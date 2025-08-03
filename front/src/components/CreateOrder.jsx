import { useEffect, useState } from 'react';
import useWallet from '../hooks/useWallet';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { fetchStrategies } from '../services/strategyService';
import { createOrder } from '../services/orderService';
import { signOrder } from '../lib/limitOrder';

export default function CreateOrder() {
  const { account, signer } = useWallet();
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [executionPrice, setExecutionPrice] = useState('');
  const [amount, setAmount] = useState('1');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!account) return;
    fetchStrategies(account).then(data => {
      setStrategies(data.data || []);
    });
  }, [account]);

  const handleCreate = async () => {
    if (!selectedStrategy || !executionPrice || !amount) {
      return setStatus('missing data');
    }

    setStatus('Signing order...');

    try {
      const orderPayload = {
        strategy_id: selectedStrategy.id,
        price: executionPrice,
        amount,
        pair: selectedStrategy?.actions?.[0]?.tokenPair || 'ETH/USDC',
        timestamp: Date.now(),
        wallet: account
      };

      const signedOrder = await signOrder(orderPayload, signer);

      const finalOrder = {
        ...orderPayload,
        execution_price: executionPrice,
        wallet_address: account,
        order_data: signedOrder.orderData,
        order_hash: signedOrder.orderHash
      };

      const response = await createOrder(finalOrder);

      if (response?.success) {
        setStatus('Order created successfully 🎯');
        setExecutionPrice('');
        setAmount('1');
      } else {
        setStatus('Error creating the order');
      }

    } catch (err) {
      console.error(err);
      setStatus('Error signing or sending the order');
    }
  };

  return (
    <div className="max-w-md bg-slate-800/80 border border-slate-600 p-6 rounded-xl text-white">
      <h2 className="text-xl font-bold mb-4">Create new order</h2>

      <div className="space-y-4">
        <Select
          label="Strategy"
          value={selectedStrategy?.name}
          onChange={(name) =>
            setSelectedStrategy(strategies.find(s => s.name === name))
          }
          options={strategies.map(s => ({ value: s.name, label: s.name }))}
          placeholder="Select a strategy"
        />

        <Input
          label="Eecution price"
          placeholder="Ej: 3150.00"
          value={executionPrice}
          onChange={e => setExecutionPrice(e.target.value)}
        />

        <Input
          label="quantity"
          placeholder="Ej: 1"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        <Button onClick={handleCreate} className="w-full">
          Create order
        </Button>

        {status && <p className="text-sm mt-2 text-cyan-300">{status}</p>}
      </div>
    </div>
  );
}
