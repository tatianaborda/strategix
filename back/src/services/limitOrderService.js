
const { LimitOrderBuilder } = require('@1inch/limit-order-protocol-utils');
const abi = require('../abis/LimitOrderProtocol');
const { ethers } = require('ethers');
const { getProvider, getWallet } = require('../utils/eth'); // toDO access to signer
const { Order } = require('../models'); // Sequelize model
const evaluateConditions = require('./conditionEvaluator'); 

const LIMIT_ORDER_PROTOCOL_ADDRESS = '0x1111111254EEB25477B68fb85Ed929f73A960582'; // v3 en Ethereum
const CHAIN_ID = 1;

const builder = new LimitOrderBuilder(
  LIMIT_ORDER_PROTOCOL_ADDRESS,
  CHAIN_ID
);

const contract = new ethers.Contract(
  LIMIT_ORDER_PROTOCOL_ADDRESS,
  abi.abi, // el ABI generado por Hardhat está bajo la propiedad "abi"
  getWallet() // o getProvider().getSigner() 
);

/**
 * Construye y firma una orden de venta
 */
async function createLimitOrder(strategy) {
  const wallet = getWallet();

  // Validar condiciones antes de crear la orden
  const shouldExecute = await evaluateConditions(strategy.conditions);

  if (!shouldExecute) {
    console.log(`Condiciones no cumplidas para estrategia ${strategy.id}`);
    return null;
  }

  const { makerToken, takerToken, makerAmount, takerAmount } = strategy.actions;

  const order = builder.buildLimitOrder({
    makerAsset: makerToken,
    takerAsset: takerToken,
    maker: wallet.address,
    receiver: wallet.address,
    makingAmount: makerAmount,
    takingAmount: takerAmount,
    salt: Date.now().toString(),
  });

  const typedData = builder.buildLimitOrderTypedData(order);
  const signature = await wallet._signTypedData(
    typedData.domain,
    typedData.types,
    typedData.message
  );

  // Guardar en la base de datos
  await Order.create({
    strategyId: strategy.id,
    order_data: JSON.stringify(order),
    order_hash: builder.buildLimitOrderHash(order),
    status: 'pending',
    execution_price: strategy.execution_price || null,
  });

  return { order, signature };
}

/**
 * Ejecuta una orden onchain usando el contrato de 1inch
 */
async function executeOrderOnChain(order, signature) {
  try {
    const tx = await contract.fillOrder(
      order,
      signature,
      order.makingAmount,
      0 // takingAmount
    );

    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.transactionHash,
    };
  } catch (err) {
    console.error('Error al ejecutar orden onchain:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}
module.exports = {
  createLimitOrder,
  executeOrderOnChain,
};
