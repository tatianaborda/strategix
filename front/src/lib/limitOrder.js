import { ethers } from 'ethers';

// Contract 1inch v5  mainnet
const LIMIT_ORDER_PROTOCOL_ADDRESS = '0x1111111254eeb25477b68fb85ed929f73a960582';

const LIMIT_ORDER_ABI = [
  "function fillOrder((uint256,address,address,address,address,uint256,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes,bytes) order, bytes signature, uint256 makingAmount, uint256 takingAmount, uint256 skipPermitAndThresholdAmount)",
  "function cancelOrder((uint256,address,address,address,address,uint256,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes,bytes) order)",
  "event OrderFilled(address indexed maker, bytes32 orderHash, uint256 remaining)"
];

export class LimitOrderService {
  constructor(signer) {
    this.signer = signer;
    this.contract = new ethers.Contract(
      LIMIT_ORDER_PROTOCOL_ADDRESS,
      LIMIT_ORDER_ABI,
      signer
    );
  }

  // order compatible with 1inch v5
  async createOrderStruct(orderParams) {
  const makerAsset = ethers.getAddress(orderParams.makerAsset.toLowerCase());
  const takerAsset = ethers.getAddress(orderParams.takerAsset.toLowerCase());
  const maker = ethers.getAddress(orderParams.maker.toLowerCase());
  const { 
    makingAmount,  
    takingAmount   
  } = orderParams;

  if (!makingAmount || !takingAmount) {
    throw new Error('required params: makingAmount o takingAmount');
  }
    const salt = ethers.toBigInt(ethers.hexlify(ethers.randomBytes(32)));
     
  const order = {
    salt,
    maker,
    receiver: ethers.ZeroAddress,
    makerAsset,
    takerAsset,
    makingAmount: makingAmount.toString(),
    takingAmount: takingAmount.toString(), 
    makerTraits: 0n,
    makerAssetData: '0x',
    takerAssetData: '0x',
    getMakerAmount: '0x',
    getTakerAmount: '0x',
    predicate: '0x',
    permit: '0x',
    interaction: '0x'
  };

  console.log('Order struct created:', {
    maker,
    makerAsset,
    takerAsset,
    makingAmount: order.makingAmount,
    takingAmount: order.takingAmount,
    salt: salt.toString()
  });

  return order;
}
  // Sign order off-chain
async signOrder(order) {
  try {
    const network = await this.signer.provider.getNetwork();
    console.log('🌐 Network info:', { 
      chainId: network.chainId.toString(), // just for logging
      name: network.name 
    });


    const requiredFields = ['salt', 'maker', 'makerAsset', 'takerAsset', 'makingAmount', 'takingAmount'];
    for (const field of requiredFields) {
      if (!order[field]) {
        throw new Error(`Missing required field in the order: ${field}`);
      }
    }

    const domain = {
      name: 'AggregationRouter',
      version: '5',
      chainId: network.chainId, 
      verifyingContract: LIMIT_ORDER_PROTOCOL_ADDRESS
    };

    // datatype for 1inch v5
    const types = {
      Order: [
        { name: 'salt', type: 'uint256' },
        { name: 'maker', type: 'address' },
        { name: 'receiver', type: 'address' },
        { name: 'makerAsset', type: 'address' },
        { name: 'takerAsset', type: 'address' },
        { name: 'makingAmount', type: 'uint256' },
        { name: 'takingAmount', type: 'uint256' },
        { name: 'makerTraits', type: 'uint256' },
        { name: 'makerAssetData', type: 'bytes' },
        { name: 'takerAssetData', type: 'bytes' },
        { name: 'getMakerAmount', type: 'bytes' },
        { name: 'getTakerAmount', type: 'bytes' },
        { name: 'predicate', type: 'bytes' },
        { name: 'permit', type: 'bytes' },
        { name: 'interaction', type: 'bytes' }
      ]
    };

    const orderForSigning = {
      ...order,
      salt: order.salt.toString(), 
      makingAmount: order.makingAmount.toString(),
      takingAmount: order.takingAmount.toString(),
      makerTraits: order.makerTraits?.toString() || '0'
    };

    console.log('📝 Signing order with domain:', {
      ...domain,
      chainId: domain.chainId.toString() // For logging
    });

    console.log('📄 Order structure:', {
      ...orderForSigning,
      makingAmount: `${ethers.formatUnits(order.makingAmount, 18)} ETH`,
      takingAmount: `${ethers.formatUnits(order.takingAmount, 6)} USDC`
    });

    // Sign the order
    const signature = await this.signer.signTypedData(domain, types, orderForSigning);
    
    // Calculate order hash
    const orderHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        [
          'uint256', 'address', 'address', 'address', 'address',
          'uint256', 'uint256', 'uint256', 'bytes', 'bytes',
          'bytes', 'bytes', 'bytes', 'bytes', 'bytes'
        ],
        [
          order.salt, 
          order.maker,
          order.receiver,
          order.makerAsset,
          order.takerAsset,
          order.makingAmount, 
          order.takingAmount, 
          order.makerTraits || 0n,
          order.makerAssetData || '0x',
          order.takerAssetData || '0x',
          order.getMakerAmount || '0x',
          order.getTakerAmount || '0x',
          order.predicate || '0x',
          order.permit || '0x',
          order.interaction || '0x'
        ]
      )
    );

    console.log('✅ Order signed successfully:', {
      orderHash,
      signature,
      maker: order.maker,
      makerAsset: order.makerAsset,
      takerAsset: order.takerAsset
    });

    return {
      order: {
        ...order,
        // Ensure all BigInt values are converted to strings for serialization
        salt: order.salt.toString(),
        makingAmount: order.makingAmount.toString(),
        takingAmount: order.takingAmount.toString(),
        makerTraits: order.makerTraits?.toString() || '0'
      },
      signature,
      orderHash
    };

  } catch (error) {
    console.error('❌ Error signing order:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      order: order ? {
        maker: order.maker,
        makerAsset: order.makerAsset,
        takerAsset: order.takerAsset
      } : null
    });

    let errorMessage = 'Error signing the order';
    if (error.code === 'ACTION_REJECTED') {
      errorMessage = 'Signature cancelled by the user';
    } else if (error.message.includes('underlying network changed')) {
      errorMessage = 'The network changed during signing';
    } else if (error.message.includes('invalid address')) {
      errorMessage = 'Invalid contract address';
    }
 
    throw new Error(`${errorMessage}: ${error.message}`);
  }
}}

export async function createAndSignLimitOrder(orderParams, signer) {
  try {
    console.log('🚀 Starting limit order creation...');
    
    const limitOrderService = new LimitOrderService(signer);

    const order = await limitOrderService.createOrderStruct(orderParams);
 
    const signedOrder = await limitOrderService.signOrder(order);
    
    console.log('✅ The order was successfully created and signed', {
      orderHash: signedOrder.orderHash,
      makerAsset: orderParams.makerAsset,
      takerAsset: orderParams.takerAsset
    });

    return signedOrder;

  } catch (error) {
    console.error('❌ Error creating limit order:', error);
    throw error;
  }
}