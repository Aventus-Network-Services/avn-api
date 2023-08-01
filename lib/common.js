'use strict';

const { hexToU8a, isHex, u8aToHex, isNumber } = require('@polkadot/util');
const { decodeAddress, encodeAddress } = require('@polkadot/util-crypto');
const { TypeRegistry, createTypeUnsafe } = require('@polkadot/types');
const { Keyring } = require('@polkadot/keyring');
const registry = new TypeRegistry();
const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
const { validate: uuidValidate } = require('uuid');
const BN = require('bn.js');

const TX_TYPE = {
  ProxyAvtTransfer: 'proxyAvtTransfer',
  ProxyTokenTransfer: 'proxyTokenTransfer',
  ProxyConfirmTokenLift: 'proxyConfirmTokenLift',
  ProxyTokenLower: 'proxyTokenLower',
  ProxyCreateNftBatch: 'proxyCreateNftBatch',
  ProxyMintSingleNft: 'proxyMintSingleNft',
  ProxyMintBatchNft: 'proxyMintBatchNft',
  ProxyListNftOpenForSale: 'proxyListNftOpenForSale',
  ProxyListNftBatchForSale: 'proxyListNftBatchForSale',
  ProxyTransferFiatNft: 'proxyTransferFiatNft',
  ProxyCancelListFiatNft: 'proxyCancelListFiatNft',
  ProxyEndNftBatchSale: 'proxyEndNftBatchSale',
  proxyStakeAvt: 'proxyStakeAvt',
  ProxyIncreaseStake: 'proxyIncreaseStake',
  ProxyUnstake: 'proxyUnstake',
  ProxyWithdrawUnlocked: 'proxyWithdrawUnlocked',
  ProxyScheduleLeaveNominators: 'proxyScheduleLeaveNominators',
  ProxyExecuteLeaveNominators: 'proxyExecuteLeaveNominators'
};

const NONCE_TYPE = {
  Token: 'token',
  Payment: 'payment',
  Staking: 'staking',
  Confirmation: 'confirmation',
  Nft: 'nft',
  Batch: 'batch',
  None: 'none'
};

const ETHEREUM_LOG_EVENT_TYPE = {
  AddedValidator: 0,
  Lifted: 1,
  NftMint: 2,
  NftTransferTo: 3,
  NftCancelListing: 4,
  NftCancelBatchListing: 5
};

const MARKET = { Ethereum: 1, Fiat: 2 };
const STAKING_STATUS = { isStaking: 'isStaking', isNotStaking: 'isNotStaking' };
const ROYALTY_STRUCTURE = ['recipient_t1_address', 'rate'];
const RATE_STRUCTURE = ['parts_per_million'];

function convertToPublicKeyIfNeeded(accountAddressOrPublicKey) {
  if (isAccountPK(accountAddressOrPublicKey)) {
    return accountAddressOrPublicKey;
  }

  const pk = convertToPublicKeyBytes(accountAddressOrPublicKey);
  return u8aToHex(pk);
}

function convertToPublicKeyBytes(accountAddressOrPublicKey) {
  try {
    return keyring.decodeAddress(accountAddressOrPublicKey);
  } catch (error) {
    const msg = 'Expected SS58 address (eg: "5FbUQ...") or hex public key (eg: "0x9c2bf..."), received:';
    console.error('Error -', msg, accountAddressOrPublicKey, error);
    return null;
  }
}

function convertToAddress(accountAddressOrPublicKey) {
  try {
      return keyring.encodeAddress(accountAddressOrPublicKey);
  } catch (error) {
      console.error(error);
      return null;
  }
}

function isAccountPK(accountString) {
  return isHex(accountString) && accountString.slice(0, 2) === '0x' && accountString.slice(2).length === 64;
}

function validateAccount(account) {
  try {
    encodeAddress(isHex(account) ? hexToU8a(account) : decodeAddress(account));
    return account;
  } catch (e) {
    console.error(e.toString());
    throw new Error(e);
  }
}

function validateAndConvertAmountToString(amount) {
  const amountAsString = amount && amount.toString();
  const isValid = /^\d+$/.test(amountAsString) && new BN(amount).isZero() === false;
  if (isValid === false) {
    throw new Error(`Invalid amount type: ${amount}`);
  }
  return amountAsString;
}

