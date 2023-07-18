'use strict';

const common = require('./common.js');
const proxyApi = require('./proxy.js');
const BN = require('bn.js');

const TX_PROCESSING_TIME = 60000;
const NONCE_TYPE = common.NONCE_TYPE;
const TX_TYPE = common.TX_TYPE;
const MARKET = common.MARKET;
const ETHEREUM_LOG_EVENT_TYPE = common.ETHEREUM_LOG_EVENT_TYPE;

function Send(api, queryApi, awtManager, signerAddress) {
    this.awtManager = awtManager

  this.transferAvt = generateFunction(transferAvt, api, queryApi, signerAddress);
  this.transferToken = generateFunction(transferToken, api, queryApi, signerAddress);
  this.confirmTokenLift = generateFunction(confirmTokenLift, api, queryApi, signerAddress);
  this.lowerToken = generateFunction(lowerToken, api, queryApi, signerAddress);
  this.createNftBatch = generateFunction(createNftBatch, api, queryApi, signerAddress);
  this.mintSingleNft = generateFunction(mintSingleNft, api, queryApi, signerAddress);
  this.mintBatchNft = generateFunction(mintBatchNft, api, queryApi, signerAddress);
  this.listFiatNftForSale = generateFunction(listFiatNftForSale, api, queryApi, signerAddress);
  this.listFiatNftBatchForSale = generateFunction(listFiatNftBatchForSale, api, queryApi, signerAddress);
  this.transferFiatNft = generateFunction(transferFiatNft, api, queryApi, signerAddress);
  this.cancelFiatNftListing = generateFunction(cancelFiatNftListing, api, queryApi, signerAddress);
  this.endNftBatchSale = generateFunction(endNftBatchSale, api, queryApi, signerAddress);
  this.stake = generateFunction(stake, api, queryApi, signerAddress);
  this.unstake = generateFunction(unstake, api, queryApi, signerAddress);
  this.scheduleLeaveNominators = generateFunction(scheduleLeaveNominators, api, queryApi, signerAddress);
  this.executeLeaveNominators = generateFunction(executeLeaveNominators, api, queryApi, signerAddress);
  this.withdrawUnlocked = generateFunction(withdrawUnlocked, api, queryApi, signerAddress);
  this.feesMap = {};
}

function transferAvt(api, queryApi, signerAddress) {
  return async function (recipient, amount) {
    common.validateAccount(recipient);
    amount = common.validateAndConvertAmountToString(amount);
    const token = await queryApi.getAvtContractAddress();
    const methodArgs = { recipient, token, amount };
    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyAvtTransfer, NONCE_TYPE.Token);
  };
}

function transferToken(api, queryApi, signerAddress) {
  return async function (recipient, token, amount) {
    common.validateAccount(recipient);
    common.validateEthereumAddress(token);
    amount = common.validateAndConvertAmountToString(amount);
    const methodArgs = { recipient, token, amount };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyTokenTransfer, NONCE_TYPE.Token);
  };
}

function confirmTokenLift(api, queryApi, signerAddress) {
  return async function (ethereumTransactionHash) {
    common.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = ETHEREUM_LOG_EVENT_TYPE.Lifted;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyConfirmTokenLift, NONCE_TYPE.Confirmation);
  };
}

function lowerToken(api, queryApi, signerAddress) {
  return async function (t1Recipient, token, amount) {
    common.validateEthereumAddress(t1Recipient);
    common.validateEthereumAddress(token);
    amount = common.validateAndConvertAmountToString(amount);
    const methodArgs = { t1Recipient, token, amount };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyTokenLower, NONCE_TYPE.Token);
  };
}

function createNftBatch(api, queryApi, signerAddress) {
  return async function (totalSupply, royalties, t1Authority) {
    common.validateNumber(totalSupply);
    common.validateRoyalties(royalties);
    common.validateEthereumAddress(t1Authority);
    const methodArgs = { totalSupply, royalties, t1Authority };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyCreateNftBatch, NONCE_TYPE.Batch);
  };
}

