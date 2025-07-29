const BASE_URL = 'http://localhost:4000'; 

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
