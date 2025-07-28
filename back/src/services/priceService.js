const axios = require('axios');

// Cache simple en memoria 
const priceCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

// Mapeo de símbolos a IDs de CoinGecko
const TOKEN_MAPPING = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin', 
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'WBTC': 'wrapped-bitcoin',
  'DAI': 'dai',
  'MATIC': 'matic-network'
};

class PriceService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.rateLimitDelay = 1000; // 1 segundo entre requests para free tier
    this.lastRequestTime = 0;
  }

  // Rate limiting para free tier
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  // Obtener precio actual de un token
  async getCurrentPrice(symbol) {
    const cacheKey = `price_${symbol.toLowerCase()}`;
    const cached = priceCache.get(cacheKey);
    
    // Verificar cache
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.price;
    }

    try {
      await this.waitForRateLimit();
      
      const coinId = TOKEN_MAPPING[symbol.toUpperCase()];
      if (!coinId) {
        throw new Error(`Token ${symbol} not supported`);
      }

      const response = await axios.get(
        `${this.baseURL}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_last_updated_at: true
          },
          timeout: 10000
        }
      );

      const price = response.data[coinId]?.usd;
      if (!price) {
        throw new Error(`Price not found for ${symbol}`);
      }

      // Guardar en cache
      priceCache.set(cacheKey, {
        price,
        timestamp: Date.now(),
        change24h: response.data[coinId]?.usd_24h_change || 0
      });

      return price;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error.message);
      
      // Devolver precio cacheado aunque esté expirado si hay error
      if (cached) {
        console.warn(`Using stale cached price for ${symbol}`);
        return cached.price;
      }
      
      throw error;
    }
  }

  // Obtener múltiples precios
  async getMultiplePrices(symbols) {
    const coinIds = symbols
      .map(symbol => TOKEN_MAPPING[symbol.toUpperCase()])
      .filter(Boolean);

    if (coinIds.length === 0) {
      throw new Error('No valid tokens provided');
    }

    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(
        `${this.baseURL}/simple/price`,
        {
          params: {
            ids: coinIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true
          },
          timeout: 15000
        }
      );

      const prices = {};
      symbols.forEach(symbol => {
        const coinId = TOKEN_MAPPING[symbol.toUpperCase()];
        if (coinId && response.data[coinId]) {
          prices[symbol.toUpperCase()] = {
            price: response.data[coinId].usd,
            change24h: response.data[coinId].usd_24h_change || 0
          };
        }
      });

      return prices;
    } catch (error) {
      console.error('Error fetching multiple prices:', error.message);
      throw error;
    }
  }

  // Obtener datos históricos para backtesting
  async getHistoricalPrice(symbol, days = 7) {
    const coinId = TOKEN_MAPPING[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Token ${symbol} not supported`);
    }

    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(
        `${this.baseURL}/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: days > 90 ? 'daily' : 'hourly'
          },
          timeout: 15000
        }
      );

      return response.data.prices.map(([timestamp, price]) => ({
        timestamp: new Date(timestamp),
        price
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Calcular si una condición de precio se cumple
  checkPriceCondition(currentPrice, condition) {
    const { operator, value } = condition;
    
    switch (operator) {
      case '>':
        return currentPrice > parseFloat(value);
      case '<':
        return currentPrice < parseFloat(value);
      case '>=':
        return currentPrice >= parseFloat(value);
      case '<=':
        return currentPrice <= parseFloat(value);
      case '=':
      case '==':
        return Math.abs(currentPrice - parseFloat(value)) < 0.01; // 1 cent tolerance
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  // Obtener tokens soportados
  getSupportedTokens() {
    return Object.keys(TOKEN_MAPPING).map(symbol => ({
      symbol,
      coinId: TOKEN_MAPPING[symbol]
    }));
  }

  // Limpiar cache
  clearCache() {
    priceCache.clear();
  }
}

module.exports = new PriceService();