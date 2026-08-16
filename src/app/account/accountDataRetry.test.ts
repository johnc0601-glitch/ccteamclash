import assert from 'node:assert/strict';
import test from 'node:test';
import {loadAccountDataWithJwtTimingRetry} from './accountDataRetry';

const transientJwtError = {
  code: 'PGRST303',
  message: 'JWT issued at future',
};

test('retries once for the exact transient JWT timing error and returns real data', async () => {
  const claims = [{id: 'claim-1'}];
  let attempts = 0;
  const waits: number[] = [];

  const result = await loadAccountDataWithJwtTimingRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw transientJwtError;
    }
    return claims;
  }, async (milliseconds) => {
    waits.push(milliseconds);
  });

  assert.equal(attempts, 2);
  assert.deepEqual(waits, [250]);
  assert.strictEqual(result, claims);
  assert.deepEqual(result, [{id: 'claim-1'}]);
});

test('propagates the second failure after one retry', async () => {
  let attempts = 0;

  await assert.rejects(
    loadAccountDataWithJwtTimingRetry(async () => {
      attempts += 1;
      throw transientJwtError;
    }, async () => undefined),
    transientJwtError,
  );

  assert.equal(attempts, 2);
});

test('does not retry an unrelated 401 error', async () => {
  const error = {code: '401', message: 'Unauthorized'};
  let attempts = 0;

  await assert.rejects(
    loadAccountDataWithJwtTimingRetry(async () => {
      attempts += 1;
      throw error;
    }, async () => undefined),
    error,
  );

  assert.equal(attempts, 1);
});

test('does not retry a 403 or RLS denial', async () => {
  for (const error of [
    {code: '403', message: 'Forbidden'},
    {code: '42501', message: 'new row violates row-level security policy'},
  ]) {
    let attempts = 0;

    await assert.rejects(
      loadAccountDataWithJwtTimingRetry(async () => {
        attempts += 1;
        throw error;
      }, async () => undefined),
      error,
    );

    assert.equal(attempts, 1);
  }
});

test('does not retry unrelated PostgREST or database errors', async () => {
  for (const error of [
    {code: 'PGRST116', message: 'JSON object requested, multiple rows returned'},
    {code: '23505', message: 'duplicate key value violates unique constraint'},
    {code: 'PGRST303', message: 'JWT expired'},
  ]) {
    let attempts = 0;

    await assert.rejects(
      loadAccountDataWithJwtTimingRetry(async () => {
        attempts += 1;
        throw error;
      }, async () => undefined),
      error,
    );

    assert.equal(attempts, 1);
  }
});
