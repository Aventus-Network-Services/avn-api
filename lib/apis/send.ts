'use strict';

import { AccountUtils, EthereumLogEventType, Market, StakingStatus, TxType, Utils } from '../utils';
import { AvnApiConfig, NonceType, Royalty, CreateMarketBaseParams, Strategy } from '../interfaces/index';
import ProxyUtils from './proxy';
import BN from 'bn.js';
import { Awt } from '../awt';
import { Query } from './query';
import { InMemoryLock, NonceData } from '../caching';
import log from 'loglevel';
import { AxiosResponse } from 'axios';

const RETRY_SEND_INTERVAL_MS: number = 1000;

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

interface ProxyParams {
  requestId: string;
  user: string;
  proxySignature: string;
  relayer: string;
  nonce: number;
  feePaymentSignature?: string;
  paymentNonce?: number;
  payer?: string;
  currencyToken: string;
}

export class Send {
  private api: AvnApiConfig;
  private awtManager: Awt;
  private queryApi: Query;
  private signerAddress: string;
  private feesMap: Fees;
  private nonceGuard: InMemoryLock;

  constructor(api: AvnApiConfig, queryApi: Query, awtManager: Awt, nonceGuard: InMemoryLock, signerAddress: string) {
    this.api = api;
    this.awtManager = awtManager;
    this.queryApi = queryApi;
    this.signerAddress = signerAddress;
    this.nonceGuard = nonceGuard;
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

  async mintEthereumBatchNft(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftMint;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(methodArgs, TxType.ProxyMintEthereumBatchNft, NonceType.Confirmation);
  }

  async transferEthereumNft(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftTransferTo;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(methodArgs, TxType.ProxyTransferEthereumNft, NonceType.Confirmation);
  }

  async cancelEthereumNftSale(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftCancelListing;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(methodArgs, TxType.ProxyCancelEthereumNftSale, NonceType.Confirmation);
  }

  async endEthereumBatchSale(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftEndBatchListing;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(methodArgs, TxType.ProxyEndEthereumBatchSale, NonceType.Confirmation);
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
    batchId = Utils.formatNftId(batchId);
    Utils.validateAccount(owner);
    Utils.validateStringIsPopulated(externalRef);
    const methodArgs = { batchId, index, owner, externalRef };

    return await this.proxyRequest(methodArgs, TxType.ProxyMintBatchNft, NonceType.None);
  }

  async listFiatNftForSale(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    const market = Market.Fiat;
    const methodArgs = { nftId, market };

    return await this.proxyRequest(methodArgs, TxType.ProxyListNftOpenForSale, NonceType.Nft);
  }

  async listEthereumNftForSale(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    const market = Market.Ethereum;
    const methodArgs = { nftId, market };

    return await this.proxyRequest(methodArgs, TxType.ProxyListEthereumNftForSale, NonceType.Nft);
  }

  async listFiatNftBatchForSale(batchId: string): Promise<string> {
    batchId = Utils.formatNftId(batchId);
    const market = Market.Fiat;
    const methodArgs = { batchId, market };

    return await this.proxyRequest(methodArgs, TxType.ProxyListNftBatchForSale, NonceType.Batch);
  }

  async listEthereumNftBatchForSale(batchId: string): Promise<string> {
    batchId = Utils.formatNftId(batchId);
    const market = Market.Ethereum;
    const methodArgs = { batchId, market };

    return await this.proxyRequest(methodArgs, TxType.ProxyListEthereumNftBatchForSale, NonceType.Batch);
  }

  async transferFiatNft(recipient: string, nftId: string): Promise<string> {
    Utils.validateAccount(recipient);
    nftId = Utils.formatNftId(nftId);
    recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);
    const methodArgs = { nftId, recipient };

    return await this.proxyRequest(methodArgs, TxType.ProxyTransferFiatNft, NonceType.Nft);
  }

  async endNftBatchSale(batchId: string): Promise<string> {
    batchId = Utils.formatNftId(batchId);
    const methodArgs = { batchId };

    return await this.proxyRequest(methodArgs, TxType.ProxyEndNftBatchSale, NonceType.Batch);
  }

