const BASE_URL = 'http://localhost:4500';

export async function createOrder(orderData) {
  try {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!res.ok) throw new Error('Error al crear la orden');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}
