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
  BlockRange: {
    start: 'BlockNumber',
    end: 'BlockNumber'
  },
  TimeRange: {
    start: 'Moment',
    end: 'Moment'
  },
  MarketPeriod: {
    _enum: {
      Block: 'BlockRange',
      Timestamp: 'TimeRange'
    }
  },
  AssetOf: 'Asset<MarketId>',
  MarketPeriodOf: 'MarketPeriod<BlockNumber, Moment>',
  DeadlinePeriodOf: 'Deadlines<BlockNumber>',
  MarketId: 'u128',
  CategoryIndex: 'u16',
  PoolId: 'u128',
  MultiHash: {
    _enum: {
      Sha3_384: '[u8; 50]'
    }
  },
  Asset: {
    _enum: {
      CategoricalOutcome: '(MarketId, CategoryIndex)',
      ScalarOutcome: '(MarketId, ScalarPosition)',
      CombinatorialOutcome: null,
      PoolShare: 'PoolId',
      Vow: null,
      ForeignAsset: 'u32',
      ParimutuelShare: '(MarketId, CategoryIndex)'
    }
  },
  ScalarPosition: {
    _enum: {
      Long: null,
      Short: null
    }
  },
  MarketType: {
    _enum: {
      /// A market with a number of categorical outcomes.
      Categorical: 'u16'
    }
  },
  MarketDisputeMechanism: {
    _enum: {
      Authorized: null,
      Court: null
    }
  },
  Deadlines: {
    grace_period: 'BlockNumber',
    oracle_duration: 'BlockNumber',
    dispute_duration: 'BlockNumber'
  },
  Strategy: {
    _enum: {
      ImmediateOrCancel: null,
      LimitOrder: null
    }
  },
  OutcomeReport: {
    _enum: {
      Categorical: 'CategoryIndex',
      Scalar: 'u128'
    }
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
  proxyBuyMarketOutcomeTokens: async proxyArgs => await signProxyBuy(proxyArgs),
  proxySellMarketOutcomeTokens: async proxyArgs => await signProxySell(proxyArgs),
  proxyReportMarketOutcome: async proxyArgs => await signProxyReport(proxyArgs),
  proxyRedeemMarketShares: async proxyArgs => await signProxyRedeemShares(proxyArgs),
  proxyTransferMarketTokens: async proxyArgs => await signProxyTransferAsset(proxyArgs),
  proxyWithdrawMarketTokens: async proxyArgs => await signProxyWithdrawMarketToken(proxyArgs),
  proxyRegisterNode: async proxyArgs => await signProxyRegisterNode(proxyArgs),
  proxyDeregisterNodes: async proxyArgs => await signProxyDeregisterNodes(proxyArgs),
  proxyAddPredictionMarketLiquidity: async proxyArgs => await signProxyAddPredictionMarketLiquidity(proxyArgs),
  proxyExitPredictionMarketLiquidity: async proxyArgs => await signProxyExitPredictionMarketLiquidity(proxyArgs),
  proxyWithdrawPredictionMarketLiquidityFees: async proxyArgs =>
    await signedProxyWithdrawPredictionMarketLiquidityFees(proxyArgs),
  proxyBuyCompletePredictionMarketOutcomeTokens: async proxyArgs =>
    await signedProxyBuyCompletePredictionMarketOutcomeTokens(proxyArgs)
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

    let signatureType = {};

    if (feeData.proxySignature.length === 132) {
      // This is an ECDSA signature
      signatureType = { Ecdsa: feeData.proxySignature };
    } else {
      signatureType = { Sr25519: feeData.proxySignature };
    }

    const proxyProofData = [{ AccountId: user }, { AccountId: feeData.relayer }, { MultiSignature: signatureType }];

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

async function signProxyRegisterChainHandler({ relayer, name, signerAddress, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const handler = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'register_chain_handler' },
    { AccountId: dataRelayer },
    { AccountId: handler },
    { 'Vec<u8>': name }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxySubmitCheckpointWithIdentity({
  relayer,
  signerAddress,
  checkpoint,
  chainId,
  nonce,
  checkpointOriginId,
  api
}) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const handler = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'submit_checkpoint' },
    { AccountId: dataRelayer },
    { AccountId: handler },
    { H256: checkpoint },
    { u32: chainId },
    { u64: nonce },
    { u64: checkpointOriginId }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyCreateMarketAndDeployPool({
  relayer,
  signerAddress,
  baseAsset,
  creatorFee,
  marketType,
  disputeMechanism,
  oracle,
  period,
  deadlines,
  metadata,
  amount,
  spotPrices,
  swapFee,
  nonce,
  api
}) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const validatedOracle = AccountUtils.convertToPublicKeyIfNeeded(oracle);

  const orderedData = [
    { Text: 'create_market_and_deploy_pool' },
    { AccountId: dataRelayer },
    { u64: nonce },
    { AssetOf: baseAsset },
    { Perbill: creatorFee },
    { AccountId: validatedOracle },
    { MarketPeriodOf: period },
    { DeadlinePeriodOf: deadlines },
    { MultiHash: metadata },
    { MarketType: marketType },
    { 'Option<MarketDisputeMechanism>': disputeMechanism },
    { BalanceOf: amount },
    { 'Vec<BalanceOf>': spotPrices },
    { BalanceOf: swapFee }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyBuy({
  relayer,
  nonce,
  signerAddress,
  marketId,
  assetCount,
  asset,
  amountIn,
  maxPrice,
  orders,
  strategy,
  api
}) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'buy outcome tokens' },
    { AccountId: dataRelayer },
    { u64: nonce },
    { u128: marketId },
    { u16: assetCount },
    { AssetOf: asset },
    { BalanceOf: amountIn },
    { BalanceOf: maxPrice },
    { 'Vec<u128>': orders },
    { u8: strategy }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxySell({
  relayer,
  nonce,
  signerAddress,
  marketId,
  assetCount,
  asset,
  amountIn,
  minPrice,
  orders,
  strategy,
  api
}) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'sell outcome tokens' },
    { AccountId: dataRelayer },
    { u64: nonce },
    { u128: marketId },
    { u16: assetCount },
    { AssetOf: asset },
    { BalanceOf: amountIn },
    { BalanceOf: minPrice },
    { 'Vec<u128>': orders },
    { Strategy: strategy }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyReport({ relayer, nonce, signerAddress, marketId, outcome, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'report_market_outcome_context' },
    { AccountId: dataRelayer },
    { u64: nonce },
    { u128: marketId },
    { OutcomeReport: outcome }
  ];
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyRedeemShares({ relayer, nonce, signerAddress, marketId, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [{ Text: 'redeem_shares_context' }, { AccountId: dataRelayer }, { u64: nonce }, { u128: marketId }];
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyTransferAsset({ relayer, nonce, signerAddress, assetEthAddress, to, amount, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const from = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'transfer_tokens_context' },
    { AccountId: dataRelayer },
    { u64: nonce },
    { H160: assetEthAddress },
    { AccountId: from },
    { AccountId: to },
    { BalanceOf: amount }
  ];
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyWithdrawMarketToken({ relayer, nonce, signerAddress, assetEthAddress, amount, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const owner = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'withdraw_tokens_context' },
    { AccountId: dataRelayer },
    { u64: nonce },
    { H160: assetEthAddress },
    { AccountId: owner },
    { BalanceOf: amount }
  ];
  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyRegisterNode({ relayer, signerAddress, nodeId, nodeOwner, nodeSigningKey, blockNumber, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const nodeIdPk = AccountUtils.convertToPublicKeyIfNeeded(nodeId);
  const nodeOwnerPk = AccountUtils.convertToPublicKeyIfNeeded(nodeOwner);

  const orderedData = [
    { Text: 'register_node' },
    { AccountId: dataRelayer },
    { AccountId: nodeIdPk },
    { AccountId: nodeOwnerPk },
    { AccountId: nodeSigningKey },
    { BlockNumber: blockNumber }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyDeregisterNodes({ relayer, signerAddress, nodesToDeregister, nodeOwner, blockNumber, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const nodeOwnerPk = AccountUtils.convertToPublicKeyIfNeeded(nodeOwner);
  nodesToDeregister = nodesToDeregister.map(node => AccountUtils.convertToPublicKeyIfNeeded(node));

  console.log(
    `signProxyDeregisterNodes:
    relayer: ${dataRelayer},
    nodeOwnerPk: ${nodeOwnerPk},
    nodesToDeregister: ${nodesToDeregister},
    num_nodes: ${nodesToDeregister.length }
    blockNumber: ${blockNumber}`
  )

  const orderedData = [
    { Text: 'deregister_node' },
    { AccountId: dataRelayer },
    { AccountId: nodeOwnerPk },
    { 'Vec<AccountId>': nodesToDeregister },
    { u32: nodesToDeregister.length },
    { BlockNumber: blockNumber }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  console.log(`signProxyDeregisterNodes encodedDataToSign: ${Utils.convertToHexIfNeeded(encodedDataToSign)}`);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyAddPredictionMarketLiquidity({
  relayer,
  marketId,
  poolSharesAmount,
  maxAmountsIn,
  signerAddress,
  blockNumber,
  api
}) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'neo_swap::join_context' },
    { AccountId: relayer },
    { u128: marketId },
    { BalanceOf: poolSharesAmount },
    { 'Vec<BalanceOf>': maxAmountsIn },
    { BlockNumber: blockNumber }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyExitPredictionMarketLiquidity({
  relayer,
  marketId,
  poolSharesAmountOut,
  minAmountsOut,
  signerAddress,
  blockNumber,
  api
}) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const orderedData = [
    { Text: 'neo_swap::exit_context' },
    { AccountId: relayer },
    { u128: marketId },
    { BalanceOf: poolSharesAmountOut },
    { 'Vec<BalanceOf>': minAmountsOut },
    { BlockNumber: blockNumber }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signedProxyWithdrawPredictionMarketLiquidityFees({ relayer, marketId, signerAddress, blockNumber, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const orderedData = [
    { Text: 'neo_swap::withdraw_fees_context' },
    { AccountId: relayer },
    { u128: marketId },
    { BlockNumber: blockNumber }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signedProxyBuyCompletePredictionMarketOutcomeTokens({ relayer, nonce, marketId, signerAddress, amount, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const orderedData = [
    { Text: 'buy_complete_set_context' },
    { AccountId: relayer },
    { u64: nonce },
    { u128: marketId },
    { BalanceOf: amount }
  ];

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
