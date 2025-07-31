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
      type: DataTypes.JSON, // IF conditions
      allowNull: false
    },
    actions: {
      type: DataTypes.JSON, // THEN actions (tokens, amounts)
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
    lastExecuted: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    }
  });

  Strategy.associate = function(models) {
    Strategy.hasMany(models.Order, {
      foreignKey: 'strategyId',
      as: 'orders'
    });
  };

  return Strategy;
};