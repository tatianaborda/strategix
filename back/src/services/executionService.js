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
    
    // Ejecutar cada 30 segundos
    cron.schedule('*/30 * * * * *', () => {
      this.executeStrategies();
    });

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

  async processLimitOrder(strategy) {
    try {
      const { conditions, actions } = strategy;
      
      // Obtener precio actual para verificar condiciones
      let currentPrice = null;
      if (conditions.targetPrice && actions.makerToken && actions.takerToken) {
        try {
          currentPrice = await priceService.getPrice(actions.makerToken, actions.takerToken);
        } catch (priceError) {
          console.log(`No se pudo obtener precio para strategy ${strategy.id}, continuando...`);
        }
      }

      // Verificar condiciones de precio si están definidas
      if (currentPrice && conditions.targetPrice && conditions.operator) {
        const shouldExecute = this.checkPriceCondition(currentPrice, conditions.targetPrice, conditions.operator);
        if (!shouldExecute) {
          console.log(`Condiciones de precio no cumplidas para strategy ${strategy.id}: ${currentPrice} ${conditions.operator} ${conditions.targetPrice}`);
          return;
        }
      }

      console.log(`Executing Limit Order for strategy ${strategy.id}`);
      

      const orderResult = await createLimitOrder(strategy);
      
      if (orderResult) {
        const { order, signature } = orderResult;
        
        // Si autoExecute está habilitado, ejecutar inmediatamente
        if (strategy.autoExecute !== false) {
          const executionResult = await executeOrderOnChain(order, signature);
          
          if (executionResult.success) {
            console.log(`Strategy ${strategy.id} executed onchain: ${executionResult.txHash}`);
            
            // Actualizar orden con hash de transacción
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
                }
              }
            );

            // Marcar estrategia como completada si es LIMIT_ORDER
            if (strategy.type === 'LIMIT_ORDER') {
              await Strategy.update(
                { 
                  status: 'completed',
                  completedAt: new Date()
                },
                { where: { id: strategy.id } }
              );
              this.activeStrategies.delete(strategy.id.toString());
            }
          } else {
            console.error(`Execution failed for strategy ${strategy.id}:`, executionResult.error);
            
            // Marcar orden como fallida
            await Order.update(
              { 
                status: 'failed',
                error_message: executionResult.error
              },
              { 
                where: { 
                  strategy_id: strategy.id,
                  status: 'pending'
                }
              }
            );
          }
        }
      } else {
        console.log(`⏸️ Strategy ${strategy.id} conditions not met, skipping execution`);
      }
    } catch (error) {
      console.error(`Error executing limit order for strategy ${strategy.id}:`, error);
      await this.saveOrder(strategy.id, null, 'failed', null, error.message);
    }
  }

  //Procesar estrategia TWAP
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
              
              // Actualizar estrategia
              await Strategy.update({
                executedIntervals: currentInterval,
                lastExecuted: new Date()
              }, { where: { id: strategy.id } });
              
              // Actualizar orden
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

  // Procesar estrategia DCA
  async processDCA(strategy) {
    try {
      const { conditions } = strategy;
      const now = Date.now();
      const lastExecution = strategy.lastExecuted ? new Date(strategy.lastExecuted).getTime() : new Date(strategy.createdAt).getTime();
      
      // Verificar si ha pasado el intervalo de DCA
      const interval = conditions.interval || 86400000; // Default 24 horas
      if (now - lastExecution >= interval) {
        console.log(`Executing DCA for strategy ${strategy.id}`);
        
        const orderResult = await createLimitOrder(strategy);
        
        if (orderResult) {
          const { order, signature } = orderResult;
          
          if (strategy.autoExecute !== false) {
            const executionResult = await executeOrderOnChain(order, signature);
            
            if (executionResult.success) {
              console.log(`DCA executed: ${executionResult.txHash}`);
              
              // Actualizar timestamp
              await Strategy.update({
                lastExecuted: new Date()
              }, { where: { id: strategy.id } });
              
              // Actualizar orden
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

  // Procesar estrategia Grid Trading
  async processGrid(strategy) {
    try {
      console.log(`Processing Grid strategy ${strategy.id} - Coming soon...`);
      // TODO: Implementar lógica de Grid Trading
    } catch (error) {
      console.error(`Error processing Grid strategy ${strategy.id}:`, error);
    }
  }

  // Procesar Options
  async processOptions(strategy) {
    try {
      console.log(`Processing Options strategy ${strategy.id} - Coming soon...`);
      // TODO: Implementar lógica de Options
    } catch (error) {
      console.error(`Error processing Options strategy ${strategy.id}:`, error);
    }
  }

  // Verificar condición de precio IMP!
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

  // Guardar orden usando Sequelize
  async saveOrder(strategyId, orderData, status, executionPrice, errorMessage = null) {
    try {
      const order = await Order.create({
        strategyId,
        order_data: orderData ? JSON.stringify(orderData) : null,
        status,
        execution_price: executionPrice,
        error_message: errorMessage,
        created_at: new Date()
      });
      
      return order;
    } catch (error) {
      console.error('Error saving order:', error);
    }
  }

  // Agregar nueva estrategia al motor
  addStrategy(strategy) {
    // Convertir a objeto plano si es una instancia de Sequelize para guardarlo
    const strategyData = strategy.toJSON ? strategy.toJSON() : strategy;
    this.activeStrategies.set(strategyData.id.toString(), strategyData);
    console.log(`Added strategy ${strategyData.id} to execution engine`);
  }

  // Remover estrategia del motor
  removeStrategy(strategyId) {
    this.activeStrategies.delete(strategyId.toString());
    console.log(`Removed strategy ${strategyId} from execution engine`);
  }

  // Actualizar estrategia en el motor
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

  // Obtener estadísticas
  getStats() {
    return {
      activeStrategies: this.activeStrategies.size,
      isRunning: this.isRunning,
      strategies: Array.from(this.activeStrategies.keys()),
      uptime: this.isRunning ? Date.now() : 0
    };
  }

  //Recargar estrategias desde DB
  async reloadStrategies() {
    console.log('Reloading strategies from DB...');
    this.activeStrategies.clear();
    await this.loadActiveStrategies();
  }

  //Obtener estrategia en particluar
  getStrategy(strategyId) {
    return this.activeStrategies.get(strategyId.toString());
  }
}

module.exports = new ExecutionService();