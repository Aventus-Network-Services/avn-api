'use strict';

const common = require('./common.js');
const proxyApi = require('./proxy.js');
const BN = require('bn.js');

const TX_PROCESSING_TIME = 3000;
const NONCE_TYPE = common.NONCE_TYPE;
const TX_TYPE = common.TX_TYPE;
const MARKET = common.MARKET;
const ETHEREUM_LOG_EVENT_TYPE = common.ETHEREUM_LOG_EVENT_TYPE;

function Send(api, queryApi) {
  this.transferAvt = generateFunction(transferAvt, api, queryApi);
  this.transferToken = generateFunction(transferToken, api, queryApi);
  this.confirmTokenLift = generateFunction(confirmTokenLift, api, queryApi);
  this.lowerToken = generateFunction(lowerToken, api, queryApi);
  this.createNftBatch = generateFunction(createNftBatch, api, queryApi);
  this.mintSingleNft = generateFunction(mintSingleNft, api, queryApi);
  this.mintBatchNft = generateFunction(mintBatchNft, api, queryApi);
  this.listFiatNftForSale = generateFunction(listFiatNftForSale, api, queryApi);
  this.listFiatNftBatchForSale = generateFunction(listFiatNftBatchForSale, api, queryApi);
  this.transferFiatNft = generateFunction(transferFiatNft, api, queryApi);
  this.cancelFiatNftListing = generateFunction(cancelFiatNftListing, api, queryApi);
  this.endNftBatchSale = generateFunction(endNftBatchSale, api, queryApi);
  this.stake = generateFunction(stake, api, queryApi);
  this.unstake = generateFunction(unstake, api, queryApi);
  this.scheduleLeaveNominators = generateFunction(scheduleLeaveNominators, api, queryApi);
  this.executeLeaveNominators = generateFunction(executeLeaveNominators, api, queryApi);
  this.withdrawUnlocked = generateFunction(withdrawUnlocked, api, queryApi);
  this.nonceMap = {};
  this.feesMap = {};
}

function transferAvt(api, queryApi) {
  return async function (recipient, amount) {
    common.validateAccount(recipient);
    amount = common.validateAndConvertAmountToString(amount);
    const token = await queryApi.getAvtContractAddress();
    const methodArgs = { recipient, token, amount };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyAvtTransfer, NONCE_TYPE.Token);
  };
}

function transferToken(api, queryApi) {
  return async function (recipient, token, amount) {
    common.validateAccount(recipient);
    common.validateEthereumAddress(token);
    amount = common.validateAndConvertAmountToString(amount);
    const methodArgs = { recipient, token, amount };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyTokenTransfer, NONCE_TYPE.Token);
  };
}

function confirmTokenLift(api, queryApi) {
  return async function (ethereumTransactionHash) {
    common.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = ETHEREUM_LOG_EVENT_TYPE.Lifted;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyConfirmTokenLift, NONCE_TYPE.Confirmation);
  };
}

function lowerToken(api, queryApi) {
  return async function (t1Recipient, token, amount) {
    common.validateEthereumAddress(t1Recipient);
    common.validateEthereumAddress(token);
    amount = common.validateAndConvertAmountToString(amount);
    const methodArgs = { t1Recipient, token, amount };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyTokenLower, NONCE_TYPE.Token);
  };
}

function createNftBatch(api, queryApi) {
  return async function (totalSupply, royalties, t1Authority) {
    common.validateNumber(totalSupply);
    common.validateRoyalties(royalties);
    common.validateEthereumAddress(t1Authority);
    const methodArgs = { totalSupply, royalties, t1Authority };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyCreateNftBatch, NONCE_TYPE.Batch);
  };
}

function mintSingleNft(api, queryApi) {
  return async function (externalRef, royalties, t1Authority) {
    common.validateStringIsPopulated(externalRef);
    common.validateRoyalties(royalties);
    common.validateEthereumAddress(t1Authority);
    const methodArgs = { externalRef, royalties, t1Authority };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyMintSingleNft, NONCE_TYPE.None);
  };
}

function mintBatchNft(api, queryApi) {
  return async function (batchId, index, owner, externalRef) {
    common.validateNftId(batchId);
    common.validateNumber(index);
    common.validateAccount(owner);
    common.validateStringIsPopulated(externalRef);
    const methodArgs = { batchId, index, owner, externalRef };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyMintBatchNft, NONCE_TYPE.None);
  };
}

function listFiatNftForSale(api, queryApi) {
  return async function (nftId) {
    common.validateNftId(nftId);
    const market = MARKET.Fiat;
    const methodArgs = { nftId, market };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyListNftOpenForSale, NONCE_TYPE.Nft);
  };
}

function listFiatNftBatchForSale(api, queryApi) {
  return async function (batchId) {
    common.validateNftId(batchId);
    const market = MARKET.Fiat;
    const methodArgs = { batchId, market };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyListNftBatchForSale, NONCE_TYPE.Batch);
  };
}

function transferFiatNft(api, queryApi) {
  return async function (recipient, nftId) {
    common.validateAccount(recipient);
    common.validateNftId(nftId);
    recipient = common.convertToPublicKeyIfNeeded(recipient);
    const methodArgs = { nftId, recipient };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyTransferFiatNft, NONCE_TYPE.Nft);
  };
}

