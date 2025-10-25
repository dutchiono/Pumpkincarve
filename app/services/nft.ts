import { encodeFunctionData } from 'viem';

// NFT Contract ABI - Mint with ETH payment (0.0003 ETH)
const PUMPKIN_NFT_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'imageUrl', type: 'string' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export interface MintTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
  value: `0x${string}`;
}

export class NFTService {
  /**
   * Encode the NFT mint transaction with ETH payment
   */
  static encodeMint(
    nftContractAddress: string,
    imageUrl: string
  ): MintTransaction {
    const data = encodeFunctionData({
      abi: PUMPKIN_NFT_ABI,
      functionName: 'mint',
      args: [imageUrl],
    });

    // 0.0003 ETH = 300000000000000 wei = 0x110d9316ec000 in hex
    return {
      to: nftContractAddress as `0x${string}`,
      data,
      value: '0x110d9316ec000' as `0x${string}`, // 0.0003 ETH in hex
    };
  }
}
