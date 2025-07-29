const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Crear instancia de Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username, 
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Importar modelos
const User = require('./User')(sequelize);
const Strategy = require('./Strategy')(sequelize);
const Order = require('./Order')(sequelize);

// Configurar asociaciones
const models = { User, Strategy, Order };

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Exportar modelos y conexión
module.exports = {
  sequelize,
  Sequelize,
  User,
  Strategy, 
  Order
};

