const express = require('express');
const accountRepository = require('../data/accountRepository');
const orderService = require('../services/orderService');
const { toMajor } = require('../money');

const router = express.Router();

function formatAccount(account) {
  const balances = {};
  for (const [currency, minor] of Object.entries(account.balances)) {
    balances[currency] = toMajor(minor);
  }
  return { id: account.id, owner: account.owner, balances };
}

router.get('/:id', async (req, res, next) => {
  try {
    const account = await accountRepository.findById(req.params.id);
    res.json(formatAccount(account));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/orders', async (req, res, next) => {
  try {
    res.json(await orderService.listOrders(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
