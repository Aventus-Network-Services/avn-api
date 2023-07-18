'use strict';

const common = require('./common.js');

const { ethereumEncode } = require('@polkadot/util-crypto');
const { isHex, u8aToHex, hexToU8a } = require('@polkadot/util');

function Query(api, awtManager) {
    console.log("Query")
    this.awtManager = awtManager

  this.getChainInfo = generateFunction(getChainInfo, api);
  this.getDefaultRelayer = generateFunction(getDefaultRelayer, api);
  this.getAvtContractAddress = generateFunction(getAvtContractAddress, api);
  this.getAvnContractAddress = generateFunction(getAvnContractAddress, api);
  this.getNftContractAddress = generateFunction(getNftContractAddress, api);
  this.getTotalAvt = generateFunction(getTotalAvt, api);
  this.getAvtBalance = generateFunction(getAvtBalance, api);
  this.getTotalToken = generateFunction(getTotalToken, api);
  this.getTokenBalance = generateFunction(getTokenBalance, api);
  this.getNonce = generateFunction(getNonce, api);
  this.getNftNonce = generateFunction(getNftNonce, api);
  this.getNftId = generateFunction(getNftId, api);
  this.getNftOwner = generateFunction(getNftOwner, api);
  this.getOwnedNfts = generateFunction(getOwnedNfts, api);
  this.getAccountInfo = generateFunction(getAccountInfo, api);
  this.getStakingStatus = generateFunction(getStakingStatus, api);
  this.getValidatorsToNominate = generateFunction(getValidatorsToNominate, api);
  this.getMinTotalNominatorStake = generateFunction(getMinTotalNominatorStake, api);
  this.getActiveEra = generateFunction(getActiveEra, api);
  this.getStakingDelay = generateFunction(getStakingDelay, api);
  this.getStakingStats = generateFunction(getStakingStats, api);
  this.getRelayerFees = generateFunction(getRelayerFees, api);
  this.getCurrentBlock = generateFunction(getCurrentBlock, api);
  this.getOutstandingLowersForAccount = generateFunction(getOutstandingLowersForAccount, api);
  this.contracts = {};
  this.nftsMap = {};
}

function getChainInfo(api) {
  return async function () {
    return await this.postRequest(api, 'getChainInfo');
  };
}

function getDefaultRelayer(api) {
  return async function () {
    return await this.postRequest(api, 'getDefaultRelayer');
  };
}

function getAvtContractAddress(api) {
  return async function () {
    if (this.contracts.avt === undefined) {
      this.contracts.avt = await this.postRequest(api, 'getAvtContractAddress');
    }
    return this.contracts.avt;
  };
}

function getAvnContractAddress(api) {
  return async function () {
    if (this.contracts.avn === undefined) {
      this.contracts.avn = await this.postRequest(api, 'getAvnContractAddress');
    }
    return this.contracts.avn;
  };
}

function getNftContractAddress(api) {
  return async function () {
    if (this.contracts.nft === undefined) {
      this.contracts.nft = await this.postRequest(api, 'getNftContractAddress');
    }
    return this.contracts.nft;
  };
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

function getTotalToken(api) {
  return async function (token) {
    common.validateEthereumAddress(token);
    return await this.postRequest(api, 'getTotalToken', { token });
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
    nftId = common.validateNftId(nftId);

    return await this.postRequest(api, 'getNftNonce', { nftId });
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
    nftId = common.validateNftId(nftId);

    return await this.postRequest(api, 'getNftOwner', { nftId });
  };
}

function getOwnedNfts(api) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, 'getOwnedNfts', { accountId });
  };
}

function getAccountInfo(api) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, 'getAccountInfo', { accountId });
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

function getMinTotalNominatorStake(api) {
  return async function () {
    return await this.postRequest(api, 'getMinTotalNominatorStake');
  };
}

function getActiveEra(api) {
  return async function () {
    return await this.postRequest(api, 'getActiveEra');
  };
}

function getStakingDelay(api) {
  return async function () {
    return await this.postRequest(api, 'getStakingDelay');
  };
}

function getStakingStats(api) {
  return async function () {
    return await this.postRequest(api, 'getStakingStats');
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

function getCurrentBlock(api) {
  return async function () {
    return await this.postRequest(api, 'getCurrentBlock');
  };
}

function getOutstandingLowersForAccount(api) {
  return async function (address) {
    const u8a = isHex(address) ? hexToU8a(address) : keyring.decodeAddress(address);
    const account = u8a.length === 20 ? ethereumEncode(u8a) : u8aToHex(u8a);
    return await this.getRequest(api, { account }, 'lowers');
  };
}

function generateFunction(functionName, api) {
  return functionName(api);
}

Query.prototype.postRequest = async function (api, method, params, handler = 'query') {
  const endpoint = api.gateway + `/${handler}`;
  const awtToken = await this.awtManager.getToken()
  const response = await api.axios(awtToken).post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });

  if (!response || !response.data) {
    throw new Error('Invalid server response');
  }

  if (response.data.result) {
    return response.data.result;
  }

  throw new Error(`Error processing query. Response: ${JSON.stringify(response.data)}`);
};

Query.prototype.getRequest = async function (api, params, handler = 'query') {
  const endpoint = api.gateway + `/${handler}?account=${params.account}`;
  const awtToken = await this.awtManager.getToken()
  const response = await api.axios(awtToken).get(endpoint);

  if (!response || !response.data) {
    throw new Error('Invalid server response');
  }

  return response.data;
};

module.exports = Query;
