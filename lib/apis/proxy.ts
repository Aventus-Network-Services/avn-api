'use strict';

import { TxType, Utils, registry } from '../utils';
import { AvnApiConfig, Royalty } from '../interfaces';
import { AccountUtils } from '../utils/accountUtils';
import { u8aConcat, u8aToHex } from '@polkadot/util';
import { createTypeUnsafe } from '@polkadot/types';
import log from 'loglevel';

export interface FeePaymentData {
  relayer: string;
  proxySignature: string;
  relayerFee: string;
  paymentNonce: number;
}

const customTypes = {
  "Range<BlockNumber>": {
    "start": "BlockNumber",
    "end": "BlockNumber"
  },
  "Range<Moment>": {
    "start": "Moment",
    "end": "Moment"
  },
  "MarketPeriod<BlockNumber,Moment>": {
    "_enum": {
      "Block": "Range<BlockNumber>",
      "Timestamp": "Range<Moment>"
    }
  },
  "AssetOf": "Asset<MarketId>",
  "MarketPeriodOf": "MarketPeriod<BlockNumber,Moment>",
  "MarketId" : "u128",
  "CategoryIndex": "u16",
  "PoolId": "u128",
  "MultiHash": {
    "_enum": {
      "Sha3_384": "[u8; 50]",
    }
  },
  "Asset<MarketId>" : {
    "_enum": {
      "CategoricalOutcome" : "(MarketId, CategoryIndex)",
      "ScalarOutcome": "(MarketId, ScalarPosition)",
      "CombinatorialOutcome": null,
      "PoolShare": "PoolId",
      "Vow": null,
      "ForeignAsset": "u32",
      "ParimutuelShare": "(MarketId, CategoryIndex)",
    }
  },
  "ScalarPosition" : {
    "_enum": {
      "Long": null,
      "Short": null
    }
  },
  "MarketType": {
    /// A market with a number of categorical outcomes.
    "Categorical": "u16"
  },
  "MarketDisputeMechanism": {
    "Authorized": null,
    "Court": null,
  },
  "Deadlines<BlockNumber>" : {
    "grace_period": "BlockNumber",
    "oracle_duration": "BlockNumber",
    "dispute_duration": "BlockNumber",
  }
};

// Register these custom types so the registry knows how to decode/encode them
registry.register(customTypes);

const numTypes = ['AccountId', 'Balance', 'BalanceOf', 'EraIndex', 'u8', 'u32', 'u64', 'u128', 'U256', 'H160', 'H256'];

const signing = {
  proxyAvtTransfer: async proxyArgs => await signProxyTokenTransfer(proxyArgs),
  proxyTokenTransfer: async proxyArgs => await signProxyTokenTransfer(proxyArgs),
  proxyConfirmTokenLift: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyMintEthereumBatchNft: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyTransferEthereumNft: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyCancelEthereumNftSale: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyEndEthereumBatchSale: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyTokenLower: async proxyArgs => await signProxyTokenLower(proxyArgs),
  proxyCreateNftBatch: async proxyArgs => await signProxyCreateNftBatch(proxyArgs),
  proxyMintSingleNft: async proxyArgs => await signProxyMintSingleNft(proxyArgs),
  proxyMintBatchNft: async proxyArgs => await signProxyMintBatchNft(proxyArgs),
  proxyListNftOpenForSale: async proxyArgs => await signProxyListNftOpenForSale(proxyArgs),
  proxyListEthereumNftForSale: async proxyArgs => await signProxyListNftOpenForSale(proxyArgs),
  proxyListNftBatchForSale: async proxyArgs => await signProxyListNftBatchForSale(proxyArgs),
  proxyListEthereumNftBatchForSale: async proxyArgs => await signProxyListNftBatchForSale(proxyArgs),
  proxyTransferFiatNft: async proxyArgs => await signProxyTransferFiatNft(proxyArgs),
  proxyCancelListFiatNft: async proxyArgs => await signProxyCancelListFiatNft(proxyArgs),
  proxyStakeAvt: async proxyArgs => await signProxyNominate(proxyArgs),
  proxyEndNftBatchSale: async proxyArgs => await signProxyEndNftBatchSale(proxyArgs),
  proxyIncreaseStake: async proxyArgs => await signProxyIncreaseStake(proxyArgs),
  proxyUnstake: async proxyArgs => await signProxyUnstake(proxyArgs),
  proxyWithdrawUnlocked: async proxyArgs => await signProxyWithdrawUnlocked(proxyArgs),
  proxyScheduleLeaveNominators: async proxyArgs => await signProxyScheduleLeaveNominators(proxyArgs),
  proxyExecuteLeaveNominators: async proxyArgs => await signProxyExecuteLeaveNominators(proxyArgs),
  proxyRegisterHandler: async proxyArgs => await signProxyRegisterChainHandler(proxyArgs),
  proxySubmitCheckpoint: async proxyArgs => await signProxySubmitCheckpointWithIdentity(proxyArgs),
  proxyCreateMarketAndDeployPool: async proxyArgs => await signProxyCreateMarketAndDeployPool(proxyArgs),
  proxyBuy: async proxyArgs => await signProxyBuy(proxyArgs),
  proxySell: async proxyArgs => await signProxySell(proxyArgs),
  proxyReport: async proxyArgs => await signProxyReport(proxyArgs),
  proxyRedeemShares: async proxyArgs => await signProxyRedeemShares(proxyArgs),
  proxyTransferAsset: async proxyArgs => await signProxyTransferAsset(proxyArgs)
};

