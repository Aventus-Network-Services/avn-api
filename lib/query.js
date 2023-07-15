'use strict';

const common = require('./common.js');

const { ethereumEncode } = require('@polkadot/util-crypto');
const { isHex, u8aToHex, hexToU8a } = require('@polkadot/util');

function Query(api, awtManager, signer) {
    this.awtManager = awtManager

    console.log("Constructor: Query")
  this.getChainInfo = generateFunction(getChainInfo, api, signer);
  this.getDefaultRelayer = generateFunction(getDefaultRelayer, api, signer);
  this.getAvtContractAddress = generateFunction(getAvtContractAddress, api, signer);
  this.getAvnContractAddress = generateFunction(getAvnContractAddress, api, signer);
  this.getNftContractAddress = generateFunction(getNftContractAddress, api, signer);
  this.getTotalAvt = generateFunction(getTotalAvt, api, signer);
  this.getAvtBalance = generateFunction(getAvtBalance, api, signer);
  this.getTotalToken = generateFunction(getTotalToken, api, signer);
  this.getTokenBalance = generateFunction(getTokenBalance, api, signer);
  this.getNonce = generateFunction(getNonce, api, signer);
  this.getNftNonce = generateFunction(getNftNonce, api, signer);
  this.getNftId = generateFunction(getNftId, api, signer);
  this.getNftOwner = generateFunction(getNftOwner, api, signer);
  this.getOwnedNfts = generateFunction(getOwnedNfts, api, signer);
  this.getAccountInfo = generateFunction(getAccountInfo, api, signer);
  this.getStakingStatus = generateFunction(getStakingStatus, api, signer);
  this.getValidatorsToNominate = generateFunction(getValidatorsToNominate, api, signer);
  this.getMinTotalNominatorStake = generateFunction(getMinTotalNominatorStake, api, signer);
  this.getActiveEra = generateFunction(getActiveEra, api, signer);
  this.getStakingDelay = generateFunction(getStakingDelay, api, signer);
  this.getStakingStats = generateFunction(getStakingStats, api, signer);
  this.getRelayerFees = generateFunction(getRelayerFees, api, signer);
  this.getCurrentBlock = generateFunction(getCurrentBlock, api, signer);
  this.getOutstandingLowersForAccount = generateFunction(getOutstandingLowersForAccount, api, signer);
  this.contracts = {};
  this.nftsMap = {};
}

function getChainInfo(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getChainInfo');
  };
}

function getDefaultRelayer(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getDefaultRelayer');
  };
}

function getAvtContractAddress(api, signer) {
  return async function () {
    if (this.contracts.avt === undefined) {
      this.contracts.avt = await this.postRequest(api, signer, 'getAvtContractAddress');
    }
    return this.contracts.avt;
  };
}

function getAvnContractAddress(api, signer) {
  return async function () {
    if (this.contracts.avn === undefined) {
      this.contracts.avn = await this.postRequest(api, signer, 'getAvnContractAddress');
    }
    return this.contracts.avn;
  };
}

function getNftContractAddress(api, signer) {
  return async function () {
    if (this.contracts.nft === undefined) {
      this.contracts.nft = await this.postRequest(api, signer, 'getNftContractAddress');
    }
    return this.contracts.nft;
  };
}

function getTotalAvt(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getTotalAvt');
  };
}

function getAvtBalance(api, signer) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, signer, 'getAvtBalance', { accountId });
  };
}

function getTotalToken(api, signer) {
  return async function (token) {
    common.validateEthereumAddress(token);
    return await this.postRequest(api, signer, 'getTotalToken', { token });
  };
}

function getTokenBalance(api, signer) {
  return async function (accountId, token) {
    common.validateAccount(accountId);
    common.validateEthereumAddress(token);

    return await this.postRequest(api, signer, 'getTokenBalance', { accountId, token });
  };
}

function getNonce(api, signer) {
  return async function (accountId, nonceType) {
    common.validateAccount(accountId);
    common.validateNonceType(nonceType);

    return await this.postRequest(api, signer, 'getNonce', { accountId, nonceType });
  };
}

function getNftNonce(api, signer) {
  return async function (nftId) {
    nftId = common.validateNftId(nftId);

    return await this.postRequest(api, signer, 'getNftNonce', { nftId });
  };
}

function getNftId(api, signer) {
  return async function (externalRef) {
    common.validateStringIsPopulated(externalRef);

    if (!this.nftsMap[externalRef]) {
      this.nftsMap[externalRef] = await this.postRequest(api, signer, 'getNftId', { externalRef });
    }

    return this.nftsMap[externalRef];
  };
}

function getNftOwner(api, signer) {
  return async function (nftId) {
    nftId = common.validateNftId(nftId);

    return await this.postRequest(api, signer, 'getNftOwner', { nftId });
  };
}

function getOwnedNfts(api, signer) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, signer, 'getOwnedNfts', { accountId });
  };
}

function getAccountInfo(api, signer) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, signer, 'getAccountInfo', { accountId });
  };
}

function getStakingStatus(api, signer) {
  return async function (accountId) {
    common.validateAccount(accountId);

    return await this.postRequest(api, signer, 'getStakingStatus', { accountId });
  };
}

function getValidatorsToNominate(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getValidatorsToNominate');
  };
}

function getMinTotalNominatorStake(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getMinTotalNominatorStake');
  };
}

function getActiveEra(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getActiveEra');
  };
}

function getStakingDelay(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getStakingDelay');
  };
}

function getStakingStats(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getStakingStats');
  };
}

function getRelayerFees(api, signer) {
  return async function (relayer, user, transactionType) {
    common.validateAccount(relayer);
    if (user) common.validateAccount(user);
    if (transactionType) common.validateTransactionType(transactionType);
    return await this.postRequest(api, signer, 'getRelayerFees', { relayer, user, transactionType });
  };
}

function getCurrentBlock(api, signer) {
  return async function () {
    return await this.postRequest(api, signer, 'getCurrentBlock');
  };
}

function getOutstandingLowersForAccount(api, signer) {
  return async function (address) {
    const u8a = isHex(address) ? hexToU8a(address) : keyring.decodeAddress(address);
    const account = u8a.length === 20 ? ethereumEncode(u8a) : u8aToHex(u8a);
    return await this.getRequest(api, signer, { account }, 'lowers');
  };
}

function generateFunction(functionName, api, signer) {
  return functionName(api, signer);
}

Query.prototype.postRequest = async function (api, signer, method, params, handler = 'query') {
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

Query.prototype.getRequest = async function (api, signer, params, handler = 'query') {
  const endpoint = api.gateway + `/${handler}?account=${params.account}`;
  const awtToken = await this.awtManager.getToken()
  const response = await api.axios(awtToken).get(endpoint);

  if (!response || !response.data) {
    throw new Error('Invalid server response');
  }

  return response.data;
};

module.exports = Query;