  async cancelFiatNftListing(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
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

  async registerHandler(handler: string, name: string): Promise<string> {
    Utils.validateAccount(handler);
    Utils.validateChainName(name);
    const methodArgs = { handler, name };
    return await this.proxyRequest(methodArgs, TxType.ProxyRegisterHander, NonceType.None);
  }

  async submitCheckpoint(handler: string, checkpoint: string, chainId: number): Promise<string> {
    Utils.validateAccount(handler);
    Utils.validateCheckpointFormat(checkpoint);
    const methodArgs = { handler, checkpoint, chainId };
    return await this.proxyRequest(methodArgs, TxType.ProxySubmitCheckpoint, NonceType.Anchor);
  }

  async createMarketAndDeployPool(
    baseAssetEthAddress: string,
    oracle: string,
    period: CreateMarketBaseParams['period'],
    deadlines: CreateMarketBaseParams['deadlines'],
    metadata: string,
    amount: string,
    spotPrices: CreateMarketBaseParams['spotPrices']
  ): Promise<string> {
    Utils.validateAccount(oracle);

    const market_constants = await this.queryApi.getPredictionMarketConstants();

    if (deadlines.grace_period > market_constants.maxGracePeriod) {
      throw new Error(`Grace period exceeds max grace period of ${market_constants.maxGracePeriod}`);
    }

    if (deadlines.oracle_duration > market_constants.maxOracleDuration) {
      throw new Error(`Oracle duration exceeds max period of ${market_constants.maxOracleDuration}`);
    }

    if (deadlines.oracle_duration < market_constants.minOracleDuration) {
      throw new Error(`Oracle duration exceeds min period of ${market_constants.minOracleDuration}`);
    }

    if (deadlines.dispute_duration > 0) {
      throw new Error(`Dispute duration must be 0 when Authorised is used as dispute mechanism`);
    }

    const baseAsset = await this.queryApi.getAssetIdFromEthToken(baseAssetEthAddress);

    if (!baseAsset) {
      throw new Error(`Invalid base asset eth address: ${baseAssetEthAddress}. Asset not found`);
    }

    const creatorFee: CreateMarketBaseParams['creatorFee'] = 0;
    const marketType: CreateMarketBaseParams['marketType'] = {
      Categorical: 2
    };

    const disputeMechanism: CreateMarketBaseParams['disputeMechanism'] = undefined; // Trusted market
    const swapFee: CreateMarketBaseParams['swapFee'] = '30000000'; //0.3% (remember its 10 decimal places not 18)

    const methodArgs = {
      baseAsset,
      baseAssetEthAddress,
      creatorFee,
      oracle,
      period,
      deadlines,
      metadata,
      marketType,
      disputeMechanism,
      amount,
      spotPrices,
      swapFee
    };
    return await this.proxyRequest(methodArgs, TxType.ProxyCreateMarketAndDeployPool, NonceType.PredictionMarkets);
  }

  async reportMarketOutcome(marketId: string, assetIndex: number): Promise<string> {
    // The name of the property (marketId) is used to get the correct nonce so do not change it.
    // This is hacky and fragile. Come up with a better way to handle this.
    const outcome = {
      Categorical: assetIndex
    };

    const methodArgs = { marketId, outcome };
    return await this.proxyRequest(methodArgs, TxType.ProxyReportMarketOutcome, NonceType.PredictionMarkets);
  }

  async redeemMarketShares(marketId: string): Promise<string> {
    // The name of the property (marketId) is used to get the correct nonce so do not change it.
    // This is hacky and fragile. Come up with a better way to handle this.
    const methodArgs = { marketId };
    return await this.proxyRequest(methodArgs, TxType.ProxyRedeemMarketShares, NonceType.PredictionMarkets);
  }

  async buyMarketOutcomeTokens(marketId: string, assetIndex: number, amountIn: string, maxPrice: string): Promise<string> {
    const assetCount = 2;
    const orders = [];
    const strategy = Strategy.ImmediateOrCancel;

    if (assetIndex < 0 || assetIndex > 1) {
      throw new Error(`Invalid asset index: ${assetIndex}`);
    }

    const asset = {
      CategoricalOutcome: [marketId, assetIndex]
    };

    const methodArgs = {
      marketId,
      assetCount,
      asset,
      amountIn,
      maxPrice,
      orders,
      strategy
    };
    return await this.proxyRequest(methodArgs, TxType.ProxyBuyMarketOutcomeTokens, NonceType.HybridRouter);
  }

  async sellMarketOutcomeTokens(marketId: string, assetIndex: number, amountIn: string, minPrice: string): Promise<string> {
    const assetCount = 2;
    const orders = [];
    const strategy = Strategy.ImmediateOrCancel;

    if (assetIndex < 0 || assetIndex > 1) {
      throw new Error(`Invalid asset index: ${assetIndex}`);
    }

    const asset = {
      CategoricalOutcome: [marketId, assetIndex]
    };

    const methodArgs = {
      marketId,
      assetCount,
      asset,
      amountIn,
      minPrice,
      orders,
      strategy
    };
    return await this.proxyRequest(methodArgs, TxType.ProxySellMarketOutcomeTokens, NonceType.HybridRouter);
  }

  async transferMarketToken(assetEthAddress: string, to: string, amount: string): Promise<string> {
    const methodArgs = {
      assetEthAddress,
      to,
      amount
    };
    return await this.proxyRequest(methodArgs, TxType.ProxyTransferMarketTokens, NonceType.PredictionMarkets);
  }

  async withdrawMarketTokens(assetEthAddress: string, amount: string): Promise<string> {
    const methodArgs = {
      assetEthAddress,
      amount
    };
    return await this.proxyRequest(methodArgs, TxType.ProxyWithdrawMarketTokens, NonceType.PredictionMarkets);
  }

  async proxyRequest(methodArgs: any, transactionType: TxType, nonceType: NonceType): Promise<string> {
    // Lock while we are sending the transaction to ensure we maintain a correct order
    const lockKey = `send-${this.signerAddress}${nonceType}`;
    await this.nonceGuard.lock(lockKey);
    log.info(``);

    const requestId = this.api.uuid();
    log.info(new Date(), ` ${requestId} - Preparing to send ${transactionType} ${JSON.stringify(methodArgs)}`);
    let proxyNonceData: NonceData, paymentNonceData: NonceData, proxyNonce: number, paymentNonce: number | undefined;

    try {
      const currencyToken = await this.api.paymentCurrencyToken(this.queryApi);
      // Handle locking of nonces. This is important to prevent multiple instances of the sdk from
      // accessing the same nonce concurrently
      if (nonceType !== NonceType.None && nonceType !== NonceType.Nft) {
        proxyNonceData = await this.api.nonceCache.lockNonce(this.signerAddress, nonceType, requestId);
      }

      if (this.api.hasSplitFeeToken() === false) {
        paymentNonceData = await this.api.nonceCache.lockNonce(this.signerAddress, NonceType.Payment, requestId);
      }

      // TODO: Passing context specific methodArgs properties is hacky and fragile. Come up with a better way to handle this.
      proxyNonce = await this.getProxyNonce(
        nonceType,
        requestId,
        proxyNonceData,
        methodArgs.nftId,
        methodArgs.chainId,
        methodArgs.marketId
      );
      const params = await this.getProxyParams(
        proxyNonce,
        transactionType,
        paymentNonceData,
        methodArgs,
        requestId,
        currencyToken
      );
      paymentNonce = params?.paymentNonce;

      const response = await this.postRequest(transactionType, params);

      log.info(new Date(), ` ${requestId} - Response: ${response}`);
      return response;
    } catch (err) {
      log.error(new Date(), ` ${requestId} - Error sending transaction to the avn gateway: `, err);
      await this.decrementNonceIfRequired(nonceType, requestId, proxyNonceData?.lockId, proxyNonce);
      await this.decrementNonceIfRequired(NonceType.Payment, requestId, paymentNonceData?.lockId, paymentNonce);
      throw err;
    } finally {
      log.debug(new Date(), ` ${requestId} - Unlocking all locks`);
      if (proxyNonceData)
        await this.api.nonceCache.unlockNonce(proxyNonceData.lockId, this.signerAddress, nonceType, requestId);

      if (paymentNonceData)
        await this.api.nonceCache.unlockNonce(paymentNonceData.lockId, this.signerAddress, NonceType.Payment, requestId);

      this.nonceGuard.unlock(lockKey);
    }
  }

  async postRequest(method: TxType, params: any): Promise<string> {
    const requestId = params.requestId || this.api.uuid();

    log.info(new Date(), ` ${requestId} - Sending transaction: ${JSON.stringify(params)}`);

    const endpoint = this.api.gateway + '/send';
    const awtToken = await this.awtManager.getToken();
    const axios = this.api.axios(awtToken);

    let response: AxiosResponse<any>;
    try {
      response = await axios.post(endpoint, { jsonrpc: '2.0', id: requestId, method: method, params: params });
    } catch (err) {
      if (err.response?.status >= 500) {
        log.warn(
          new Date(),
          ` ${requestId} - First attempt at sending transaction to the gateway failed, retrying. Error: `,
          err
        );
        await Utils.sleep(RETRY_SEND_INTERVAL_MS);
        response = await axios.post(endpoint, { jsonrpc: '2.0', id: requestId, method: method, params: params });
      }
    }

    if (response?.data?.result === null || response?.data?.result === undefined) {
      throw new Error(`${requestId} - Invalid server response`);
    }

    return response.data.result;
  }

  async getRelayerFee(relayer: string, payer: string, transactionType: TxType, currencyToken: string) {
    payer = AccountUtils.convertToPublicKeyIfNeeded(payer);
    const f = await this.queryApi.getRelayerFees(relayer, currencyToken, payer);
    if (!this.feesMap[relayer]) this.feesMap[relayer] = {};
    if (!this.feesMap[relayer][currencyToken]) this.feesMap[relayer][currencyToken] = {};
    if (!this.feesMap[relayer][currencyToken][payer])
      this.feesMap[relayer][currencyToken][payer] = await this.queryApi.getRelayerFees(relayer, currencyToken, payer);
    return this.feesMap[relayer][currencyToken][payer][transactionType];
  }

  async getPaymentSignature(
    requestId: string,
    paymentNonce: number,
    paymentArgs: PaymentArgs,
    currencyToken: string
  ): Promise<string> {
    const { relayer, user, payer, proxySignature, transactionType } = paymentArgs;
    const relayerFee = await this.getRelayerFee(relayer, payer, transactionType, currencyToken);
    const feePaymentArgs = { relayer, user, proxySignature, relayerFee, paymentNonce, signerAddress: this.signerAddress };

    log.debug(new Date(), ` ${requestId} - Generating fee payment signature. ${JSON.stringify(feePaymentArgs)}`);
    const feePaymentSignature = await ProxyUtils.generateFeePaymentSignature(
      feePaymentArgs,
      this.signerAddress,
      this.api,
      requestId,
      currencyToken
    );
    return feePaymentSignature;
  }

  private async getProxyNonce(
    nonceType: NonceType,
    requestId: string,
    proxyNonceData?: NonceData,
    nftId?: string,
    chainId?: number,
    marketId?: string
  ) {
    if (
      nonceType !== NonceType.Nft &&
      nonceType !== NonceType.Anchor &&
      nonceType !== NonceType.PredictionMarkets &&
      nonceType !== NonceType.HybridRouter &&
      !proxyNonceData
    )
      return undefined;

    if (nonceType === NonceType.Nft) {
      return new BN(await this.queryApi.getNftNonce(nftId)).toNumber();
    } else if (nonceType === NonceType.Anchor) {
      return new BN(await this.queryApi.getAnchorNonce(chainId)).toNumber();
    } else if (nonceType === NonceType.PredictionMarkets) {
      return new BN(await this.queryApi.getPredictionMarketsNonce(marketId, this.signerAddress)).toNumber();
    } else if (nonceType === NonceType.HybridRouter) {
      return new BN(await this.queryApi.getHybridRouterNonce(marketId, this.signerAddress)).toNumber();
    } else if (proxyNonceData) {
      return await this.api.nonceCache.incrementNonce(proxyNonceData, this.signerAddress, nonceType, this.queryApi, requestId);
    }
  }

  private async getProxyParams(
    proxyNonce: number,
    txType: TxType,
    paymentNonceData: NonceData,
    methodArgs: object,
    requestId: string,
    currencyToken: string
  ): Promise<ProxyParams> {
    let paymentNonce: number;
    const relayer = await this.api.relayer(this.queryApi);
    const proxyArgs = Object.assign({ relayer, nonce: proxyNonce }, methodArgs);
    const proxySignature = await ProxyUtils.generateProxySignature(this.api, this.signerAddress, txType, proxyArgs);
    let params = { ...proxyArgs, requestId, user: this.signerAddress, proxySignature, currencyToken };

    // Only populate paymentInfo if this is a self pay transaction
    if (this.api.hasSplitFeeToken() === false) {
      try {
        log.debug(new Date(), ` ${requestId} - Getting payment info. ${JSON.stringify(paymentNonceData)}`);
        paymentNonce = await this.api.nonceCache.incrementNonce(
          paymentNonceData,
          this.signerAddress,
          NonceType.Payment,
          this.queryApi,
          requestId
        );

        const paymentArgs = {
          relayer,
          user: this.signerAddress,
          payer: this.signerAddress,
          proxySignature,
          transactionType: txType
        };

        const feePaymentSignature = await this.getPaymentSignature(requestId, paymentNonce, paymentArgs, currencyToken);
        params = Object.assign(params, {
          feePaymentSignature,
          paymentNonce,
          payer: this.signerAddress
        });
      } catch (err) {
        log.error(
          new Date(),
          ` ${requestId} - Error getting proxy params. Transaction: ${txType}, args: ${JSON.stringify(methodArgs)}`
        );

        await this.decrementNonceIfRequired(NonceType.Payment, requestId, paymentNonceData.lockId, paymentNonce);
        throw err;
      }
    }

    return params;
  }

  private async decrementNonceIfRequired(
    nonceType: NonceType,
    requestId: string,
    lockId?: string,
    currentNonce?: number
  ): Promise<void> {
    if (lockId && currentNonce) {
      await this.api.nonceCache.setNonce(lockId, currentNonce - 1, this.signerAddress, nonceType, requestId);
    }
  }
}
