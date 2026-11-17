const { db, latency } = require('./db');

// Behaves like a DB client: async, and returns copies rather than live references.

async function findById(id) {
  await latency();
  const account = db.accounts.get(id);
  return account ? structuredClone(account) : null;
}

async function updateBalances(id, balances) {
  await latency();
  const account = db.accounts.get(id);
  if (!account) throw new Error(`Account ${id} not found`);
  account.balances = { ...balances };
}

module.exports = { findById, updateBalances };
