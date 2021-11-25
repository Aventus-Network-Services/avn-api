'use strict'

const common = require('./common.js')
const proxyApi = require('./proxy.js')

const MAX_TX_PROCESSING_TIME = 3000
const NONCE_TYPE = { proxy: 0, payment: 1 }
const TX_TYPE = {
  ProxyAvtTransfer: 'proxyAvtTransfer',
  ProxyTokenTransfer: 'proxyTokenTransfer'
}

function Send(api, queryApi, avtContractAddress) {
  this.transferAvt = generateFunction(transferAvt, api, queryApi)
  this.transferToken = generateFunction(transferToken, api, queryApi)
  this.avtContractAddress = avtContractAddress
  this.nonceMap = {}
  this.feesMap = {}
}

function transferAvt(api, queryApi) {
  return async function(relayer, signer, recipient, amount) {
    return await this.proxyTransfer(api, queryApi, relayer, signer, recipient, this.avtContractAddress, amount)
  }
}

function transferToken(api, queryApi) {
  return async function(relayer, signer, recipient, token, amount) {
    return await this.proxyTransfer(api, queryApi, relayer, signer, recipient, token, amount)
  }
}

Send.prototype.proxyTransfer = async function(api, queryApi, relayer, signer, recipient, token, amount, isRetry) {
  const proxyNonce = await this.smartNonce(queryApi, signer, NONCE_TYPE.proxy)
  const proxyTransferSignature = proxyApi.createProxyTransferSignature(
    relayer,
    signer,
    recipient,
    token,
    amount,
    proxyNonce
  )

  const paymentNonce = await this.smartNonce(queryApi, signer, NONCE_TYPE.payment)
  const transactionType = token === this.avtContractAddress ? TX_TYPE.ProxyAvtTransfer : TX_TYPE.ProxyTokenTransfer
  const relayerFee = await this.getRelayerFee(queryApi, relayer, signer, transactionType)
  const feePaymentSignature = proxyApi.createFeePaymentSignature(
    relayer,
    signer,
    proxyTransferSignature,
    relayerFee,
    paymentNonce
  )

  const response = await this.postRequest(api, transactionType, {
    pallet: 'tokenManager',
    method: 'signedTransfer',
    relayer,
    signer,
    recipient,
    token,
    amount,
    proxyTransferSignature,
    feePaymentSignature,
    paymentNonce
  })

  if (!response && !isRetry) {
    await this.proxyTransfer(api, queryApi, relayer, signer, recipient, token, amount, true)
  }

  return response
}

function generateFunction(functionName, api, queryApi) {
  return functionName(api, queryApi)
}

Send.prototype.postRequest = async function(api, method, params) {
  const endpoint = api.gateway + '/send'
  const response = await api.axios().post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params })
  return response.data.result || response.data.error.message
}

Send.prototype.smartNonce = async function(queryApi, _account, nonceType) {
  const account = common.convertToPublicKeyIfNeeded(_account)
  if (!this.nonceMap[account]) this.nonceMap[account] = { proxy: {}, payment: {} }
  const nonceData = this.nonceMap[account]
  const updated = Date.now()
  let nonce

  switch (nonceType) {
    case NONCE_TYPE.proxy:
      nonce =
        nonceData.proxy.nonce === undefined || updated - nonceData.proxy.updated >= MAX_TX_PROCESSING_TIME * 2
          ? parseInt(await queryApi.getAccountNonce(account))
          : nonceData.proxy.nonce + 1

      this.nonceMap[account].proxy = { nonce: nonce, updated: updated }
      break

    case NONCE_TYPE.payment:
      nonce =
        nonceData.payment.nonce === undefined || updated - nonceData.payment.updated >= MAX_TX_PROCESSING_TIME * 2
          ? parseInt(await queryApi.getAccountPaymentNonce(account))
          : nonceData.payment.nonce + 1

      this.nonceMap[account].payment = { nonce: nonce, updated: updated }
      break

    default:
      throw new Error(`Invalid nonce type (${nonceType}) provided`)
  }

  return nonce.toString()
}

Send.prototype.getRelayerFee = async function(queryApi, relayer, user, transactionType) {
  if (!this.feesMap[relayer]) this.feesMap[relayer] = {}
  if (!this.feesMap[relayer][user]) this.feesMap[relayer][user] = await queryApi.getRelayerFees(relayer, user)
  return this.feesMap[relayer][user][transactionType]
}

module.exports = Send