function mintSingleNft(api, queryApi, signerAddress) {
  return async function (externalRef, royalties, t1Authority) {
    common.validateStringIsPopulated(externalRef);
    common.validateRoyalties(royalties);
    common.validateEthereumAddress(t1Authority);
    const methodArgs = { externalRef, royalties, t1Authority };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyMintSingleNft, NONCE_TYPE.None);
  };
}

function mintBatchNft(api, queryApi, signerAddress) {
  return async function (batchId, index, owner, externalRef) {
    batchId = common.validateNftId(batchId);
    common.validateNumber(index);
    common.validateAccount(owner);
    common.validateStringIsPopulated(externalRef);
    const methodArgs = { batchId, index, owner, externalRef };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyMintBatchNft, NONCE_TYPE.None);
  };
}

function listFiatNftForSale(api, queryApi, signerAddress) {
  return async function (nftId) {
    nftId = common.validateNftId(nftId);
    const market = MARKET.Fiat;
    const methodArgs = { nftId, market };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyListNftOpenForSale, NONCE_TYPE.Nft);
  };
}

function listFiatNftBatchForSale(api, queryApi, signerAddress) {
  return async function (batchId) {
    batchId = common.validateNftId(batchId);
    const market = MARKET.Fiat;
    const methodArgs = { batchId, market };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyListNftBatchForSale, NONCE_TYPE.Batch);
  };
}

function transferFiatNft(api, queryApi, signerAddress) {
  return async function (recipient, nftId) {
    common.validateAccount(recipient);
    nftId = common.validateNftId(nftId);
    recipient = common.convertToPublicKeyIfNeeded(recipient);
    const methodArgs = { nftId, recipient };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyTransferFiatNft, NONCE_TYPE.Nft);
  };
}

function endNftBatchSale(api, queryApi, signerAddress) {
  return async function (batchId) {
    batchId = common.validateNftId(batchId);
    const methodArgs = { batchId };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyEndNftBatchSale, NONCE_TYPE.Batch);
  };
}

function cancelFiatNftListing(api, queryApi, signerAddress) {
  return async function (nftId) {
    nftId = common.validateNftId(nftId);
    const methodArgs = { nftId };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyCancelListFiatNft, NONCE_TYPE.Nft);
  };
}

function stake(api, queryApi, signerAddress) {
  return async function (amount) {
    amount = common.validateAndConvertAmountToString(amount);
    const stakingStatus = await queryApi.getStakingStatus(signerAddress);

    if (stakingStatus === common.STAKING_STATUS.isStaking) {
      const methodArgs = { amount };
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyIncreaseStake, NONCE_TYPE.Staking);
    } else {
      const targets = await queryApi.getValidatorsToNominate();
      common.validateStakingTargets(targets);
      const methodArgs = { amount, targets };
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.proxyStakeAvt, NONCE_TYPE.Staking);
    }
  };
}

function unstake(api, queryApi, signerAddress) {
  return async function (unstakeAmount) {
    const amount = common.validateAndConvertAmountToString(unstakeAmount);
    const minimumFirstTimeStakingValue = await common.getMinimumStakingValue(queryApi);
    const accountInfo = await queryApi.getAccountInfo(signerAddress);
    let newStakedBalance = new BN(accountInfo?.stakedBalance).sub(new BN(amount));

    if (newStakedBalance?.lt(minimumFirstTimeStakingValue)) {
      const methodArgs = {};
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyScheduleLeaveNominators, NONCE_TYPE.Staking);
    } else {
      const methodArgs = { amount };
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyUnstake, NONCE_TYPE.Staking);
    }
  };
}

function withdrawUnlocked(api, queryApi, signerAddress) {
  return async function () {
    const accountInfo = await queryApi.getAccountInfo(signerAddress);
    const methodArgs = {};

    if (new BN(accountInfo?.stakedBalance).eq(new BN(accountInfo?.unlockedBalance))) {
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyExecuteLeaveNominators, NONCE_TYPE.Staking);
    } else {
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyWithdrawUnlocked, NONCE_TYPE.Staking);
    }
  };
}

