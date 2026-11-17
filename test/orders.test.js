const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./helpers');

const api = setupServer();

const balances = async (id) => (await api.request('GET', `/accounts/${id}`)).body.balances;

test('BUY fills at the ask and moves both balances', async () => {
  const { status, body } = await api.request('POST', '/orders', {
    accountId: 'acc_1', pair: 'EUR/USD', side: 'BUY', amount: 1000,
  });
  assert.equal(status, 201);
  assert.equal(body.status, 'FILLED');
  assert.equal(body.side, 'BUY');
  assert.equal(body.pair, 'EUR/USD');
  assert.equal(body.amount, 1000);
  assert.equal(body.rate, 1.08506);
  assert.equal(body.quoteAmount, 1085.06);
  assert.ok(body.id);
  assert.ok(body.createdAt);

  assert.deepEqual(await balances('acc_1'), { USD: 8914.94, EUR: 1000, GBP: 0, JPY: 0 });
});

test('SELL fills at the bid and moves both balances', async () => {
  const { status, body } = await api.request('POST', '/orders', {
    accountId: 'acc_2', pair: 'EURUSD', side: 'SELL', amount: 500,
  });
  assert.equal(status, 201);
  assert.equal(body.rate, 1.08494);
  assert.equal(body.quoteAmount, 542.47);

  assert.deepEqual(await balances('acc_2'), { USD: 1042.47, EUR: 1500, GBP: 0, JPY: 0 });
});

test('SELL on a JPY pair credits JPY at the correct bid', async () => {
  const { status, body } = await api.request('POST', '/orders', {
    accountId: 'acc_1', pair: 'USD/JPY', side: 'SELL', amount: 100,
  });
  assert.equal(status, 201);
  assert.equal(body.rate, 151.195);
  assert.equal(body.quoteAmount, 15119.5);

  assert.deepEqual(await balances('acc_1'), { USD: 9900, EUR: 0, GBP: 0, JPY: 15119.5 });
});

test('quote amount is rounded to the nearest cent', async () => {
  const { status, body } = await api.request('POST', '/orders', {
    accountId: 'acc_1', pair: 'EUR/USD', side: 'BUY', amount: 0.07,
  });
  assert.equal(status, 201);
  assert.equal(body.quoteAmount, 0.08); // 0.07 * 1.08506 = 0.0759542

  assert.deepEqual(await balances('acc_1'), { USD: 9999.92, EUR: 0.07, GBP: 0, JPY: 0 });
});

test('rejects an order the account cannot afford and leaves balances untouched', async () => {
  const { status, body } = await api.request('POST', '/orders', {
    accountId: 'acc_1', pair: 'EUR/USD', side: 'BUY', amount: 10000,
  });
  assert.equal(status, 422);
  assert.ok(body.error);
  assert.deepEqual(await balances('acc_1'), { USD: 10000, EUR: 0, GBP: 0, JPY: 0 });
});

for (const [name, payload] of [
  ['missing side', { accountId: 'acc_1', pair: 'EURUSD', amount: 10 }],
  ['invalid side', { accountId: 'acc_1', pair: 'EURUSD', side: 'HOLD', amount: 10 }],
  ['zero amount', { accountId: 'acc_1', pair: 'EURUSD', side: 'BUY', amount: 0 }],
  ['negative amount', { accountId: 'acc_1', pair: 'EURUSD', side: 'BUY', amount: -5 }],
  ['string amount', { accountId: 'acc_1', pair: 'EURUSD', side: 'BUY', amount: '100' }],
  ['more than 2 decimals', { accountId: 'acc_1', pair: 'EURUSD', side: 'BUY', amount: 10.001 }],
  ['missing pair', { accountId: 'acc_1', side: 'BUY', amount: 10 }],
]) {
  test(`returns 400 for ${name}`, async () => {
    const { status, body } = await api.request('POST', '/orders', payload);
    assert.equal(status, 400);
    assert.ok(body.error);
  });
}

test('returns 404 for an unknown account', async () => {
  const { status } = await api.request('POST', '/orders', {
    accountId: 'nope', pair: 'EURUSD', side: 'BUY', amount: 10,
  });
  assert.equal(status, 404);
});

test('returns 404 for an unsupported pair', async () => {
  const { status } = await api.request('POST', '/orders', {
    accountId: 'acc_1', pair: 'XAUBTC', side: 'BUY', amount: 10,
  });
  assert.equal(status, 404);
});

test('concurrent affordable orders are all applied (no lost updates)', async () => {
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      api.request('POST', '/orders', { accountId: 'acc_1', pair: 'EURUSD', side: 'BUY', amount: 100 })),
  );
  assert.deepEqual(results.map((r) => r.status), Array(10).fill(201));
  // each order costs 100 * 1.08506 = 108.51
  assert.deepEqual(await balances('acc_1'), { USD: 8914.9, EUR: 1000, GBP: 0, JPY: 0 });
});

test('concurrent orders cannot overdraw an account', async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      api.request('POST', '/orders', { accountId: 'acc_1', pair: 'EURUSD', side: 'BUY', amount: 3000 })),
  );
  // each order costs 3255.18, so only 3 of 5 fit into 10,000 USD
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 201, 201, 422, 422]);
  assert.deepEqual(await balances('acc_1'), { USD: 234.46, EUR: 9000, GBP: 0, JPY: 0 });
});

test('GET /accounts/:id/orders lists the account orders newest first', async () => {
  await api.request('POST', '/orders', { accountId: 'acc_2', pair: 'EURUSD', side: 'SELL', amount: 100 });
  await api.request('POST', '/orders', { accountId: 'acc_2', pair: 'EURUSD', side: 'SELL', amount: 200 });
  await api.request('POST', '/orders', { accountId: 'acc_1', pair: 'EURUSD', side: 'BUY', amount: 50 });

  const { status, body } = await api.request('GET', '/accounts/acc_2/orders');
  assert.equal(status, 200);
  assert.deepEqual(body.map((o) => o.amount), [200, 100]);
  assert.ok(body.every((o) => o.accountId === 'acc_2'));
});

test('GET /accounts/:id/orders returns 404 for an unknown account', async () => {
  const { status } = await api.request('GET', '/accounts/nope/orders');
  assert.equal(status, 404);
});
