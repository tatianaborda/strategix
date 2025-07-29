import { useEffect, useState } from 'react';
import { fetchStrategies } from '../services/strategyService';

export default function StrategyList({ account }) {
  const [strategies, setStrategies] = useState([]);

  useEffect(() => {
    if (!account) return;

    const loadStrategies = async () => {
      const data = await fetchStrategies(account);
      setStrategies(data);
    };

    loadStrategies();
  }, [account]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Your Strategies</h2>
      {strategies.length === 0 ? (
        <p>There aren't Strategies yet</p>
      ) : (
        <ul className="space-y-2">
          {strategies.map((s) => (
            <li key={s.id} className="p-2 border rounded shadow">
              <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(s, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
