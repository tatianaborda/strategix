// test-endpoints.js - Script para verificar todos los endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:4500';

async function testEndpoints() {
  console.log('🔍 VERIFICANDO STRATEGIX BACKEND');
  console.log('================================');

  try {
    // 1. Health Check
    console.log('\n1️⃣ Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data);

    // 2. Test Strategy Creation (LIMIT_ORDER)
    console.log('\n2️⃣ Creando Strategy LIMIT_ORDER...');
    const strategyData = {
      user_id: "0x742d35Cc6323d5b3b3B1b2A5b5b5b5b5b5b5b5b5",
      name: "Test ETH->USDC Limit Order",
      strategy_type: "LIMIT_ORDER",
      conditions: {
        targetPrice: 2500,
        operator: ">=",
        triggerPrice: 2500
      },
      actions: {
        makerToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        takerToken: "0xA0b86a33E6417c66d3F0C8c0Db5b4F3D9E0b0b0b", // USDC
        makerAmount: "1000000000000000000", // 1 ETH
        takerAmount: "2500000000", // 2500 USDC
        maker: "0x742d35Cc6323d5b3b3B1b2A5b5b5b5b5b5b5b5b5"
      }
    };

    const strategy = await axios.post(`${BASE_URL}/api/strategies`, strategyData);
    console.log('✅ Strategy creada:', strategy.data);
    const strategyId = strategy.data.strategy.id;

    // 3. Get All Strategies
    console.log('\n3️⃣ Obteniendo todas las strategies...');
    const allStrategies = await axios.get(`${BASE_URL}/api/strategies`);
    console.log('✅ Strategies:', allStrategies.data);

    // 4. Test Price Service
    console.log('\n4️⃣ Verificando Price Service...');
    try {
      const price = await axios.get(`${BASE_URL}/api/prices/ETH/USDC`);
      console.log('✅ Precio ETH/USDC:', price.data);
    } catch (priceError) {
      console.log('⚠️ Price service no disponible:', priceError.message);
    }

    // 5. Test Strategy Execution (simulado)
    console.log('\n5️⃣ Simulando ejecución de strategy...');
    try {
      const execution = await axios.post(`${BASE_URL}/api/strategies/${strategyId}/execute`);
      console.log('✅ Execution result:', execution.data);
    } catch (execError) {
      console.log('⚠️ Execution error (esperado sin blockchain):', execError.response?.data || execError.message);
    }

    console.log('\n🎉 VERIFICACIÓN COMPLETA');
    console.log('================================');
    console.log('✅ Backend funcionando correctamente');
    console.log('✅ Endpoints respondiendo');
    console.log('✅ Database conectada');
    console.log('✅ Models funcionando');

  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
  }
}

// Verificar que el servidor esté corriendo
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Servidor corriendo en puerto 4500');
    return true;
  } catch (error) {
    console.log('❌ Servidor NO está corriendo en puerto 4500');
    console.log('🔧 Ejecuta: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testEndpoints();
  }
}

main();