function endNftBatchSale(api, queryApi) {
  return async function (batchId) {
    common.validateNftId(batchId);
    const methodArgs = { batchId };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyEndNftBatchSale, NONCE_TYPE.Batch);
  };
}

function cancelFiatNftListing(api, queryApi) {
  return async function (nftId) {
    common.validateNftId(nftId);
    const methodArgs = { nftId };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyCancelListFiatNft, NONCE_TYPE.Nft);
  };
}

function stake(api, queryApi) {
  return async function (amount) {
    amount = common.validateAndConvertAmountToString(amount);

    const user = api.signer().address;
    const stakingStatus = await queryApi.getStakingStatus(user);

    if (stakingStatus === common.STAKING_STATUS.isStaking) {
      const methodArgs = { amount };
      return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyIncreaseStake, NONCE_TYPE.Staking);
    } else {
      const targets = await queryApi.getValidatorsToNominate();
      common.validateStakingTargets(targets);
      const methodArgs = { amount, targets };
      return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.proxyStakeAvt, NONCE_TYPE.Staking);
    }
  };
}

function unstake(api, queryApi) {
  return async function (unstakeAmount) {
    const amount = common.validateAndConvertAmountToString(unstakeAmount);
    const user = api.signer().address;

    const minimumFirstTimeStakingValue = await common.getMinimumStakingValue(queryApi);
    const accountInfo = await queryApi.getAccountInfo(user);
    let newStakedBalance = new BN(accountInfo?.stakedBalance).sub(new BN(amount));

    if (newStakedBalance?.lt(minimumFirstTimeStakingValue)) {
      const methodArgs = {};
      return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyScheduleLeaveNominators, NONCE_TYPE.Staking);
    } else {
      const methodArgs = { amount };
      return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyUnstake, NONCE_TYPE.Staking);
    }
  };
}

function withdrawUnlocked(api, queryApi) {
  return async function () {
    const nominator = api.signer().address;
    const methodArgs = { nominator };

    const user = api.signer().address;
    const accountInfo = await queryApi.getAccountInfo(user);

    if (new BN(accountInfo?.stakedBalance).eq(new BN(accountInfo?.unlockedBalance))) {
      return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyExecuteLeaveNominators, NONCE_TYPE.Staking);
    } else {
      return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyWithdrawUnlocked, NONCE_TYPE.Staking);
    }
  };
}

function scheduleLeaveNominators(api, queryApi) {
  return async function () {
    const methodArgs = {};
    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyScheduleLeaveNominators, NONCE_TYPE.Staking);
  };
}

function executeLeaveNominators(api, queryApi) {
  return async function () {
    const nominator = api.signer().address;
    const methodArgs = { nominator };

    return await this.proxyRequest(api, queryApi, methodArgs, TX_TYPE.ProxyExecuteLeaveNominators, NONCE_TYPE.Staking);
  };
}

function generateFunction(functionName, api, queryApi) {
  return functionName(api, queryApi);
}

Send.prototype.proxyRequest = async function (api, queryApi, methodArgs, transactionType, nonceType, retry) {
  const apiSigner = api.signer();
  const user = apiSigner.address;
  // By default the user pays the relayer fees but this can be changed to any `payer`
  const payer = user;
  const relayer = api.relayer();
  let proxyArgs = Object.assign({ relayer, user, payer }, methodArgs);

  if (nonceType !== NONCE_TYPE.None) {
    proxyArgs.nonce =
      nonceType === NONCE_TYPE.Nft
        ? await queryApi.getNftNonce(methodArgs.nftId)
        : await this.smartNonce(queryApi, user, nonceType, retry);
  }
  let params = { ...proxyArgs };

  const proxySignature = proxyApi.generateProxySignature(apiSigner, transactionType, proxyArgs);
  params.proxySignature = proxySignature;

  // Only populate paymentInfo if this is a self pay transaction
  if (api.hasSplitFeeToken() === false) {
    // By default the user pays the relayer fees but this can be changed to any `payer`
    const payer = user;
    const paymentArgs = { relayer, user, payer, proxySignature, transactionType, signer: apiSigner };
    const paymentData = await this.getPaymentNonceAndSignature(queryApi, paymentArgs, retry);
    params = Object.assign(params, {
      feePaymentSignature: paymentData.feePaymentSignature,
      paymentNonce: paymentData.paymentNonce,
      payer
    });
  }

  const response = await this.postRequest(api, transactionType, params, retry);

  if (!response && !retry) {
    retry = true;
    await this.proxyRequest(api, queryApi, methodArgs, transactionType, nonceType, retry);
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
  const { relayer, user, payer, proxySignature, transactionType, signer } = paymentArgs;
  const paymentNonce = await this.smartNonce(queryApi, payer, NONCE_TYPE.Payment, retry);
  const relayerFee = await this.getRelayerFee(queryApi, relayer, payer, transactionType);
  const feePaymentArgs = { relayer, user, proxySignature, relayerFee, paymentNonce, signer };
  const feePaymentSignature = proxyApi.generateFeePaymentSignature(feePaymentArgs);
  return { paymentNonce, feePaymentSignature };
};

module.exports = Send;
