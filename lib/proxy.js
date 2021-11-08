'use strict'

const { hexToU8a, u8aToHex, u8aConcat } = require('@polkadot/util')
const common = require('./common.js')

const SIGNED_TRANSFER_SIGNATURE_CONTEXT = 'authorization for transfer operation'

const transferToken = {
  createAuthorisationSignature: function(relayer, from, to, token, amount, nonce) {
    const signerSuri = common.obtainClientSuri()
    const relayerPublicKey = common.convertToPublicKeyIfNeeded(relayer)
    const senderPublicKey = common.convertToPublicKeyIfNeeded(from)
    const recipientPublicKey = common.convertToPublicKeyIfNeeded(to)

    const dataToSign = {
      context: SIGNED_TRANSFER_SIGNATURE_CONTEXT,
      relayer: relayerPublicKey,
      from: senderPublicKey,
      to: recipientPublicKey,
      token: token,
      amount: amount,
      nonce: nonce
    }

    const encodedDataInHex = this.encodeSignatureData(dataToSign)
    return signData(signerSuri, encodedDataInHex)
  },

  encodeSignatureData: function(params) {
    const context = common.registry.createType('Text', params.context)
    const relayer_obj = common.registry.createType('AccountId', hexToU8a(params.relayer))
    const from_obj = common.registry.createType('AccountId', hexToU8a(params.from))
    const to_obj = common.registry.createType('AccountId', hexToU8a(params.to))
    const token_obj = common.registry.createType('H160', hexToU8a(params.token))
    const amount_obj = common.registry.createType('u128', params.amount)
    const nonce_obj = common.registry.createType('u64', params.nonce)

    const encoded_params = u8aConcat(
      context.toU8a(false),
      relayer_obj.toU8a(true),
      from_obj.toU8a(true),
      to_obj.toU8a(true),
      token_obj.toU8a(true),
      amount_obj.toU8a(true),
      nonce_obj.toU8a(true)
    )

    return u8aToHex(encoded_params)
  }
}

function signData(signerSuri, encodedData) {
  const signer = common.keyring.addFromUri(signerSuri)
  const signature = u8aToHex(signer.sign(encodedData))
  return signature
}

module.exports = {
  transferToken
}