function scheduleLeaveNominators(api, queryApi, signerAddress) {
  return async function () {
    const methodArgs = {};
    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyScheduleLeaveNominators, NONCE_TYPE.Staking);
  };
}

function executeLeaveNominators(api, queryApi, signerAddress) {
  return async function () {
    const methodArgs = {};
    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TX_TYPE.ProxyExecuteLeaveNominators, NONCE_TYPE.Staking);
  };
}

function generateFunction(functionName, api, queryApi, signerAddress) {
  return functionName(api, queryApi, signerAddress);
}

Send.prototype.proxyRequest = async function (api, queryApi, apiSigner, methodArgs, transactionType, nonceType, retry) {
  // By default the user pays the relayer fees but this can be changed to any `payer`

  const payer = apiSigner;
  const relayer = await api.relayer(queryApi);

  let proxyArgs = Object.assign({ relayer, user: apiSigner, payer }, methodArgs);

  if (nonceType !== NONCE_TYPE.None) {
    proxyArgs.nonce =
      nonceType === NONCE_TYPE.Nft
        ? await queryApi.getNftNonce(methodArgs.nftId)
        : await api.nonceCache.getNonceAndIncrement(apiSigner, nonceType, queryApi);
  }

  let params = { ...proxyArgs };

  const proxySignature = await proxyApi.generateProxySignature(api, apiSigner, transactionType, proxyArgs);
  params.proxySignature = proxySignature;

  // Only populate paymentInfo if this is a self pay transaction
  if (api.hasSplitFeeToken() === false) {
    // By default the user pays the relayer fees but this can be changed to any `payer`
    const paymentArgs = { relayer, user: apiSigner, payer, proxySignature, transactionType };
    const paymentData = await this.getPaymentNonceAndSignature(api, queryApi, apiSigner, paymentArgs, retry);
    params = Object.assign(params, {
      feePaymentSignature: paymentData.feePaymentSignature,
      paymentNonce: paymentData.paymentNonce,
      payer
    });
  }

  const response = await this.postRequest(api, apiSigner, transactionType, params, retry);

  if (!response && !retry) {
    retry = true;
    await this.proxyRequest(api, queryApi, apiSigner, methodArgs, transactionType, nonceType, retry);
  }

  return response;
};

Send.prototype.postRequest = async function (api, signerAddress, method, params, retry) {
  if (retry === true) {
    console.log('Request failed - retrying...');
  }

  const endpoint = api.gateway + '/send';
  const awtToken = await this.awtManager.getToken()
  const response = await api.axios(awtToken).post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });

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

Send.prototype.getRelayerFee = async function (queryApi, relayer, payer, transactionType) {
  payer = common.convertToPublicKeyIfNeeded(payer);
  if (!this.feesMap[relayer]) this.feesMap[relayer] = {};
  if (!this.feesMap[relayer][payer]) this.feesMap[relayer][payer] = await queryApi.getRelayerFees(relayer, payer);
  return this.feesMap[relayer][payer][transactionType];
};

Send.prototype.getPaymentNonceAndSignature = async function (api, queryApi, signerAddress, paymentArgs, retry) {
  const { relayer, user, payer, proxySignature, transactionType } = paymentArgs;
  const paymentNonce = await api.nonceCache.getNonceAndIncrement(payer, NONCE_TYPE.Payment, queryApi);
  const relayerFee = await this.getRelayerFee(queryApi, relayer, payer, transactionType);
  const feePaymentArgs = { relayer, user, proxySignature, relayerFee, paymentNonce, signerAddress };
  const feePaymentSignature = await proxyApi.generateFeePaymentSignature(feePaymentArgs, signerAddress, api);
  return { paymentNonce, feePaymentSignature };
};

module.exports = Send;
