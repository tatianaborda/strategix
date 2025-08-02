import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { createStrategy, fetchStrategies } from '../services/strategyService';
import { createOrder } from '../services/orderService';
import useWallet from '../hooks/useWallet';
import { ethers } from 'ethers';

export default function CombinedOrderStrategy() {
  const { account, signer, isConnected } = useWallet();

  // Estado para crear estrategia
  const [selectedPair, setSelectedPair] = useState('ETH/USDC');
  const [sellPrice, setSellPrice] = useState('');
  const [amount, setAmount] = useState('');
  
  // Estado para estrategias
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshingStrategies, setRefreshingStrategies] = useState(false);
  
  // Estado para mensajes
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const pairs = [
    { value: 'ETH/USDC', label: 'ETH/USDC', icon: '🔸' },
    { value: 'BTC/USDC', label: 'BTC/USDC', icon: '₿' },
    { value: 'SOL/USDC', label: 'SOL/USDC', icon: '☀️' },
    { value: 'ADA/USDC', label: 'ADA/USDC', icon: '🔷' },
    { value: 'MATIC/USDC', label: 'MATIC/USDC', icon: '🟣' },
  ];

  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMsg(message);
      setErrorMsg('');
    } else {
      setErrorMsg(message);
      setSuccessMsg('');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 4000);
  };

  const refreshStrategies = async () => {
    if (!account || !isConnected) {
      console.log('No account or not connected, clearing strategies');
      setStrategies([]);
      return;
    }

    try {
      setRefreshingStrategies(true);
      console.log('Refreshing strategies for account:', account);
      
      // Intentar diferentes endpoints si falla
      let fetched;
      try {
        fetched = await fetchStrategies(account);
        console.log('Strategies fetched successfully:', fetched);
      } catch (firstError) {
        console.error('First attempt failed:', firstError);
        
        // Si el primer intento falla, intentar con userAddress en lugar de walletAddress
        console.log('Trying alternative endpoint...');
        throw firstError; // Por ahora, relanzar el error original
      }
      
      // Asegurar que sea un array
      const strategiesArray = Array.isArray(fetched) ? fetched : [];
      setStrategies(strategiesArray);
      
      if (strategiesArray.length > 0) {
        console.log(`✅ Loaded ${strategiesArray.length} strategies successfully`);
      } else {
        console.log('ℹ️ No strategies found for this account');
      }
      
    } catch (error) {
      console.error('Error refreshing strategies:', error);
      setStrategies([]);
      
      // Manejar diferentes tipos de errores con más detalle
      if (error.message.includes('500')) {
        console.error('🔴 Server Error 500 - Backend issue');
        if (error.message.includes('createdAt')) {
          showMessage('Error en la base de datos: La columna createdAt no existe. Revisa el schema de la BD.', 'error');
        } else if (error.message.includes('Unknown column')) {
          showMessage('Error en la base de datos: Problema con el schema. Revisa las columnas de la tabla.', 'error');
        } else {
          showMessage('Error del servidor (500). Revisa que el backend esté funcionando correctamente.', 'error');
        }
      } else if (error.message.includes('404')) {
        console.error('🔴 Not Found 404 - Endpoint doesn\'t exist');
        showMessage('Endpoint no encontrado (404). Verifica la URL del API.', 'error');
      } else if (error.message.includes('fetch')) {
        console.error('🔴 Network Error - Can\'t reach backend');
        showMessage('Error de conexión. ¿Está el backend corriendo en puerto 4500?', 'error');
      } else {
        console.error('🔴 Unknown error:', error);
        showMessage('Error: ' + error.message, 'error');
      }
    } finally {
      setRefreshingStrategies(false);
    }
  };

  useEffect(() => {
    // Solo refrescar estrategias si la wallet está conectada
    if (isConnected && account) {
      refreshStrategies();
    } else {
      setStrategies([]);
    }
  }, [account, isConnected]);

  const validateInputs = () => {
    if (!sellPrice.trim()) {
      showMessage('Por favor ingresa un precio de venta', 'error');
      return false;
    }

    if (!amount.trim()) {
      showMessage('Por favor ingresa una cantidad', 'error');
      return false;
    }

    const numPrice = parseFloat(sellPrice.replace(/[$,]/g, ''));
    const numAmount = parseFloat(amount);

    if (isNaN(numPrice) || numPrice <= 0) {
      showMessage('El precio debe ser un número válido mayor a 0', 'error');
      return false;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      showMessage('La cantidad debe ser un número válido mayor a 0', 'error');
      return false;
    }

    return true;
  };

  const handleCreateStrategy = async () => {
    if (!isConnected || !account) {
      showMessage('Por favor conecta tu wallet', 'error');
      return;
    }

    if (!validateInputs()) return;

    const cleanPrice = sellPrice.replace(/[$,]/g, '');
    const cleanAmount = amount.replace(/[,]/g, '');

    const strategyPayload = {
      userAddress: account,
      name: `Limit Sell ${selectedPair} @ $${cleanPrice}`,
      type: 'LIMIT_ORDER',
      conditions: [
        {
          type: 'price_above',
          value: parseFloat(cleanPrice),
          pair: selectedPair,
          operator: '>='
        }
      ],
      actions: [
        {
          type: 'sell_limit_order',
          tokenPair: selectedPair,
          price: parseFloat(cleanPrice),
          amount: parseFloat(cleanAmount),
          wallet: account
        }
      ],
      config: {
        pair: selectedPair,
        side: 'sell',
        orderType: 'limit'
      }
    };

    try {
      setLoading(true);
      console.log('Creating strategy with payload:', strategyPayload);
      
      const response = await createStrategy(strategyPayload);
      console.log('Strategy creation response:', response);
      
      if (response && (response.success !== false)) {
        showMessage('✅ Estrategia creada exitosamente', 'success');
        
        // Esperar un poco antes de refrescar para que el backend procese
        setTimeout(async () => {
          await refreshStrategies();
        }, 1000);
        
        // Limpiar formulario
        setSellPrice('');
        setAmount('');
      } else {
        const errorMessage = response?.message || response?.details || 'Error desconocido al crear estrategia';
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error creating strategy:', error);
      if (error.message.includes('500')) {
        showMessage('Error del servidor al crear estrategia. Verifica la conexión con el backend.', 'error');
      } else {
        showMessage('Error al crear estrategia: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (strategy) => {
    if (!isConnected || !signer) {
      showMessage('Wallet no conectada correctamente', 'error');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        strategy_id: strategy.id,
        price: strategy.actions?.[0]?.price || '0',
        amount: strategy.actions?.[0]?.amount || '0',
        pair: strategy.actions?.[0]?.tokenPair || selectedPair,
        timestamp: Date.now(),
        wallet: account
      };

      const msgToSign = JSON.stringify(orderData);
      console.log('Signing message:', msgToSign);

      const signature = await signer.signMessage(msgToSign);

      const payload = {
        strategy_id: strategy.id,
        userAddress: account,
        execution_price: strategy.actions?.[0]?.price || '0',
        order_data: orderData,
        order_hash: signature,
        status: 'PENDING'
      };

      console.log('Creating order with payload:', payload);
      const result = await createOrder(payload);
      
      if (result && result.success !== false) {
        showMessage('✅ Orden creada y firmada exitosamente', 'success');
      } else {
        const errorMessage = result?.message || 'Error al crear orden';
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      if (error.code === 'ACTION_REJECTED') {
        showMessage('Firma cancelada por el usuario', 'error');
      } else {
        showMessage('Error al crear orden: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return isNaN(num) ? '0' : num.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'paused': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return '🟢';
      case 'completed': return '✅';
      case 'paused': return '⏸️';
      case 'failed': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Strategix Trading
        </h1>
        <p className="text-slate-400">Crea estrategias de trading automatizadas</p>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <p className="text-amber-300">⚠️ Conecta tu wallet para comenzar a crear estrategias</p>
        </div>
      )}

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <p className="text-green-300">{successMsg}</p>
        </div>
      )}
      
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-red-300">❌ {errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CREAR ESTRATEGIA */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-600/30 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
            <h2 className="text-xl font-semibold text-cyan-300">Crear Nueva Estrategia</h2>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Par de Trading</label>
              <Select
                value={selectedPair}
                onChange={setSelectedPair}
                options={pairs}
                placeholder="Selecciona un par"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Precio de Venta (USD)"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="3200.00"
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  label="Cantidad"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1.0"
                  className="w-full"
                />
              </div>
            </div>

            {sellPrice && amount && (
              <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
                <p className="text-xs text-slate-400 mb-1">Total estimado:</p>
                <p className="text-lg font-semibold text-cyan-300">
                  {formatPrice((parseFloat(sellPrice.replace(/[$,]/g, '')) || 0) * (parseFloat(amount) || 0))}
                </p>
              </div>
            )}
            
            <Button 
              onClick={handleCreateStrategy} 
              disabled={loading || !isConnected}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creando...
                </span>
              ) : (
                '🚀 Crear Estrategia'
              )}
            </Button>
          </div>
        </div>

        {/* ESTRATEGIAS EXISTENTES */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-600/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <h2 className="text-xl font-semibold text-purple-300">Mis Estrategias</h2>
            </div>
            
            <button
              onClick={refreshStrategies}
              disabled={refreshingStrategies || !isConnected}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
              title="Actualizar estrategias"
            >
              <span className={`text-lg ${refreshingStrategies ? 'animate-spin' : ''}`}>🔄</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {!isConnected ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔌</span>
                </div>
                <p className="text-slate-400">Conecta tu wallet para ver tus estrategias</p>
              </div>
            ) : refreshingStrategies ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Cargando estrategias...</p>
              </div>
            ) : strategies.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-slate-400 mb-2">No tienes estrategias creadas aún</p>
                <p className="text-slate-500 text-sm">Crea tu primera estrategia para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strategies.map(strategy => (
                  <div key={strategy.id} className="bg-slate-700/60 backdrop-blur-sm p-4 rounded-xl border border-slate-600/30 hover:border-purple-500/50 transition-all duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">
                            {pairs.find(p => p.value === strategy.actions?.[0]?.tokenPair)?.icon || '🔸'}
                          </span>
                          <h3 className="font-medium text-cyan-200 truncate">{strategy.name}</h3>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{getStatusIcon(strategy.status)}</span>
                            <span className={`text-xs font-medium ${getStatusColor(strategy.status)}`}>
                              {strategy.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-slate-400 space-y-1">
                          {strategy.conditions?.[0] && (
                            <p>📊 Condición: Precio {strategy.conditions[0].operator || '>='} {formatPrice(strategy.conditions[0].value)}</p>
                          )}
                          {strategy.actions?.[0] && (
                            <p>💰 Cantidad: {strategy.actions[0].amount || 'N/A'} {strategy.actions[0].tokenPair?.split('/')[0] || 'tokens'}</p>
                          )}
                          <p>🕒 Creada: {strategy.createdAt ? new Date(strategy.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        onClick={() => handleCreateOrder(strategy)}
                        disabled={loading || strategy.status !== 'active'}
                        className="flex-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border-purple-500/30 disabled:opacity-50"
                      >
                        {loading ? '⏳' : '📋'} Emitir Orden
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      {isConnected && strategies.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-cyan-400">{strategies.length}</p>
              <p className="text-xs text-slate-400">Total Estrategias</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{strategies.filter(s => s.status === 'active').length}</p>
              <p className="text-xs text-slate-400">Activas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{strategies.filter(s => s.status === 'completed').length}</p>
              <p className="text-xs text-slate-400">Completadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">{account ? `${account.slice(0,6)}...${account.slice(-4)}` : ''}</p>
              <p className="text-xs text-slate-400">Wallet</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(51 65 85 / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(139 92 246 / 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(139 92 246 / 0.7);
        }
      `}</style>
    </div>
  );
}