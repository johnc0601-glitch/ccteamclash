import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveLaunchSignupDisplayName} from './LaunchSignupDisplayName';

test('entered displayName is the first profile and account fallback', () => {
  assert.equal(resolveLaunchSignupDisplayName('email-name@example.com', {
    displayName: '  Entered Player  ',
    name: 'Provider Name',
  }), 'Entered Player');
});

test('name metadata is used when displayName is absent', () => {
  assert.equal(resolveLaunchSignupDisplayName('email-name@example.com', {
    name: '  Provider Name  ',
  }), 'Provider Name');
});

test('email prefix is used only after displayName and name', () => {
  assert.equal(resolveLaunchSignupDisplayName('email-name@example.com', {}), 'email-name');
  assert.equal(resolveLaunchSignupDisplayName(undefined, {}), '');
});
