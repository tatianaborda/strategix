const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    strategy_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'strategies',
        key: 'id'
      }
    },
    // Hash único de la orden en 1inch
    order_hash: {
      type: DataTypes.STRING(66),
      allowNull: false,
      unique: true
    },
    // Datos de la orden 1inch
    order_data: {
      type: DataTypes.JSON,
      allowNull: false
      // Contiene toda la estructura de 1inch limit order
    },
    // Token input
    token_in: {
      type: DataTypes.STRING(42),
      allowNull: false
    },
    token_in_symbol: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    // Token output  
    token_out: {
      type: DataTypes.STRING(42),
      allowNull: false
    },
    token_out_symbol: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    // Amounts
    amount_in: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false
    },
    amount_out: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false
    },
    // Precio al momento de creación
    price_at_creation: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false
    },
    // Estado de la orden
    status: {
      type: DataTypes.ENUM(
        'PENDING',    // Esperando condiciones
        'SUBMITTED',  // Enviada a 1inch
        'PARTIALLY_FILLED', // Parcialmente ejecutada
        'FILLED',     // Completamente ejecutada
        'CANCELLED',  // Cancelada
        'EXPIRED',    // Expirada
        'FAILED'      // Falló
      ),
      defaultValue: 'PENDING'
    },
    // Condiciones que dispararon la orden
    trigger_conditions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Precio al que se ejecutó
    execution_price: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: true
    },
    // Gas usado en la ejecución
    gas_used: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gas_price: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    // Transaction hash cuando se ejecuta
    tx_hash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    // Block number de ejecución
    block_number: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Timestamp de ejecución
    executed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Para órdenes que expiran
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['order_hash']
      },
      {
        fields: ['strategy_id']  
      },
      {
        fields: ['status']
      },
      {
        fields: ['token_in', 'token_out']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  Order.associate = (models) => {
    Order.belongsTo(models.Strategy, {
      foreignKey: 'strategy_id',
      as: 'strategy'
    });
  };

  return Order;
};