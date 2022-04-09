'use strict';

const common = require('./common.js');
const { mnemonicGenerate, mnemonicToMiniSecret } = require('@polkadot/util-crypto');
const { u8aToHex } = require('@polkadot/util');

function generateNewAccount() {
  const mnemonic = mnemonicGenerate();
  const keyPair = common.keyring.createFromUri(mnemonic);
  const account = {
    mnemonic,
    seed: u8aToHex(mnemonicToMiniSecret(mnemonic)),
    address: keyPair.address,
    publicKey: u8aToHex(keyPair.publicKey)
  };
  return account;
}

function addressToPublicKey(address) {
  common.validateAccount(address);
  return common.convertToPublicKeyIfNeeded(address);
}

function myAddress() {
  return common.getSignerAddress();
}

function myPublicKey() {
  return common.convertToPublicKeyIfNeeded(myAddress());
}

module.exports = {
  addressToPublicKey,
  generateNewAccount,
  myAddress,
  myPublicKey
};
