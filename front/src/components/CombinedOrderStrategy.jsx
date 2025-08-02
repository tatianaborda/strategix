import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { createStrategy, fetchStrategies } from '../services/strategyService';
import { createOrder } from '../services/orderService';
import useWallet from '../hooks/useWallet';
import { ethers } from 'ethers';

export default function CombinedOrderStrategy() {
  const { account, signer } = useWallet();

  const [selectedPair, setSelectedPair] = useState('ETH/USDC');
  const [sellPrice, setSellPrice] = useState('$3,200.00');
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const pairs = [
    { value: 'ETH/USDC', label: 'ETH/USDC' },
    { value: 'BTC/USDC', label: 'BTC/USDC' },
    { value: 'SOL/USDC', label: 'SOL/USDC' },
    { value: 'ADA/USDC', label: 'ADA/USDC' },
    { value: 'MATIC/USDC', label: 'MATIC/USDC' },
  ];

  const refreshStrategies = async () => {
    if (!account) return;
    const fetched = await fetchStrategies(account);
    setStrategies(fetched);
  };

  useEffect(() => {
    refreshStrategies();
  }, [account]);

  const handleCreateStrategy = async () => {
    if (!account) return alert('Conecta tu wallet');

    const cleanPrice = sellPrice.replace('$', '').replace(',', '');

    const strategyPayload = {
      name: `Limit Sell ${selectedPair}`,
      wallet_address: account,
      conditions: [
        {
          type: 'price_above',
          value: cleanPrice,
          pair: selectedPair
        }
      ],
      actions: [
        {
          type: 'sell_limit_order',
          tokenPair: selectedPair,
          price: cleanPrice,
          wallet: account
        }
      ]
    };

    setLoading(true);
    const response = await createStrategy(strategyPayload);
    if (response?.success) {
      setSuccessMsg('Estrategia creada ✅');
      refreshStrategies();
      setSellPrice('');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setLoading(false);
  };

  const handleCreateOrder = async (strategy) => {
    if (!signer) return alert('Wallet no conectada');

    const msgToSign = JSON.stringify({
      strategy_id: strategy.id,
      price: strategy.actions[0]?.price || '0',
      timestamp: Date.now()
    });

    const signature = await signer.signMessage(msgToSign);

    const payload = {
      strategy_id: strategy.id,
      wallet_address: account,
      execution_price: strategy.actions[0]?.price || '0',
      order_data: msgToSign,
      order_hash: signature
    };

    setLoading(true);
    const result = await createOrder(payload);
    if (result) {
      setSuccessMsg('Orden creada y firmada ✅');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* CREAR ESTRATEGIA */}
      <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-600/30">
        <h2 className="text-lg font-semibold text-cyan-300 mb-4">Crear nueva estrategia</h2>
        <div className="space-y-4">
          <Select
            value={selectedPair}
            onChange={setSelectedPair}
            options={pairs}
            placeholder="Select pair"
          />
          <Input
            label="Precio de venta"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="Ej: $3200.00"
          />
          <Button 
            onClick={handleCreateStrategy} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creando...' : 'Crear Estrategia'}
          </Button>
          {successMsg && <p className="text-green-400 text-sm text-center">{successMsg}</p>}
        </div>
      </div>

      {/* ESTRATEGIAS EXISTENTES */}
      <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-600/30">
        <h2 className="text-lg font-semibold text-purple-300 mb-4">Mis estrategias</h2>
        {strategies.length === 0 ? (
          <p className="text-slate-400 text-sm">No tienes estrategias creadas aún.</p>
        ) : (
          <ul className="space-y-3">
            {strategies.map(strategy => (
              <li key={strategy.id} className="bg-slate-700/60 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-cyan-200 font-medium">{strategy.name}</p>
                  <p className="text-slate-400 text-xs">Condición: {strategy.conditions?.[0]?.type} {strategy.conditions?.[0]?.value}</p>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => handleCreateOrder(strategy)}
                  disabled={loading}
                >
                  Emitir Orden
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
