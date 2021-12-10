'use strict'

const common = require('./common.js')
const { mnemonicGenerate, mnemonicToMiniSecret } = require('@polkadot/util-crypto')
const { u8aToHex } = require('@polkadot/util')

function generateNewAccount(api) {
  const mnemonic = mnemonicGenerate()
  const keyPair = common.keyring.createFromUri(mnemonic)
  const account = {
    mnemonic,
    seed: u8aToHex(mnemonicToMiniSecret(mnemonic)),
    address: keyPair.address,
    publicKey: u8aToHex(keyPair.publicKey)
  }
  return account
}

module.exports = {
  generateNewAccount
}
