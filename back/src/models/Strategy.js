const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Strategy = sequelize.define('Strategy', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    strategy_type: {
      type: DataTypes.ENUM(
        'LIMIT_ORDER',
        'DCA',
        'TWAP', 
        'GRID_TRADING',
        'STOP_LOSS',
        'CONDITIONAL'
      ),
      allowNull: false
    },
    // Configuración de la estrategia
    config: {
      type: DataTypes.JSON,
      allowNull: false,
      // Ejemplo: {
      //   tokenIn: 'ETH',
      //   tokenOut: 'USDC', 
      //   amount: '1.0',
      //   conditions: [
      //     { type: 'PRICE', operator: '>', value: 3200 },
      //     { type: 'GAS', operator: '<', value: 50 }
      //   ],
      //   logic: 'AND'
      // }
    },
    // Condiciones como array para fácil procesamiento
    conditions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM(
        'DRAFT',      // Creada pero no activada
        'ACTIVE',     // Monitoreando condiciones
        'PAUSED',     // Pausada por usuario
        'COMPLETED',  // Ejecutada exitosamente
        'CANCELLED',  // Cancelada por usuario
        'FAILED'      // Falló en ejecución
      ),
      defaultValue: 'DRAFT'
    },
    // Metadata para 1inch
    order_data: {
      type: DataTypes.JSON,
      allowNull: true
      // Contiene: signature, salt, deadline, etc.
    },
    // IPFS hash para estrategias compartidas
    ipfs_hash: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Tracking de ejecución
    executions_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_execution: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Para DCA y TWAP
    total_amount: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: true
    },
    executed_amount: {
      type: DataTypes.DECIMAL(36, 18),
      defaultValue: '0'
    }
  }, {
    tableName: 'strategies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['strategy_type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  Strategy.associate = (models) => {
    Strategy.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    Strategy.hasMany(models.Order, {
      foreignKey: 'strategy_id',
      as: 'orders'
    });
  };

  return Strategy;
};