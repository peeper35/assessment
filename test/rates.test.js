const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./helpers');

const api = setupServer();

test('GET /rates lists every supported pair', async () => {
  const { status, body } = await api.request('GET', '/rates');
  assert.equal(status, 200);
  assert.deepEqual(body.map((q) => q.pair).sort(), ['EUR/GBP', 'EUR/USD', 'GBP/USD', 'USD/JPY']);
});

test('GET /rates/:pair returns a two-way quote around the mid', async () => {
  const { status, body } = await api.request('GET', '/rates/EURUSD');
  assert.equal(status, 200);
  assert.equal(body.pair, 'EUR/USD');
  assert.equal(body.bid, 1.08494);
  assert.equal(body.ask, 1.08506);
});

test('GET /rates/:pair is case and separator insensitive', async () => {
  const { status, body } = await api.request('GET', '/rates/eur-usd');
  assert.equal(status, 200);
  assert.equal(body.pair, 'EUR/USD');
});

test('JPY pairs apply the spread with the correct pip size', async () => {
  const { status, body } = await api.request('GET', '/rates/USDJPY');
  assert.equal(status, 200);
  assert.equal(body.bid, 151.195);
  assert.equal(body.ask, 151.205);
});

test('GET /rates/:pair returns 404 for an unsupported pair', async () => {
  const { status, body } = await api.request('GET', '/rates/XAUBTC');
  assert.equal(status, 404);
  assert.ok(body.error);
});
