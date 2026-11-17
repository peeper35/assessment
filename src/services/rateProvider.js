// Fake upstream liquidity provider. In production this would be an HTTP/WebSocket feed.

const DEFAULT_MIDS = {
  EURUSD: 1.085,
  GBPUSD: 1.27,
  USDJPY: 151.2,
  EURGBP: 0.854,
};

let mids = { ...DEFAULT_MIDS };

async function fetchMid(pair) {
  await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 20));
  return mids[pair];
}

// Test helpers.
function setMid(pair, value) {
  mids[pair] = value;
}
function resetMids() {
  mids = { ...DEFAULT_MIDS };
}

module.exports = { fetchMid, setMid, resetMids };
