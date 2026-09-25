import {createClient} from "npm:@supabase/supabase-js@2.110.8";
import {
  exportApplicationServerKey,
  exportVapidKeys,
  generateVapidKeys,
} from "jsr:@negrel/webpush@0.5.0";

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
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

  const {data: existing} = await admin
    .from("launch_push_config")
    .select("public_key,enabled")
    .eq("id", "default")
    .maybeSingle();

  if (existing?.enabled && existing.public_key) {
    return Response.json({
      initialized: true,
      publicKey: existing.public_key,
      message: "Web Push is already initialized.",
    });
  }

  const keys = await generateVapidKeys({extractable: true});
  const exported = await exportVapidKeys(keys);
  const publicKey = await exportApplicationServerKey(keys);
  const privateKey = exported.privateKey.d;
  if (!privateKey) {
    return Response.json({error: "VAPID private scalar was not exportable"}, {status: 500});
  }

  const dispatchToken = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const dispatchUrl = supabaseUrl + "/functions/v1/team-clash-push-dispatch";

  const {error} = await admin.rpc("initialize_push_delivery_config", {
    p_public_key: publicKey,
    p_private_key: privateKey,
    p_dispatch_token: dispatchToken,
    p_dispatch_url: dispatchUrl,
    p_subject: "https://ccteamclash.com",
  });

  if (error) {
    return Response.json({error: error.message}, {status: 500});
  }

  return Response.json({initialized: true, publicKey});
});

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

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
