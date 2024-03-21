'use strict';

import { AccountUtils, StakingStatus, TxType, Utils } from '../utils';
import { Awt } from '../awt';
import { AvnApiConfig, NonceType } from '../interfaces';
import { ethereumEncode } from '@polkadot/util-crypto';
import { isHex, u8aToHex, hexToU8a } from '@polkadot/util';

interface T1Contracts {
  avt: string;
  avn: string;
  nfts: string[];
}

interface Nfts {
  [key: string]: string;
}

type RelayerFees = {
  [key in TxType]: string;
};

interface AccountInfo {
  totalBalance: string;
  freeBalance: string;
  stakedBalance: string;
  unlockedBalance: string;
  unstakedBalance: string;
}

interface StakingStats {
  totalStaked: string;
  minUserBond: string;
  maxNominatorsRewardedPerValidator: string;
  totalStakers: string;
  averageStaked: string;
}

interface LowerData {
  token: string;
  from: string;
  to: string;
  amount: string;
  claimData: LowerClaimData;
}

interface LowerClaimData {
  leaf: string;
  merklePath: string[];
}

export class Query {
  private api: AvnApiConfig;
  private awtManager: Awt;

  private contracts: T1Contracts;
  private nftsMap: Nfts;
  constructor(api: AvnApiConfig, awtManager: Awt) {
    this.awtManager = awtManager;
    this.api = api;

    this.contracts = {
      avt: undefined,
      avn: undefined,
      nfts: []
    };

    this.nftsMap = {};
  }

