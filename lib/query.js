'use strict';

const common = require('./common.js');

function Query(api) {
  this.getTotalAvt = generateFunction(getTotalAvt, api);
  this.getAvtBalance = generateFunction(getAvtBalance, api);
  this.getTokenBalance = generateFunction(getTokenBalance, api);
  this.getNonce = generateFunction(getNonce, api);
  this.getAvtContractAddress = generateFunction(getAvtContractAddress, api);
  this.getRelayerFees = generateFunction(getRelayerFees, api);
  this.getNftNonce = generateFunction(getNftNonce, api);
  this.getNftId = generateFunction(getNftId, api);
  this.getNftOwner = generateFunction(getNftOwner, api);
  this.getAccountInfo = generateFunction(getAccountInfo, api);
  this.getStakingStatus = generateFunction(getStakingStatus, api);
  this.getValidatorsToNominate = generateFunction(getValidatorsToNominate, api);
  this.getActiveEra = generateFunction(getActiveEra, api);
  this.getOwnedNfts = generateFunction(getOwnedNfts, api);
  this.nftsMap = {};
}

function getTotalAvt(api) {
  return async function () {
    return await this.postRequest(api, 'getTotalAvt');
  };
}

function getAvtBalance(api) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, 'getAvtBalance', { accountId });
  };
}

function getTokenBalance(api) {
  return async function (accountId, token) {
    common.validateAccount(accountId);
    common.validateEthereumAddress(token);

    return await this.postRequest(api, 'getTokenBalance', { accountId, token });
  };
}

function getNonce(api) {
  return async function (accountId, nonceType) {
    common.validateAccount(accountId);
    common.validateNonceType(nonceType);

    return await this.postRequest(api, 'getNonce', { accountId, nonceType });
  };
}

function getNftNonce(api) {
  return async function (nftId) {
    common.validateNftId(nftId);

    return await this.postRequest(api, 'getNftNonce', { nftId });
  };
}

function getStakingStatus(api) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, 'getStakingStatus', { accountId });
  };
}

function getValidatorsToNominate(api) {
  return async function () {
    return await this.postRequest(api, 'getValidatorsToNominate');
  };
}

function getActiveEra(api) {
  return async function () {
    return await this.postRequest(api, 'getActiveEra');
  };
}

function getNftId(api) {
  return async function (externalRef) {
    common.validateStringIsPopulated(externalRef);

    if (!this.nftsMap[externalRef]) {
      this.nftsMap[externalRef] = await this.postRequest(api, 'getNftId', { externalRef });
    }

    return this.nftsMap[externalRef];
  };
}

function getNftOwner(api) {
  return async function (nftId) {
    common.validateNftId(nftId);

    return await this.postRequest(api, 'getNftOwner', { nftId });
  };
}

function getAvtContractAddress(api) {
  return async function () {
    return await this.postRequest(api, 'getAvtContractAddress');
  };
}

function getRelayerFees(api) {
  return async function (relayer, user, transactionType) {
    common.validateAccount(relayer);
    if (user) common.validateAccount(user);
    if (transactionType) common.validateTransactionType(transactionType);

    return await this.postRequest(api, 'getRelayerFees', { relayer, user, transactionType });
  };
}

function generateFunction(functionName, api) {
  return functionName(api);
}

function getAccountInfo(api) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, 'getAccountInfo', { accountId });
  };
}

function getOwnedNfts(api) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, 'getOwnedNfts', { accountId });
  };
}

Query.prototype.postRequest = async function (api, method, params) {
  const endpoint = api.gateway + '/query';
  const response = await api.axios().post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });

  if (!response || !response.data) {
    throw new Error('Invalid server response');
  }

  if (response.data.result) {
    return response.data.result;
  }

  throw new Error(`Error processing query. Response: ${JSON.stringify(response.data)}`);
};

module.exports = Query;
