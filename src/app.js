const express = require('express');
const ratesRouter = require('./routes/rates');
const accountsRouter = require('./routes/accounts');
const ordersRouter = require('./routes/orders');
const { HttpError } = require('./errors');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/rates', ratesRouter);
  app.use('/accounts', accountsRouter);
  app.use('/orders', ordersRouter);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
