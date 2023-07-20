'use strict';

import common = require('../utils/utils.js');
import {Awt} from '../awt/awt.js'
import {AvnApiConfig, NonceType} from '../interfaces'
import { ethereumEncode } from '@polkadot/util-crypto';
import { isHex, u8aToHex, hexToU8a } from '@polkadot/util';

interface T1Contracts {
    avt: string,
    avn: string,
    nfts: string[]
}

interface Nfts {
    [key: string]: string;
}

export class Query {
    private api: AvnApiConfig;
    private awtManager: Awt;

    private contracts: T1Contracts;
    private nftsMap: Nfts;
    constructor(api: AvnApiConfig, awtManager: Awt) {
        this.awtManager = awtManager;
        this.api = api;

        // this.getChainInfo = generateFunction(getChainInfo, api);
        // this.getDefaultRelayer = generateFunction(getDefaultRelayer, api);
        // this.getAvtContractAddress = generateFunction(getAvtContractAddress, api);
        // this.getAvnContractAddress = generateFunction(getAvnContractAddress, api);
        // this.getNftContractAddress = generateFunction(getNftContractAddress, api);
        // this.getTotalAvt = generateFunction(getTotalAvt, api);
        // this.getAvtBalance = generateFunction(getAvtBalance, api);
        // this.getTotalToken = generateFunction(getTotalToken, api);
        // this.getTokenBalance = generateFunction(getTokenBalance, api);
        // this.getNonce = generateFunction(getNonce, api);
        // this.getNftNonce = generateFunction(getNftNonce, api);
        // this.getNftId = generateFunction(getNftId, api);
        // this.getNftOwner = generateFunction(getNftOwner, api);
        // this.getOwnedNfts = generateFunction(getOwnedNfts, api);
        // this.getAccountInfo = generateFunction(getAccountInfo, api);
        // this.getStakingStatus = generateFunction(getStakingStatus, api);
        // this.getValidatorsToNominate = generateFunction(getValidatorsToNominate, api);
        // this.getMinTotalNominatorStake = generateFunction(getMinTotalNominatorStake, api);
        // this.getActiveEra = generateFunction(getActiveEra, api);
        // this.getStakingDelay = generateFunction(getStakingDelay, api);
        // this.getStakingStats = generateFunction(getStakingStats, api);
        // this.getRelayerFees = generateFunction(getRelayerFees, api);
        // this.getCurrentBlock = generateFunction(getCurrentBlock, api);
        //this.getOutstandingLowersForAccount = generateFunction(getOutstandingLowersForAccount, api);
        this.contracts = {
            avt: undefined,
            avn: undefined,
            nfts: []
        };

        this.nftsMap = {};
    }

