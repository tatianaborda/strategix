const express = require('express');
const router = express.Router();
const { Strategy, Order } = require('../models');
const { createStrategy, getAllStrategies } = require('../controllers/strategyController');
const executionService = require('../services/executionService');
const { signOrder, executeOrderOnChain } = require('../services/limitOrderService');

// Middleware para obtener una estrategia por ID
const getStrategy = async (req, res, next) => {
  try {
    const strategy = await Strategy.findByPk(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada'
      });
    }
    
    // Attach strategy to request object
    req.strategy = strategy;
    next();
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener la estrategia',
      error: error.message
    });
  }
};

// Ruta para crear una estrategia
router.post('/', createStrategy);

// Ruta para obtener todas las estrategias
router.get('/', getAllStrategies);

// Ruta para ejecutar una estrategia
router.post('/:id/execute', getStrategy, async (req, res, next) => {
  const strategy = req.strategy;

  try {
    const pendingOrder = await Order.findOne({
      where: { strategy_id: strategy.id, status: 'pending' }
    });

    if (!pendingOrder) {
      return res.status(404).json({
        success: false,
        message: 'No hay órdenes pendientes para ejecutar en esta estrategia.'
      });
    }

    const { signature } = await signOrder(pendingOrder.order_data);
    const executionResult = await executeOrderOnChain(pendingOrder.order_data, signature);

    if (!executionResult.success) {
      return res.status(500).json({
        success: false,
        error: executionResult.error || 'Error al ejecutar orden onchain'
      });
    }

    await Order.update(
      {
        status: 'executed',
        tx_hash: executionResult.txHash,
        executed_at: new Date()
      },
      {
        where: {
          strategy_id: strategy.id,
          status: 'pending'
        }
      }
    );

    if (strategy.type === 'LIMIT_ORDER') {
      await strategy.update({
        status: 'completed',
        completedAt: new Date()
      });
      executionService.removeStrategy(strategy.id);
    }

    return res.json({
      success: true,
      txHash: executionResult.txHash,
      etherscanUrl: `https://etherscan.io/tx/${executionResult.txHash}`
    });
  } catch (error) {
    console.error('Error ejecutando estrategia:', error);
    return next(error);
  }
});

module.exports = router;