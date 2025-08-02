module.exports = {
   abi: [
  {
    "inputs": [
      { "internalType": "uint256", "name": "salt", "type": "uint256" },
      { "internalType": "address", "name": "makerAsset", "type": "address" },
      { "internalType": "address", "name": "takerAsset", "type": "address" },
      { "internalType": "address", "name": "maker", "type": "address" },
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "address", "name": "allowedSender", "type": "address" },
      { "internalType": "uint256", "name": "makingAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "takingAmount", "type": "uint256" },
      { "internalType": "bytes", "name": "makerAssetData", "type": "bytes" },
      { "internalType": "bytes", "name": "takerAssetData", "type": "bytes" },
      { "internalType": "bytes", "name": "getMakerAmount", "type": "bytes" },
      { "internalType": "bytes", "name": "getTakerAmount", "type": "bytes" },
      { "internalType": "bytes", "name": "predicate", "type": "bytes" },
      { "internalType": "bytes", "name": "permit", "type": "bytes" },
      { "internalType": "bytes", "name": "interaction", "type": "bytes" }
    ],
    "name": "fillOrder",
    "outputs": [
      { "internalType": "uint256", "name": "actualMakingAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "actualTakingAmount", "type": "uint256" }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "salt", "type": "uint256" },
          { "internalType": "address", "name": "makerAsset", "type": "address" },
          { "internalType": "address", "name": "takerAsset", "type": "address" },
          { "internalType": "address", "name": "maker", "type": "address" },
          { "internalType": "address", "name": "receiver", "type": "address" },
          { "internalType": "address", "name": "allowedSender", "type": "address" },
          { "internalType": "uint256", "name": "makingAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "takingAmount", "type": "uint256" },
          { "internalType": "bytes", "name": "makerAssetData", "type": "bytes" },
          { "internalType": "bytes", "name": "takerAssetData", "type": "bytes" },
          { "internalType": "bytes", "name": "getMakerAmount", "type": "bytes" },
          { "internalType": "bytes", "name": "getTakerAmount", "type": "bytes" },
          { "internalType": "bytes", "name": "predicate", "type": "bytes" },
          { "internalType": "bytes", "name": "permit", "type": "bytes" },
          { "internalType": "bytes", "name": "interaction", "type": "bytes" }
        ],
        "internalType": "struct OrderLib.Order",
        "name": "order",
        "type": "tuple"
      },
      { "internalType": "bytes32", "name": "orderHash", "type": "bytes32" },
      { "internalType": "bytes", "name": "signature", "type": "bytes" },
      { "internalType": "uint256", "name": "makingAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "takingAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "skipPermitAndThresholdAmount", "type": "uint256" },
      { "internalType": "address", "name": "target", "type": "address" },
      { "internalType": "bytes", "name": "targetInteraction", "type": "bytes" }
    ],
    "name": "simulateFillOrder",
    "outputs": [
      { "internalType": "uint256", "name": "actualMakingAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "actualTakingAmount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // hashOrder function
  {
    "inputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "salt", "type": "uint256" },
          { "internalType": "address", "name": "makerAsset", "type": "address" },
          { "internalType": "address", "name": "takerAsset", "type": "address" },
          { "internalType": "address", "name": "maker", "type": "address" },
          { "internalType": "address", "name": "receiver", "type": "address" },
          { "internalType": "address", "name": "allowedSender", "type": "address" },
          { "internalType": "uint256", "name": "makingAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "takingAmount", "type": "uint256" },
          { "internalType": "bytes", "name": "makerAssetData", "type": "bytes" },
          { "internalType": "bytes", "name": "takerAssetData", "type": "bytes" },
          { "internalType": "bytes", "name": "getMakerAmount", "type": "bytes" },
          { "internalType": "bytes", "name": "getTakerAmount", "type": "bytes" },
          { "internalType": "bytes", "name": "predicate", "type": "bytes" },
          { "internalType": "bytes", "name": "permit", "type": "bytes" },
          { "internalType": "bytes", "name": "interaction", "type": "bytes" }
        ],
        "internalType": "struct OrderLib.Order",
        "name": "order",
        "type": "tuple"
      }
    ],
    "name": "hashOrder",
    "outputs": [
      { "internalType": "bytes32", "name": "", "type": "bytes32" }
    ],
    "stateMutability": "view", 
    "type": "function"
  },

  //cancelOrder function
  {
    "inputs": [
      { "internalType": "uint256", "name": "orderInfo", "type": "uint256" }
    ],
    "name": "cancelOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Events for monitoring
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "orderHash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "makingAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "takingAmount", "type": "uint256" }
    ],
    "name": "OrderFilled",
    "type": "event"
  }
]
}