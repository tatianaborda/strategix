import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { createStrategy } from '../services/strategyService';
import useWallet from '../hooks/useWallet';

export default function LimitOrderBot() {
  const [selectedPair, setSelectedPair] = useState('ETH/USDC');
  const [sellPrice, setSellPrice] = useState('$3,200.00');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const { account } = useWallet();

  const pairs = [
    { value: 'ETH/USDC', label: 'ETH/USDC' },
    { value: 'BTC/USDC', label: 'BTC/USDC' },
    { value: 'SOL/USDC', label: 'SOL/USDC' },
    { value: 'ADA/USDC', label: 'ADA/USDC' },
    { value: 'MATIC/USDC', label: 'MATIC/USDC' },
  ];

  const handleCreateStrategy = async () => {
    if (!account) return alert('Conecta tu wallet');

    const strategyPayload = {
      name: `Limit Sell ${selectedPair}`,
      conditions: [
        {
          type: 'price_above',
          value: sellPrice.replace('$', '').replace(',', ''),
          pair: selectedPair
        }
      ],
      actions: [
        {
          type: 'sell_limit_order',
          tokenPair: selectedPair,
          price: sellPrice.replace('$', '').replace(',', ''),
          wallet: account
        }
      ]
    };

    setLoading(true);
    const response = await createStrategy(strategyPayload);

    if (response?.success) {
      setSuccessMsg('Estrategia creada exitosamente 🎉');
      setTimeout(() => setSuccessMsg(''), 3000);
      setSellPrice('');
    }

    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-600/30 w-80 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-400 opacity-50"></div>
      
      <h2 className="text-xl font-bold mb-6 leading-tight">
        <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
          Limit Order Bot Maker
        </span>
      </h2>
      
      <div className="space-y-4">
        <div> 
          <div className="space-y-3">
            <div>
              <label className="block text-slate-200 text-xs font-medium mb-1">
                Pair
              </label>
              <Select
                value={selectedPair}
                onChange={setSelectedPair}
                options={pairs}
                placeholder="Select pair"
              />
            </div>
            
            <Input
              label="Sell Price"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="Enter price"
            />
          </div>
        </div>
        
        <Button 
          className="w-full py-3 text-base font-semibold" 
          onClick={handleCreateStrategy}
          disabled={loading}
        >
          {loading ? 'Creando...' : 'Create Strategy'}
        </Button>

        {successMsg && (
          <div className="text-green-400 text-sm text-center mt-2">{successMsg}</div>
        )}
      </div>
    </div>
  );
}
