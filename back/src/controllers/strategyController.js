const { Strategy, Order } = require('../models');
const executionService = require('../services/executionService');

const createStrategy = async (req, res) => {
  try {
    console.log('Datos recibidos para crear estrategia:', req.body); // Debug log
    
    // Maping data
    const strategyData = {
      userAddress: req.body.user_id || req.body.userAddress, // Support both
      name: req.body.name,
      type: req.body.strategy_type || req.body.type, // Support both
      conditions: req.body.conditions,
      actions: req.body.actions,
      config: req.body.config || {},
      status: 'active'
    };

    console.log('Datos mapeados para crear estrategia:', strategyData); // Debug log

  
    const strategy = await Strategy.create(strategyData);
    
    // Agregar al motor de ejecución
    try {
      executionService.addStrategy(strategy);
    } catch (serviceError) {
      console.warn('Error adding strategy to execution service:', serviceError);
    }

    return res.status(201).json({
      success: true,
      message: 'Strategy created successfully!',
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
    console.error('Error creating strategy:', error);
    

    const statusCode = error.name === 'SequelizeValidationError' ? 400 : 500;
    const errorMessage = error.name === 'SequelizeValidationError' 
      ? 'invalid strategy Data'
      : 'internal Error';

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
    const whereClause = {};
    const addressToFilter = walletAddress || userAddress;
    
    if (addressToFilter) {
      whereClause.userAddress = addressToFilter.toLowerCase();
    }
    const strategies = await Strategy.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Order,
          as: 'orders', 
          required: false
        }
      ]
    });

    console.log(`Found Strategies: ${strategies.length}`); // Debug log

    res.json({
      success: true,
      message: 'Success getting all strategies!',
      data: strategies || []
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'internal Error',
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
        message: 'strategy not found',
        data: null
      });
    }

    res.json({
      success: true,
      message: 'Success getting strategy!',
      data: strategy
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'internal Error',
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
        message: 'strategy not found',
        data: null
      });
    }

    await strategy.update(updates);
    if (strategy.status === 'active') {
      try {
        executionService.updateStrategy(strategy);
      } catch (serviceError) {
        console.warn('Error updating strategy in execution service:', serviceError);
      }
    }

    res.json({
      success: true,
      message: 'Success updating strategy!',
      data: strategy
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal error',
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
        message: 'strategy not found'
      });
    }

    if (userAddress && strategy.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para eliminar esta estrategia'
      });
    }

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
      message: 'strategy deleted!'
    });
  } catch (error) {
    console.error('Error deleting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Error',
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
        message: 'strategy not found'
      });
    }

    if (strategy.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: ' not active strategy'
      });
    }

    try {
      const result = await executionService.executeStrategy(strategy);
      
      res.json({
        success: true,
        message: 'Success',
        data: result
      });
    } catch (executionError) {
      console.error('Error:', executionError);
      res.status(500).json({
        success: false,
        message: 'Error',
        error: executionError.message
      });
    }
  } catch (error) {
    console.error('Error en executeStrategy:', error);
    res.status(500).json({
      success: false,
      message: 'internal error',
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
        message: 'strategy not found',
        data: []
      });
    }

    const whereClause = { strategy_id: id };
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const orders = await Order.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    // Stats
    const stats = {
      total: orders.length,
      executed: orders.filter(o => o.status === 'FILLED').length,
      failed: orders.filter(o => o.status === 'FAILED').length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length
    };

    res.json({
      success: true,
      message: 'Strategy orders',
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
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'internal error',
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