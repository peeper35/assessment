const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./helpers');

const api = setupServer();

test('GET /accounts/:id returns balances in major units', async () => {
  const { status, body } = await api.request('GET', '/accounts/acc_1');
  assert.equal(status, 200);
  assert.deepEqual(body, {
    id: 'acc_1',
    owner: 'Alice',
    balances: { USD: 10000, EUR: 0, GBP: 0, JPY: 0 },
  });
});

test('GET /accounts/:id returns 404 for an unknown account', async () => {
  const { status, body } = await api.request('GET', '/accounts/nope');
  assert.equal(status, 404);
  assert.ok(body.error);
});
