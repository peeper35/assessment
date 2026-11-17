// In-memory "database". Balances are integer minor units (see src/money.js).

function seed() {
  return {
    accounts: new Map([
      ['acc_1', { id: 'acc_1', owner: 'Alice', balances: { USD: 1_000_000, EUR: 0, GBP: 0, JPY: 0 } }],
      ['acc_2', { id: 'acc_2', owner: 'Bob', balances: { USD: 50_000, EUR: 200_000, GBP: 0, JPY: 0 } }],
    ]),
    orders: [],
  };
}

const db = seed();

// Used by tests to start each case from a clean state.
function reset() {
  Object.assign(db, seed());
}

// Simulates network latency to a real database.
const latency = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

module.exports = { db, reset, latency };
