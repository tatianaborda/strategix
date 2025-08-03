import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { createStrategy, fetchStrategies } from '../services/strategyService';
import { createOrder } from '../services/orderService';
import useWallet from '../hooks/useWallet';
import { createAndSignLimitOrder } from '../lib/limitOrder';
import { ethers } from 'ethers';

export default function CombinedOrderStrategy() {
  const { account, signer, isConnected } = useWallet();
  const [selectedPair, setSelectedPair] = useState('ETH/USDC');
  const [sellPrice, setSellPrice] = useState('');
  const [amount, setAmount] = useState('');

  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshingStrategies, setRefreshingStrategies] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const pairs = [
    { value: 'ETH/USDC', label: 'ETH/USDC', icon: '🔸' },
    { value: 'BTC/USDC', label: 'BTC/USDC', icon: '₿' },
    { value: 'SOL/USDC', label: 'SOL/USDC', icon: '☀️' },
    { value: 'ADA/USDC', label: 'ADA/USDC', icon: '🔷' },
    { value: 'MATIC/USDC', label: 'MATIC/USDC', icon: '🟣' },
  ];

  // ✅Ethereum Mainnet
  const TOKEN_ADDRESSES = {
    'ETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',   // WETH
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    'BTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',    // WBTC
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',   // USDT
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',    // DAI
    'SOL': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',   // Using WETH as fallback
    'ADA': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',   // Using WETH as fallback
    'MATIC': '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0'  // MATIC
  };

 
