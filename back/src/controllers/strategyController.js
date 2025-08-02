const { Strategy, Order } = require('../models');
const executionService = require('../services/executionService');
const { createLimitOrder } = require('../services/limitOrderService');

const createStrategy = async (req, res) => {
  try {
    console.log('Datos recibidos para crear estrategia:', req.body); // Debug log
    
    // Mapear datos validados del validator al modelo
    const strategyData = {
      userAddress: req.body.user_id || req.body.userAddress, // Soportar ambos nombres
      name: req.body.name,
      type: req.body.strategy_type || req.body.type, // Soportar ambos nombres
      conditions: req.body.conditions,
      actions: req.body.actions,
      config: req.body.config || {},
      status: 'active'
    };

    console.log('Datos mapeados para crear estrategia:', strategyData); // Debug log

    // Crear estrategia en la base de datos
    const strategy = await Strategy.create(strategyData);
    
    // Agregar al motor de ejecución
    try {
      executionService.addStrategy(strategy);
    } catch (serviceError) {
      console.warn('Error adding strategy to execution service:', serviceError);
      // No fallar la creación si el servicio de ejecución falla
    }

    return res.status(201).json({
      success: true,
      message: 'Estrategia creada correctamente',
      data: {
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        status: strategy.status,
        userAddress: strategy.userAddress,
        conditions: strategy.conditions,
        actions: strategy.actions,
        config: strategy.config,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creando estrategia:', error);
    
    // Manejar diferentes tipos de errores
    const statusCode = error.name === 'SequelizeValidationError' ? 400 : 500;
    const errorMessage = error.name === 'SequelizeValidationError' 
      ? 'Datos de estrategia inválidos'
      : 'Error interno al crear la estrategia';

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: [],
      details: error.errors?.map(e => e.message) || error.message
    });
  }
};

const getAllStrategies = async (req, res) => {
  try {
    const { walletAddress, userAddress } = req.query;
    
    console.log('Request para obtener estrategias:', { walletAddress, userAddress }); // Debug log
    
    // Construir filtro
    const whereClause = {};
    const addressToFilter = walletAddress || userAddress;
    
    if (addressToFilter) {
      whereClause.userAddress = addressToFilter.toLowerCase();
    }

    console.log('Filtro aplicado:', whereClause); // Debug log

    const strategies = await Strategy.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Order,
          as: 'orders', // Asegúrate de que esta asociación esté definida en tu modelo
          required: false
        }
      ]
    });

    console.log(`Estrategias encontradas: ${strategies.length}`); // Debug log

    // Estructura de respuesta consistente
    res.json({
      success: true,
      message: 'Estrategias obtenidas exitosamente',
      data: strategies || []
    });
  } catch (error) {
    console.error('Error al obtener estrategias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      data: []
    });
  }
};

const getStrategyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const strategy = await Strategy.findByPk(id, {
      include: [
        {
          model: Order,
          as: 'orders',
          required: false
        }
      ]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada',
        data: null
      });
    }

    res.json({
      success: true,
      message: 'Estrategia obtenida exitosamente',
      data: strategy
    });
  } catch (error) {
    console.error('Error al obtener estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      data: null
    });
  }
};

const updateStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const strategy = await Strategy.findByPk(id);

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada',
        data: null
      });
    }

    // Actualizar estrategia
    await strategy.update(updates);

    // Actualizar en el servicio de ejecución si está activa
    if (strategy.status === 'active') {
      try {
        executionService.updateStrategy(strategy);
      } catch (serviceError) {
        console.warn('Error updating strategy in execution service:', serviceError);
      }
    }

    res.json({
      success: true,
      message: 'Estrategia actualizada exitosamente',
      data: strategy
    });
  } catch (error) {
    console.error('Error al actualizar estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      data: null
    });
  }
};

const deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const { userAddress } = req.body;

    const strategy = await Strategy.findByPk(id);

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada'
      });
    }

    // Verificar propietario
    if (userAddress && strategy.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para eliminar esta estrategia'
      });
    }

    // Remover del servicio de ejecución
    try {
      executionService.removeStrategy(id);
    } catch (serviceError) {
      console.warn('Error removing strategy from execution service:', serviceError);
    }

    // Cancelar órdenes relacionadas
    await Order.update(
      { status: 'CANCELLED' },
      { where: { strategy_id: id, status: 'PENDING' } }
    );

    // Eliminar estrategia
    await strategy.destroy();

    res.json({
      success: true,
      message: 'Estrategia eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

const executeStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    
    const strategy = await Strategy.findByPk(id);

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada'
      });
    }

    if (strategy.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'La estrategia no está activa'
      });
    }

    // Ejecutar estrategia manualmente
    try {
      const result = await executionService.executeStrategy(strategy);
      
      res.json({
        success: true,
        message: 'Estrategia ejecutada exitosamente',
        data: result
      });
    } catch (executionError) {
      console.error('Error ejecutando estrategia:', executionError);
      res.status(500).json({
        success: false,
        message: 'Error al ejecutar estrategia',
        error: executionError.message
      });
    }
  } catch (error) {
    console.error('Error en executeStrategy:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

const getStrategyOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    // Verificar que la estrategia existe
    const strategy = await Strategy.findByPk(id);
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada',
        data: []
      });
    }

    // Construir filtro para órdenes
    const whereClause = { strategy_id: id };
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const orders = await Order.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    // Estadísticas de órdenes
    const stats = {
      total: orders.length,
      executed: orders.filter(o => o.status === 'FILLED').length,
      failed: orders.filter(o => o.status === 'FAILED').length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length
    };

    res.json({
      success: true,
      message: 'Órdenes de estrategia obtenidas exitosamente',
      data: {
        orders,
        stats,
        strategy: {
          id: strategy.id,
          name: strategy.name,
          type: strategy.type,
          status: strategy.status
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener órdenes de estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      data: []
    });
  }
};

module.exports = {
  createStrategy,
  getAllStrategies,
  getStrategyById,
  updateStrategy,
  deleteStrategy,
  executeStrategy,
  getStrategyOrders
};