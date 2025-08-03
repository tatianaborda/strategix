const { abi } = require('../abis/LimitOrderProtocol');

const ONEINCH_CONTRACTS = {
  // MAINNET ADDRESSES 
  MAINNET: {
    // address of protocol v5 de 1inch
    LIMIT_ORDER_PROTOCOL: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    AGGREGATION_ROUTER_V5: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    SERIES_NONCE_MANAGER: '0xe3456f4ee65e745a44ec3bcb83d0f2529d1b84eb'
  },
  
  // Polygon Addresses  
  POLYGON: {
    LIMIT_ORDER_PROTOCOL: '0x94Bc2a1C732BcAd7343B25af48385Fe76E08734f',
    AGGREGATION_ROUTER_V5: '0x1111111254EEB25477B68fb85Ed929f73A960582'
  },
  
  // Arbitrum Addresses
  ARBITRUM: {
    LIMIT_ORDER_PROTOCOL: '0x7F069df72b7A39bCE9806e3AfaF579E54D8CF2b9',
    AGGREGATION_ROUTER_V5: '0x1111111254EEB25477B68fb85Ed929f73A960582'
  },


  LOCAL: {
    LIMIT_ORDER_PROTOCOL: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    AGGREGATION_ROUTER_V5: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
  }
};

const COMMON_TOKENS = {
  MAINNET: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
  },

  LOCAL: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',  
    USDC: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',  
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',  
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',   
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'  
  }
};

const LIMIT_ORDER_PROTOCOL_ABI = abi;

module.exports = {
  ONEINCH_CONTRACTS,
  LIMIT_ORDER_PROTOCOL_ABI,
  COMMON_TOKENS,

  getContractAddress: (network = 'MAINNET', contractName = 'LIMIT_ORDER_PROTOCOL') => {
    const address = ONEINCH_CONTRACTS[network.toUpperCase()]?.[contractName];
    if (!address) {
      throw new Error(`Contract ${contractName} not found for network ${network}`);
    }
    return address;
  },

  getTokenAddress: (network = 'MAINNET', tokenSymbol = 'WETH') => {
    const address = COMMON_TOKENS[network.toUpperCase()]?.[tokenSymbol];
    if (!address) {
      throw new Error(`Token ${tokenSymbol} not found for network ${network}`);
    }
    return address;
  },

validateAndFormatAddress: (address) => {
  try {
    const { getAddress } = require('ethers'); 
    return getAddress(address); 
  } catch (error) {
    throw new Error(`Invalid address format: ${address}`);
  }
}
};