const validateAndFormatAddress = (address) => {
  try {
    if (!address) throw new Error('Empty address');
    if (!ethers.isAddress(address)) throw new Error('Invalid address');
    return ethers.getAddress(address.toLowerCase());
  } catch (error) {
    console.error('Error validating address:', address, error);
    throw new Error(`Invalid address: ${address}`);
  }
};

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
      
      const fetched = await fetchStrategies(account);
      console.log('Strategies fetched successfully:', fetched);
      
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
      
      if (error.message.includes('500')) {
        console.error('🔴 Server Error 500 - Backend issue');
        if (error.message.includes('createdAt')) {
          showMessage('Database error, column createdAt does not exist. check DB schema.', 'error');
        } else if (error.message.includes('Unknown column')) {
          showMessage('Database error', 'error');
        } else {
          showMessage(' Server Error 500 - Backend issue', 'error');
        }
      } else if (error.message.includes('404')) {
        console.error('🔴 Not Found 404 - Endpoint doesn\'t exist');
        showMessage('Not Found 404 - Endpoint doesn\'t exist.', 'error');
      } else if (error.message.includes('fetch')) {
        console.error('🔴 Network Error - Can\'t reach backend');
        showMessage('Network Error - Can\'t reach backend', 'error');
      } else {
        console.error('🔴 Unknown error:', error);
        showMessage('Error: ' + error.message, 'error');
      }
    } finally {
      setRefreshingStrategies(false);
    }
  };

  useEffect(() => {
    if (isConnected && account) {
      refreshStrategies();
    } else {
      setStrategies([]);
    }
  }, [account, isConnected]);

  const validateInputs = () => {
    if (!sellPrice.trim()) {
      showMessage('Please add a sell price', 'error');
      return false;
    }

    if (!amount.trim()) {
      showMessage('Please add an amount', 'error');
      return false;
    }

    const numPrice = parseFloat(sellPrice.replace(/[$,]/g, ''));
    const numAmount = parseFloat(amount);

    if (isNaN(numPrice) || numPrice <= 0) {
      showMessage('Price must be a valid number greater than 0', 'error');
      return false;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      showMessage('Amount must be a valid number greater than 0', 'error');
      return false;
    }

    return true;
  };

  const handleCreateStrategy = async () => {
    if (!isConnected || !account) {
      showMessage('Please connect your wallet', 'error');
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
        showMessage('✅ Strategy created successfully!', 'success');
        
        setTimeout(async () => {
          await refreshStrategies();
        }, 1000);
        
        setSellPrice('');
        setAmount('');
      } else {
        const errorMessage = response?.message || response?.details || 'Error creating strategy';
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error creating strategy:', error);
      if (error.message.includes('500')) {
        showMessage('Server error', 'error');
      } else {
        showMessage('Error creating strategy: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

const handleCreateOrder = async (strategy) => {
  if (!isConnected || !signer) {
    showMessage('Wallet is not connected properly', 'error');
    return;
  }

  try {
    setLoading(true);
    
    const action = strategy.actions?.[0];
    if (!action) {
      throw new Error('strategy without actions');
    }
    
    const [baseToken, quoteToken] = action.tokenPair.split('/');

    const makerAssetRaw = TOKEN_ADDRESSES[baseToken];
    const takerAssetRaw = TOKEN_ADDRESSES[quoteToken];
    
    if (!makerAssetRaw || !takerAssetRaw) {
      throw new Error(`not supported Token: ${baseToken} o ${quoteToken}`);
    }

    const makerAsset = validateAndFormatAddress(makerAssetRaw);
    const takerAsset = validateAndFormatAddress(takerAssetRaw);
    const maker = validateAndFormatAddress(account);

    const makingAmountWei = ethers.parseEther(action.amount.toString());
    const takingAmountWei = ethers.parseUnits(
      (action.amount * action.price).toString(), 
      6 
    );
    
    const orderParams = {
      makerAsset,
      takerAsset,
      makingAmount: makingAmountWei.toString(), 
      takingAmount: takingAmountWei.toString(), 
      maker
    };

    console.log('🔨 Creting limit order with params:', orderParams);

    // Create and sign te order
    const signedOrder = await createAndSignLimitOrder(orderParams, signer);
    const payload = {
      strategy_id: strategy.id,
      userAddress: account,
      orderData: {
        makerAsset,
        takerAsset,
        makingAmount: makingAmountWei.toString(),
        takingAmount: takingAmountWei.toString(),
        salt: ethers.toBigInt(ethers.hexlify(ethers.randomBytes(32))).toString(),
        maker: account,
        makerTraits: '0'
      },
      orderHash: signedOrder.orderHash,
      signature: signedOrder.signature,
      makerSymbol: baseToken,
      takerSymbol: quoteToken,
      priceAtCreation: action.price
    };

    console.log('📤 Payload completo para el backend:', payload);
    
    const response = await createOrder(payload);

    if (!response?.success) {
      throw new Error(response?.error || 'Error creating the order');
    }

    showMessage('✅ Order creted successfully!', 'success');
    await refreshStrategies();

  } catch (error) {
    console.error('Error creating the order:', error);
    showMessage(`❌ ${error.message}`, 'error');
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
        <p className="text-slate-400">Create your strategies</p>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <p className="text-amber-300">⚠️ Connect your wallet to start creating strategies!</p>
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
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-600/30 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
            <h2 className="text-xl font-semibold text-cyan-300">Create New Strategy</h2>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Trading Pair</label>
              <Select
                value={selectedPair}
                onChange={setSelectedPair}
                options={pairs}
                placeholder="Select a pair"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Sell Price (USD)"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="3200.00"
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  label="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1.0"
                  className="w-full"
                />
              </div>
            </div>

            {sellPrice && amount && (
              <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
                <p className="text-xs text-slate-400 mb-1">Estimated total:</p>
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
                  Creating...
                </span>
              ) : (
                '🚀 Create strategy'
              )}
            </Button>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-600/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <h2 className="text-xl font-semibold text-purple-300">My Strategies</h2>
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
                <p className="text-slate-400">Connect your wallet to see your strategies</p>
              </div>
            ) : refreshingStrategies ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Loading strategies...</p>
              </div>
            ) : strategies.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-slate-400 mb-2">You dont have any strategy yet</p>
                <p className="text-slate-500 text-sm">Create your first strategy to start</p>
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
                            <p>📊 Condition: Price {strategy.conditions[0].operator || '>='} {formatPrice(strategy.conditions[0].value)}</p>
                          )}
                          {strategy.actions?.[0] && (
                            <p>💰 Amount: {strategy.actions[0].amount || 'N/A'} {strategy.actions[0].tokenPair?.split('/')[0] || 'tokens'}</p>
                          )}
                          <p>🕒 Created: {strategy.createdAt ? new Date(strategy.createdAt).toLocaleDateString() : 'N/A'}</p>
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
                        {loading ? '⏳' : '📋'} Create Order
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