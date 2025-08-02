require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        blockNumber: 18500000 
      },
      chainId: 31337,
      accounts: {
        count: 20,
        initialBalance: "10000000000000000000000"
      }
    }
  }
};