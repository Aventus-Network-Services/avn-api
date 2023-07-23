'use strict';

import { AccountUtils, EthereumLogEventType, Market, StakingStatus, TxType, Utils } from '../utils';
import { AvnApiConfig, NonceType, Royalty } from '../interfaces/index';
import proxyApi = require('./proxy');
import BN from 'bn.js';
import { Awt } from '../awt';
import { Query } from './query';

interface Fees {
  [key: string]: object;
}

interface PaymentArgs {
  relayer: string;
  user: string;
  payer: string;
  proxySignature: string;
  transactionType: TxType;
}

export class Send {
  private api: AvnApiConfig;
  private awtManager: Awt;
  private queryApi: Query;
  private signerAddress: string;
  private feesMap: Fees;

  constructor(api: AvnApiConfig, queryApi: Query, awtManager: Awt, signerAddress: string) {
    this.api = api;
    this.awtManager = awtManager;
    this.queryApi = queryApi;
    this.signerAddress = signerAddress;
    this.feesMap = {};
  }

  async transferAvt(recipient: string, amount: string): Promise<string> {
    Utils.validateAccount(recipient);
    amount = Utils.validateAndConvertAmountToString(amount);
    const token = await this.queryApi.getAvtContractAddress();
    const methodArgs = { recipient, token, amount };
    return await this.proxyRequest(methodArgs, TxType.ProxyAvtTransfer, NonceType.Token);
  }

  async transferToken(recipient: string, token: string, amount: string): Promise<string> {
    Utils.validateAccount(recipient);
    Utils.validateEthereumAddress(token);
    amount = Utils.validateAndConvertAmountToString(amount);
    const methodArgs = { recipient, token, amount };

    return await this.proxyRequest(methodArgs, TxType.ProxyTokenTransfer, NonceType.Token);
  }

  async confirmTokenLift(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.Lifted;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(methodArgs, TxType.ProxyConfirmTokenLift, NonceType.Confirmation);
  }

  async lowerToken(t1Recipient: string, token: string, amount: string): Promise<string> {
    Utils.validateEthereumAddress(t1Recipient);
    Utils.validateEthereumAddress(token);
    amount = Utils.validateAndConvertAmountToString(amount);
    const methodArgs = { t1Recipient, token, amount };

    return await this.proxyRequest(methodArgs, TxType.ProxyTokenLower, NonceType.Token);
  }

  async createNftBatch(totalSupply: number, royalties: Royalty[], t1Authority: string): Promise<string> {
    Utils.validateRoyalties(royalties);
    Utils.validateEthereumAddress(t1Authority);
    const methodArgs = { totalSupply, royalties, t1Authority };

    return await this.proxyRequest(methodArgs, TxType.ProxyCreateNftBatch, NonceType.Batch);
  }

  async mintSingleNft(externalRef: string, royalties: Royalty[], t1Authority: string): Promise<string> {
    Utils.validateStringIsPopulated(externalRef);
    Utils.validateRoyalties(royalties);
    Utils.validateEthereumAddress(t1Authority);
    const methodArgs = { externalRef, royalties, t1Authority };

    return await this.proxyRequest(methodArgs, TxType.ProxyMintSingleNft, NonceType.None);
  }

  async mintBatchNft(batchId: string, index: number, owner: string, externalRef: string): Promise<string> {
    batchId = Utils.validateNftId(batchId);
    Utils.validateAccount(owner);
    Utils.validateStringIsPopulated(externalRef);
    const methodArgs = { batchId, index, owner, externalRef };

    return await this.proxyRequest(methodArgs, TxType.ProxyMintBatchNft, NonceType.None);
  }

  async listFiatNftForSale(nftId: string): Promise<string> {
    nftId = Utils.validateNftId(nftId);
    const market = Market.Fiat;
    const methodArgs = { nftId, market };

    return await this.proxyRequest(methodArgs, TxType.ProxyListNftOpenForSale, NonceType.Nft);
  }

  async listFiatNftBatchForSale(batchId: string): Promise<string> {
    batchId = Utils.validateNftId(batchId);
    const market = Market.Fiat;
    const methodArgs = { batchId, market };

    return await this.proxyRequest(methodArgs, TxType.ProxyListNftBatchForSale, NonceType.Batch);
  }

  async transferFiatNft(recipient: string, nftId: string): Promise<string> {
    Utils.validateAccount(recipient);
    nftId = Utils.validateNftId(nftId);
    recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);
    const methodArgs = { nftId, recipient };

