import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSignupConfirmationUrl} from './confirmationUrl';

const productionSiteUrl = 'https://ccteamclash.com';
const productionSupabaseUrl = 'https://iwyssbrekhwkjnlagxzc.supabase.co';
const callback = 'https://ccteamclash.com/auth/callback?next=/account';

test('intermediary validation does not fetch or consume the confirmation token', () => {
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error('Confirmation validation must not make a request.');
  };

  try {
    const result = validateSignupConfirmationUrl({
      confirmationUrl: confirmationUrl(),
      requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
      siteUrl: productionSiteUrl,
      supabaseUrl: productionSupabaseUrl,
    });
    assert.equal(result.ok, true);
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('explicit confirmation target accepts the exact Production Supabase verify endpoint', () => {
  assert.deepEqual(validateSignupConfirmationUrl({
    confirmationUrl: confirmationUrl(),
    requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
    siteUrl: productionSiteUrl,
    supabaseUrl: productionSupabaseUrl,
  }), {
    ok: true,
    url: confirmationUrl(),
  });
});

test('external and lookalike verification URLs are rejected', () => {
  for (const url of [
    `https://example.com/auth/v1/verify?token=secret&type=signup&redirect_to=${encodeURIComponent(callback)}`,
    `https://iwyssbrekhwkjnlagxzc.supabase.co.example.com/auth/v1/verify?token=secret&type=signup&redirect_to=${encodeURIComponent(callback)}`,
    `http://iwyssbrekhwkjnlagxzc.supabase.co/auth/v1/verify?token=secret&type=signup&redirect_to=${encodeURIComponent(callback)}`,
  ]) {
    assert.equal(validateSignupConfirmationUrl({
      confirmationUrl: url,
      requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
      siteUrl: productionSiteUrl,
      supabaseUrl: productionSupabaseUrl,
    }).ok, false);
  }
});

test('confirmation URL must return through the canonical account callback', () => {
  const wrongCallback = 'https://ccteamclash.com/auth/callback?next=/office';
  assert.equal(validateSignupConfirmationUrl({
    confirmationUrl: confirmationUrl(wrongCallback),
    requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
    siteUrl: productionSiteUrl,
    supabaseUrl: productionSupabaseUrl,
  }).ok, false);
});

test('missing or unsupported signup token data is rejected', () => {
  const missingToken = `${productionSupabaseUrl}/auth/v1/verify?type=signup&redirect_to=${encodeURIComponent(callback)}`;
  const recoveryToken = `${productionSupabaseUrl}/auth/v1/verify?token=secret&type=recovery&redirect_to=${encodeURIComponent(callback)}`;
  assert.equal(validateSignupConfirmationUrl({
    confirmationUrl: missingToken,
    requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
    siteUrl: productionSiteUrl,
    supabaseUrl: productionSupabaseUrl,
  }).ok, false);
  assert.equal(validateSignupConfirmationUrl({
    confirmationUrl: recoveryToken,
    requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
    siteUrl: productionSiteUrl,
    supabaseUrl: productionSupabaseUrl,
  }).ok, false);
});

test('Production project guard rejects a configured URL from another Supabase project', () => {
  const otherProjectUrl = 'https://smnhoxujttckdvjsrhsz.supabase.co';
  const otherConfirmation = `${otherProjectUrl}/auth/v1/verify?token=secret&type=signup&redirect_to=${encodeURIComponent(callback)}`;
  assert.equal(validateSignupConfirmationUrl({
    confirmationUrl: otherConfirmation,
    requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
    siteUrl: productionSiteUrl,
    supabaseUrl: otherProjectUrl,
  }).ok, false);
});

test('Production and Preview reject each other’s confirmation URLs', () => {
  const stagingSupabaseUrl = 'https://smnhoxujttckdvjsrhsz.supabase.co';
  const stagingSiteUrl = 'https://ccteamclash-git-roster-preview-cfdt.vercel.app';
  const stagingCallback = `${stagingSiteUrl}/auth/callback?next=/account`;
  const stagingConfirmation = `${stagingSupabaseUrl}/auth/v1/verify?token=staging&type=email&redirect_to=${encodeURIComponent(stagingCallback)}`;

  assert.equal(validateSignupConfirmationUrl({
    confirmationUrl: stagingConfirmation,
    requiredProjectRef: 'iwyssbrekhwkjnlagxzc',
    siteUrl: productionSiteUrl,
    supabaseUrl: productionSupabaseUrl,
  }).ok, false);

  assert.equal(validateSignupConfirmationUrl({
    confirmationUrl: confirmationUrl(),
    siteUrl: stagingSiteUrl,
    supabaseUrl: stagingSupabaseUrl,
  }).ok, false);

  assert.equal(validateSignupConfirmationUrl({
    confirmationUrl: stagingConfirmation,
    siteUrl: stagingSiteUrl,
    supabaseUrl: stagingSupabaseUrl,
  }).ok, true);
});

function confirmationUrl(redirectTo = callback): string {
  return `${productionSupabaseUrl}/auth/v1/verify?token=secret&type=signup&redirect_to=${encodeURIComponent(redirectTo)}`;
}
