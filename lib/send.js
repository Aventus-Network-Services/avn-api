'use strict';

const common = require('./common.js');
const proxyApi = require('./proxy.js');
const BN = require('bn.js');

const TX_PROCESSING_TIME = 3000;
const NONCE_TYPE = common.NONCE_TYPE;
const TX_TYPE = common.TX_TYPE;
const MARKET = { Ethereum: 1, Fiat: 2 };
const ETHEREUM_LOG_EVENT_TYPE = {
  AddedValidator: 0,
  Lifted: 1,
  NftMint: 2,
  NftTransferTo: 3,
  NftCancelListing: 4,
  NftCancelBatchListing: 5
};

function Send(api, queryApi, avtContractAddress) {
  this.transferAvt = generateFunction(transferAvt, api, queryApi);
  this.transferToken = generateFunction(transferToken, api, queryApi);
  this.confirmTokenLift = generateFunction(confirmTokenLift, api, queryApi);
  this.lowerToken = generateFunction(lowerToken, api, queryApi);
  this.mintSingleNft = generateFunction(mintSingleNft, api, queryApi);
  this.listFiatNftForSale = generateFunction(listFiatNftForSale, api, queryApi);
  this.transferFiatNft = generateFunction(transferFiatNft, api, queryApi);
  this.cancelFiatNftListing = generateFunction(cancelFiatNftListing, api, queryApi);
  this.stake = generateFunction(stake, api, queryApi);
  this.unstake = generateFunction(unstake, api, queryApi);
  this.withdrawUnlocked = generateFunction(withdrawUnlocked, api, queryApi);
  this.payoutStakers = generateFunction(payoutStakers, api, queryApi);
  this.avtContractAddress = avtContractAddress;
  this.nonceMap = {};
  this.feesMap = {};
}

function transferAvt(api, queryApi) {
  return async function (relayer, recipient, amount) {
    common.validateAccount(relayer);
    common.validateAccount(recipient);
    amount = common.validateAndConvertAmountToString(amount);
    const token = this.avtContractAddress;
    const methodArgs = { recipient, token, amount };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyAvtTransfer, NONCE_TYPE.Token);
  };
}

function transferToken(api, queryApi) {
  return async function (relayer, recipient, token, amount) {
    common.validateAccount(relayer);
    common.validateAccount(recipient);
    common.validateEthereumAddress(token);
    amount = common.validateAndConvertAmountToString(amount);
    const methodArgs = { recipient, token, amount };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyTokenTransfer, NONCE_TYPE.Token);
  };
}

function confirmTokenLift(api, queryApi) {
  return async function (relayer, ethereumTransactionHash) {
    common.validateAccount(relayer);
    common.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = ETHEREUM_LOG_EVENT_TYPE.Lifted;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyConfirmTokenLift, NONCE_TYPE.Confirmation);
  };
}

function lowerToken(api, queryApi) {
  return async function (relayer, t1Recipient, token, amount) {
    common.validateAccount(relayer);
    common.validateEthereumAddress(t1Recipient);
    common.validateEthereumAddress(token);
    amount = common.validateAndConvertAmountToString(amount);
    const methodArgs = { t1Recipient, token, amount };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyTokenLower, NONCE_TYPE.Token);
  };
}

function mintSingleNft(api, queryApi) {
  return async function (relayer, externalRef, royalties, t1Authority) {
    common.validateAccount(relayer);
    common.validateStringIsPopulated(externalRef);
    common.validateRoyalties(royalties);
    common.validateEthereumAddress(t1Authority);
    const methodArgs = { externalRef, royalties, t1Authority };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyMintSingleNft, NONCE_TYPE.None);
  };
}

function listFiatNftForSale(api, queryApi) {
  return async function (relayer, nftId) {
    common.validateAccount(relayer);
    common.validateNftId(nftId);
    const market = MARKET.Fiat;
    const methodArgs = { nftId, market };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyListNftOpenForSale, NONCE_TYPE.Nft);
  };
}

