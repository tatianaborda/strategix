const express = require('express');
const router = express.Router();

// GET /api/users/profile - Obtener perfil del usuario
router.get('/profile', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: {
        id: 1,
        walletAddress: '0x1234567890123456789012345678901234567890',
        strategies: 0,
        totalOrders: 0,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/users/connect - Conectar wallet
router.post('/connect', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address requerida'
      });
    }

    res.json({
      success: true,
      message: 'Wallet conectada exitosamente',
      data: {
        walletAddress,
        connected: true,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error al conectar wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/users/disconnect - Desconectar wallet
router.post('/disconnect', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Wallet desconectada exitosamente'
    });
  } catch (error) {
    console.error('Error al desconectar wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;