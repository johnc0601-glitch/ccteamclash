import assert from 'node:assert/strict';
import test from 'node:test';
import {isAppPreviewHost, resolveAppPreviewState} from '@/components/appPreviewState';

test('app preview is limited to Vercel and local development hosts', () => {
  assert.equal(isAppPreviewHost('ccteamclash-preview.vercel.app'), true);
  assert.equal(isAppPreviewHost('localhost'), true);
  assert.equal(isAppPreviewHost('127.0.0.1'), true);
  assert.equal(isAppPreviewHost('ccteamclash.com'), false);
});

test('appPreview=1 persists and enables preview on a Vercel browser host', () => {
  assert.deepEqual(resolveAppPreviewState({
    hostname: 'ccteamclash-preview.vercel.app',
    queryValue: '1',
    persisted: false,
    standalone: false,
  }), {
    persisted: true,
    enabled: true,
  });
});

test('persisted browser preview stays enabled without query string', () => {
  assert.deepEqual(resolveAppPreviewState({
    hostname: 'ccteamclash-preview.vercel.app',
    queryValue: null,
    persisted: true,
    standalone: false,
  }), {
    persisted: true,
    enabled: true,
  });
});

test('production hostname can never enable browser app preview', () => {
  assert.deepEqual(resolveAppPreviewState({
    hostname: 'ccteamclash.com',
    queryValue: '1',
    persisted: false,
    standalone: false,
  }), {
    persisted: false,
    enabled: false,
  });
});

test('standalone display suppresses browser-preview state', () => {
  assert.deepEqual(resolveAppPreviewState({
    hostname: 'ccteamclash-preview.vercel.app',
    queryValue: null,
    persisted: true,
    standalone: true,
  }), {
    persisted: true,
    enabled: false,
  });
});

test('appPreview=0 clears persisted preview', () => {
  assert.deepEqual(resolveAppPreviewState({
    hostname: 'ccteamclash-preview.vercel.app',
    queryValue: '0',
    persisted: true,
    standalone: false,
  }), {
    persisted: false,
    enabled: false,
  });
});


test('configured app surface stays enabled without preview state', () => {
  assert.deepEqual(resolveAppPreviewState({
    hostname: 'app.ccteamclash.com',
    queryValue: null,
    persisted: false,
    standalone: false,
    appSurface: true,
  }), {
    persisted: false,
    enabled: true,
  });
});

test('configured app surface cannot be exited with appPreview=0', () => {
  assert.deepEqual(resolveAppPreviewState({
    hostname: 'app.ccteamclash.com',
    queryValue: '0',
    persisted: true,
    standalone: true,
    appSurface: true,
  }), {
    persisted: false,
    enabled: true,
  });
});
