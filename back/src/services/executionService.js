const cron = require('node-cron');
const { createLimitOrder, executeOrderOnChain } = require('./limitOrderService');
const priceService = require('./priceService');
const { Strategy, Order } = require('../models'); 
const { ethers } = require('ethers');
const { Op } = require('sequelize');

class ExecutionService {
  constructor() {
    this.activeStrategies = new Map();
    this.isRunning = false;
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL); // Cambio para ethers v6
  }

  // Iniciar el motor de ejecución
  start() {
    if (this.isRunning) return;
    
    console.log('Strategy Execution Engine Started');
    this.isRunning = true;
    
    //  Ejecutar cada 30 segundos
    // cron.schedule('*/30 * * * * *', () => {
    //   this.executeStrategies();
    // }); 

    // Cargar estrategias activas al inicio
    this.loadActiveStrategies();
  }

  // Cargar estrategias activas usando Sequelize
  async loadActiveStrategies() {
    try {
      const activeStrategies = await Strategy.findAll({ 
        where: {
          status: 'active',
          isExecuting: false 
        }
      });

      activeStrategies.forEach(strategy => {
        this.activeStrategies.set(strategy.id.toString(), strategy);
      });

      console.log(`Loaded ${activeStrategies.length} active strategies`);
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  }

  // Ejecutar todas las estrategias activas
  async executeStrategies() {
    if (this.activeStrategies.size === 0) return;
    
    console.log(`🔄 Processing ${this.activeStrategies.size} active strategies...`);
    
    for (const [strategyId, strategy] of this.activeStrategies) {
      try {
        await this.processStrategy(strategy);
      } catch (error) {
        console.error(`Error processing strategy ${strategyId}:`, error);
      }
    }
  }

 
  async processStrategy(strategy) {
    const { type, conditions, actions, userAddress } = strategy;

    // Marcar como en ejecución para evitar duplicados
    await Strategy.update(
      { isExecuting: true },
      { where: { id: strategy.id } }
    );

    try {
      console.log(`Processing ${type} strategy ${strategy.id}`);

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
      await Strategy.update(
        { isExecuting: false },
        { where: { id: strategy.id } }
      );
    }
  }

  async processLimitOrder(strategy, executionPrice) {
    try {
      console.log('Processing strategy:', strategy.name);

      // Create order
      const result = await createLimitOrder(strategy);
      if (!result || !result.order) {
        console.error('⚠️can not create the order');
        return null;
      }

      const { order, orderHash } = result;

      const { signature } = await signOrder(order);

      // Save order
      const saved = await this.saveOrder(
        strategy.id,
        order,
        'PENDING',
        executionPrice,
        null,
        orderHash,
        signature
      );

      return saved;
    } catch (error) {
      console.error(`❌ Error executing order for this strategy ${strategy.id}:`, error.message);
      return null;
    }
  }

  //Process strategy TWAP
  async processTWAP(strategy) {
    try {
      const { conditions, actions } = strategy;
      const now = Date.now();
      
      // Verificar si es momento de ejecutar el siguiente intervalo
      const elapsed = now - new Date(strategy.createdAt).getTime();
      const intervalTime = (conditions.timeframe || 3600000) / (conditions.intervals || 10); // Default 1 hora, 10 intervalos
      const currentInterval = Math.floor(elapsed / intervalTime);
      
      if (currentInterval > (strategy.executedIntervals || 0)) {
        console.log(`Executing TWAP interval ${currentInterval} for strategy ${strategy.id}`);
        
        // Crear orden para este intervalo
        const intervalAmount = BigInt(actions.makerAmount) / BigInt(conditions.intervals || 10);
        
        // Crear estrategia temporal para este intervalo
        const intervalStrategy = {
          ...strategy.toJSON(),
          actions: {
            ...actions,
            makerAmount: intervalAmount.toString()
          }
        };
        
        const orderResult = await createLimitOrder(intervalStrategy);
        
        if (orderResult) {
          const { order, signature } = orderResult;
          
          if (strategy.autoExecute !== false) {
            const executionResult = await executeOrderOnChain(order, signature);
            
            if (executionResult.success) {
              console.log(`TWAP interval ${currentInterval} executed: ${executionResult.txHash}`);
              
              // Update strategy
              await Strategy.update({
                executedIntervals: currentInterval,
                lastExecuted: new Date()
              }, { where: { id: strategy.id } });
              
              // Update order
              await Order.update(
                { 
                  status: 'executed',
                  tx_hash: executionResult.txHash,
                  executed_at: new Date()
                },
                { 
                  where: { 
                    strategy_id: strategy.id,
                    status: 'pending'
                  },
                  order: [['created_at', 'DESC']],
                  limit: 1
                }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error executing TWAP for strategy ${strategy.id}:`, error);
    }
  }

  // Process strategy DCA
  async processDCA(strategy) {
    try {
      const { conditions } = strategy;
      const now = Date.now();
      const lastExecution = strategy.lastExecuted ? new Date(strategy.lastExecuted).getTime() : new Date(strategy.createdAt).getTime();
      
      // Verify interval of DCA
      const interval = conditions.interval || 86400000; // Default 24 hs
      if (now - lastExecution >= interval) {
        console.log(`Executing DCA for strategy ${strategy.id}`);
        
        const orderResult = await createLimitOrder(strategy);
        
        if (orderResult) {
          const { order, signature } = orderResult;
          
          if (strategy.autoExecute !== false) {
            const executionResult = await executeOrderOnChain(order, signature);
            
            if (executionResult.success) {
              console.log(`DCA executed: ${executionResult.txHash}`);
              
              // Update timestamp
              await Strategy.update({
                lastExecuted: new Date()
              }, { where: { id: strategy.id } });
              
              // Update order
              await Order.update(
                { 
                  status: 'executed',
                  tx_hash: executionResult.txHash,
                  executed_at: new Date()
                },
                { 
                  where: { 
                    strategy_id: strategy.id,
                    status: 'pending'
                  },
                  order: [['created_at', 'DESC']],
                  limit: 1
                }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error executing DCA for strategy ${strategy.id}:`, error);
    }
  }

  // Process strategy Grid Trading
  async processGrid(strategy) {
    try {
      console.log(`Processing Grid strategy ${strategy.id} - Coming soon...`);
      // TODO: Implementar lógica de Grid Trading
    } catch (error) {
      console.error(`Error processing Grid strategy ${strategy.id}:`, error);
    }
  }

  // Process Options
  async processOptions(strategy) {
    try {
      console.log(`Processing Options strategy ${strategy.id} - Coming soon...`);
      // TODO: Implementar lógica de Options
    } catch (error) {
      console.error(`Error processing Options strategy ${strategy.id}:`, error);
    }
  }

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
      case '==':
        return Math.abs(currentPrice - targetPrice) < (targetPrice * 0.001); // 0.1% tolerance
      default:
        console.log(`Unknown operator: ${operator}`);
        return false;
    }
  }

  // Save order using Sequelize
  async saveOrder(strategyId, orderData, status, executionPrice, errorMessage = null, orderHash = null, signature = null) {
    try {
      const makerAsset = orderData.makerAsset;
      const takerAsset = orderData.takerAsset;

      const tokenInSymbol = 'WETH';   
      const tokenOutSymbol = 'USDC';  

      const savedOrder = await Order.create({
        strategy_id: strategyId,
        order_hash: orderHash,
        order_data: orderData,
        token_in: makerAsset,
        token_in_symbol: tokenInSymbol,
        token_out: takerAsset,
        token_out_symbol: tokenOutSymbol,
        amount_in: orderData.makingAmount,
        amount_out: orderData.takingAmount,
        price_at_creation: (Number(orderData.takingAmount) / Number(orderData.makingAmount)).toString(),
        status,
        execution_price: executionPrice,
        error_message: errorMessage || null,
        signature: signature || null
      });

      console.log('💾 Saved order:', savedOrder.id);
      return savedOrder;

    } catch (error) {
      console.error('❌ Error saving order in DB:', error);
      return null;
    }
  }


  addStrategy(strategy) {
    const strategyData = strategy.toJSON ? strategy.toJSON() : strategy;
    this.activeStrategies.set(strategyData.id.toString(), strategyData);
    console.log(`Added strategy ${strategyData.id} to execution engine`);
  }

  removeStrategy(strategyId) {
    this.activeStrategies.delete(strategyId.toString());
    console.log(`Removed strategy ${strategyId} from execution engine`);
  }

  updateStrategy(strategy) {
    const strategyData = strategy.toJSON ? strategy.toJSON() : strategy;
    if (this.activeStrategies.has(strategyData.id.toString())) {
      this.activeStrategies.set(strategyData.id.toString(), strategyData);
      console.log(`Updated strategy ${strategyData.id} in execution engine`);
    }
  }

  // Detener el motor
  stop() {
    this.isRunning = false;
    this.activeStrategies.clear();
    console.log('Strategy Execution Engine Stopped');
  }

  // stats
  getStats() {
    return {
      activeStrategies: this.activeStrategies.size,
      isRunning: this.isRunning,
      strategies: Array.from(this.activeStrategies.keys()),
      uptime: this.isRunning ? Date.now() : 0
    };
  }

  //Reload strategies from DB
  async reloadStrategies() {
    console.log('Reloading strategies from DB...');
    this.activeStrategies.clear();
    await this.loadActiveStrategies();
  }

  //get one strategy in particular
  getStrategy(strategyId) {
    return this.activeStrategies.get(strategyId.toString());
  }
}

module.exports = new ExecutionService();