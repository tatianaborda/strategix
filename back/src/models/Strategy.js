module.exports = (sequelize, DataTypes) => {
  const Strategy = sequelize.define('Strategy', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('LIMIT_ORDER', 'TWAP', 'DCA', 'GRID', 'OPTIONS'),
      allowNull: false
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: false
    },
    actions: {
      type: DataTypes.JSON,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'completed', 'cancelled'),
      defaultValue: 'active'
    },
    isExecuting: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    autoExecute: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    executedIntervals: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
    },
    lastExecuted: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'strategies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Strategy.associate = (models) => {
    Strategy.hasMany(models.Order, {
      foreignKey: 'strategy_id',
      as: 'orders'
    });
  };

  return Strategy;
};
