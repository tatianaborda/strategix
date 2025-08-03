const BASE_URL = 'http://localhost:4500/api';

export async function createOrder(orderData) {
  try {
    if (!orderData?.orderData?.makingAmount) {
      throw new Error('Invalid order format: makingAmount field is missing');
    }

    const payload = {
      strategy_id: orderData.strategy_id,
      userAddress: orderData.userAddress,
      orderData: {
        makerAsset: orderData.orderData.makerAsset,
        takerAsset: orderData.orderData.takerAsset,
        makingAmount: orderData.orderData.makingAmount,
        takingAmount: orderData.orderData.takingAmount,
        maker: orderData.orderData.maker
      }
    };

    console.log('🚀 Payload final completo:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status} creating order`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in createOrder:', {
      message: error.message,
      payload: orderData,
      stack: error.stack
    });
    throw error;
  }
}