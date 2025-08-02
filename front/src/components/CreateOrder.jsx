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
  const [status, setStatus] = useState('');
  
  useEffect(() => {
    if (!account) return;
    fetchStrategies(account).then(data => {
      setStrategies(data.data || []);
    });
  }, [account]);

  const handleCreate = async () => {
    if (!selectedStrategy || !executionPrice) {
      return setStatus('Faltan datos');
    }

    setStatus('Firmando orden...');

    try {
      const orderPayload = {
        strategy_id: selectedStrategy.id,
        execution_price: executionPrice,
        wallet_address: account
      };

      // 🔐 Paso 1: firmar onchain
      const signedOrder = await signOrder(orderPayload, signer);

      // 🧾 Paso 2: enviar al backend
      const finalOrder = {
        ...orderPayload,
        order_data: signedOrder.orderData,
        order_hash: signedOrder.orderHash
      };

      const response = await createOrder(finalOrder);

      if (response?.success) {
        setStatus('Orden creada correctamente 🎯');
        setExecutionPrice('');
      } else {
        setStatus('Error al crear la orden');
      }

    } catch (err) {
      console.error(err);
      setStatus('Error al firmar o enviar la orden');
    }
  };

  return (
    <div className="max-w-md bg-slate-800/80 border border-slate-600 p-6 rounded-xl text-white">
      <h2 className="text-xl font-bold mb-4">Crear nueva orden</h2>

      <div className="space-y-4">
        <Select
          label="Estrategia"
          value={selectedStrategy?.name}
          onChange={(name) =>
            setSelectedStrategy(strategies.find(s => s.name === name))
          }
          options={strategies.map(s => ({ value: s.name, label: s.name }))}
          placeholder="Seleccioná una estrategia"
        />

        <Input
          label="Precio de ejecución"
          placeholder="Ej: 3150.00"
          value={executionPrice}
          onChange={e => setExecutionPrice(e.target.value)}
        />

        <Button onClick={handleCreate} className="w-full">
          Crear orden
        </Button>

        {status && <p className="text-sm mt-2 text-cyan-300">{status}</p>}
      </div>
    </div>
  );
}
