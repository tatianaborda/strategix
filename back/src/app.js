const express = require('express');
const cors = require('cors');

const strategiesRoutes = require('./routes/strategies');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');
const pricesRoutes = require('./routes/prices');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/strategies', strategiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/prices', pricesRoutes);


app.get('/', (req, res) => {
  res.json({
    message: 'Strategix API is running!YAAAAAY',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      strategies: '/api/strategies',
      users: '/api/users',
      orders: '/api/orders',
      prices: '/api/prices'
    }
  });
});


app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found :(',
    path: req.originalUrl
  });
});


app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({
    success: false,
    message: 'Internal Server error'
  });
});

module.exports = app;