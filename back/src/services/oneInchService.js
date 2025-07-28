const axios = require('axios');
const { ethers } = require('ethers');

class OneInchService {
  constructor() {
    this.baseURL = 'https://api.1inch.dev';
    this.apiKey = process.env.ONEINCH_API_KEY; // toDO!!!!
    this.chainId = 1; // Ethereum mainnet (cambiar según red)
    
    // 1inch Limit Order Protocol Contract Address
    this.limitOrderProtocolAddress = '0x119c71D3BbAC22029622cbaEc24854d3D32D2828';
    
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // 1. Obtener tokens disponibles
  async getTokens() {
    try {
      const response = await axios.get(
        `${this.baseURL}/swap/v5.2/${this.chainId}/tokens`,
        { headers: this.headers }
      );
      return response.data.tokens;
    } catch (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }
  }

  // 2. Crear Limit Order para estrategia
  async createLimitOrder(orderParams) {
    const {
      makerAsset,     // Token que se vende
      takerAsset,     // Token que se compra  
      makingAmount,   // Cantidad que se vende
      takingAmount,   // Cantidad mínima que se acepta
      maker,          // wallet address
      receiver,       // Quien recibe
      predicate,      // Condiciones personalizadas (acá las estrategias!)
      permit,         // Firma para permitir gasto
      interaction     // Hook personalizado pero aun no desarrollado
    } = orderParams;

    const limitOrder = {
      salt: Date.now().toString(), // Unique identifier
      maker,
      receiver: receiver || maker,
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      predicate: predicate || '0x', // Condiciones personalizadas
      permit: permit || '0x',
      interaction: interaction || '0x' // Lógica personalizada
    };

    return limitOrder;
  }

  // 3. Crear predicate personalizado para estrategias complejas
  createStrategyPredicate(conditions) {
   
    const { priceTarget, timeLimit, volumeCondition } = conditions;
    
    const encodedConditions = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256'],
      [priceTarget, timeLimit, volumeCondition]
    );
    
    return encodedConditions;
  }

  // 4. Firmar orden (se hace en frontend pero preparo la estructura)
  async prepareOrderForSigning(limitOrder) {
    try {
      const response = await axios.post(
        `${this.baseURL}/orderbook/v3.0/${this.chainId}/order`,
        limitOrder,
        { headers: this.headers }
      );
      
      return {
        orderHash: response.data.orderHash,
        signature: response.data.signature,
        order: limitOrder
      };
    } catch (error) {
      console.error('Error preparing order:', error);
      throw error;
    }
  }

  // 5. Obtener órdenes activas de un usuario
  async getUserOrders(makerAddress) {
    try {
      const response = await axios.get(
        `${this.baseURL}/orderbook/v3.0/${this.chainId}/orders`,
        {
          headers: this.headers,
          params: {
            maker: makerAddress,
            limit: 100,
            statuses: 'active'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }

  // 6. Cancelar orden
  async cancelOrder(orderHash, signature) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/orderbook/v3.0/${this.chainId}/order/${orderHash}`,
        {
          headers: this.headers,
          data: { signature }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  // 7. Monitor de precios para estrategias TWAP
  async getTWAPData(tokenAddress, intervals = 24) {
    try {
      // watch priceService
      const currentPrice = await this.getPriceFromPriceService(tokenAddress);
      
      // Calcular TWAP basado en intervalos
      const twapPrice = await this.calculateTWAP(tokenAddress, intervals);
      
      return {
        currentPrice,
        twapPrice,
        deviation: ((currentPrice - twapPrice) / twapPrice) * 100
      };
    } catch (error) {
      console.error('Error calculating TWAP:', error);
      throw error;
    }
  }

  // 8. Función helper para crear estrategias complejas
  async createAdvancedStrategy(strategyConfig) {
    const {
      type, // 'TWAP', 'DCA', 'GRID', 'OPTIONS'
      conditions,
      tokens,
      amounts,
      timeframe,
      userAddress
    } = strategyConfig;

    switch (type) {
      case 'TWAP':
        return await this.createTWAPStrategy(conditions, tokens, amounts, timeframe, userAddress);
      
      case 'DCA':
        return await this.createDCAStrategy(conditions, tokens, amounts, timeframe, userAddress);
      
      case 'GRID':
        return await this.createGridStrategy(conditions, tokens, amounts, userAddress);
      
      case 'OPTIONS':
        return await this.createOptionsStrategy(conditions, tokens, amounts, timeframe, userAddress);
      
      default:
        throw new Error('Unsupported strategy type');
    }
  }

  // Ejemplo: Estrategia TWAP
  async createTWAPStrategy(conditions, tokens, amounts, timeframe, userAddress) {
    const { targetPrice, maxSlippage, intervals } = conditions;
    
    // Dividir la orden en múltiples órdenes más pequeñas
    const orderSize = amounts.makingAmount / intervals;
    const orders = [];

    for (let i = 0; i < intervals; i++) {
      const delay = (timeframe / intervals) * i;
      
      const predicate = this.createStrategyPredicate({
        priceTarget: targetPrice,
        timeLimit: Date.now() + delay,
        maxSlippage: maxSlippage
      });

      const order = await this.createLimitOrder({
        makerAsset: tokens.from,
        takerAsset: tokens.to,
        makingAmount: orderSize.toString(),
        takingAmount: (orderSize * targetPrice * (1 - maxSlippage/100)).toString(),
        maker: userAddress,
        predicate
      });

      orders.push(order);
    }

    return orders;
  }
}

module.exports = new OneInchService();