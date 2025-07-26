import { useState } from 'react';

export default function BotForm() {
  const [pair, setPair] = useState('ETH/USDC');
  const [price, setPrice] = useState('3200.00');

  return (
    <div className="bg-white/5 rounded-2xl p-6 w-full max-w-md backdrop-blur border border-white/10">
      <h3 className="text-2xl font-bold text-cyan-400 mb-4">Limit Order Bot Maker</h3>

      <div className="mb-3">
        <label className="block text-sm mb-1">Pair</label>
        <select
          className="w-full bg-white/10 border border-white/10 text-white py-2 px-3 rounded-lg"
          value={pair}
          onChange={(e) => setPair(e.target.value)}
        >
          <option>ETH/USDC</option>
          <option>ETH/DAI</option>
          <option>BTC/USDC</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Sell Price</label>
        <input
          type="text"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full bg-white/10 border border-white/10 text-white py-2 px-3 rounded-lg"
        />
      </div>

      <button className="w-full bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg hover:bg-cyan-300 transition">
        Create Strategy
      </button>
    </div>
  );
}
