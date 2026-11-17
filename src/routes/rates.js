const express = require('express');
const rateService = require('../services/rateService');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await rateService.getAllQuotes());
});

router.get('/:pair', async (req, res) => {
  const quote = await rateService.getQuote(req.params.pair);
  res.json(quote);
});

module.exports = router;
