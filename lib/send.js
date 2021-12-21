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
  const signer = common.getClientAddress()
  const proxyNonce = await this.smartNonce(queryApi, signer, NONCE_TYPE.proxy, retry)
  const proxyTransferSignature = proxyApi.createProxyTransferSignature(relayer, signer, recipient, token, amount, proxyNonce)

  const transactionType = token === this.avtContractAddress ? TX_TYPE.ProxyAvtTransfer : TX_TYPE.ProxyTokenTransfer
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(
    queryApi,
    relayer,
    signer,
    proxyTransferSignature,
    transactionType,
    retry
  )

  const response = await this.postRequest(api, transactionType, retry, {
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

  if (!response && !retry) {
    retry = true
    await this.proxyTransfer(api, queryApi, relayer, recipient, token, amount, retry)
  }

  return response
}

Send.prototype.proxyListNftOpenForSale = async function (api, queryApi, relayer, nftId, market, retry) {
  const signer = common.getClientAddress()
  const nftNonce = await queryApi.getNftNonce(nftId)
  const proxyListNftOpenForSaleSignature = proxyApi.createProxyListNftOpenForSaleSignature(
    relayer,
    signer,
    nftId,
    market,
    nftNonce
  )

  const transactionType = TX_TYPE.ProxyListNftOpenForSale
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(
    queryApi,
    relayer,
    signer,
    proxyListNftOpenForSaleSignature,
    transactionType,
    retry
  )

  const response = await this.postRequest(api, transactionType, retry, {
    pallet: 'nftManager',
    method: 'signedListNftOpenForSale',
    relayer,
    signer,
    nftId,
    market,
    proxyListNftOpenForSaleSignature,
    feePaymentSignature,
    paymentNonce
  })

  if (!response && !retry) {
    retry = true
    await this.proxyListNftOpenForSale(api, queryApi, relayer, nftId, market, retry)
  }

  return response
}

Send.prototype.proxyMintSingleNft = async function (api, queryApi, relayer, externalRef, royalties, t1Authority, retry) {
  const signer = common.getClientAddress()
  const proxyMintSignature = proxyApi.createProxyMintSingleNftSignature(relayer, signer, externalRef, royalties, t1Authority)

  const transactionType = TX_TYPE.ProxyMintSingleNft
  let { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(
    queryApi,
    relayer,
    signer,
    proxyMintSignature,
    transactionType,
    retry
  )

  paymentNonce = paymentNonce

  const response = await this.postRequest(api, transactionType, retry, {
    pallet: 'nftManager',
    method: 'signedMintSingleNft',
    relayer,
    signer,
    externalRef,
    royalties,
    t1Authority,
    proxyMintSignature,
    feePaymentSignature,
    paymentNonce
  })

  if (!response && !retry) {
    retry = true
    await this.proxyMintSingleNft(api, queryApi, relayer, externalRef, royalties, t1Authority, retry)
  }

  return response
}

Send.prototype.proxyTransferFiatNft = async function (api, queryApi, relayer, nftId, recipient, retry) {
  const signer = common.getClientAddress()
  const opId = await queryApi.getNftNonce(nftId)
  const proxyTransferFiatNftSignature = proxyApi.createProxyTransferFiatNftSignature(relayer, signer, nftId, recipient, opId)

  const transactionType = TX_TYPE.ProxyTransferFiatNft
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(
    queryApi,
    relayer,
    signer,
    proxyTransferFiatNftSignature,
    transactionType,
    retry
  )

  const response = await this.postRequest(api, transactionType, retry, {
    pallet: 'nftManager',
    method: 'signedTransferFiatNft',
    relayer,
    signer,
    nftId,
    recipient,
    proxyTransferFiatNftSignature,
    feePaymentSignature,
    paymentNonce
  })

  if (!response && !retry) {
    retry = true
    await this.proxyTransferFiatNft(api, queryApi, relayer, nftId, recipient, retry)
  }

  return response
}

Send.prototype.proxyCancelListFiatNft = async function (api, queryApi, relayer, nftId, retry) {
  const signer = common.getClientAddress()
  const opId = await queryApi.getNftNonce(nftId)
  const proxyCancelListFiatNftSignature = proxyApi.createProxyCancelListFiatNftSignature(relayer, signer, nftId, opId)

  const transactionType = TX_TYPE.ProxyCancelListFiatNft
  const { paymentNonce, feePaymentSignature } = await this.getPaymentNonceAndSignature(
    queryApi,
    relayer,
    signer,
    proxyCancelListFiatNftSignature,
    transactionType,
    retry
  )

  const response = await this.postRequest(api, transactionType, retry, {
    pallet: 'nftManager',
    method: 'signedCancelListFiatNft',
    relayer,
    signer,
    nftId,
    proxyCancelListFiatNftSignature,
    feePaymentSignature,
    paymentNonce
  })

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

Send.prototype.getPaymentNonceAndSignature = async function (
  queryApi,
  relayer,
  signer,
  proxySignature,
  transactionType,
  retry
) {
  const paymentNonce = await this.smartNonce(queryApi, signer, NONCE_TYPE.payment, retry)
  const relayerFee = await this.getRelayerFee(queryApi, relayer, signer, transactionType)
  const feePaymentSignature = proxyApi.createFeePaymentSignature(relayer, signer, proxySignature, relayerFee, paymentNonce)

  return { paymentNonce, feePaymentSignature }
}

module.exports = Send
