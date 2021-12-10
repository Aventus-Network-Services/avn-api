'use strict'

const common = require('./common.js')
const { u8aToHex, u8aConcat } = require('@polkadot/util')

const FEE_PAYMENT_CONTEXT = 'authorization for proxy payment'
const PROXY_TRANSFER_CONTEXT = 'authorization for transfer operation'
const PROXY_MINT_SINGLE_NFT_CONTEXT = 'authorization for mint single nft operation'
const PROXY_LIST_NFT_OPEN_FOR_SALE_CONTEXT = 'authorization for list nft open for sale operation'
const PROXY_TRANSFER_FIAT_NFT_CONTEXT = 'authorization for transfer fiat nft operation'
const PROXY_CANCEL_LIST_FIAT_NFT_CONTEXT = 'authorization for cancel list fiat nft for sale operation'

function createProxyTransferSignature(_relayer, _signer, _recipient, token, amount, proxyNonce) {
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
  return signData(hexEncodedData)
}

function createProxyMintSingleNftSignature(_relayer, signer, externalRef, royalties, t1Authority) {
  const relayer = common.convertToPublicKeyIfNeeded(_relayer)

  const dataToSign = {
    context: PROXY_MINT_SINGLE_NFT_CONTEXT,
    relayer,
    externalRef,
    royalties,
    t1Authority
  }

  const hexEncodedData = encodeProxyMintSingleNftSignatureData(dataToSign)
  return signData(hexEncodedData)
}

function createProxyListNftOpenForSaleSignature(_relayer, signer, nftId, market, nftNonce) {
  const relayer = common.convertToPublicKeyIfNeeded(_relayer)

  const dataToSign = {
    context: PROXY_LIST_NFT_OPEN_FOR_SALE_CONTEXT,
    relayer,
    nftId,
    market,
    nftNonce
  }

  const hexEncodedData = encodeProxyListNftOpenForSaleSignatureData(dataToSign)
  return signData(hexEncodedData)
}

function createProxyTransferFiatNftSignature(_relayer, signer, nftId, _recipient, opId) {
  const relayer = common.convertToPublicKeyIfNeeded(_relayer)
  const recipient = common.convertToPublicKeyIfNeeded(_recipient)

  const dataToSign = {
    context: PROXY_TRANSFER_FIAT_NFT_CONTEXT,
    relayer,
    nftId,
    recipient,
    opId
  }

  const hexEncodedData = encodeProxyTransferFiatNftSignature(dataToSign)
  return signData(hexEncodedData)
}

function createProxyCancelListFiatNftSignature(_relayer, signer, nftId, opId) {
  const relayer = common.convertToPublicKeyIfNeeded(_relayer)

  const dataToSign = {
    context: PROXY_CANCEL_LIST_FIAT_NFT_CONTEXT,
    relayer,
    nftId,
    opId
  }

  const hexEncodedData = encodeProxyCancelListFiatNftSignature(dataToSign)
  return signData(hexEncodedData)
}

function createFeePaymentSignature(_relayer, signer, proxySignature, relayerFee, paymentNonce) {
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
  return signData(hexEncodedData)
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

function encodeProxyMintSingleNftSignatureData(params) {
  const encodedContext = common.registry.createType('Text', params.context)
  const encodedRelayer = common.registry.createType('AccountId', params.relayer)
  const encodedExternalRef = common.registry.createType('Vec<u8>', params.externalRef)
  const encodedRoyalties = encodeRoyalty(params.royalties)
  const encodedT1Authority = common.registry.createType('H160', params.t1Authority)

  const encodedData = u8aConcat(
    encodedContext.toU8a(false),
    encodedRelayer.toU8a(true),
    encodedExternalRef.toU8a(false),
    encodedRoyalties,
    encodedT1Authority.toU8a(true)
  )

  return u8aToHex(encodedData)
}

function encodeProxyListNftOpenForSaleSignatureData(params) {
  const encodedContext = common.registry.createType('Text', params.context)
  const encodedRelayer = common.registry.createType('AccountId', params.relayer)
  const encodedNftId = common.registry.createType('U256', params.nftId)
  const encodedMarket = common.registry.createType('u8', params.market)
  const encodedNftNonce = common.registry.createType('u64', params.nftNonce)

  const encodedData = u8aConcat(
    encodedContext.toU8a(false),
    encodedRelayer.toU8a(true),
    encodedNftId.toU8a(true),
    encodedMarket.toU8a(true),
    encodedNftNonce.toU8a(true)
  )

  return u8aToHex(encodedData)
}

function encodeProxyTransferFiatNftSignature(params) {
  const encodedContext = common.registry.createType('Text', params.context)
  const encodedRelayer = common.registry.createType('AccountId', params.relayer)
  const encodedNftId = common.registry.createType('U256', params.nftId)
  const encodedRecipient = common.registry.createType('AccountId', params.recipient)
  const encodedOpId = common.registry.createType('u64', params.opId)

  const encodedData = u8aConcat(
    encodedContext.toU8a(false),
    encodedRelayer.toU8a(true),
    encodedNftId.toU8a(true),
    encodedRecipient.toU8a(true),
    encodedOpId.toU8a(true)
  )

  return u8aToHex(encodedData)
}

function encodeProxyCancelListFiatNftSignature(params) {
  const encodedContext = common.registry.createType('Text', params.context)
  const encodedRelayer = common.registry.createType('AccountId', params.relayer)
  const encodedNftId = common.registry.createType('U256', params.nftId)
  const encodedOpId = common.registry.createType('u64', params.opId)

  const encodedData = u8aConcat(
    encodedContext.toU8a(false),
    encodedRelayer.toU8a(true),
    encodedNftId.toU8a(true),
    encodedOpId.toU8a(true)
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

// This complicated logic is required because we do not have access to a connected `api`.
// If we did, we could have used a 1 liner: api.createType('Vec<Royalty>', royalties)
function encodeRoyalty(royalties) {
  const encodedRoyalties = royalties.map(r => {
    const recipientT1Address = common.registry.createType('H160', r.recipient_t1_address)
    const partsPerMillion = common.registry.createType('u32', r.rate.parts_per_million)
    return u8aConcat(recipientT1Address.toU8a(true), partsPerMillion.toU8a(true))
  })

  const encodedResult = common.createTypeUnsafe(common.registry, 'Vec<(H160, u32)>', [encodedRoyalties])
  return encodedResult.toU8a(false)
}

function signData(encodedData) {
  const signerSuri = common.obtainSignerSuri()
  const signer = common.keyring.addFromUri(signerSuri)
  const signature = u8aToHex(signer.sign(encodedData))
  return signature
}

module.exports = {
  createFeePaymentSignature,
  createProxyTransferSignature,
  createProxyListNftOpenForSaleSignature,
  createProxyMintSingleNftSignature,
  createProxyTransferFiatNftSignature,
  createProxyCancelListFiatNftSignature
}