function transferFiatNft(api, queryApi) {
  return async function (relayer, recipient, nftId) {
    common.validateAccount(relayer);
    common.validateAccount(recipient);
    common.validateNftId(nftId);
    recipient = common.convertToPublicKeyIfNeeded(recipient);
    const methodArgs = { nftId, recipient };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyTransferFiatNft, NONCE_TYPE.Nft);
  };
}

function cancelFiatNftListing(api, queryApi) {
  return async function (relayer, nftId) {
    common.validateAccount(relayer);
    common.validateNftId(nftId);
    const methodArgs = { nftId };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyCancelListFiatNft, NONCE_TYPE.Nft);
  };
}

function stake(api, queryApi) {
  return async function (relayer, amount) {
    common.validateAccount(relayer);
    amount = common.validateAndConvertAmountToString(amount);

    const user = common.getSignerAddress();
    const stakingStatus = await queryApi.getStakingStatus(user);

    if (stakingStatus === common.STAKING_STATUS.isStaking) {
      const methodArgs = { amount };
      return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyIncreaseStake, NONCE_TYPE.Staking);
    } else {
      const targets = await queryApi.getValidatorsToNominate();
      common.validateStakingTargets(targets);
      const methodArgs = { amount, targets };
      // first time staking is made up of 2 transactions: Bond + Nominate, so we cannot use the standard proxyRequest function
      return await this.proxyStakeAvtRequest(api, queryApi, relayer, methodArgs, 'proxyStakeAvt', NONCE_TYPE.Staking);
    }
  };
}

function unstake(api, queryApi) {
  return async function (relayer, amount) {
    common.validateAccount(relayer);
    amount = common.validateAndConvertAmountToString(amount);
    const methodArgs = { amount };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyUnstake, NONCE_TYPE.Staking);
  };
}

function withdrawUnlocked(api, queryApi) {
  return async function (relayer) {
    common.validateAccount(relayer);
    const methodArgs = {};

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyWithdrawUnlocked, NONCE_TYPE.Staking);
  };
}

function payoutStakers(api, queryApi) {
  return async function (relayer, era) {
    common.validateAccount(relayer);

    if (!era) {
      era = await queryApi.getActiveEra();

      if (era === 0) {
        throw new Error('You must wait for at least 1 era to pass before calling this method. Current era index: ', era);
      }

      era = era - 1; // the default is to payout the previous era because the current one won't be ready yet.
    }
    common.validateNumber(era);
    const methodArgs = { era };

    return await this.proxyRequest(api, queryApi, relayer, methodArgs, TX_TYPE.ProxyPayoutStakers, NONCE_TYPE.Staking);
  };
}

function generateFunction(functionName, api, queryApi) {
  return functionName(api, queryApi);
}

Send.prototype.proxyRequest = async function (api, queryApi, relayer, methodArgs, transactionType, nonceType, retry) {
  const user = common.getSignerAddress();
  // By default the user pays the relayer fees but this can be changed to any `payer`
  const payer = user;
  let proxyArgs = Object.assign({ relayer, user, payer }, methodArgs);
  let params = { ...proxyArgs };

  if (nonceType !== NONCE_TYPE.None) {
    proxyArgs.nonce =
      nonceType === NONCE_TYPE.Nft
        ? await queryApi.getNftNonce(methodArgs.nftId)
        : await this.smartNonce(queryApi, user, nonceType, retry);
  }

  const proxySignature = proxyApi.generateProxySignature(transactionType, proxyArgs);
  params.proxySignature = proxySignature;
  const paymentArgs = { relayer, user, payer, proxySignature, transactionType };
  const paymentData = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry);
  params = Object.assign(params, paymentData);

  const response = await this.postRequest(api, transactionType, params, retry);

  if (!response && !retry) {
    retry = true;
    await this.proxyRequest(api, queryApi, relayer, methodArgs, transactionType, nonceType, retry);
  }

  return response;
};

