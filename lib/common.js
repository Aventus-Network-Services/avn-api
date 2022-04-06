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
  ProxyMintSingleNft: 'proxyMintSingleNft',
  ProxyListNftOpenForSale: 'proxyListNftOpenForSale',
  ProxyTransferFiatNft: 'proxyTransferFiatNft',
  ProxyCancelListFiatNft: 'proxyCancelListFiatNft',
  ProxyBond: 'proxyBond',
  ProxyNominate: 'proxyNominate',
  ProxyIncreaseStake: 'proxyIncreaseStake',
  ProxyUnstake: 'proxyUnstake',
  ProxyWithdrawUnlocked: 'proxyWithdrawUnlocked',
  ProxyPayoutStakers: 'proxyPayoutStakers'
};

const NONCE_TYPE = {
  Token: 'token',
  Payment: 'payment',
  Staking: 'staking',
  Confirmation: 'confirmation',
  Nft: 'nft',
  None: 'none'
};

const STAKING_STATUS = {
  isStaking: 'isStaking',
  isNotStaking: 'isNotStaking'
};

const ROYALTY_STRUCTURE = ['recipient_t1_address', 'rate'];
const RATE_STRUCTURE = ['parts_per_million'];

function convertToPublicKeyIfNeeded(accountAddressOrPublicKey) {
  if (isAccountPK(accountAddressOrPublicKey)) {
    return accountAddressOrPublicKey;
  } else {
    try {
      const pk = keyring.decodeAddress(accountAddressOrPublicKey);
      return u8aToHex(pk);
    } catch (error) {
      const msg = 'Expected SS58 address (eg: "5FbUQ...") or hex public key (eg: "0x9c2bf..."), received:';
      console.error('Error -', msg, accountAddressOrPublicKey, error);
      return null;
    }
  }
}

function isAccountPK(accountString) {
  return isHex(accountString) && accountString.slice(0, 2) === '0x' && accountString.slice(2).length === 64;
}

function validateAccount(account) {
  const isValid = encodeAddress(isHex(account) ? hexToU8a(account) : decodeAddress(account));
  if (isValid === false) {
    throw new Error(`Invalid account type: ${account}`);
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

function validateNftId(nftId) {
  return isHex(nftId);
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
  if (isNumber(num) === false) {
    throw new Error(`Value is not a valid number: ${num}`);
  }
}

function validateNonceType(nonceType) {
  const isValid = Object.values(NONCE_TYPE).includes(nonceType);
  if (isValid === false) {
    throw new Error(`Invalid nonce type: ${nonceType}`);
  }
}

function getSigner() {
  const suri = process.env.SURI;
  if (!suri) throw new Error('Please set SURI environment variable');
  const user = keyring.addFromUri(suri);
  return user;
}

function getSignerAddress() {
  const signer = getSigner();
  return signer.address;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createTypeUnsafe,
  convertToPublicKeyIfNeeded,
  getSignerAddress,
  getSigner,
  keyring,
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
  validateNftId,
  validateRequestId,
  validateStringIsPopulated,
  validateTransactionType,
  validateRoyalties,
  validateStakingTargets,
  validateNumber
};
