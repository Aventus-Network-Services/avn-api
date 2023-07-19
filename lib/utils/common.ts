'use strict';

import { hexToU8a, isHex, u8aToHex, isNumber } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { TypeRegistry } from '@polkadot/types';
import { Keyring } from '@polkadot/keyring';
import { validate as uuidValidate } from 'uuid';
import BN = require('bn.js');
import { Royalty } from '../interfaces';
import { Query } from '../apis/query';

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

export function convertToPublicKeyIfNeeded(accountAddressOrPublicKey: string) {
  if (isAccountPK(accountAddressOrPublicKey)) {
    return accountAddressOrPublicKey;
  }

  const pk = convertToPublicKeyBytes(accountAddressOrPublicKey);
  return u8aToHex(pk);
}

export function convertToPublicKeyBytes(accountAddressOrPublicKey: string): Uint8Array {
  try {
    return keyring.decodeAddress(accountAddressOrPublicKey);
  } catch (error) {
    const msg = 'Expected SS58 address (eg: "5FbUQ...") or hex public key (eg: "0x9c2bf..."), received:';
    console.error('Error -', msg, accountAddressOrPublicKey, error);
    return null;
  }
}

export function convertToAddress(accountAddressOrPublicKey: string) {
  try {
      return keyring.encodeAddress(accountAddressOrPublicKey);
  } catch (error) {
      console.error(error);
      return null;
  }
}

export function isAccountPK(accountString: string) {
  return isHex(accountString) && accountString.slice(0, 2) === '0x' && accountString.slice(2).length === 64;
}

export function validateAccount(account: string) {
  try {
    encodeAddress(isHex(account) ? hexToU8a(account) : decodeAddress(account));
    return account;
  } catch (e) {
    console.error(e.toString());
    throw new Error(e);
  }
}

export function validateAndConvertAmountToString(amount: string) {
  const amountAsString = amount && amount.toString();
  const isValid = /^\d+$/.test(amountAsString) && new BN(amount).isZero() === false;
  if (isValid === false) {
    throw new Error(`Invalid amount type: ${amount}`);
  }
  return amountAsString;
}

export function validateEthereumAddress(ethereumAddress: string) {
  const isValid = isHex(ethereumAddress) && ethereumAddress.split('').length == 42;
  if (isValid === false) {
    throw new Error(`Invalid ethereum address type: ${ethereumAddress}`);
  }
}

export function validateEthereumTransactionHash(ethereumTransactionHash: string) {
  const isValid = isHex(ethereumTransactionHash) && ethereumTransactionHash.split('').length == 66;
  if (isValid === false) {
    throw new Error(`Invalid ethereum address type: ${ethereumTransactionHash}`);
  }
}

export function validateRoyalties(royalties: Royalty[]) {
  validateIsArray(royalties);
  if (royalties.length === 0) {
    return;
  }

  royalties.forEach(royalty => {
    validateEthereumAddress(royalty.recipient_t1_address);
    if (
      Number.isInteger(royalty.rate.parts_per_million) === false ||
      royalty.rate.parts_per_million <= 0 ||
      royalty.rate.parts_per_million > 1000000
    ) {
      throw new Error(`Invalid rate value: ${royalty.rate.parts_per_million}`);
    }
  });
}

export function validateIsArray(array: any) {
  const isValid = Array.isArray(array);
  if (isValid === false) {
    throw new Error(`Invalid array type: ${array}`);
  }
}

export function validateNftId(nftId: string) {
  try {
    if (isHex(nftId)) return new BN(nftId.substring(2), 16).toString(10);
    else {
      const hexNftId = new BN(nftId).toString(16);
      if (hexNftId.length <= 64) return nftId;
      else throw nftId;
    }
  } catch (nftId) {
    throw new Error(`Invalid nftId type: ${nftId}`);
  }
}

export function validateRequestId(requestId: string) {
  const isValid = uuidValidate(requestId);
  if (isValid === false) {
    throw new Error(`Invalid request ID type: ${requestId}`);
  }
}

export function validateStringIsPopulated(string: string) {
  const isValid = !(string ? string.replace(/\s/g, '').length == 0 : true);
  if (isValid === false) {
    throw new Error(`String is not populated: ${string}`);
  }
}

export function validateStakingTargets(targets: string[]) {
  validateIsArray(targets);
  if (targets.length === 0) {
    throw new Error(`Staking targets is a mandatory field. You must select at least 1 target to nominate.`);
  }
}

export function validateNumber(num: string) {
  if (isNumber(parseInt(num)) === false) {
    throw new Error(`Value is not a valid number: ${num}`);
  }
}

export async function getMinimumStakingValue(queryApi: Query) {
  const minStakingValuePerValidator = new BN(await queryApi.getMinTotalNominatorStake());
  const validators = await queryApi.getValidatorsToNominate();
  return new BN(minStakingValuePerValidator.mul(new BN(validators.length)));
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}