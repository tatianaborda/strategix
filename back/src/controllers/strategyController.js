const { Strategy, Order } = require('../models');
const executionService = require('../services/executionService');
const { createLimitOrder } = require('../services/limitOrderService');

const createStrategy = async (req, res) => {
  try {
    // Mapear datos validados del validator al modelo
    const strategyData = {
      userAddress: req.body.user_id,
      name: req.body.name,
      type: req.body.strategy_type,
      conditions: req.body.conditions,
      actions: req.body.actions,
      config: req.body.config || {},
      status: 'active'
    };

    // Crear estrategia en la base de datos
    const strategy = await Strategy.create(strategyData);
    
    // Agregar al motor de ejecución
    executionService.addStrategy(strategy);

    return res.status(201).json({
      success: true,
      message: 'Estrategia creada correctamente',
      strategy: {
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        status: strategy.status,
        createdAt: strategy.createdAt
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
      details: error.errors?.map(e => e.message) || error.message
    });
  }
};

// Exportar todos los métodos del controlador
module.exports = {
  createStrategy,
  // Agregar otros métodos que uses en tus rutas
  getAllStrategies: async (req, res) => {
    try {
      const strategies = await Strategy.findAll();
      res.json({ success: true, strategies });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  executeStrategy: async (req, res) => {
    // Implementación para ejecutar estrategia
  },
  getStrategyOrders: async (req, res) => {
    // Implementación para obtener órdenes
  },
  deleteStrategy: async (req, res) => {
    // Implementación para eliminar estrategia
  }
};