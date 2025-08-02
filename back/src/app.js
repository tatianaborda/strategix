const express = require('express');
const cors = require('cors');

const strategiesRouter = require('./routes/strategies');
const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const pricesRouter = require('./routes/prices');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Routes
app.use('/api/strategies', strategiesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/users', usersRouter);
app.use('/api/prices', pricesRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Strategix Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

module.exports = app;
