'use strict'

const { isHex, u8aToHex } = require('@polkadot/util')
const { TypeRegistry } = require('@polkadot/types')
const { Keyring } = require('@polkadot/keyring')
const registry = new TypeRegistry()
const keyring = new Keyring({ type: 'sr25519' })

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

function obtainClientSuri() {
  return process.env.SURI
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = {
  isAccountPK,
  convertToPublicKeyIfNeeded,
  obtainClientSuri,
  keyring,
  registry,
  sleep
}
