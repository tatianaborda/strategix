const { ethers } = require('ethers');

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.RPC_URL);
}

function getWallet() {
  const provider = getProvider();
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

module.exports = {
  getProvider,
  getWallet
};