const { before, after, beforeEach } = require('node:test');
const { createApp } = require('../src/app');
const { reset } = require('../src/data/db');
const { resetMids } = require('../src/services/rateProvider');

// Starts the app on a random port for the current test file and resets state before each test.
function setupServer() {
  const ctx = {};
  let server;

  before(async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    ctx.baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => server.close());

  beforeEach(() => {
    reset();
    resetMids();
  });

  ctx.request = async (method, path, body) => {
    const res = await fetch(ctx.baseUrl + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(2000),
    });
    return { status: res.status, body: await res.json() };
  };

  return ctx;
}

module.exports = { setupServer };
