const express = require('express');
const router = express.Router();
const { Strategy, Order, User } = require('../models');
const { createLimitOrder, executeOrderOnChain } = require('../services/limitOrderService');
const executionService = require('../services/executionService');
const { validateStrategy } = require('../validators/strategyValidator');

// GET /api/strategies - Obtener todas las estrategias del usuario
router.get('/', async (req, res) => {
  try {
    const { userAddress } = req.query;
    
    const strategies = await Strategy.findAll({
      where: userAddress ? { userAddress } : {},
      include: [{
        model: Order,
        as: 'orders',
        attributes: ['id', 'order_hash', 'status', 'execution_price', 'tx_hash', 'createdAt']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      strategies: strategies.map(strategy => ({
        ...strategy.toJSON(),
        totalOrders: strategy.orders?.length || 0,
        executedOrders: strategy.orders?.filter(o => o.status === 'executed').length || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/strategies - Crear nueva estrategia
router.post('/', validateStrategy, async (req, res) => {
  try {
    const strategyData = req.body;
    
    // Crear estrategia en DB
    const strategy = await Strategy.create({
      ...strategyData,
      status: 'active',
      isExecuting: false
    });

    executionService.addStrategy(strategy);

    // Si es una estrategia simple, crear la orden inmediatamente
    if (strategyData.type === 'LIMIT_ORDER' && strategyData.executeImmediately) {
      try {
        const orderResult = await createLimitOrder(strategy);
        if (orderResult) {
          console.log(`Orden creada para estrategia ${strategy.id}`);
        }
      } catch (orderError) {
        console.error('Error creando orden inicial:', orderError);
        // No fallar la creación de estrategia por esto
      }
    }

    res.status(201).json({
      success: true,
      strategy: strategy.toJSON(),
      message: 'Estrategia creada y agregada al motor de ejecución'
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/strategies/:id/execute - Ejecución manual
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    
    const strategy = await Strategy.findByPk(id);
    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Estrategia no encontrada' });
    }

    const orderResult = await createLimitOrder(strategy);
    
    if (!orderResult) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se pudo crear la orden. Condiciones no cumplidas.' 
      });
    }

    const { order, signature } = orderResult;

    // Ejecutar onchain inmediatamente
    const executionResult = await executeOrderOnChain(order, signature);

    if (executionResult.success) {
      // Actualizar orden en DB con hash de transacción
      await Order.update(
        { 
          status: 'executed',
          tx_hash: executionResult.txHash,
          executed_at: new Date()
        },
        { 
          where: { 
            strategyId: id,
            status: 'pending'
          }
        }
      );

      // Marcar estrategia como completada si es de una sola ejecución
      if (strategy.type === 'LIMIT_ORDER') {
        await strategy.update({ 
          status: 'completed',
          completedAt: new Date()
        });
        executionService.removeStrategy(id);
      }

      res.json({
        success: true,
        txHash: executionResult.txHash,
        message: 'Orden ejecutada exitosamente onchain',
        etherscanUrl: `https://etherscan.io/tx/${executionResult.txHash}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: executionResult.error,
        message: 'Error ejecutando orden onchain'
      });
    }
  } catch (error) {
    console.error('Error executing strategy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/strategies/:id/orders - Historial de órdenes
router.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    
    const orders = await Order.findAll({
      where: { strategyId: id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order.toJSON(),
        etherscanUrl: order.tx_hash ? `https://etherscan.io/tx/${order.tx_hash}` : null
      }))
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/strategies/:id - Cancelar estrategia
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const strategy = await Strategy.findByPk(id);
    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Estrategia no encontrada' });
    }

    // Remover del motor de ejecución
    executionService.removeStrategy(id);
    
    // Actualizar estado
    await strategy.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Estrategia cancelada'
    });
  } catch (error) {
    console.error('Error cancelling strategy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
