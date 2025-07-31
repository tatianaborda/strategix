const express = require('express');
const cors = require('cors');
const executionService = require('./services/executionService');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/strategies', require('./routes/strategies'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/users', require('./routes/users'));

// INICIALIZAR MOTOR DE EJECUCIÓN AL ARRANCAR
app.listen(process.env.PORT || 4001, () => {
  console.log('🚀 Strategix Backend Started');
 
  executionService.start();
  
  console.log('Execution Engine Active');
});

module.exports = app;