export default class ProxyUtils {
  // signing object contains functions called by passing transaction type and the arguments to sign to generateProxySignature
  static async generateProxySignature(api: AvnApiConfig, signerAddress: string, transactionType: TxType, proxyArgs: object) {
    return await signing[transactionType](Object.assign({}, proxyArgs, { api, signerAddress }));
  }

  static async generateFeePaymentSignature(
    feeData: FeePaymentData,
    signerAddress: string,
    api: AvnApiConfig,
    requestId: string,
    currencyToken: string
  ) {
    feeData.relayer = AccountUtils.convertToPublicKeyIfNeeded(feeData.relayer);
    const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

    const proxyProofData = [
      { AccountId: user },
      { AccountId: feeData.relayer },
      { MultiSignature: { Sr25519: feeData.proxySignature } }
    ];

    const orderedData = [
      { Text: 'authorization for proxy payment' },
      { SkipEncode: encodeOrderedData(proxyProofData) },
      { AccountId: feeData.relayer },
      { Balance: feeData.relayerFee },
      { H160: currencyToken },
      { u64: feeData.paymentNonce }
    ];

    const encodedDataToSign = encodeOrderedData(orderedData);
    log.debug(new Date(), ` ${requestId} - Payment signature encoded data: ${u8aToHex(encodedDataToSign)}`);

    return await signData(api, signerAddress, encodedDataToSign);
  }
}

