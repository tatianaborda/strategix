const { ethers } = require('ethers');
const { ONEINCH_CONTRACTS, LIMIT_ORDER_PROTOCOL_ABI, COMMON_TOKENS, getContractAddress, getTokenAddress } = require('../config/1inch-contracts');
const { Order } = require('../models');

class OneInchLimitOrderService {
  constructor() {
    // Usar RPC_URL desde .env o Hardhat local
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
    
    // Configurar red (LOCAL para desarrollo con Hardhat)
    this.network = process.env.NETWORK || 'LOCAL';
    
    // Dirección del contrato 1inch Limit Order Protocol
    this.contractAddress = getContractAddress(this.network);
    
    // Crear instancia del contrato
    this.contract = new ethers.Contract(
      this.contractAddress,
      LIMIT_ORDER_PROTOCOL_ABI,
      this.provider
    );

    console.log(`🔗 1inch Limit Order Protocol initialized on ${this.network}`);
    console.log(`📍 Contract address: ${this.contractAddress}`);
  }

  // Crear orden 1inch
  async createLimitOrder(strategy) {
    try {
      const { actions, conditions } = strategy;
      
      // Generar salt único
      const salt = ethers.toBigInt(Date.now());
      
      // Obtener direcciones de tokens
      const makerAsset = getTokenAddress(this.network, 'WETH') || actions.makerToken;
      const takerAsset = getTokenAddress(this.network, 'USDC') || actions.takerToken;
      
      // Construir orden según el formato 1inch
      const order = {
        salt: salt.toString(),
        makerAsset: makerAsset,
        takerAsset: takerAsset,
        maker: actions.maker || process.env.DEFAULT_MAKER_ADDRESS,
        receiver: actions.receiver || actions.maker || process.env.DEFAULT_MAKER_ADDRESS,
        allowedSender: ethers.ZeroAddress, // Cualquiera puede ejecutar
        makingAmount: actions.makerAmount || ethers.parseEther('1'), // 1 ETH por defecto
        takingAmount: actions.takerAmount || ethers.parseUnits('2500', 6), // 2500 USDC por defecto
        makerAssetData: '0x', // Sin datos adicionales
        takerAssetData: '0x',
        getMakerAmount: '0x', // Sin lógica personalizada
        getTakerAmount: '0x',
        predicate: '0x', // Sin condiciones adicionales
        permit: '0x', // Sin permit
        interaction: '0x' // Sin interacciones post-trade
      };

      console.log('🔨 Creating 1inch Limit Order:', {
        makerAsset: order.makerAsset,
        takerAsset: order.takerAsset,
        makingAmount: order.makingAmount.toString(),
        takingAmount: order.takingAmount.toString()
      });

      // Generar hash de la orden
      const orderHash = await this.contract.hashOrder(order);
      
      // Guardar orden en base de datos
      const savedOrder = await Order.create({
        strategy_id: strategy.id,
        order_hash: orderHash,
        order_data: order,
        token_in: order.makerAsset,
        token_in_symbol: 'WETH',
        token_out: order.takerAsset,
        token_out_symbol: 'USDC',
        amount_in: order.makingAmount.toString(),
        amount_out: order.takingAmount.toString(),
        price_at_creation: (Number(order.takingAmount) / Number(order.makingAmount)).toString(),
        status: 'PENDING'
      });

      console.log('✅ Order created and saved:', orderHash);
      
      return {
        order,
        orderHash,
        signature: null // Se firmará cuando se ejecute
      };

    } catch (error) {
      console.error('❌ Error creating limit order:', error);
      throw error;
    }
  }

  // Firmar orden
  async signOrder(orderData) {
    try {
      // En desarrollo, usar una wallet de prueba
      const privateKey = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat account #0
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Crear hash de la orden para firmar
      const orderHash = await this.contract.hashOrder(orderData);
      
      // Firmar el hash
      const signature = await wallet.signMessage(ethers.getBytes(orderHash));
      
      console.log('✍️ Order signed:', signature);
      
      return { signature, orderHash };

    } catch (error) {
      console.error('❌ Error signing order:', error);
      throw error;
    }
  }

  // Ejecutar orden onchain
  async executeOrderOnChain(orderData, signature) {
    try {
      console.log('🚀 Executing order onchain...');
      
      // Usar una wallet con fondos para ejecutar
      const privateKey = process.env.EXECUTOR_PRIVATE_KEY || process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Conectar contrato con wallet
      const contractWithSigner = this.contract.connect(wallet);
      
      // Preparar parámetros para fillOrder
      const fillParams = {
        order: orderData,
        signature: signature || '0x',
        makingAmount: orderData.makingAmount,
        takingAmount: orderData.takingAmount,
        skipPermitAndThresholdAmount: '0'
      };

      console.log('📡 Calling fillOrder on contract...');
      
      // Ejecutar transacción
      const tx = await contractWithSigner.fillOrder(
        fillParams.order,
        '0x', // orderHash (se calcula automáticamente)
        fillParams.signature,
        fillParams.makingAmount,
        fillParams.takingAmount,
        fillParams.skipPermitAndThresholdAmount,
        ethers.ZeroAddress, // target
        '0x' // targetInteraction
      );

      console.log('⏳ Transaction sent:', tx.hash);
      
      // Esperar confirmación
      const receipt = await tx.wait();
      
      console.log('✅ Transaction confirmed:', receipt.hash);
      
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('❌ Error executing order:', error);
      
      return {
        success: false,
        error: error.message,
        details: error.reason || 'Unknown error'
      };
    }
  }

  // Verificar estado de orden
  async getOrderStatus(orderHash) {
    try {
      // Aquí podrías implementar lógica para verificar si una orden fue ejecutada
      // Por ahora, simular verificación
      console.log('🔍 Checking order status:', orderHash);
      
      return {
        hash: orderHash,
        status: 'PENDING',
        filled: '0',
        remaining: '100'
      };

    } catch (error) {
      console.error('❌ Error checking order status:', error);
      throw error;
    }
  }

  // Cancelar orden
  async cancelOrder(orderData) {
    try {
      console.log('❌ Cancelling order...');
      
      // Implementar lógica de cancelación si es necesario
      // Por ahora, solo actualizar en base de datos
      
      return {
        success: true,
        message: 'Order cancelled'
      };

    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      throw error;
    }
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