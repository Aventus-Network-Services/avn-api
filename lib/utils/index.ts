import { TypeRegistry } from '@polkadot/types';
import { Keyring } from '@polkadot/keyring';

export * from './accountUtils';
export * from './utils';

export const registry = new TypeRegistry();
export const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });

export enum TxType {
  ProxyAvtTransfer = 'proxyAvtTransfer',
  ProxyTokenTransfer = 'proxyTokenTransfer',
  ProxyConfirmTokenLift = 'proxyConfirmTokenLift',
  ProxyTokenLower = 'proxyTokenLower',
  ProxyCreateNftBatch = 'proxyCreateNftBatch',
  ProxyMintSingleNft = 'proxyMintSingleNft',
  ProxyMintBatchNft = 'proxyMintBatchNft',
  ProxyListNftOpenForSale = 'proxyListNftOpenForSale',
  ProxyListNftBatchForSale = 'proxyListNftBatchForSale',
  ProxyTransferFiatNft = 'proxyTransferFiatNft',
  ProxyCancelListFiatNft = 'proxyCancelListFiatNft',
  ProxyEndNftBatchSale = 'proxyEndNftBatchSale',
  proxyStakeAvt = 'proxyStakeAvt',
  ProxyIncreaseStake = 'proxyIncreaseStake',
  ProxyUnstake = 'proxyUnstake',
  ProxyWithdrawUnlocked = 'proxyWithdrawUnlocked',
  ProxyScheduleLeaveNominators = 'proxyScheduleLeaveNominators',
  ProxyExecuteLeaveNominators = 'proxyExecuteLeaveNominators'
};

export enum EthereumLogEventType {
  AddedValidator = 0,
  Lifted = 1,
  NftMint = 2,
  NftTransferTo = 3,
  NftCancelListing = 4,
  NftCancelBatchListing = 5
};

export enum Market {
    Ethereum = 1,
    Fiat = 2
}

export enum StakingStatus {
    isStaking = 'isStaking',
    isNotStaking = 'isNotStaking'
}