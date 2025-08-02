import { ethers } from 'ethers';
// import your ABI and contract address
import LimitOrderProtocolAbi from '../abis/LimitOrderProtocol.json';

const CONTRACT_ADDRESS = '0xYour1inchLimitOrderProtocolAddress';

export async function signOrder(orderPayload, signer) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, LimitOrderProtocolAbi, signer);

  // TO DO construir orden onchain según el protocolo de 1inch
  // Esta parte depende del tipo de orden (simple, RFQ, etc.)
  
  const dummyOrderData = ethers.solidityPacked(['address', 'uint256'], [orderPayload.wallet_address, ethers.parseUnits(orderPayload.execution_price, 18)]);
  const dummyOrderHash = ethers.keccak256(dummyOrderData);

  return {
    orderData: dummyOrderData,
    orderHash: dummyOrderHash
  };
}