    return await this.proxyRequest(methodArgs, TxType.ProxyTransferFiatNft, NonceType.Nft);
  }

  async endNftBatchSale(batchId: string): Promise<string> {
    batchId = Utils.validateNftId(batchId);
    const methodArgs = { batchId };

    return await this.proxyRequest(methodArgs, TxType.ProxyEndNftBatchSale, NonceType.Batch);
  }

  async cancelFiatNftListing(nftId: string): Promise<string> {
    nftId = Utils.validateNftId(nftId);
    const methodArgs = { nftId };

    return await this.proxyRequest(methodArgs, TxType.ProxyCancelListFiatNft, NonceType.Nft);
  }

  async stake(amount: string): Promise<string> {
    amount = Utils.validateAndConvertAmountToString(amount);
    const stakingStatus = await this.queryApi.getStakingStatus(this.signerAddress);

    if (stakingStatus === StakingStatus.isStaking) {
      const methodArgs = { amount };
      return await this.proxyRequest(methodArgs, TxType.ProxyIncreaseStake, NonceType.Staking);
    } else {
      const targets = await this.queryApi.getValidatorsToNominate();
      Utils.validateStakingTargets(targets);
      const methodArgs = { amount, targets };
      return await this.proxyRequest(methodArgs, TxType.proxyStakeAvt, NonceType.Staking);
    }
  }

  async unstake(unstakeAmount: string): Promise<string> {
    const amount = Utils.validateAndConvertAmountToString(unstakeAmount);
    const minimumFirstTimeStakingValue = await Utils.getMinimumStakingValue(this.queryApi);
    const accountInfo = await this.queryApi.getAccountInfo(this.signerAddress);
    const newStakedBalance = new BN(accountInfo?.stakedBalance).sub(new BN(amount));

    if (newStakedBalance?.lt(minimumFirstTimeStakingValue)) {
      const methodArgs = {};
      return await this.proxyRequest(methodArgs, TxType.ProxyScheduleLeaveNominators, NonceType.Staking);
    } else {
      const methodArgs = { amount };
      return await this.proxyRequest(methodArgs, TxType.ProxyUnstake, NonceType.Staking);
    }
  }

  async withdrawUnlocked(): Promise<string> {
    const accountInfo = await this.queryApi.getAccountInfo(this.signerAddress);
    const methodArgs = {};

    if (new BN(accountInfo?.stakedBalance).eq(new BN(accountInfo?.unlockedBalance))) {
      return await this.proxyRequest(methodArgs, TxType.ProxyExecuteLeaveNominators, NonceType.Staking);
    } else {
      return await this.proxyRequest(methodArgs, TxType.ProxyWithdrawUnlocked, NonceType.Staking);
    }
  }

  async scheduleLeaveNominators(): Promise<string> {
    const methodArgs = {};
    return await this.proxyRequest(methodArgs, TxType.ProxyScheduleLeaveNominators, NonceType.Staking);
  }

  async executeLeaveNominators(): Promise<string> {
    const methodArgs = {};
    return await this.proxyRequest(methodArgs, TxType.ProxyExecuteLeaveNominators, NonceType.Staking);
  }

  async proxyRequest(methodArgs: any, transactionType: TxType, nonceType: NonceType): Promise<string> {
    const uniqueId = this.api.uuid();
    console.log(`\n\n **** \n- Preapring to send ${uniqueId}`)
    // By default the user pays the relayer fees but this can be changed to any `payer`
    const payer = this.signerAddress;
    const relayer = await this.api.relayer(this.queryApi);

    const proxyArgs = Object.assign({ relayer, user: this.signerAddress, payer }, methodArgs);

    if (nonceType !== NonceType.None) {
      proxyArgs.nonce =
        nonceType === NonceType.Nft
          ? await this.queryApi.getNftNonce(methodArgs.nftId)
          : await this.api.nonceCache.getNonceAndIncrement(this.signerAddress, nonceType, this.queryApi);
    }

    let params = { ...proxyArgs, uniqueId };

    const proxySignature = await proxyApi.generateProxySignature(this.api, this.signerAddress, transactionType, proxyArgs);
    params.proxySignature = proxySignature;

    // Only populate paymentInfo if this is a self pay transaction
    if (this.api.hasSplitFeeToken() === false) {
      // By default the user pays the relayer fees but this can be changed to any `payer`
      const paymentArgs = { relayer, user: this.signerAddress, payer, proxySignature, transactionType };
      const paymentData = await this.getPaymentNonceAndSignature(paymentArgs);
      params = Object.assign(params, {
        feePaymentSignature: paymentData.feePaymentSignature,
        paymentNonce: paymentData.paymentNonce,
        payer
      });
    }

    const response = await this.postRequest(transactionType, params);
    console.log(`\nResponse ${uniqueId} - (${new Date()}): ${response}\n\n`);
    return response;
  }

  async postRequest(method: TxType, params: any): Promise<string> {
    const uniqueId = params.uniqueId || this.api.uuid();
    console.log(`\n Sending transaction ${uniqueId} - (${new Date()}): ${JSON.stringify(params)}`);
    const endpoint = this.api.gateway + '/send';
    const awtToken = await this.awtManager.getToken();
    const response = await this.api
      .axios(awtToken)
      .post(endpoint, { jsonrpc: '2.0', id: uniqueId, method: method, params: params });

    if (!response || !response.data) {
      throw new Error('Invalid server response');
    }

    if (response.data.result) {
      return response.data.result;
    }
  }

  async getRelayerFee(relayer: string, payer: string, transactionType: TxType) {
    payer = AccountUtils.convertToPublicKeyIfNeeded(payer);
    if (!this.feesMap[relayer]) this.feesMap[relayer] = {};
    if (!this.feesMap[relayer][payer]) this.feesMap[relayer][payer] = await this.queryApi.getRelayerFees(relayer, payer);
    return this.feesMap[relayer][payer][transactionType];
  }

  async getPaymentNonceAndSignature(paymentArgs: PaymentArgs): Promise<{ paymentNonce: number; feePaymentSignature: string }> {
    const { relayer, user, payer, proxySignature, transactionType } = paymentArgs;
    const paymentNonce = await this.api.nonceCache.getNonceAndIncrement(payer, NonceType.Payment, this.queryApi);
    const relayerFee = await this.getRelayerFee(relayer, payer, transactionType);
    const feePaymentArgs = { relayer, user, proxySignature, relayerFee, paymentNonce, signerAddress: this.signerAddress };
    const feePaymentSignature = await proxyApi.generateFeePaymentSignature(feePaymentArgs, this.signerAddress, this.api);
    return { paymentNonce, feePaymentSignature };
  }
}
