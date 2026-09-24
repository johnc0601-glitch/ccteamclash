import {createClient} from "npm:@supabase/supabase-js@2.110.8";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

type DeliveryConfig = {
  public_key: string;
  private_key: string;
  dispatch_token: string;
  subject: string;
  dispatch_url: string | null;
  enabled: boolean;
};

type OutboxItem = {
  id: string;
  profile_id: string;
  category: string;
  title: string;
  body: string;
  url: string;
  source_type: string;
  source_id: string;
  attempts: number;
  expires_at: string;
};

type StoredSubscription = {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({error: "Method not allowed"}, {status: 405});
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = readServiceKey();
  if (!supabaseUrl || !serviceKey) {
    return Response.json({error: "Supabase admin environment unavailable"}, {status: 500});
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });

  const {data: configRows, error: configError} = await admin
    .rpc("get_push_delivery_config");
  const config = (Array.isArray(configRows) ? configRows[0] : configRows) as DeliveryConfig | null;

  if (
    configError
    || !config?.enabled
    || !config.public_key
    || !config.private_key
    || !config.dispatch_token
  ) {
    return Response.json({error: "Push delivery is not configured"}, {status: 503});
  }

  const suppliedToken = req.headers.get("x-team-clash-dispatch") ?? "";
  if (suppliedToken !== config.dispatch_token) {
    return Response.json({error: "Unauthorized"}, {status: 401});
  }

  const {data: claimedRows, error: claimError} = await admin
    .rpc("claim_push_notification_outbox", {p_limit: 50});
  if (claimError) {
    console.error("Push outbox claim failed.", claimError);
    return Response.json({error: "Could not claim push outbox"}, {status: 500});
  }

  const items = (claimedRows ?? []) as OutboxItem[];
  if (!items.length) {
    return Response.json({ok: true, claimed: 0, sent: 0, skipped: 0, retried: 0});
  }

  const profileIds = [...new Set<string>(items.map((item) => item.profile_id))];
  const {data: subscriptionRows, error: subscriptionError} = await admin
    .from("launch_push_subscriptions")
    .select("id,profile_id,endpoint,p256dh,auth_secret")
    .in("profile_id", profileIds)
    .eq("enabled", true);

  if (subscriptionError) {
    await releaseClaims(admin, items, "Subscriptions could not be loaded.");
    return Response.json({error: "Could not load push subscriptions"}, {status: 500});
  }

  const subscriptions = (subscriptionRows ?? []) as StoredSubscription[];
  const subscriptionsByProfile = new Map<string, StoredSubscription[]>();
  for (const subscription of subscriptions) {
    const list = subscriptionsByProfile.get(subscription.profile_id) ?? [];
    list.push(subscription);
    subscriptionsByProfile.set(subscription.profile_id, list);
  }

  const applicationServer = await createApplicationServer(config);
  let sent = 0;
  let skipped = 0;
  let retried = 0;

  for (const item of items) {
    const profileSubscriptions = subscriptionsByProfile.get(item.profile_id) ?? [];
    if (!profileSubscriptions.length) {
      await admin
        .from("launch_notification_outbox")
        .update({
          skipped_at: new Date().toISOString(),
          processing_at: null,
          last_error: "No active push subscriptions.",
        })
        .eq("id", item.id);
      skipped += 1;
      continue;
    }

    let successfulDevices = 0;
    const transientErrors: string[] = [];

    for (const subscription of profileSubscriptions) {
      try {
        const subscriber = applicationServer.subscribe({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: normalizeBase64Url(subscription.p256dh),
            auth: normalizeBase64Url(subscription.auth_secret),
          },
        });

        await subscriber.pushTextMessage(
          JSON.stringify({
            title: item.title,
            body: item.body,
            url: item.url,
            tag: `team-clash-${item.category}-${item.source_id}`,
          }),
          {},
        );

        successfulDevices += 1;
        await admin
          .from("launch_push_subscriptions")
          .update({last_seen_at: new Date().toISOString(), enabled: true})
          .eq("id", subscription.id);
      } catch (error) {
        if (error instanceof webpush.PushMessageError && error.isGone()) {
          await admin
            .from("launch_push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          continue;
        }

        transientErrors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (successfulDevices > 0) {
      await admin
        .from("launch_notification_outbox")
        .update({
          sent_at: new Date().toISOString(),
          processing_at: null,
          last_error: transientErrors.length
            ? `Delivered to ${successfulDevices} device(s); ${transientErrors.length} device(s) failed.`
            : null,
        })
        .eq("id", item.id);
      sent += 1;
      continue;
    }

    const errorText = transientErrors.slice(0, 3).join(" | ") || "No active subscription accepted the push.";
    if (transientErrors.length === 0 || item.attempts >= 5) {
      await admin
        .from("launch_notification_outbox")
        .update({
          skipped_at: new Date().toISOString(),
          processing_at: null,
          last_error: errorText.slice(0, 1000),
        })
        .eq("id", item.id);
      skipped += 1;
    } else {
      await admin
        .from("launch_notification_outbox")
        .update({
          processing_at: null,
          last_error: errorText.slice(0, 1000),
        })
        .eq("id", item.id);
      retried += 1;
    }
  }

  return Response.json({
    ok: true,
    claimed: items.length,
    sent,
    skipped,
    retried,
  });
});

async function createApplicationServer(config: DeliveryConfig) {
  const publicBytes = base64UrlToBytes(config.public_key);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error("Invalid VAPID public key.");
  }

  const privateBytes = base64UrlToBytes(config.private_key);
  if (privateBytes.length !== 32) {
    throw new Error("Invalid VAPID private key.");
  }

  const publicJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    x: bytesToBase64Url(publicBytes.slice(1, 33)),
    y: bytesToBase64Url(publicBytes.slice(33, 65)),
    key_ops: ["verify"],
    ext: true,
  };
  const privateJwk: JsonWebKey = {
    ...publicJwk,
    d: bytesToBase64Url(privateBytes),
    key_ops: ["sign"],
  };

  const vapidKeys = await webpush.importVapidKeys({
    publicKey: publicJwk,
    privateKey: privateJwk,
  }, {extractable: false});

  return webpush.ApplicationServer.new({
    contactInformation: config.subject || "https://ccteamclash.com",
    vapidKeys,
  });
}

async function releaseClaims(
  admin: ReturnType<typeof createClient>,
  items: OutboxItem[],
  message: string,
) {
  const ids = items.map((item) => item.id);
  if (!ids.length) return;
  await admin
    .from("launch_notification_outbox")
    .update({processing_at: null, last_error: message})
    .in("id", ids);
}

function readServiceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;

  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return undefined;
  try {
    const keys = JSON.parse(raw) as Record<string, string>;
    return keys.default;
  } catch {
    return undefined;
  }
}

function normalizeBase64Url(value: string) {
  return value.trim().replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const normalized = normalizeBase64Url(value);
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
