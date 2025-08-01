const { ethers } = require('ethers');
require('dotenv').config(); 

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL; 

if (!PRIVATE_KEY || !RPC_URL) {
  throw new Error('Faltan las variables de entorno PRIVATE_KEY o RPC_URL');
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

function getProvider() {
  return provider;
}

function getWallet() {
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

module.exports = {
  getProvider,
  getWallet,
};