    async postRequest(api: AvnApiConfig, method: string, params = {}, handler = 'query') {
        const endpoint = api.gateway + `/${handler}`;
        const awtToken = await this.awtManager.getToken();
        const response = await api.axios(awtToken).post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });

        if (!response || !response.data) {
            throw new Error('Invalid server response');
        }

        if (response.data.result) {
            return response.data.result;
        }

        throw new Error(`Error processing query. Response: ${JSON.stringify(response.data)}`);
    }

    async getRequest(api: AvnApiConfig, params, handler = 'query') {
        const endpoint = api.gateway + `/${handler}?account=${params.account}`;
        const awtToken = await this.awtManager.getToken();
        const response = await api.axios(awtToken).get(endpoint);

        if (!response || !response.data) {
            throw new Error('Invalid server response');
        }

        return response.data;
    }

    async getChainInfo() {
        return await this.postRequest(this.api, 'getChainInfo');
    }

    async getDefaultRelayer() {
        return await this.postRequest(this.api, 'getDefaultRelayer');
    }

    async getAvtContractAddress() {
        if (this.contracts.avt === undefined) {
        this.contracts.avt = await this.postRequest(this.api, 'getAvtContractAddress');
        }
        return this.contracts.avt;
    }

    async getAvnContractAddress() {
        if (this.contracts.avn === undefined) {
        this.contracts.avn = await this.postRequest(this.api, 'getAvnContractAddress');
        }
        return this.contracts.avn;
    }

    async getNftContractAddress() {
          if (this.contracts.nfts === undefined || this.contracts.nfts.length == 0) {
            this.contracts.nfts = await this.postRequest(this.api, 'getNftContractAddress');
          }
          return this.contracts.nfts;
    }

    async getTotalAvt() {
        return await this.postRequest(this.api, 'getTotalAvt');
    }

    async getAvtBalance(accountAddress: string) {
          common.validateAccount(accountAddress);
          return await this.postRequest(this.api, 'getAvtBalance', { accountId: accountAddress });
    }

    async getTotalToken(token: string) {
          common.validateEthereumAddress(token);
          return await this.postRequest(this.api, 'getTotalToken', { token });
    }

    async getTokenBalance(accountAddress: string, token: string) {
          common.validateAccount(accountAddress);
          common.validateEthereumAddress(token);

          return await this.postRequest(this.api, 'getTokenBalance', { accountId: accountAddress, token });
    }

    async getNonce(accountAddress: string, nonceType: NonceType) {
          common.validateAccount(accountAddress);

          return await this.postRequest(this.api, 'getNonce', { accountId: accountAddress, nonceType });
    }

    async getNftNonce(nftId: string) {
        nftId = common.validateNftId(nftId);
        return await this.postRequest(this.api, 'getNftNonce', { nftId });
    }

    async getNftId(externalRef: string) {
        common.validateStringIsPopulated(externalRef);

        if (!this.nftsMap[externalRef]) {
        this.nftsMap[externalRef] = await this.postRequest(this.api, 'getNftId', { externalRef });
        }

        return this.nftsMap[externalRef];
    }

    async getNftOwner(nftId: string) {
          nftId = common.validateNftId(nftId);
          return await this.postRequest(this.api, 'getNftOwner', { nftId });
    }

    async getOwnedNfts(accountAddress: string) {
          common.validateAccount(accountAddress);
          return await this.postRequest(this.api, 'getOwnedNfts', { accountId: accountAddress });
    }

    async getAccountInfo(accountAddress: string) {
        common.validateAccount(accountAddress);
        return await this.postRequest(this.api, 'getAccountInfo', { accountId: accountAddress });
    }

    async getStakingStatus(stakerAddress: string) {
          common.validateAccount(stakerAddress);
          return await this.postRequest(this.api, 'getStakingStatus', { accountId: stakerAddress });
    }

    async getValidatorsToNominate() {
        return await this.postRequest(this.api, 'getValidatorsToNominate');
    }

    async getMinTotalNominatorStake() {
        return await this.postRequest(this.api, 'getMinTotalNominatorStake');
    }

    async getActiveEra() {
        return await this.postRequest(this.api, 'getActiveEra');
    }

    async getStakingDelay() {
        return await this.postRequest(this.api, 'getStakingDelay');
    }

    async getStakingStats() {
        return await this.postRequest(this.api, 'getStakingStats');
    }

    async getRelayerFees(relayerAddress: string, userAddress: string, transactionType?: common.TxType) {
        common.validateAccount(relayerAddress);
        if (userAddress) common.validateAccount(userAddress);

        return await this.postRequest(this.api, 'getRelayerFees', { relayer: relayerAddress, user: userAddress, transactionType });
    }

    async getCurrentBlock() {
        return await this.postRequest(this.api, 'getCurrentBlock');
    }

    async getOutstandingLowersForAccount(accountAddress: string) {
        const u8a = isHex(accountAddress) ? hexToU8a(accountAddress) : common.convertToPublicKeyBytes(accountAddress);
        const account = u8a.length === 20 ? ethereumEncode(u8a) : u8aToHex(u8a);
        return await this.getRequest(this.api, { account }, 'lowers');
    }
}
