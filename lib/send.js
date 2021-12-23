'use strict'

const common = require('./common.js')
const proxyApi = require('./proxy.js')

const TX_PROCESSING_TIME = 3000
const NONCE_TYPE = { proxy: 0, payment: 1 }
const TX_TYPE = common.TX_TYPE
const MARKET = { Ethereum: 1, Fiat: 2 }

function Send(api, queryApi, avtContractAddress) {
  this.transferAvt = generateFunction(transferAvt, api, queryApi)
  this.transferToken = generateFunction(transferToken, api, queryApi)
  this.mintSingleNft = generateFunction(mintSingleNft, api, queryApi)
  this.listFiatNftForSale = generateFunction(listFiatNftForSale, api, queryApi)
  this.transferFiatNft = generateFunction(transferFiatNft, api, queryApi)
  this.cancelFiatNftListing = generateFunction(cancelFiatNftListing, api, queryApi)
  this.avtContractAddress = avtContractAddress
  this.nonceMap = {}
  this.feesMap = {}
}

function transferAvt(api, queryApi) {
  return async function (relayer, recipient, amount) {
    common.validateAccount(relayer)
    common.validateAccount(recipient)
    common.validateAmount(amount)

    return await this.proxyTransfer(api, queryApi, relayer, recipient, this.avtContractAddress, amount)
  }
}

function transferToken(api, queryApi) {
  return async function (relayer, recipient, token, amount) {
    common.validateAccount(relayer)
    common.validateAccount(recipient)
    common.validateEthereumAddress(token)
    common.validateAmount(amount)

    return await this.proxyTransfer(api, queryApi, relayer, recipient, token, amount)
  }
}

function mintSingleNft(api, queryApi) {
  return async function (relayer, externalRef, royalties, t1Authority) {
    common.validateAccount(relayer)
    common.validateStringIsPopulated(externalRef)
    common.validateIsArray(royalties)
    common.validateEthereumAddress(t1Authority)

    return await this.proxyMintSingleNft(api, queryApi, relayer, externalRef, royalties, t1Authority)
  }
}

function listFiatNftForSale(api, queryApi) {
  return async function (relayer, nftId) {
    common.validateAccount(relayer)
    common.validateNftId(nftId)
    const market = MARKET.Fiat

    return await this.proxyListNftOpenForSale(api, queryApi, relayer, nftId, market)
  }
}

function transferFiatNft(api, queryApi) {
  return async function (relayer, _recipient, nftId) {
    common.validateAccount(relayer)
    const recipient = common.convertToPublicKeyIfNeeded(_recipient)
    common.validateNftId(nftId)

    return await this.proxyTransferFiatNft(api, queryApi, relayer, nftId, recipient)
  }
}

function cancelFiatNftListing(api, queryApi) {
  return async function (relayer, nftId) {
    common.validateAccount(relayer)
    common.validateNftId(nftId)

    return await this.proxyCancelListFiatNft(api, queryApi, relayer, nftId)
  }
}

function generateFunction(functionName, api, queryApi) {
  return functionName(api, queryApi)
}

Send.prototype.proxyTransfer = async function (api, queryApi, relayer, recipient, token, amount, retry) {
  const transactionType = token === this.avtContractAddress ? TX_TYPE.ProxyAvtTransfer : TX_TYPE.ProxyTokenTransfer
  const signer = common.getClientAddress()
  const proxyNonce = await this.smartNonce(queryApi, signer, NONCE_TYPE.proxy, retry)
  const proxySignature = proxyApi.createProxyTransferSignature(relayer, signer, recipient, token, amount, proxyNonce)
  const paymentArgs = { relayer, signer, proxySignature, transactionType }
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry)
  const params = { relayer, signer, recipient, token, amount, proxySignature, feePaymentSignature, paymentNonce }
  const response = await this.postRequest(api, transactionType, retry, params)

  if (!response && !retry) {
    retry = true
    await this.proxyTransfer(api, queryApi, relayer, recipient, token, amount, retry)
  }

  return response
}

Send.prototype.proxyListNftOpenForSale = async function (api, queryApi, relayer, nftId, market, retry) {
  const transactionType = TX_TYPE.ProxyListNftOpenForSale
  const signer = common.getClientAddress()
  const nftNonce = await queryApi.getNftNonce(nftId)
  const proxySignature = proxyApi.createProxyListNftOpenForSaleSignature(relayer, signer, nftId, market, nftNonce)
  const paymentArgs = { relayer, signer, proxySignature, transactionType }
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry)
  const params = { relayer, signer, nftId, market, proxySignature, feePaymentSignature, paymentNonce }
  const response = await this.postRequest(api, transactionType, retry, params)

  if (!response && !retry) {
    retry = true
    await this.proxyListNftOpenForSale(api, queryApi, relayer, nftId, market, retry)
  }

  return response
}

