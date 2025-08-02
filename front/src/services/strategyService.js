const BASE_URL = 'http://localhost:4500/api';

export const fetchStrategies = async (walletAddress) => {
  try {
    const url = walletAddress 
      ? `${BASE_URL}/strategies?walletAddress=${walletAddress}`
      : `${BASE_URL}/strategies`;
    
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      // Intentar obtener más detalles del error del servidor
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('Server error details:', errorData);
      } catch (jsonError) {
        console.error('Could not parse error response as JSON');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Response from server:', result);
    
    if (result.success !== undefined) {
      if (result.success) {
        return Array.isArray(result.data) ? result.data : [];
      } else {
        console.error('Server returned error:', result.message);
        throw new Error(result.message || 'Server returned success: false');
      }
    } else if (Array.isArray(result)) {
      return result;
    } else if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else {

      console.warn('Unknown response format:', result);
      return [];
    }
    
  } catch (error) {
    console.error('Error al obtener estrategias:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('No se pudo conectar al servidor. ¿Está el backend corriendo?');
    }
    throw error;
  }
};

export const createStrategy = async (strategyData) => {
  try {
    console.log('Creating strategy:', strategyData);
    
    const response = await fetch(`${BASE_URL}/strategies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(strategyData),
    });
    
    console.log('Create strategy response status:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('Create strategy error details:', errorData);
      } catch (jsonError) {
        console.error('Could not parse error response as JSON');
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Create strategy result:', result);
    
    if (result.success !== undefined) {
      if (result.success) {
        return result.data || result;
      } else {
        throw new Error(result.message || 'Server returned success: false');
      }
    }
    
    return result.data || result;
  } catch (error) {
    console.error('Error al crear estrategia:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('No se pudo conectar al servidor para crear la estrategia');
    }
    
    throw error;
  }
};

//Testing backend connection
export const testConnection = async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
};

// Función para obtener una estrategia específica
export const fetchStrategyById = async (strategyId) => {
  try {
    const url = `${BASE_URL}/strategies/${strategyId}`;
    console.log('Fetching strategy by ID from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error fetching strategy by ID:', error);
    throw error;
  }
};