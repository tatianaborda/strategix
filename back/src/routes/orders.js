
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Strategy = require('../models/Strategy');
const oneInchService = require('../services/oneInchService');

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

    // Calcular estadísticas de la estrategia
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

// GET /api/orders/user/:userAddress - Obtener órdenes de un usuario
router.get('/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { status, days = 30 } = req.query;

    // Filtrar por fecha (últimos X días)
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));

    const filter = { 
      userAddress: userAddress.toLowerCase(),
      timestamp: { $gte: dateFilter }
    };
    
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('strategyId', 'name type tokens')
      .sort({ timestamp: -1 });

    // También obtener órdenes activas de 1inch
    let oneInchOrders = [];
    try {
      oneInchOrders = await oneInchService.getUserOrders(userAddress);
    } catch (error) {
      console.warn('Could not fetch 1inch orders:', error.message);
    }

    res.json({
      success: true,
      message: 'Órdenes de usuario obtenidas exitosamente',
      data: {
        localOrders: orders,
        oneInchOrders: oneInchOrders,
        summary: {
          totalLocal: orders.length,
          totalOneInch: oneInchOrders.length,
          executed: orders.filter(o => o.status === 'EXECUTED').length,
          failed: orders.filter(o => o.status === 'FAILED').length
        }
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

// POST /api/orders/manual - Crear orden manual (bypass strategy)
router.post('/manual', async (req, res) => {
  try {
    const {
      userAddress,
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      conditions = {}
    } = req.body;

    // Validaciones básicas
    if (!userAddress || !makerAsset || !takerAsset || !makingAmount || !takingAmount) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    // Crear orden directamente con 1inch
    const orderParams = {
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      maker: userAddress,
      predicate: conditions.predicate || '0x'
    };

    const limitOrder = await oneInchService.createLimitOrder(orderParams);

    // Guardar en base de datos
    const order = new Order({
      strategyId: null, // Orden manual
      userAddress,
      orderData: limitOrder,
      status: 'CREATED',
      executionPrice: null,
      timestamp: new Date(),
      isManual: true
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: 'Orden manual creada exitosamente',
      data: {
        order,
        limitOrder,
        requiresSigning: true
      }
    });
  } catch (error) {
    console.error('Error al crear orden manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear orden manual',
      error: error.message
    });
  }
});

// PUT /api/orders/:id/cancel - Cancelar orden
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { signature, userAddress } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    // Verificar que el usuario sea el propietario
    if (order.userAddress && order.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para cancelar esta orden'
      });
    }

    // Cancelar en 1inch si tiene orderHash
    if (order.orderData && order.orderData.orderHash) {
      try {
        await oneInchService.cancelOrder(order.orderData.orderHash, signature);
      } catch (error) {
        console.warn('Error canceling on 1inch:', error.message);
      }
    }

    // Actualizar estado en base de datos
    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    await order.save();

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

// GET /api/orders/analytics/summary - Resumen analítico
router.get('/analytics/summary', async (req, res) => {
  try {
    const { userAddress, days = 30 } = req.query;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));

    const matchFilter = {
      timestamp: { $gte: dateFilter }
    };

    if (userAddress) {
      matchFilter.userAddress = userAddress.toLowerCase();
    }

    const analytics = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalVolume: { 
            $sum: { $ifNull: ['$executionPrice', 0] } 
          }
        }
      }
    ]);

    // Obtener órdenes por día para gráfico
    const dailyStats = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      message: 'Analytics obtenidas exitosamente',
      data: {
        summary: analytics,
        daily: dailyStats,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Error al obtener analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener analytics',
      error: error.message
    });
  }
});

module.exports = router;