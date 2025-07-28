const cron = require('node-cron');
const oneInchService = require('./oneInchService');
const priceService = require('./priceService');
const Strategy = require('../models/Strategy');
const Order = require('../models/Order');
const { ethers } = require('ethers');

class ExecutionService {
  constructor() {
    this.activeStrategies = new Map();
    this.isRunning = false;
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  }

  // Iniciar el motor de ejecución
  start() {
    if (this.isRunning) return;
    
    console.log('🚀 Strategy Execution Engine Started');
    this.isRunning = true;
    
    // Ejecutar cada 30 segundos
    cron.schedule('*/30 * * * * *', () => {
      this.executeStrategies();
    });

    // Cargar estrategias activas al inicio
    this.loadActiveStrategies();
  }

  // Cargar estrategias activas de la DB
  async loadActiveStrategies() {
    try {
      const activeStrategies = await Strategy.find({ 
        status: 'active',
        isExecuting: false 
      });

      activeStrategies.forEach(strategy => {
        this.activeStrategies.set(strategy._id.toString(), strategy);
      });

      console.log(`📊 Loaded ${activeStrategies.length} active strategies`);
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  }

  // Ejecutar todas las estrategias activas
  async executeStrategies() {
    for (const [strategyId, strategy] of this.activeStrategies) {
      try {
        await this.processStrategy(strategy);
      } catch (error) {
        console.error(`Error processing strategy ${strategyId}:`, error);
      }
    }
  }

  // Procesar una estrategia individual
  async processStrategy(strategy) {
    const { type, conditions, tokens, amounts, userAddress } = strategy;

    // Marcar como en ejecución para evitar duplicados
    await Strategy.findByIdAndUpdate(strategy._id, { isExecuting: true });

    try {
      switch (type) {
        case 'LIMIT_ORDER':
          await this.processLimitOrder(strategy);
          break;
        
        case 'TWAP':
          await this.processTWAP(strategy);
          break;
        
        case 'DCA':
          await this.processDCA(strategy);
          break;
        
        case 'GRID':
          await this.processGrid(strategy);
          break;
        
        case 'OPTIONS':
          await this.processOptions(strategy);
          break;
        
        default:
          console.log(`Unknown strategy type: ${type}`);
      }
    } finally {
      // Liberar el lock
      await Strategy.findByIdAndUpdate(strategy._id, { isExecuting: false });
    }
  }

  // Procesar Limit Order básica
  async processLimitOrder(strategy) {
    const { conditions, tokens, amounts } = strategy;
    const currentPrice = await priceService.getPrice(tokens.from, tokens.to);

    // Verificar si se cumple la condición de precio
    if (this.checkPriceCondition(currentPrice, conditions.targetPrice, conditions.operator)) {
      await this.executeLimitOrder(strategy, currentPrice);
    }
  }

  // Procesar estrategia TWAP
  async processTWAP(strategy) {
    const { conditions, tokens, amounts, timeframe } = strategy;
    const now = Date.now();
    
    // Verificar si es momento de ejecutar el siguiente intervalo
    const elapsed = now - strategy.createdAt.getTime();
    const intervalTime = timeframe / conditions.intervals;
    const currentInterval = Math.floor(elapsed / intervalTime);
    
    if (currentInterval > strategy.executedIntervals) {
      const twapData = await oneInchService.getTWAPData(tokens.from);
      
      if (this.shouldExecuteTWAPInterval(twapData, conditions)) {
        await this.executeTWAPInterval(strategy, currentInterval);
      }
    }
  }

  // Procesar estrategia DCA (Dollar Cost Averaging)
  async processDCA(strategy) {
    const { conditions, tokens, amounts } = strategy;
    const now = Date.now();
    const lastExecution = strategy.lastExecuted || strategy.createdAt;
    
    // Verificar si ha pasado el intervalo de DCA
    if (now - lastExecution.getTime() >= conditions.interval) {
      const currentPrice = await priceService.getPrice(tokens.from, tokens.to);
      
      // DCA siempre ejecuta independientemente del precio
      await this.executeDCAOrder(strategy, currentPrice);
    }
  }

  // Procesar estrategia Grid Trading
  async processGrid(strategy) {
    const { conditions, tokens, amounts } = strategy;
    const currentPrice = await priceService.getPrice(tokens.from, tokens.to);
    
    const { gridLevels, spacing } = conditions;
    
    // Verificar qué niveles del grid se deben ejecutar
    for (const level of gridLevels) {
      if (this.shouldExecuteGridLevel(currentPrice, level)) {
        await this.executeGridOrder(strategy, level, currentPrice);
      }
    }
  }

  // Ejecutar Limit Order
  async executeLimitOrder(strategy, currentPrice) {
    try {
      console.log(`Executing Limit Order for strategy ${strategy._id}`);
      
      const orderParams = {
        makerAsset: strategy.tokens.from,
        takerAsset: strategy.tokens.to,
        makingAmount: strategy.amounts.input,
        takingAmount: strategy.amounts.output,
        maker: strategy.userAddress,
        predicate: oneInchService.createStrategyPredicate(strategy.conditions)
      };

      const limitOrder = await oneInchService.createLimitOrder(orderParams);
      
      // Guardar orden en DB
      await this.saveOrder(strategy._id, limitOrder, 'EXECUTED', currentPrice);
      
      // Marcar estrategia como completada si es de una sola ejecución
      if (strategy.type === 'LIMIT_ORDER') {
        await Strategy.findByIdAndUpdate(strategy._id, { 
          status: 'completed',
          completedAt: new Date()
        });
        this.activeStrategies.delete(strategy._id.toString());
      }

      console.log(`Limit Order executed successfully`);
    } catch (error) {
      console.error('Error executing limit order:', error);
      await this.saveOrder(strategy._id, null, 'FAILED', currentPrice, error.message);
    }
  }

  // Ejecutar intervalo TWAP
  async executeTWAPInterval(strategy, intervalIndex) {
    try {
      console.log(`Executing TWAP interval ${intervalIndex} for strategy ${strategy._id}`);
      
      const intervalAmount = strategy.amounts.input / strategy.conditions.intervals;
      const currentPrice = await priceService.getPrice(strategy.tokens.from, strategy.tokens.to);
      
      const orderParams = {
        makerAsset: strategy.tokens.from,
        takerAsset: strategy.tokens.to,
        makingAmount: intervalAmount.toString(),
        takingAmount: (intervalAmount * currentPrice * 0.995).toString(), // 0.5% slippage
        maker: strategy.userAddress
      };

      const limitOrder = await oneInchService.createLimitOrder(orderParams);
      
      // Actualizar estrategia
      await Strategy.findByIdAndUpdate(strategy._id, {
        executedIntervals: intervalIndex + 1,
        lastExecuted: new Date()
      });
      
      await this.saveOrder(strategy._id, limitOrder, 'EXECUTED', currentPrice);
      
      console.log(`TWAP interval ${intervalIndex} executed`);
    } catch (error) {
      console.error('Error executing TWAP interval:', error);
    }
  }

  // Verificar condición de precio
  checkPriceCondition(currentPrice, targetPrice, operator) {
    switch (operator) {
      case '>':
        return currentPrice > targetPrice;
      case '<':
        return currentPrice < targetPrice;
      case '>=':
        return currentPrice >= targetPrice;
      case '<=':
        return currentPrice <= targetPrice;
      case '=':
        return Math.abs(currentPrice - targetPrice) < (targetPrice * 0.001); // 0.1% tolerance
      default:
        return false;
    }
  }

  // Guardar orden en DB
  async saveOrder(strategyId, orderData, status, executionPrice, errorMessage = null) {
    try {
      const order = new Order({
        strategyId,
        orderData,
        status,
        executionPrice,
        errorMessage,
        timestamp: new Date()
      });
      
      await order.save();
      return order;
    } catch (error) {
      console.error('Error saving order:', error);
    }
  }

  // Agregar nueva estrategia al motor
  addStrategy(strategy) {
    this.activeStrategies.set(strategy._id.toString(), strategy);
    console.log(`Added strategy ${strategy._id} to execution engine`);
  }

  // Remover estrategia del motor
  removeStrategy(strategyId) {
    this.activeStrategies.delete(strategyId.toString());
    console.log(`Removed strategy ${strategyId} from execution engine`);
  }

  // Detener el motor
  stop() {
    this.isRunning = false;
    this.activeStrategies.clear();
    console.log('Strategy Execution Engine Stopped');
  }

  // Obtener estadísticas
  getStats() {
    return {
      activeStrategies: this.activeStrategies.size,
      isRunning: this.isRunning,
      strategies: Array.from(this.activeStrategies.keys())
    };
  }
}

module.exports = new ExecutionService();