  async postRequest<R>(api: AvnApiConfig, method: string, params: object = {}, handler = 'query'): Promise<R> {
    const endpoint = api.gateway + `/${handler}`;
    const awtToken = await this.awtManager.getToken();
    const response = await api
      .axios(awtToken)
      .post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });

    if (!response || !response.data) {
      throw new Error('Invalid server response');
    }

    if (response.data.result) {
      return response.data.result;
    }

    throw new Error(`Error processing query. Response: ${JSON.stringify(response.data)}`);
  }

  async getRequest<R>(api: AvnApiConfig, accountAddress: string, handler = 'query'): Promise<R> {
    const endpoint = api.gateway + `/${handler}?account=${accountAddress}`;
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

  async getDefaultRelayer(): Promise<string> {
    return await this.postRequest<string>(this.api, 'getDefaultRelayer');
  }

  async getAvtContractAddress(): Promise<string> {
    if (this.contracts.avt === undefined) {
      this.contracts.avt = await this.postRequest<string>(this.api, 'getAvtContractAddress');
    }
    return this.contracts.avt;
  }

  async getAvnContractAddress(): Promise<string> {
    if (this.contracts.avn === undefined) {
      this.contracts.avn = await this.postRequest<string>(this.api, 'getAvnContractAddress');
    }
    return this.contracts.avn;
  }

  async getNftContractAddress(): Promise<string[]> {
    if (this.contracts.nfts === undefined || this.contracts.nfts.length == 0) {
      this.contracts.nfts = await this.postRequest<string[]>(this.api, 'getNftContractAddress');
    }
    return this.contracts.nfts;
  }

  async getTotalAvt(): Promise<string> {
    return await this.postRequest<string>(this.api, 'getTotalAvt');
  }

  async getAvtBalance(accountAddress: string): Promise<string> {
    Utils.validateAccount(accountAddress);
    return await this.postRequest<string>(this.api, 'getAvtBalance', { accountId: accountAddress });
  }

  async getTotalToken(token: string): Promise<string> {
    Utils.validateEthereumAddress(token);
    return await this.postRequest<string>(this.api, 'getTotalToken', { token });
  }

  async getTokenBalance(accountAddress: string, token: string): Promise<string> {
    Utils.validateAccount(accountAddress);
    Utils.validateEthereumAddress(token);

    return await this.postRequest<string>(this.api, 'getTokenBalance', { accountId: accountAddress, token });
  }

  async getNonce(accountAddress: string, nonceType: NonceType): Promise<string> {
    Utils.validateAccount(accountAddress);

    return await this.postRequest<string>(this.api, 'getNonce', { accountId: accountAddress, nonceType });
  }

  async getNftNonce(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    return await this.postRequest<string>(this.api, 'getNftNonce', { nftId });
  }

  async getNftListingStatus(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    return await this.postRequest<string>(this.api, 'getNftListingStatus', { nftId });
  }

  async getBatchListingStatus(batchId: string): Promise<string> {
    // Nft Ids and Batch Ids have the same format
    batchId = Utils.formatNftId(batchId);
    return await this.postRequest<string>(this.api, 'getBatchListingStatus', { batchId });
  }

  async getNftInfo(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    return await this.postRequest<string>(this.api, 'getNftInfo', { nftId });
  }

  async getNftId(externalRef: string): Promise<string> {
    Utils.validateStringIsPopulated(externalRef);

    if (!this.nftsMap[externalRef]) {
      this.nftsMap[externalRef] = await this.postRequest<string>(this.api, 'getNftId', { externalRef });
    }

    return this.nftsMap[externalRef];
  }

  async getNftOwner(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    return await this.postRequest<string>(this.api, 'getNftOwner', { nftId });
  }

  async getOwnedNfts(accountAddress: string): Promise<string[]> {
    Utils.validateAccount(accountAddress);
    return await this.postRequest<string[]>(this.api, 'getOwnedNfts', { accountId: accountAddress });
  }

  async getAccountInfo(accountAddress: string): Promise<AccountInfo> {
    Utils.validateAccount(accountAddress);
    return await this.postRequest<AccountInfo>(this.api, 'getAccountInfo', { accountId: accountAddress });
  }

  async getStakingStatus(stakerAddress: string): Promise<StakingStatus> {
    Utils.validateAccount(stakerAddress);
    return await this.postRequest<StakingStatus>(this.api, 'getStakingStatus', { accountId: stakerAddress });
  }

  async getStakerRewardsEarned(accountId: string, fromTimestamp: string = null, toTimestamp: string = null): Promise<string> {
    Utils.validateAccount(accountId);
    return await this.postRequest<string>(this.api, 'getStakerRewardsEarned', { accountId, fromTimestamp, toTimestamp });
  }

  async getValidatorsToNominate(): Promise<string[]> {
    return await this.postRequest<string[]>(this.api, 'getValidatorsToNominate');
  }

  async getMinTotalNominatorStake(): Promise<string> {
    return await this.postRequest<string>(this.api, 'getMinTotalNominatorStake');
  }

  async getActiveEra(): Promise<string> {
    return await this.postRequest<string>(this.api, 'getActiveEra');
  }

  async getStakingDelay(): Promise<number> {
    return await this.postRequest<number>(this.api, 'getStakingDelay');
  }

  async getStakingStats(): Promise<StakingStats> {
    return await this.postRequest<StakingStats>(this.api, 'getStakingStats');
  }

  async getRelayerFees(relayerAddress: string, userAddress: string, transactionType?: TxType): Promise<RelayerFees | number> {
    Utils.validateAccount(relayerAddress);
    if (userAddress) Utils.validateAccount(userAddress);

    return await this.postRequest<RelayerFees | number>(this.api, 'getRelayerFees', {
      relayer: relayerAddress,
      user: userAddress,
      transactionType
    });
  }

  async getCurrentBlock(): Promise<string> {
    return await this.postRequest<string>(this.api, 'getCurrentBlock');
  }

  async getOutstandingLowersForAccount(accountAddress: string): Promise<LowerData> {
    const u8a = isHex(accountAddress) ? hexToU8a(accountAddress) : AccountUtils.convertToPublicKeyBytes(accountAddress);
    const account = u8a.length === 20 ? ethereumEncode(u8a) : u8aToHex(u8a);
    return await this.getRequest<LowerData>(this.api, account, 'lowers');
  }
}
