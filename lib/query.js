'use strict'

function Query(api) {
  this.getTotalAvt = generateFunction(getTotalAvt, api)
  this.getAvtBalance = generateFunction(getAvtBalance, api)
  this.getTokenBalance = generateFunction(getTokenBalance, api)
  this.getAccountNonce = generateFunction(getAccountNonce, api)
  this.getAvtContractAddress = generateFunction(getAvtContractAddress, api)
}

function getTotalAvt(api) {
  return async function() {
    return await this.postRequest(api, 'getTotalAvt', [])
  }
}

function getAvtBalance(api) {
  return async function(account) {
    return await this.postRequest(api, 'getAvtBalance', [account])
  }
}

function getTokenBalance(api) {
  return async function(account, token) {
    return await this.postRequest(api, 'getTokenBalance', [account, token])
  }
}

function getAccountNonce(api) {
  return async function(account) {
    return await this.postRequest(api, 'getAccountNonce', [account])
  }
}

function getAvtContractAddress(api) {
  return async function() {
    return await this.postRequest(api, 'getAvtContractAddress', [])
  }
}

function generateFunction(functionName, api) {
  return functionName(api)
}

Query.prototype.postRequest = async function(api, method, params) {
  const endpoint = api.gateway + '/query'
  const response = await api.axios().post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params })
  return response.data.result || response.data.error.message
}

module.exports = Query