async function signProxyTokenTransfer({ relayer, recipient, token, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
  recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);

  const orderedData = [
    { Text: 'authorization for transfer operation' },
    { AccountId: relayer },
    { AccountId: user },
    { AccountId: recipient },
    { H160: token },
    { u128: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  log.debug(new Date(), ` - Proxy signature encoded data: `, Utils.convertToHexIfNeeded(encodedDataToSign));
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyAddEthereumLog({ relayer, eventType, ethereumTransactionHash, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for add ethereum log operation' },
    { AccountId: relayer },
    { u8: eventType },
    { H256: ethereumTransactionHash },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyTokenLower({ relayer, token, amount, t1Recipient, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'authorization for lower operation' },
    { AccountId: relayer },
    { AccountId: user },
    { H160: token },
    { u128: amount },
    { H160: t1Recipient },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyCreateNftBatch({ relayer, totalSupply, royalties, t1Authority, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for create batch operation' },
    { AccountId: relayer },
    { u64: totalSupply },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyMintSingleNft({ relayer, externalRef, royalties, t1Authority, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for mint single nft operation' },
    { AccountId: relayer },
    { 'Vec<u8>': externalRef },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyMintBatchNft({ relayer, batchId, index, owner, externalRef, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  owner = AccountUtils.convertToPublicKeyIfNeeded(owner);

  const orderedData = [
    { Text: 'authorization for mint batch nft operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u64: index },
    { 'Vec<u8>': externalRef },
    { AccountId: owner }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyListNftOpenForSale({ relayer, nftId, market, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list nft open for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyListNftBatchForSale({ relayer, batchId, market, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list batch for sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyTransferFiatNft({ relayer, nftId, recipient, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);

  const orderedData = [
    { Text: 'authorization for transfer fiat nft operation' },
    { AccountId: relayer },
    { U256: nftId },
    { AccountId: recipient },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyCancelListFiatNft({ relayer, nftId, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for cancel list fiat nft for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyEndNftBatchSale({ relayer, batchId, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for end batch sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyNominate({ relayer, targets, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominate operation' },
    { AccountId: relayer },
    { 'Vec<LookupSource>': targets },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyIncreaseStake({ relayer, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominator bond extra operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyUnstake({ relayer, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling nominator unbond operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyWithdrawUnlocked({ relayer, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'parachain authorization for executing nomination requests operation' },
    { AccountId: relayer },
    { AccountId: user },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyScheduleLeaveNominators({ relayer, nonce, signerAddress, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling leaving nominators operation' },
    { AccountId: dataRelayer },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyExecuteLeaveNominators({ relayer, nonce, signerAddress, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'parachain authorization for executing leave nominators operation' },
    { AccountId: dataRelayer },
    { AccountId: user },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyRegisterChainHandler({ relayer, name, signerAddress, api }){
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const handler = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'register_chain_handler' },
    { AccountId: dataRelayer },
    { AccountId: handler },
    { 'Vec<u8>': name },
  ]

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign)

}

async function signProxySubmitCheckpointWithIdentity({relayer, signerAddress, checkpoint, chainId, nonce, api}) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const handler = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'submit_checkpoint' },
    { AccountId: dataRelayer },
    { AccountId: handler },
    { H256: checkpoint },
    { u32: chainId },
    { u64: nonce }
  ]

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign)
}

async function signProxyCreateMarketAndDeployPool({relayer,signerAddress,baseAsset,
  oracle,
  period,
  deadlines,
  metadata,
  amount,
  spotPrices,
  swapFee,nonce, api}){
    const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
    const validatedOracle = AccountUtils.convertToPublicKeyIfNeeded(oracle);

    const orderedData = [
      { Text: 'create_market_and_deploy_pool' },
      { AccountId: dataRelayer },
      { u64: nonce },
      { AssetOf: baseAsset },
      { AccountId: validatedOracle },
      { MarketPeriodOf: period },
      { DeadlinePeriodOf: deadlines },
      { MultiHash: metadata },
      { BalanceOf: amount },
      { 'Vec<u8>': spotPrices },
      { BalanceOf: swapFee },
    ]

    const encodedDataToSign = encodeOrderedData(orderedData);
    return await signData(api, signerAddress, encodedDataToSign);
  }

async function signProxyBuy({ relayer, nonce, signerAddress, marketId, assetCount, asset, amountIn, maxPrice, orders, strategy, api }){
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'buy outcome tokens' },
      { AccountId: dataRelayer },
      { u64: nonce },
      { u32: marketId },
      { u16: assetCount },
      { AssetOf: asset },
      { BalanceOf: amountIn },
      { BalanceOf: maxPrice },
      { 'Vec<u128>': orders },
      { u8: strategy }
  ]
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxySell({relayer, nonce, signerAddress, marketId, assetCount, asset, amountIn, minPrice, orders, strategy, api,}) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'sell outcome tokens' },
    { AccountId: dataRelayer },
    { u64: nonce },
    { u32: marketId },
    { u16: assetCount },
    { AssetOf: asset },
    { BalanceOf: amountIn },
    { BalanceOf: minPrice },
    { 'Vec<u128>': orders },
    { u8: strategy }
  ]
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);

}

async function signProxyReport({relayer, nonce, signerAddress, outcome, api}){
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'report_market_outcome_context' },
      { AccountId: dataRelayer },
      { u64: nonce },
      { u32: outcome }
  ]
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyRedeemShares({relayer, nonce, signerAddress, marketId, api}){
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'redeem_shares_context' },
      { AccountId: dataRelayer },
      { u64: nonce },
      { u32: marketId }
  ]
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyTransferAsset({relayer, nonce, signerAddress, token, who, to,amount, api}){
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'redeem_shares_context' },
      { AccountId: dataRelayer },
      { u64: nonce },
      { H160: token },
      { AccountId: who },
      { AccountId: to },
      { BalanceOf: amount }
  ]
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

function encodeOrderedData(data: object[]) {
  const encodedDataToSign = data.map(d => {
    const [type, value] = Object.entries(d)[0];
    return type === 'SkipEncode' ? value : registry.createType(type as any, value).toU8a(numTypes.includes(type));
  });
  return u8aConcat(...encodedDataToSign);
}

function encodeRoyalties(royalties: Royalty[]) {
  const encodedRoyalties = royalties.map(r => {
    const orderedData = [{ H160: r.recipient_t1_address }, { u32: r.rate.parts_per_million }];
    return encodeOrderedData(orderedData);
  });

  const encodedResult = createTypeUnsafe(registry, 'Vec<(H160, u32)>', [encodedRoyalties]);
  return encodedResult.toU8a(false);
}

// the response to sign() can come from a remote signer so
// handle hex and bytes return types here.
async function signData(api: AvnApiConfig, signerAddress: string, encodedDataToSign: string | Uint8Array) {
  encodedDataToSign = Utils.convertToHexIfNeeded(encodedDataToSign);
  const signature = await api.sign(encodedDataToSign, signerAddress);
  return Utils.convertToHexIfNeeded(signature);
}
