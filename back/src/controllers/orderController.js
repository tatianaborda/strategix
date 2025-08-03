const { createLimitOrder, executeOrderOnChain } = require('../services/limitOrderService');
const { Order } = require('../models');

exports.createOrder = async (req, res) => {
  try {
    console.log('📦 Body received from frontend:', req.body);
    if (req.body.orderData) {
      return await handleFrontendFormat(req, res);
    } else {
      // For curl testing
      return await handleDirectFormat(req, res);
    }

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

async function handleFrontendFormat(req, res) {
  const {
    strategy_id,
    userAddress,
    orderData,
    orderHash,
    signature
  } = req.body;

  console.log('Frontend format detected');
  console.log('  strategy_id:', strategy_id);
  console.log('  userAddress:', userAddress);
  console.log('  orderData:', orderData);

  const makerAsset = orderData.makerAsset;
  const takerAsset = orderData.takerAsset;
  const makingAmount = orderData.makingAmount || orderData.amount || '1000000000000000000';
  const takingAmount = orderData.takingAmount || orderData.expectedAmount || '2500000000';

  console.log('🔧 Extracted data:');
  console.log('  makerAsset:', makerAsset);
  console.log('  takerAsset:', takerAsset);
  console.log('  makingAmount:', makingAmount);
  console.log('  takingAmount:', takingAmount);

  const tempStrategy = {
    id: strategy_id || 1,
    conditions: {},
    actions: {
      makerToken: makerAsset,
      takerToken: takerAsset,
      makerAmount: makingAmount,
      takerAmount: takingAmount,
      maker: userAddress
    }
  };

  const result = await createLimitOrder(tempStrategy);

  if (signature) {
    result.signature = signature;
  }

  // execute onchain
  const tx = await executeOrderOnChain(result.order, result.signature);
  console.log('🟢 Order onchain:', tx.hash);

  return res.status(201).json({
    success: true,
    message: '✅ Frontend order created and executed onchain!',
    data: {
      order: result.order,
      orderHash: result.orderHash,
      signature: result.signature,
      txHash: tx.hash,
      frontendData: {
        strategy_id,
        originalOrderHash: orderHash
      }
    }
  });
}

// for testing
async function handleDirectFormat(req, res) {
  const {
    userAddress,
    makerAsset,
    takerAsset,
    makingAmount,
    takingAmount,
    conditions = {}
  } = req.body;

  console.log('🧪 Direct format detected (testing)');

  const tempStrategy = {
    id: 1,
    conditions: conditions,
    actions: {
      makerToken: makerAsset,
      takerToken: takerAsset,
      makerAmount: makingAmount,
      takerAmount: takingAmount,
      maker: userAddress
    }
  };

  const result = await createLimitOrder(tempStrategy);
  const tx = await executeOrderOnChain(result.order, result.signature);
console.log('🟢 Order onchain:', tx.hash);

  return res.status(201).json({
    success: true,
    message: '✅ Direct order created successfully!',
    data: {
      order: result.order,
      orderHash: result.orderHash,
      signature: result.signature
    }
  });
}