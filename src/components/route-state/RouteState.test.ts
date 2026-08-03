import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RouteError} from './RouteError';
import {RouteLoading} from './RouteLoading';

test('error fallback renders safe recovery choices without internal details', () => {
  const internalMessage = 'relation private.secret_table does not exist';
  const markup = renderToStaticMarkup(createElement(RouteError, {
    backHref: '/schedule',
    backLabel: 'Return to schedule',
    message: 'The match page could not be loaded. Please try again.',
    title: 'Match unavailable',
    unstableRetry: () => undefined,
  }));

  assert.match(markup, /Match unavailable/);
  assert.match(markup, /Try again/);
  assert.match(markup, /Return to schedule/);
  assert.doesNotMatch(markup, new RegExp(internalMessage));
});

test('loading fallback announces the requested route without fake progress', () => {
  const markup = renderToStaticMarkup(createElement(RouteLoading, {label: 'Loading Captain Home'}));

  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /Loading Captain Home/);
  assert.doesNotMatch(markup, /%/);
});
