const { HttpError } = require('../errors');

/**
 * Executes a market order immediately at the current quote.
 *
 * TODO(candidate): implement. See README, Task 2 and Task 3.
 *
 * @param {object} input  raw request body: { accountId, pair, side, amount }
 * @returns {Promise<object>} the filled order
 */
async function placeMarketOrder(input) {
  throw new HttpError(501, 'Not implemented');
}

/**
 * Returns an account's orders, newest first.
 *
 * TODO(candidate): implement. See README, Task 2.
 */
async function listOrders(accountId) {
  throw new HttpError(501, 'Not implemented');
}

module.exports = { placeMarketOrder, listOrders };