Send.prototype.proxyStakeAvtRequest = async function (api, queryApi, relayer, methodArgs, methodName, nonceType, retry) {
  const user = common.getSignerAddress();
  // By default the user pays the relayer fees but this can be changed to any `payer`
  const payer = user;
  let proxyArgs = Object.assign({ relayer, user, payer }, methodArgs);
  let params = { ...proxyArgs };
  proxyArgs.nonce = await this.smartNonce(queryApi, user, nonceType, retry);

  let transactionType = TX_TYPE.ProxyBond;
  params.bondMethodName = transactionType;
  let proxySignature = proxyApi.generateProxySignature(transactionType, proxyArgs);
  params.proxyBondSignature = proxySignature;
  let paymentArgs = { relayer, user, payer, proxySignature, transactionType };
  let paymentData = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry);
  params.bondFeePaymentSignature = paymentData.feePaymentSignature;
  params.bondPaymentNonce = paymentData.paymentNonce;

  proxyArgs.nonce = new BN(nonce).add(new BN(1));

  transactionType = TX_TYPE.ProxyNominate;
  params.nominateMethodName = transactionType;
  proxySignature = proxyApi.generateProxySignature(transactionType, proxyArgs);
  params.proxyNominateSignature = proxySignature;
  paymentArgs = { relayer, user, payer, proxySignature, transactionType };
  paymentData = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry);
  params.nominateFeePaymentSignature = paymentData.feePaymentSignature;
  params.nominatePaymentNonce = paymentData.paymentNonce;

  const response = await this.postRequest(api, methodName, params, retry);

  if (!response && !retry) {
    retry = true;
    await this.proxyStakeAvtRequest(api, queryApi, relayer, methodArgs, methodName, nonceType, retry);
  }

  return response;
};

Send.prototype.postRequest = async function (api, method, params, retry) {
  if (retry === true) {
    console.log('Request failed - retrying...');
  }

  const endpoint = api.gateway + '/send';
  const response = await api.axios().post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });

  if (!response || !response.data) {
    throw new Error('Invalid server response');
  }

  if (response.data.result) {
    return response.data.result;
  }

  if (retry === true) {
    throw new Error(`Error processing send after retry: ${JSON.stringify(response.data.error)}`);
  }
};

Send.prototype.smartNonce = async function (queryApi, account, nonceType, retry) {
  common.validateNonceType(nonceType);
  account = common.convertToPublicKeyIfNeeded(account);

  if (this.nonceMap[account] === undefined) {
    this.nonceMap[account] = Object.values(NONCE_TYPE).reduce((o, key) => ({ ...o, [key]: {} }), {});
  }

  const nonceData = this.nonceMap[account][nonceType];
  const updated = Date.now();
  const refreshNonce = nonceData.nonce === undefined || updated - nonceData.updated >= TX_PROCESSING_TIME * 2 || retry === true;
  let nonce = refreshNonce ? parseInt(await queryApi.getNonce(account, nonceType)) : nonceData.nonce + 1;
  this.nonceMap[account][nonceType] = { nonce, updated };
  return nonce.toString();
};

Send.prototype.getRelayerFee = async function (queryApi, relayer, account, transactionType) {
  account = common.convertToPublicKeyIfNeeded(account);
  if (!this.feesMap[relayer]) this.feesMap[relayer] = {};
  if (!this.feesMap[relayer][account]) this.feesMap[relayer][account] = await queryApi.getRelayerFees(relayer, account);
  return this.feesMap[relayer][account][transactionType];
};

Send.prototype.getPaymentNonceAndSignature = async function (queryApi, paymentArgs, retry) {
  const { relayer, user, payer, proxySignature, transactionType } = paymentArgs;
  const paymentNonce = await this.smartNonce(queryApi, payer, NONCE_TYPE.Payment, retry);
  const relayerFee = await this.getRelayerFee(queryApi, relayer, payer, transactionType);
  const feePaymentArgs = { relayer, user, proxySignature, relayerFee, paymentNonce };
  const feePaymentSignature = proxyApi.generateFeePaymentSignature(feePaymentArgs);
  return { paymentNonce, feePaymentSignature };
};

module.exports = Send;
