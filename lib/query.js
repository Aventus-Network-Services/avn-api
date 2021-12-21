'use strict'

const common = require('./common.js')

function Query(api) {
  this.getTotalAvt = generateFunction(getTotalAvt, api)
  this.getAvtBalance = generateFunction(getAvtBalance, api)
  this.getTokenBalance = generateFunction(getTokenBalance, api)
  this.getAccountNonce = generateFunction(getAccountNonce, api)
  this.getAccountPaymentNonce = generateFunction(getAccountPaymentNonce, api)
  this.getAvtContractAddress = generateFunction(getAvtContractAddress, api)
  this.getRelayerFees = generateFunction(getRelayerFees, api)
  this.getNftNonce = generateFunction(getNftNonce, api)
  this.getNftId = generateFunction(getNftId, api)
  this.nftsMap = {}
}

function getTotalAvt(api) {
  return async function () {
    return await this.postRequest(api, 'getTotalAvt')
  }
}

function getAvtBalance(api) {
  return async function (accountId) {
    common.validateAccount(accountId)

    return await this.postRequest(api, 'getAvtBalance', { accountId })
  }
}

function getTokenBalance(api) {
  return async function (accountId, token) {
    common.validateAccount(accountId)
    common.validateEthereumAddress(token)

    return await this.postRequest(api, 'getTokenBalance', { accountId, token })
  }
}

function getAccountNonce(api) {
  return async function (accountId) {
    common.validateAccount(accountId)

    return await this.postRequest(api, 'getAccountNonce', { accountId })
  }
}

function getAccountPaymentNonce(api) {
  return async function (accountId) {
    common.validateAccount(accountId)

    return await this.postRequest(api, 'getAccountPaymentNonce', { accountId })
  }
}

function getNftNonce(api) {
  return async function (nftId) {
    common.validateNftId(nftId)

    return await this.postRequest(api, 'getNftNonce', { nftId })
  }
}

function getNftId(api) {
  return async function (externalRef) {
    common.validateStringIsPopulated(externalRef)

    if (!this.nftsMap[externalRef]) {
      this.nftsMap[externalRef] = await this.postRequest(api, 'getNftId', { externalRef })
    }

    return this.nftsMap[externalRef]
  }
}

function getAvtContractAddress(api) {
  return async function () {
    return await this.postRequest(api, 'getAvtContractAddress')
  }
}

function getRelayerFees(api) {
  return async function (relayer, user, transactionType) {
    common.validateAccount(relayer)
    if (user) common.validateAccount(user)
    if (transactionType) common.validateTransactionType(transactionType)

    return await this.postRequest(api, 'getRelayerFees', { relayer, user, transactionType })
  }
}

function generateFunction(functionName, api) {
  return functionName(api)
}

Query.prototype.postRequest = async function (api, method, params) {
  const endpoint = api.gateway + '/query'
  const response = await api.axios().post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params })

  if (!response || !response.data) {
    throw new Error('Invalid server response')
  }

  if (response.data.result) {
    return response.data.result
  }

  throw new Error(`Error processing query: ${JSON.stringify(response.data.error)}`)
}

module.exports = Query
