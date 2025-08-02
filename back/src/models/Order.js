module.exports = (sequelize, DataTypes) => {
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
    order_hash: {
      type: DataTypes.STRING(66),
      allowNull: false,
      unique: true
    },
    order_data: {
      type: DataTypes.JSON,
      allowNull: false
    },
    token_in: {
      type: DataTypes.STRING(42),
      allowNull: false
    },
    token_in_symbol: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    token_out: {
      type: DataTypes.STRING(42),
      allowNull: false
    },
    token_out_symbol: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    amount_in: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false
    },
    amount_out: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false
    },
    price_at_creation: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'SUBMITTED',
        'PARTIALLY_FILLED',
        'FILLED',
        'CANCELLED',
        'EXPIRED',
        'FAILED'
      ),
      defaultValue: 'PENDING'
    },
    trigger_conditions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    execution_price: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: true
    },
    gas_used: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gas_price: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    tx_hash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    block_number: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
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
