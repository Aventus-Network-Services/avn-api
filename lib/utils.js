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

function getSigner(suri) {
  if (!suri) throw new Error('Unable to get signer because Suri is not defined');
  const user = common.keyring.addFromUri(suri);
  return user;
}

module.exports = {
  addressToPublicKey,
  convertToPublicKeyIfNeeded: common.convertToPublicKeyIfNeeded,
  generateNewAccount,
  getSigner
};
