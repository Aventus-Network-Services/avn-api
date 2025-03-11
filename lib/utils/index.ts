import { TypeRegistry } from '@polkadot/types';
import { Keyring } from '@polkadot/keyring';

export * from './accountUtils';
export * from './utils';
export * from './nonceUtils';

export const registry = new TypeRegistry();
export const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });

export enum TxType {
  ProxyAvtTransfer = 'proxyAvtTransfer',
  ProxyTokenTransfer = 'proxyTokenTransfer',
  ProxyConfirmTokenLift = 'proxyConfirmTokenLift',

  // Ethereum events
  ProxyMintEthereumBatchNft = 'proxyMintEthereumBatchNft',
  ProxyTransferEthereumNft = 'proxyTransferEthereumNft',
  ProxyCancelEthereumNftSale = 'proxyCancelEthereumNftSale',
  ProxyEndEthereumBatchSale = 'proxyEndEthereumBatchSale',

  ProxyTokenLower = 'proxyTokenLower',
  ProxyCreateNftBatch = 'proxyCreateNftBatch',
  ProxyMintSingleNft = 'proxyMintSingleNft',
  ProxyMintBatchNft = 'proxyMintBatchNft',
  ProxyListNftOpenForSale = 'proxyListNftOpenForSale',
  ProxyListEthereumNftForSale = 'proxyListEthereumNftForSale',
  ProxyListNftBatchForSale = 'proxyListNftBatchForSale',
  ProxyListEthereumNftBatchForSale = 'proxyListEthereumNftBatchForSale',
  ProxyTransferFiatNft = 'proxyTransferFiatNft',
  ProxyCancelListFiatNft = 'proxyCancelListFiatNft',
  ProxyEndNftBatchSale = 'proxyEndNftBatchSale',
  proxyStakeAvt = 'proxyStakeAvt',
  ProxyIncreaseStake = 'proxyIncreaseStake',
  ProxyUnstake = 'proxyUnstake',
  ProxyWithdrawUnlocked = 'proxyWithdrawUnlocked',
  ProxyScheduleLeaveNominators = 'proxyScheduleLeaveNominators',
  ProxyExecuteLeaveNominators = 'proxyExecuteLeaveNominators',
  ProxyRegisterHander = 'proxyRegisterHandler',
  ProxySubmitCheckpoint = 'proxySubmitCheckpoint',

  // Prediction_Market market
  ProxyCreateMarketAndDeployPool = 'proxyCreateMarketAndDeployPool',
  ProxyReportMarketOutcome = 'proxyReportMarketOutcome',
  ProxyRedeemMarketShares = 'proxyRedeemMarketShares',
  ProxyTransferMarketTokens = 'proxyTransferMarketTokens',
  ProxyBuyMarketOutcomeTokens = 'proxyBuyMarketOutcomeTokens',
  ProxySellMarketOutcomeTokens = 'proxySellMarketOutcomeTokens',
  ProxyWithdrawMarketTokens = 'proxyWithdrawMarketTokens',

  ProxyAddPredictionMarketLiquidity = 'proxyAddPredictionMarketLiquidity',
  ProxyExitPredictionMarketLiquidity = 'proxyExitWithFees',


  // Node manager
  ProxyRegisterNode = 'proxyRegisterNode'
}

export enum EthereumLogEventType {
  AddedValidator = 0,
  Lifted = 1,
  NftMint = 2,
  NftTransferTo = 3,
  NftCancelListing = 4,
  NftEndBatchListing = 5
}

export enum Market {
  Ethereum = 1,
  Fiat = 2
}

export enum StakingStatus {
  isStaking = 'isStaking',
  isNotStaking = 'isNotStaking'
}
