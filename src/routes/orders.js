const express = require('express');
const orderService = require('../services/orderService');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const order = await orderService.placeMarketOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
