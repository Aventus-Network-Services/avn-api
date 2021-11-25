'use strict'
const { u8aToHex, u8aConcat } = require('@polkadot/util')
const common = require('./common.js')

const FEE_PAYMENT_CONTEXT = 'authorization for proxy payment'
const PROXY_TRANSFER_CONTEXT = 'authorization for transfer operation'

function createProxyTransferSignature(_relayer, _signer, _recipient, token, amount, proxyNonce) {
  const signerSuri = common.obtainClientSuri()
  const relayer = common.convertToPublicKeyIfNeeded(_relayer)
  const signer = common.convertToPublicKeyIfNeeded(_signer)
  const recipient = common.convertToPublicKeyIfNeeded(_recipient)

  const dataToSign = {
    context: PROXY_TRANSFER_CONTEXT,
    relayer,
    signer,
    recipient,
    token,
    amount,
    proxyNonce
  }

  const hexEncodedData = encodeProxyTransferSignatureData(dataToSign)
  return signData(signerSuri, hexEncodedData)
}

function createFeePaymentSignature(_relayer, signer, proxySignature, relayerFee, paymentNonce) {
  const signerSuri = common.obtainClientSuri()
  const relayer = common.convertToPublicKeyIfNeeded(_relayer)

  const proxyProof = {
    signer,
    relayer,
    signature: {
      Sr25519: proxySignature
    }
  }

  const dataToSign = {
    context: FEE_PAYMENT_CONTEXT,
    proxyProof,
    relayer,
    relayerFee,
    paymentNonce
  }

  const hexEncodedData = encodeFeePaymentSignatureData(dataToSign)
  return signData(signerSuri, hexEncodedData)
}

function encodeProxyTransferSignatureData(params) {
  const encodedContext = common.registry.createType('Text', params.context)
  const encodedRelayer = common.registry.createType('AccountId', params.relayer)
  const encodedSigner = common.registry.createType('AccountId', params.signer)
  const encodedRecipient = common.registry.createType('AccountId', params.recipient)
  const encodedToken = common.registry.createType('H160', params.token)
  const encodedAmount = common.registry.createType('u128', params.amount)
  const encodedNonce = common.registry.createType('u64', params.proxyNonce)

  const encodedData = u8aConcat(
    encodedContext.toU8a(false),
    encodedRelayer.toU8a(true),
    encodedSigner.toU8a(true),
    encodedRecipient.toU8a(true),
    encodedToken.toU8a(true),
    encodedAmount.toU8a(true),
    encodedNonce.toU8a(true)
  )

  return u8aToHex(encodedData)
}

function encodeFeePaymentSignatureData(params) {
  const encodedContext = common.registry.createType('Text', params.context)
  const encodedProxyProof = encodeProxyProof(params.proxyProof)
  const encodedRelayer = common.registry.createType('AccountId', params.relayer)
  const encodedRelayerFee = common.registry.createType('Balance', params.relayerFee)
  const encodedPaymentNonce = common.registry.createType('u64', params.paymentNonce)

  const encodedData = u8aConcat(
    encodedContext.toU8a(false),
    encodedProxyProof,
    encodedRelayer.toU8a(true),
    encodedRelayerFee.toU8a(true),
    encodedPaymentNonce.toU8a(true)
  )

  return u8aToHex(encodedData)
}

function encodeProxyProof(params) {
  const signer = common.registry.createType('AccountId', params.signer)
  const relayer = common.registry.createType('AccountId', params.relayer)
  const signature = common.registry.createType('MultiSignature', params.signature)
  return u8aConcat(signer.toU8a(true), relayer.toU8a(true), signature.toU8a(false))
}

function signData(signerSuri, encodedData) {
  const signer = common.keyring.addFromUri(signerSuri)
  const signature = u8aToHex(signer.sign(encodedData))
  return signature
}

module.exports = {
  createFeePaymentSignature,
  createProxyTransferSignature
}