Send.prototype.proxyMintSingleNft = async function (api, queryApi, relayer, externalRef, royalties, t1Authority, retry) {
  const transactionType = TX_TYPE.ProxyMintSingleNft
  const signer = common.getClientAddress()
  const proxySignature = proxyApi.createProxyMintSingleNftSignature(relayer, signer, externalRef, royalties, t1Authority)
  const paymentArgs = { relayer, signer, proxySignature, transactionType }
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry)
  const params = { relayer, signer, externalRef, royalties, t1Authority, proxySignature, feePaymentSignature, paymentNonce }
  const response = await this.postRequest(api, transactionType, retry, params)

  if (!response && !retry) {
    retry = true
    await this.proxyMintSingleNft(api, queryApi, relayer, externalRef, royalties, t1Authority, retry)
  }

  return response
}

Send.prototype.proxyTransferFiatNft = async function (api, queryApi, relayer, nftId, recipient, retry) {
  const transactionType = TX_TYPE.ProxyTransferFiatNft
  const signer = common.getClientAddress()
  const opId = await queryApi.getNftNonce(nftId)
  const proxySignature = proxyApi.createProxyTransferFiatNftSignature(relayer, signer, nftId, recipient, opId)
  const paymentArgs = { relayer, signer, proxySignature, transactionType }
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry)
  const params = { relayer, signer, nftId, recipient, proxySignature, feePaymentSignature, paymentNonce }
  const response = await this.postRequest(api, transactionType, retry, params)

  if (!response && !retry) {
    retry = true
    await this.proxyTransferFiatNft(api, queryApi, relayer, nftId, recipient, retry)
  }

  return response
}

Send.prototype.proxyCancelListFiatNft = async function (api, queryApi, relayer, nftId, retry) {
  const transactionType = TX_TYPE.ProxyCancelListFiatNft
  const signer = common.getClientAddress()
  const opId = await queryApi.getNftNonce(nftId)
  const proxySignature = proxyApi.createProxyCancelListFiatNftSignature(relayer, signer, nftId, opId)
  const paymentArgs = { relayer, signer, proxySignature, transactionType }
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry)
  const params = { relayer, signer, nftId, proxySignature, feePaymentSignature, paymentNonce }
  const response = await this.postRequest(api, transactionType, retry, params)

  if (!response && !retry) {
    retry = true
    await this.proxyCancelListFiatNft(api, queryApi, relayer, nftId, retry)
  }

  return response
}

Send.prototype.postRequest = async function (api, method, retry, params) {
  if (retry === true) {
    console.log('Request failed - retrying...')
  }

  const endpoint = api.gateway + '/send'
  const response = await api.axios().post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params })

  if (!response || !response.data) {
    throw new Error('Invalid server response')
  }

  if (response.data.result) {
    return response.data.result
  }

  if (retry === true) {
    throw new Error(`Error processing send after retry: ${JSON.stringify(response.data.error)}`)
  }
}

Send.prototype.smartNonce = async function (queryApi, _account, nonceType, retry) {
  const account = common.convertToPublicKeyIfNeeded(_account)
  if (!this.nonceMap[account]) this.nonceMap[account] = { proxy: {}, payment: {} }
  const nonceData = this.nonceMap[account]
  const updated = Date.now()
  let nonce

  switch (nonceType) {
    case NONCE_TYPE.proxy:
      nonce =
        nonceData.proxy.nonce === undefined || updated - nonceData.proxy.updated >= TX_PROCESSING_TIME * 2 || retry === true
          ? parseInt(await queryApi.getAccountNonce(account))
          : nonceData.proxy.nonce + 1

      this.nonceMap[account].proxy = { nonce: nonce, updated: updated }
      break

    case NONCE_TYPE.payment:
      nonce =
        nonceData.payment.nonce === undefined || updated - nonceData.payment.updated >= TX_PROCESSING_TIME * 2 || retry === true
          ? parseInt(await queryApi.getAccountPaymentNonce(account))
          : nonceData.payment.nonce + 1

      this.nonceMap[account].payment = { nonce: nonce, updated: updated }
      break

    default:
      throw new Error(`Invalid nonce type (${nonceType}) provided`)
  }

  return nonce.toString()
}

Send.prototype.getRelayerFee = async function (queryApi, relayer, user, transactionType) {
  if (!this.feesMap[relayer]) this.feesMap[relayer] = {}
  if (!this.feesMap[relayer][user]) this.feesMap[relayer][user] = await queryApi.getRelayerFees(relayer, user)
  return this.feesMap[relayer][user][transactionType]
}

Send.prototype.getPaymentNonceAndSignature = async function (queryApi, paymentArgs, retry) {
  const { relayer, signer, proxySignature, transactionType } = paymentArgs
  const paymentNonce = await this.smartNonce(queryApi, signer, NONCE_TYPE.payment, retry)
  const relayerFee = await this.getRelayerFee(queryApi, relayer, signer, transactionType)
  const feePaymentSignature = proxyApi.createFeePaymentSignature(relayer, signer, proxySignature, relayerFee, paymentNonce)
  return { paymentNonce, feePaymentSignature }
}

module.exports = Send
