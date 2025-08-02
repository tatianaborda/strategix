const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Strategy = require('../models/Strategy');
const orderController = require('../controllers/orderController');
const { validateOrder } = require('../validators/orderValidator');
const { executeOrderOnChain } = require('../services/limitOrderService');

// GET /api/orders - Obtener todas las órdenes (con filtros)
router.get('/', async (req, res) => {
  try {
    const { 
      userAddress, 
      strategyId, 
      status, 
      limit = 50, 
      page = 1 
    } = req.query;

    // Construir filtro
    const filter = {};
    if (userAddress) filter.userAddress = userAddress;
    if (strategyId) filter.strategyId = strategyId;
    if (status) filter.status = status;

    // Paginación
    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .populate('strategyId', 'name type tokens')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      message: 'Órdenes obtenidas exitosamente',
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: skip + orders.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/orders/:id - Obtener orden específica
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('strategyId', 'name type tokens conditions');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Orden obtenida exitosamente',
      data: order
    });
  } catch (error) {
    console.error('Error al obtener orden:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/orders/strategy/:strategyId - Obtener órdenes de una estrategia
router.get('/strategy/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { status } = req.query;

    const filter = { strategyId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ timestamp: -1 });

    // strategy stats
    const stats = {
      total: orders.length,
      executed: orders.filter(o => o.status === 'EXECUTED').length,
      failed: orders.filter(o => o.status === 'FAILED').length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      totalVolume: orders
        .filter(o => o.status === 'EXECUTED')
        .reduce((sum, o) => sum + (o.executionPrice || 0), 0)
    };

    res.json({
      success: true,
      message: 'Órdenes de estrategia obtenidas exitosamente',
      data: orders,
      stats
    });
  } catch (error) {
    console.error('Error al obtener órdenes de estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/orders/user/:userAddress
router.get('/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { status, days = 30 } = req.query;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));

    // Buscar órdenes por estrategias del usuario usando Sequelize
    const { Strategy } = require('../models');
    
    const whereClause = {
      created_at: { [Op.gte]: dateFilter }
    };
    
    if (status) whereClause.status = status.toUpperCase();

    const orders = await Order.findAll({
      where: whereClause,
      include: [{
        model: Strategy,
        as: 'strategy',
        where: { 
          userAddress: userAddress.toLowerCase() 
        },
        attributes: ['id', 'name', 'type', 'tokens']
      }],
      order: [['created_at', 'DESC']]
    });

    // stats
    const summary = {
      total: orders.length,
      executed: orders.filter(o => o.status === 'FILLED').length,
      failed: orders.filter(o => o.status === 'FAILED').length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length
    };

    res.json({
      success: true,
      message: 'Órdenes de usuario obtenidas exitosamente',
      data: {
        orders: orders,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Error al obtener órdenes de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

//POST 
router.post('/', validateOrder, orderController.createOrder);

// PUT /api/orders/:id/cancel for SEQUELIZE
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { userAddress } = req.body;

    const order = await Order.findByPk(id, {
      include: [{ model: Strategy, as: 'strategy' }]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    // Verificar propietario usando la estrategia asociada
    if (order.strategy && order.strategy.userAddress && 
        order.strategy.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para cancelar esta orden'
      });
    }

    //  Actualizar estado usando Sequelize
    await order.update({
      status: 'CANCELLED'
    });

    res.json({
      success: true,
      message: 'Orden cancelada exitosamente',
      data: order
    });
  } catch (error) {
    console.error('Error al cancelar orden:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar orden',
      error: error.message
    });
  }
});


module.exports = router;