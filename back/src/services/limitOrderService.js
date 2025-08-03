const { ethers } = require('ethers');
const { Order } = require('../models');

const CORRECT_ADDRESSES = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  LIMIT_ORDER_PROTOCOL: '0x1111111254eeb25477b68fb85ed929f73a960582'
};

function normalizeAddress(address) {
  try {
    return ethers.getAddress(address);
  } catch (error) {
    throw new Error(`Invalid address format: ${address}`);
  }
}

class OneInchLimitOrderService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
    this.network = process.env.NETWORK || 'LOCAL';
    this.contractAddress = CORRECT_ADDRESSES.LIMIT_ORDER_PROTOCOL;
    
    const SIMPLE_ABI = [
      "function hashOrder(tuple(uint256 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, bytes makerAssetData, bytes takerAssetData, bytes getMakerAmount, bytes getTakerAmount, bytes predicate, bytes permit, bytes interaction) order) view returns (bytes32)"
    ];
    
    this.contract = new ethers.Contract(this.contractAddress, SIMPLE_ABI, this.provider);
  }

  async createLimitOrder(strategy) {
    try {
      const { actions } = strategy;
      
      const makerAsset = normalizeAddress(CORRECT_ADDRESSES.WETH);
      const takerAsset = normalizeAddress(CORRECT_ADDRESSES.USDC);
      
      const makingAmount = actions?.makerAmount || '1000000000000000000';
      const takingAmount = actions?.takerAmount || '2500000000';
      
      const defaultMaker = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const maker = normalizeAddress(actions?.maker || defaultMaker);
      
      const salt = ethers.toBigInt(Date.now());
      
      const order = {
        salt: salt.toString(),
        makerAsset,
        takerAsset,
        maker,
        receiver: maker,
        allowedSender: ethers.ZeroAddress,
        makingAmount: makingAmount.toString(),
        takingAmount: takingAmount.toString(),
        makerAssetData: '0x',
        takerAssetData: '0x',
        getMakerAmount: '0x',
        getTakerAmount: '0x',
        predicate: '0x',
        permit: '0x',
        interaction: '0x'
      };

      console.log(`📝 Order created for strategy ${strategy.id}`);
      
      const orderHash = 'hash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const savedOrder = await Order.create({
        strategy_id: strategy.id || 1,
        order_hash: orderHash,
        order_data: order,
        token_in: order.makerAsset,
        token_in_symbol: 'WETH',
        token_out: order.takerAsset,
        token_out_symbol: 'USDC',
        amount_in: Math.floor(parseInt(order.makingAmount) / 1e12).toString(),
        amount_out: order.takingAmount,
        price_at_creation: (Number(order.takingAmount) / Number(order.makingAmount) * 1e18).toString(),
        status: 'PENDING'
      });
      
      return {
        order,
        orderHash,
        signature: null
      };

    } catch (error) {
      console.error(`❌ Error creating order for strategy ${strategy.id}:`, error.message);
      throw error;
    }
  }

  async signOrder(orderData) {
    try {
      const privateKey = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      const message = `Order: ${orderData.salt}`;
      const signature = await wallet.signMessage(message);
      
      console.log(`✍️ Order signed`);
      
      return { signature, orderHash: 'signed_' + Date.now() };

    } catch (error) {
      console.error('❌ Error signing order:', error.message);
      throw error;
    }
  }

async executeOrderOnChain(orderData, signature) {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, this.provider);

    // ABI
    const LIMIT_ORDER_ABI = [
      "function fillOrder(tuple(uint256 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, bytes makerAssetData, bytes takerAssetData, bytes getMakerAmount, bytes getTakerAmount, bytes predicate, bytes permit, bytes interaction) order, bytes signature, uint256 makingAmount, uint256 takingAmount, uint256 thresholdAmount, bytes interaction) returns (uint256, uint256)"
    ];

    const contract = new ethers.Contract(
      this.contractAddress,
      LIMIT_ORDER_ABI,
      wallet
    );

    // TODO Usar los mismos valores del order para el fill
    const makingAmount = orderData.makingAmount;
    const takingAmount = orderData.takingAmount;

    console.log('Ejecutando orden onchain con fillOrder...');
    
    const tx = await contract.fillOrder(
      orderData,
      signature,
      makingAmount,
      takingAmount,
      0,
      '0x'
    );

    return {
      success: true,
      txHash: tx.hash,
      message: 'Order executed onchain'
    };
  } catch (error) {
    console.error('❌ Error executing order onchain:', error);
    throw new Error(`Order execution failed: ${error.message}`);
  }
}

  async getOrderStatus(orderHash) {
    return {
      hash: orderHash,
      status: 'PENDING',
      filled: '0',
      remaining: '100'
    };
  }

  async cancelOrder(orderData) {
    return {
      success: true,
      message: 'Order cancelled'
    };
  }
}

const limitOrderService = new OneInchLimitOrderService();

module.exports = {
  createLimitOrder: (strategy) => limitOrderService.createLimitOrder(strategy),
  signOrder: (orderData) => limitOrderService.signOrder(orderData),
  executeOrderOnChain: (orderData, signature) => limitOrderService.executeOrderOnChain(orderData, signature),
  getOrderStatus: (orderHash) => limitOrderService.getOrderStatus(orderHash),
  cancelOrder: (orderData) => limitOrderService.cancelOrder(orderData)
};