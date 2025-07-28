const express = require('express');
const router = express.Router();
const priceService = require('../services/priceService');

// GET /api/prices - Obtener tokens soportados (DEBE IR PRIMERO)
router.get('/', async (req, res) => {
  try {
    const supportedTokens = priceService.getSupportedTokens();
    
    res.json({
      success: true,
      message: 'Tokens soportados obtenidos exitosamente',
      data: supportedTokens
    });
  } catch (error) {
    console.error('Error al obtener tokens soportados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tokens soportados'
    });
  }
});

// POST /api/prices/multiple - Obtener precios de múltiples tokens
router.post('/multiple', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de symbols'
      });
    }

    const prices = await priceService.getMultiplePrices(symbols);
    
    res.json({
      success: true,
      message: 'Precios obtenidos exitosamente',
      data: prices
    });
  } catch (error) {
    console.error('Error al obtener precios múltiples:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener precios de los tokens'
    });
  }
});

// POST /api/prices/check-condition - Verificar condición de precio
router.post('/check-condition', async (req, res) => {
  try {
    const { symbol, operator, value } = req.body;
    
    if (!symbol || !operator || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren symbol, operator y value'
      });
    }

    const currentPrice = await priceService.getCurrentPrice(symbol);
    const conditionMet = priceService.checkPriceCondition(currentPrice, { operator, value });
    
    res.json({
      success: true,
      message: 'Condición verificada exitosamente',
      data: {
        symbol: symbol.toUpperCase(),
        currentPrice,
        condition: { operator, value },
        conditionMet
      }
    });
  } catch (error) {
    console.error('Error al verificar condición:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al verificar condición de precio'
    });
  }
});

// GET /api/prices/:symbol/history - Obtener historial de precios (ANTES de /:symbol)
router.get('/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 7 } = req.query;
    
    const history = await priceService.getHistoricalPrice(symbol, parseInt(days));
    
    res.json({
      success: true,
      message: 'Historial de precios obtenido exitosamente',
      data: {
        symbol: symbol.toUpperCase(),
        days: parseInt(days),
        history
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de precios:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener historial de precios'
    });
  }
});

// GET /api/prices/:symbol - Obtener precio de un token específico (DEBE IR AL FINAL)
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`Obteniendo precio para: ${symbol}`);
    
    const price = await priceService.getCurrentPrice(symbol);
    
    res.json({
      success: true,
      message: 'Precio obtenido exitosamente',
      data: {
        symbol: symbol.toUpperCase(),
        price,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error al obtener precio:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener precio del token'
    });
  }
});

module.exports = router;