import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createAdminClient} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORT = new Set(['strongly_support', 'somewhat_support', 'neutral_unsure', 'somewhat_oppose', 'strongly_oppose']);
const LIKELY_USE = new Set(['very_likely', 'somewhat_likely', 'not_sure', 'somewhat_unlikely', 'very_unlikely']);
const VISIT_FREQUENCY = new Set(['weekly_plus', 'few_times_month', 'monthly', 'few_times_year', 'rarely', 'never']);
const EXPERIENCE = new Set(['regular', 'occasional', 'new_interested', 'nonplayer_interested', 'nonplayer']);
const RESIDENCY = new Set(['yes', 'no', 'not_sure']);
const CONSIDERATIONS = new Set([
  'paths_safety',
  'natural_areas',
  'existing_uses',
  'parking_access',
  'accessibility',
  'maintenance',
  'cost_funding',
]);
const SOURCES = new Set(['disc_golf', 'neighborhood', 'park_qr', 'social', 'word_of_mouth', 'other']);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({error: 'Invalid request origin.'}, {status: 403});
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({error: 'Invalid survey response.'}, {status: 400});
  }

  // Honeypot: acknowledge likely bot submissions without persisting them.
  if (typeof body.website === 'string' && body.website.trim()) {
    return Response.json({ok: true});
  }

  const support = readAllowed(body.support, SUPPORT);
  const likelyUse = readAllowed(body.likelyUse, LIKELY_USE);
  const parkVisitFrequency = readAllowed(body.parkVisitFrequency, VISIT_FREQUENCY);
  const discGolfExperience = readAllowed(body.discGolfExperience, EXPERIENCE);
  const wilmingtonResident = readAllowed(body.wilmingtonResident, RESIDENCY);
  const zipCode = typeof body.zipCode === 'string' ? body.zipCode.trim() : '';
  const source = body.source === '' || body.source == null ? null : readAllowed(body.source, SOURCES);
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  const considerations = Array.isArray(body.considerations)
    ? [...new Set(body.considerations.filter((value): value is string => typeof value === 'string' && CONSIDERATIONS.has(value)))]
    : [];

  if (!support || !likelyUse || !parkVisitFrequency || !discGolfExperience || !wilmingtonResident) {
    return Response.json({error: 'Please complete all required questions.'}, {status: 400});
  }
  if (!/^\d{5}$/.test(zipCode)) {
    return Response.json({error: 'Please enter a valid 5-digit ZIP code.'}, {status: 400});
  }
  if (body.source && !source) {
    return Response.json({error: 'Please select a valid survey source.'}, {status: 400});
  }
  if (comment.length > 2000) {
    return Response.json({error: 'Comments must be 2,000 characters or fewer.'}, {status: 400});
  }

  const ipHash = hashRequestIp(request);
  const supabase = createAdminClient() as unknown as SupabaseClient;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{count: recentCount, error: recentError}, {count: dailyCount, error: dailyError}] = await Promise.all([
    supabase
      .from('burnt_mill_survey_responses')
      .select('id', {head: true, count: 'exact'})
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo),
    supabase
      .from('burnt_mill_survey_responses')
      .select('id', {head: true, count: 'exact'})
      .eq('ip_hash', ipHash)
      .gte('created_at', oneDayAgo),
  ]);

  if (recentError || dailyError) {
    console.error('Burnt Mill survey rate-limit lookup failed.', {recentError, dailyError});
    return Response.json({error: 'The survey is temporarily unavailable. Please try again.'}, {status: 500});
  }

  // Loose limits deter scripted repeats while allowing several people on one home/public network.
  if ((recentCount ?? 0) >= 8 || (dailyCount ?? 0) >= 20) {
    return Response.json(
      {error: 'Too many responses have been submitted from this network recently. Please try again later.'},
      {status: 429},
    );
  }

  const {error} = await supabase.from('burnt_mill_survey_responses').insert({
    support,
    likely_use: likelyUse,
    park_visit_frequency: parkVisitFrequency,
    disc_golf_experience: discGolfExperience,
    considerations,
    comment: comment || null,
    wilmington_resident: wilmingtonResident,
    zip_code: zipCode,
    source,
    ip_hash: ipHash,
  });

  if (error) {
    console.error('Burnt Mill survey submission failed.', {code: error.code});
    return Response.json({error: 'Your response could not be saved. Please try again.'}, {status: 500});
  }

  return Response.json({ok: true}, {status: 201});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readAllowed(value: unknown, allowed: Set<string>): string | null {
  return typeof value === 'string' && allowed.has(value) ? value : null;
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function hashRequestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
  const serverPepper = process.env.SUPABASE_SERVICE_ROLE_KEY || 'burnt-mill-survey';
  return createHash('sha256').update(ip).update('|').update(serverPepper).digest('hex');
}
