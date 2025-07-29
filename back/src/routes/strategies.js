const express = require('express');
const router = express.Router();
const { Strategy } = require('../models');
const validateStrategy = require('../middleware/validators/strategyValidator');

// GET /api/strategies - Obtener todas las estrategias
router.get('/', async (req, res) => {
  try {
    const strategies = await Strategy.findAll();
    res.json({
      success: true,
      message: 'Estrategias obtenidas exitosamente',
      data: strategies
    });
  } catch (error) {
    console.error('Error al obtener estrategias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/strategies - Crear nueva estrategia
router.post('/', validateStrategy, async (req, res) => {
  try {
    const newStrategy = await Strategy.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Estrategia creada exitosamente',
      data: newStrategy
    });
  } catch (error) {
    console.error('Error al crear estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/strategies/:id - Obtener estrategia específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const strategy = await Strategy.findByPk(id);

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada'
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
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/strategies/:id - Actualizar estrategia
router.put('/:id', validateStrategy, async (req, res) => {
  try {
    const { id } = req.params;
    const strategy = await Strategy.findByPk(id);
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada'
      });
    }
    await strategy.update(req.body);
    res.json({
      success: true,
      message: 'Estrategia actualizada exitosamente',
      data: strategy
    });
  } catch (error) {
    console.error('Error al actualizar estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


// DELETE /api/strategies/:id - Eliminar estrategia
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const strategy = await Strategy.findByPk(id);

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Estrategia no encontrada'
      });
    }

    await strategy.destroy();

    res.json({
      success: true,
      message: 'Estrategia eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar estrategia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
