import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { createStrategy } from '../services/strategyService';
import { createOrder } from '../services/orderService';
import useWallet from '../hooks/useWallet';
import { createAndSignLimitOrder } from '../lib/limitOrder';
import { ethers } from 'ethers';

export default function GridTradingStrategy() {
  const { account, signer, isConnected } = useWallet();
  const [selectedPair, setSelectedPair] = useState('ETH/USDC');
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');
  const [gridLevels, setGridLevels] = useState('5');
  const [totalAmount, setTotalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewOrders, setPreviewOrders] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const pairs = [
    { value: 'ETH/USDC', label: 'ETH/USDC', icon: '🔸' },
    { value: 'BTC/USDC', label: 'BTC/USDC', icon: '₿' },
    { value: 'SOL/USDC', label: 'SOL/USDC', icon: '☀️' },
  ];

  const TOKEN_ADDRESSES = {
    'ETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'BTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    'SOL': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
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

  // Calculate grid orders preview
  useEffect(() => {
    if (lowerPrice && upperPrice && gridLevels && totalAmount) {
      calculateGridOrders();
    } else {
      setPreviewOrders([]);
    }
  }, [lowerPrice, upperPrice, gridLevels, totalAmount]);

  const calculateGridOrders = () => {
    const lower = parseFloat(lowerPrice);
    const upper = parseFloat(upperPrice);
    const levels = parseInt(gridLevels);
    const total = parseFloat(totalAmount);

    if (lower >= upper || levels < 2 || total <= 0) {
      setPreviewOrders([]);
      return;
    }

    const priceStep = (upper - lower) / (levels - 1);
    const amountPerOrder = total / levels;
    const orders = [];

    for (let i = 0; i < levels; i++) {
      const price = lower + (priceStep * i);
      orders.push({
        id: i + 1,
        type: 'BUY',
        price: price,
        amount: amountPerOrder,
        total: price * amountPerOrder,
        status: 'PENDING'
      });
    }

    setPreviewOrders(orders);
  };

  const handleCreateGridStrategy = async () => {
    if (!isConnected || !account) {
      showMessage('Please connect your wallet', 'error');
      return;
    }

    if (previewOrders.length === 0) {
      showMessage('Please fill all grid parameters', 'error');
      return;
    }

    const strategyPayload = {
      userAddress: account,
      name: `Grid Trading ${selectedPair} (${gridLevels} levels)`,
      type: 'GRID_TRADING',
      conditions: [
        {
          type: 'price_range',
          lowerBound: parseFloat(lowerPrice),
          upperBound: parseFloat(upperPrice),
          pair: selectedPair
        }
      ],
      actions: previewOrders.map(order => ({
        type: 'grid_buy_order',
        tokenPair: selectedPair,
        price: order.price,
        amount: order.amount,
        gridLevel: order.id,
        wallet: account
      })),
      config: {
        pair: selectedPair,
        strategy: 'grid_trading',
        totalLevels: parseInt(gridLevels),
        priceRange: [parseFloat(lowerPrice), parseFloat(upperPrice)],
        totalAmount: parseFloat(totalAmount)
      }
    };

    try {
      setLoading(true);
      console.log('Creating grid strategy:', strategyPayload);
      
      const response = await createStrategy(strategyPayload);
      
      if (response && response.success !== false) {
        showMessage(`✅ Grid strategy created with ${gridLevels} levels!`, 'success');
        
        // Reset form
        setLowerPrice('');
        setUpperPrice('');
        setGridLevels('5');
        setTotalAmount('');
        setPreviewOrders([]);
      } else {
        showMessage(response?.message || 'Error creating grid strategy', 'error');
      }
    } catch (error) {
      console.error('Error creating grid strategy:', error);
      showMessage('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeGridOrders = async () => {
    if (!signer || previewOrders.length === 0) {
      showMessage('No orders to execute', 'error');
      return;
    }

    try {
      setLoading(true);
      showMessage('🔄 Executing grid orders...', 'success');
      
      const [baseToken, quoteToken] = selectedPair.split('/');
      const makerAsset = TOKEN_ADDRESSES[baseToken];
      const takerAsset = TOKEN_ADDRESSES[quoteToken];

      for (let i = 0; i < previewOrders.length; i++) {
        const order = previewOrders[i];
        
        const makingAmountWei = ethers.parseUnits(
          (order.total).toString(), // USDC amount
          6
        );
        const takingAmountWei = ethers.parseEther(order.amount.toString()); // ETH amount
        
        const orderParams = {
          makerAsset: takerAsset, // We're selling USDC
          takerAsset: makerAsset, // To buy ETH
          makingAmount: makingAmountWei.toString(),
          takingAmount: takingAmountWei.toString(),
          maker: account
        };

        const signedOrder = await createAndSignLimitOrder(orderParams, signer);
        
        const payload = {
          strategy_id: 1, // Grid strategy ID
          userAddress: account,
          orderData: {
            makerAsset: takerAsset,
            takerAsset: makerAsset,
            makingAmount: makingAmountWei.toString(),
            takingAmount: takingAmountWei.toString(),
            salt: ethers.toBigInt(ethers.hexlify(ethers.randomBytes(32))).toString(),
            maker: account,
            makerTraits: `0x${i.toString(16).padStart(64, '0')}` // Grid level identifier
          },
          orderHash: signedOrder.orderHash,
          signature: signedOrder.signature,
          makerSymbol: quoteToken,
          takerSymbol: baseToken,
          priceAtCreation: order.price
        };

        await createOrder(payload);
        
        // Update preview to show progress
        setPreviewOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: 'SUBMITTED' } : o
        ));
      }

      showMessage(`✅ Successfully created ${previewOrders.length} grid orders!`, 'success');
      
    } catch (error) {
      console.error('Error executing grid orders:', error);
      showMessage(`❌ Error executing orders: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const getOrderColor = (index, total) => {
    const ratio = index / (total - 1);
    if (ratio < 0.33) return 'bg-green-500/20 border-green-500/40';
    if (ratio < 0.66) return 'bg-yellow-500/20 border-yellow-500/40';
    return 'bg-red-500/20 border-red-500/40';
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-2">
          Grid Trading Strategy
        </h1>
        <p className="text-slate-400">Automated buy orders across price ranges</p>
      </div>

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
        {/* Configuration Panel */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-600/30 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <h2 className="text-xl font-semibold text-green-300">Grid Configuration</h2>
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

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Lower Price ($)"
                value={lowerPrice}
                onChange={(e) => setLowerPrice(e.target.value)}
                placeholder="2800.00"
                className="w-full"
              />
              <Input
                label="Upper Price ($)"
                value={upperPrice}
                onChange={(e) => setUpperPrice(e.target.value)}
                placeholder="3200.00"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Grid Levels"
                value={gridLevels}
                onChange={(e) => setGridLevels(e.target.value)}
                placeholder="5"
                type="number"
                min="2"
                max="20"
                className="w-full"
              />
              <Input
                label="Total Amount (ETH)"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="1.0"
                className="w-full"
              />
            </div>

            {previewOrders.length > 0 && (
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <p className="text-sm text-slate-400 mb-2">Grid Summary:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-400">Total Orders: {previewOrders.length}</p>
                    <p className="text-blue-400">Price Range: {formatPrice(parseFloat(lowerPrice))} - {formatPrice(parseFloat(upperPrice))}</p>
                  </div>
                  <div>
                    <p className="text-purple-400">Amount per order: {(parseFloat(totalAmount) / previewOrders.length).toFixed(4)} ETH</p>
                    <p className="text-cyan-400">Total Investment: ~{formatPrice(previewOrders.reduce((sum, o) => sum + o.total, 0))}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button 
                onClick={handleCreateGridStrategy} 
                disabled={loading || !isConnected || previewOrders.length === 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:opacity-50"
              >
                {loading ? '⏳ Creating...' : '🚀 Create Grid Strategy'}
              </Button>
              
              <Button 
                onClick={executeGridOrders} 
                disabled={loading || !isConnected || previewOrders.length === 0}
                variant="secondary"
                className="px-6 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40"
              >
                {loading ? '⏳' : '⚡'} Execute
              </Button>
            </div>
          </div>
        </div>

        {/* Grid Preview */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-600/30 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
            <h2 className="text-xl font-semibold text-purple-300">Grid Orders Preview</h2>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {previewOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-slate-400">Configure grid parameters to see preview</p>
              </div>
            ) : (
              <div className="space-y-2">
                {previewOrders.map((order, index) => (
                  <div 
                    key={order.id} 
                    className={`p-3 rounded-lg border transition-all duration-200 ${getOrderColor(index, previewOrders.length)}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold">
                          {order.id}
                        </span>
                        <span className="text-sm font-medium text-white">
                          BUY {order.amount.toFixed(4)} ETH
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'SUBMITTED' ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/20 text-slate-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Price: {formatPrice(order.price)}</span>
                      <span>Total: {formatPrice(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Visualization */}
      {previewOrders.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-cyan-300 mb-4">📊 Price Grid Visualization</h3>
          <div className="flex items-end justify-between h-32 bg-slate-900/50 rounded-lg p-4">
            {previewOrders.map((order, index) => (
              <div key={order.id} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-8 bg-gradient-to-t from-green-500 to-blue-500 rounded-t transition-all duration-300`}
                  style={{ 
                    height: `${(order.price - parseFloat(lowerPrice)) / (parseFloat(upperPrice) - parseFloat(lowerPrice)) * 100}%`,
                    minHeight: '20px'
                  }}
                ></div>
                <span className="text-xs text-slate-400 rotate-45 origin-bottom-left">
                  ${order.price.toFixed(0)}
                </span>
              </div>
            ))}
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