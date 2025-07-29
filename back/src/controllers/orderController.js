const { createLimitOrder, executeOrderOnChain } = require('../services/limitOrderService');
const { Order } = require('../models');

exports.createManualOrder = async (req, res) => {
  try {
    const {
      userAddress,
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      conditions = {}
    } = req.body;

    // Crear estrategia temporal para orden manual
    const tempStrategy = {
      id: null,
      conditions: conditions,
      actions: {
        makerToken: makerAsset,
        takerToken: takerAsset,
        makerAmount: makingAmount,
        takerAmount: takingAmount
      }
    };

    const result = await createLimitOrder(tempStrategy);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo crear la orden (condiciones no cumplidas)'
      });
    }

    const { order, signature } = result;

    // Calcular precio aproximado
    const priceAtCreation = parseFloat(takingAmount) / parseFloat(makingAmount);

    // Guardar con estructura CORRECTA para Sequelize
    const savedOrder = await Order.create({
      strategy_id: null, // Orden manual
      order_hash: require('../services/limitOrderService').builder?.buildLimitOrderHash(order) || 'manual_' + Date.now(),
      order_data: order, // Sequelize maneja JSON automáticamente
      token_in: makerAsset,
      token_in_symbol: '', // TODO: obtener símbolo
      token_out: takerAsset,
      token_out_symbol: '', // TODO: obtener símbolo
      amount_in: makingAmount,
      amount_out: takingAmount,
      price_at_creation: priceAtCreation,
      status: 'PENDING',
      trigger_conditions: conditions
    });

    return res.status(201).json({
      success: true,
      message: 'Orden manual creada exitosamente',
      data: {
        order: savedOrder,
        limitOrder: order,
        signature: signature,
        requiresSigning: false // Ya está firmada
      }
    });
  } catch (error) {
    console.error('Error al crear orden manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al crear orden',
      error: error.message
    });
  }
};