function validateEthereumAddress(ethereumAddress) {
  const isValid = isHex(ethereumAddress) && ethereumAddress.split('').length == 42;
  if (isValid === false) {
    throw new Error(`Invalid ethereum address type: ${ethereumAddress}`);
  }
}

function validateEthereumTransactionHash(ethereumTransactionHash) {
  const isValid = isHex(ethereumTransactionHash) && ethereumTransactionHash.split('').length == 66;
  if (isValid === false) {
    throw new Error(`Invalid ethereum address type: ${ethereumTransactionHash}`);
  }
}

function validateRoyaltyStructure(royalty) {
  let structureCheck = JSON.stringify(Object.keys(royalty)) === JSON.stringify(ROYALTY_STRUCTURE);
  if (structureCheck) {
    structureCheck = JSON.stringify(Object.keys(royalty.rate)) === JSON.stringify(RATE_STRUCTURE);
  }

  if (!structureCheck) {
    throw new Error(`Invalid royalties format: ${royalties}`);
  }
}

function validateRoyalties(royalties) {
  validateIsArray(royalties);
  if (royalties.length === 0) {
    return;
  }

  royalties.forEach(royalty => {
    validateRoyaltyStructure(royalty);
    validateEthereumAddress(royalty.recipient_t1_address);
    if (
      royalty.rate.parts_per_million === false ||
      Number.isInteger(royalty.rate.parts_per_million) === false ||
      royalty.rate.parts_per_million <= 0 ||
      royalty.rate.parts_per_million > 1000000
    ) {
      throw new Error(`Invalid rate value: ${royalty.rate.parts_per_million}`);
    }
  });
}

function validateIsArray(array) {
  const isValid = Array.isArray(array);
  if (isValid === false) {
    throw new Error(`Invalid array type: ${array}`);
  }
}

function formatNftId(nftId) {
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

function validateRequestId(requestId) {
  const isValid = uuidValidate(requestId);
  if (isValid === false) {
    throw new Error(`Invalid request ID type: ${requestId}`);
  }
}

function validateStringIsPopulated(string) {
  const isValid = !(string ? string.replace(/\s/g, '').length == 0 : true);
  if (isValid === false) {
    throw new Error(`String is not populated: ${string}`);
  }
}

function validateTransactionType(transactionType) {
  const isValid = Object.values(TX_TYPE).includes(transactionType);
  if (isValid === false) {
    throw new Error(`Invalid transaction type: ${transactionType}`);
  }
}

function validateStakingTargets(targets) {
  validateIsArray(targets);
  if (targets.length === 0) {
    throw new Error(`Staking targets is a mandatory field. You must select at least 1 target to nominate.`);
  }
}

function validateNumber(num) {
  if (isNumber(parseInt(num)) === false) {
    throw new Error(`Value is not a valid number: ${num}`);
  }
}

function validateNonceType(nonceType) {
  const isValid = Object.values(NONCE_TYPE).includes(nonceType);
  if (isValid === false) {
    throw new Error(`Invalid nonce type: ${nonceType}`);
  }
}

async function getMinimumStakingValue(queryApi) {
  const minStakingValuePerValidator = new BN(await queryApi.getMinTotalNominatorStake());
  const validators = await queryApi.getValidatorsToNominate();
  return new BN(minStakingValuePerValidator.mul(new BN(validators.length)));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createTypeUnsafe,
  convertToPublicKeyIfNeeded,
  convertToPublicKeyBytes,
  convertToAddress,
  ETHEREUM_LOG_EVENT_TYPE,
  keyring,
  MARKET,
  NONCE_TYPE,
  registry,
  sleep,
  STAKING_STATUS,
  TX_TYPE,
  validateAccount,
  validateAndConvertAmountToString,
  validateEthereumAddress,
  validateEthereumTransactionHash,
  validateIsArray,
  validateNonceType,
  formatNftId,
  validateRequestId,
  validateStringIsPopulated,
  validateTransactionType,
  validateRoyalties,
  validateStakingTargets,
  validateNumber,
  getMinimumStakingValue
};
