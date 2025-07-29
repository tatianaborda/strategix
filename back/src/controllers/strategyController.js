const { Strategy } = require('../models');

const createStrategy = async (req, res) => {
  try {
    // Crear estrategia con datos validados
    const strategy = await Strategy.create(req.body);
    
    return res.status(201).json({
      success: true,
      message: 'Estrategia creada correctamente',
      strategy
    });
  } catch (error) {
    console.error('Error creando estrategia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear la estrategia'
    });
  }
};

module.exports = {
  createStrategy
};
