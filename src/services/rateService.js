const provider = require('./rateProvider');
const { HttpError } = require('../errors');

// Spread charged to clients, in pips, per pair.
const SPREAD_PIPS = {
  EURUSD: 1.2,
  GBPUSD: 1.5,
  USDJPY: 1.0,
  EURGBP: 1.8,
};

const PIP_SIZE = 0.0001;

const SUPPORTED_PAIRS = Object.keys(SPREAD_PIPS);

// Accepts "EURUSD", "eurusd", "EUR/USD", "eur-usd" -> "EURUSD"
function normalizePair(input) {
  return String(input || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
}

function decimalsFor(pair) {
  return pair.endsWith('JPY') ? 3 : 5;
}

const round = (value, decimals) => Number(value.toFixed(decimals));

/**
 * Returns a two-way quote for a pair.
 * bid = price at which the client SELLS the base currency
 * ask = price at which the client BUYS the base currency
 */
async function getQuote(pairInput) {
  const pair = normalizePair(pairInput);
  if (!SUPPORTED_PAIRS.includes(pair)) {
    throw new HttpError(404, `Unsupported pair: ${pairInput}`);
  }

  const mid = await provider.fetchMid(pair);
  const halfSpread = (SPREAD_PIPS[pair] * PIP_SIZE) / 2;
  const decimals = decimalsFor(pair);

  return {
    pair: `${pair.slice(0, 3)}/${pair.slice(3)}`,
    base: pair.slice(0, 3),
    quote: pair.slice(3),
    bid: round(mid - halfSpread, decimals),
    ask: round(mid + halfSpread, decimals),
    timestamp: new Date().toISOString(),
  };
}

async function getAllQuotes() {
  return Promise.all(SUPPORTED_PAIRS.map(getQuote));
}

module.exports = { getQuote, getAllQuotes, normalizePair, SUPPORTED_PAIRS };
