require('dotenv').config({ path: __dirname + '/../.env' });
console.log('Cargando app...');
const app = require('./src/app');
const executionService = require('./src/services/executionService');
console.log('App cargada');

const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 4500;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Verificar conexión a base de datos
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Sincronizar modelos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized');
    }

    // Iniciar servidor HTTP
    const server = app.listen(PORT, () => {
      console.log(`Strategix Backend running on port ${PORT}`);
      
      // Iniciar execution service después de que el servidor esté corriendo
      try {
        executionService.start();
        console.log('Strategy Execution Engine iniciado');
      } catch (serviceError) {
        console.error('Error starting execution service:', serviceError);
      }
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} shutting down`);
      
      // Detener execution service primero
      try {
        if (executionService && executionService.stop) {
          executionService.stop();
          console.log('Strategy Execution Engine stopped');
        }
      } catch (error) {
        console.error('Error stopping execution service:', error);
      }
      
      server.close(async () => {
        console.log('🔄 HTTP server closed');
        
        try {
          await sequelize.close();
          console.log('Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Iniciar servidor
startServer();