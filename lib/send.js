'use strict'

const common = require('./common.js')
const proxyApi = require('./proxy.js')

const MAX_TX_PROCESSING_TIME = 3000

function Send(api, queryApi, avtContractAddress) {
  this.transferAvt = generateFunction(transferAvt, api, queryApi)
  this.transferToken = generateFunction(transferToken, api, queryApi)
  this.nonceMap = {}
  this.avtContractAddress = avtContractAddress
}

function transferAvt(api, queryApi) {
  return async function(relayer, from, to, amount) {
    return await this.proxyTokenTransfer(api, queryApi, relayer, from, to, this.avtContractAddress, amount)
  }
}

function transferToken(api, queryApi) {
  return async function(relayer, from, to, token, amount) {
    return await this.proxyTokenTransfer(api, queryApi, relayer, from, to, token, amount)
  }
}

Send.prototype.proxyTokenTransfer = async function(api, queryApi, relayer, from, to, token, amount) {
  const nonce = await this.smartNonce(queryApi, from)
  const signature = proxyApi.transferToken.createAuthorisationSignature(relayer, from, to, token, amount, nonce)

  return await this.postRequest(api, 'proxy', {
    pallet: 'tokenManager',
    method: 'signedTransfer',
    signature,
    relayer,
    innerArgs: { from, to, token, amount }
  })
}

function generateFunction(functionName, api, queryApi) {
  return functionName(api, queryApi)
}

Send.prototype.postRequest = async function(api, method, params, isRetry) {
  const endpoint = api.gateway + '/send'
  const response = await api.axios().post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params })

  if (!response.data.result) {
    if (method === 'proxy') {
      await common.sleep(MAX_TX_PROCESSING_TIME)
      return !isRetry ? await this.postRequest(api, method, params, true) : response.data.error.message
    }
    return response.data.error.message
  }
  return response.data.result
}

Send.prototype.smartNonce = async function(queryApi, _account) {
  const account = common.convertToPublicKeyIfNeeded(_account)
  const nonceData = this.nonceMap[account]
  const updated = Date.now()

  const nonce =
    nonceData === undefined || updated - nonceData.updated >= MAX_TX_PROCESSING_TIME * 2
      ? parseInt(await queryApi.getAccountNonce(account))
      : nonceData.nonce + 1

  this.nonceMap[account] = { nonce: nonce, updated: updated }
  return nonce.toString()
}

module.exports = Send
