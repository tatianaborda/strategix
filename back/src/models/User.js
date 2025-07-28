const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    wallet_address: {
      type: DataTypes.STRING(42),
      allowNull: false,
      unique: true,
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Invalid Ethereum address format');
          }
        }
      }
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        notifications: true,
        defaultSlippage: 0.5,
        theme: 'dark'
      }
    },
    total_strategies: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['wallet_address']
      }
    ]
  });

  User.associate = (models) => {
    User.hasMany(models.Strategy, {
      foreignKey: 'user_id',
      as: 'strategies'
    });
  };

  return User;
};