const { db, latency } = require('./db');

async function insert(order) {
  await latency();
  db.orders.push(structuredClone(order));
}

async function findByAccountId(accountId) {
  await latency();
  return db.orders.filter((o) => o.accountId === accountId).map((o) => structuredClone(o));
}

module.exports = { insert, findByAccountId };
