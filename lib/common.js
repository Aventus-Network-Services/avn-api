'use strict'

const { hexToU8a, isHex, u8aToHex } = require('@polkadot/util')
const { decodeAddress, encodeAddress } = require('@polkadot/util-crypto')
const { TypeRegistry, createTypeUnsafe } = require('@polkadot/types')
const { Keyring } = require('@polkadot/keyring')
const registry = new TypeRegistry()
const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })
const { validate: uuidValidate } = require('uuid')
const BN = require('bn.js')

const TX_TYPE = {
  ProxyAvtTransfer: 'proxyAvtTransfer',
  ProxyTokenTransfer: 'proxyTokenTransfer',
  ProxyMintSingleNft: 'proxyMintSingleNft',
  ProxyListNftOpenForSale: 'proxyListNftOpenForSale',
  ProxyTransferFiatNft: 'proxyTransferFiatNft',
  ProxyCancelListFiatNft: 'proxyCancelListFiatNft'
}

function convertToPublicKeyIfNeeded(accountAddressOrPublicKey) {
  if (isAccountPK(accountAddressOrPublicKey)) {
    return accountAddressOrPublicKey
  } else {
    try {
      const pk = keyring.decodeAddress(accountAddressOrPublicKey)
      return u8aToHex(pk)
    } catch (error) {
      const msg = 'Expected SS58 address (eg: "5FbUQ...") or hex public key (eg: "0x9c2bf..."), received:'
      console.error('Error -', msg, accountAddressOrPublicKey, error)
      return null
    }
  }
}

function isAccountPK(accountString) {
  return isHex(accountString) && accountString.slice(0, 2) === '0x' && accountString.slice(2).length === 64
}

function validateAccount(account) {
  const isValid = encodeAddress(isHex(account) ? hexToU8a(account) : decodeAddress(account))
  if (isValid === false) {
    throw new Error(`Invalid account type: ${account}`)
  }
}

function validateAmount(amount) {
  const amountAsString = amount.toString()
  const isValid = /^\d+$/.test(amountAsString) && new BN(amount).isZero() === false
  if (isValid === false) {
    throw new Error(`Invalid amount type: ${amount}`)
  }
}

function validateEthereumAddress(ethereumAddress) {
  const isValid = isHex(ethereumAddress) && ethereumAddress.split('').length == 42
  if (isValid === false) {
    throw new Error(`Invalid ethereum address type: ${ethereumAddress}`)
  }
}

function validateIsArray(array) {
  const isValid = Array.isArray(array)
  if (isValid === false) {
    throw new Error(`Invalid array type: ${array}`)
  }
}

function validateNftId(nftId) {
  return isHex(nftId)
}

function validateRequestId(requestId) {
  const isValid = uuidValidate(requestId)
  if (isValid === false) {
    throw new Error(`Invalid request ID type: ${requestId}`)
  }
}

function validateStringIsPopulated(string) {
  const isValid = !(string ? string.replace(/\s/g, '').length == 0 : true)
  if (isValid === false) {
    throw new Error(`String is not populated: ${string}`)
  }
}

function validateTransactionType(transactionType) {
  const isValid = Object.values(TX_TYPE).includes(transactionType)
  if (isValid === false) {
    throw new Error(`Invalid transaction type: ${transactionType}`)
  }
}

function getClientSigner() {
  const suri = process.env.SURI
  if (!suri) throw new Error('Please set SURI environment variable')
  const signer = keyring.addFromUri(suri)
  return signer
}

function getClientAddress() {
  const signer = getClientSigner()
  return signer.address
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = {
  createTypeUnsafe,
  convertToPublicKeyIfNeeded,
  getClientAddress,
  getClientSigner,
  keyring,
  registry,
  sleep,
  TX_TYPE,
  validateAccount,
  validateAmount,
  validateEthereumAddress,
  validateIsArray,
  validateNftId,
  validateRequestId,
  validateStringIsPopulated,
  validateTransactionType
}
