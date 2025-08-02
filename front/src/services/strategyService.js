const BASE_URL = 'http://localhost:4500'; 

export async function fetchStrategies(account) {
  try {
    const res = await fetch(`${BASE_URL}/strategies?walletAddress=${account}`);
    if (!res.ok) throw new Error('Error al obtener estrategias');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function createStrategy({ name, conditions, actions }) {
  try {
    const res = await fetch(`${BASE_URL}/strategies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, conditions, actions })
    });

    if (!res.ok) throw new Error('Error al crear estrategia');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

