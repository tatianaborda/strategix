// src/config/1inch-contracts.js - CONFIGURACIÓN 1INCH
const { abi } = require('../abis/LimitOrderProtocol');

const ONEINCH_CONTRACTS = {
  // Mainnet Addresses
  MAINNET: {
    LIMIT_ORDER_PROTOCOL: '0x119c71D3BbAc22029622cbaEc24854d3D32D2828',
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

  // Local/Testnet (Hardhat)
  LOCAL: {
    LIMIT_ORDER_PROTOCOL: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Primer contrato deployado
    AGGREGATION_ROUTER_V5: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'  // Segundo contrato
  }
};

// ABI del contrato (usando tu archivo existente)
const LIMIT_ORDER_PROTOCOL_ABI = abi;

// Token addresses comunes
const COMMON_TOKENS = {
  MAINNET: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86a33E6413cC2C6AA3F7849d23892EDAf1815',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  LOCAL: {
    WETH: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Mock token en Hardhat
    USDC: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // Mock token en Hardhat
    USDT: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    DAI: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707'
  }
};

module.exports = {
  ONEINCH_CONTRACTS,
  LIMIT_ORDER_PROTOCOL_ABI,
  COMMON_TOKENS,
  
//  MAINNET instead of LOCAL
getContractAddress: (network = 'MAINNET', contractName = 'LIMIT_ORDER_PROTOCOL') => {
  return ONEINCH_CONTRACTS[network.toUpperCase()]?.[contractName];
},

getTokenAddress: (network = 'MAINNET', tokenSymbol = 'WETH') => {
  return COMMON_TOKENS[network.toUpperCase()]?.[tokenSymbol];
}
};