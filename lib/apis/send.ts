'use strict';

import { AccountUtils, EthereumLogEventType, Market, StakingStatus, TxType, Utils, NonceUtils } from '../utils';
import { AvnApiConfig, NonceType, Royalty, CreateMarketBaseParams, Strategy, NonceInfo } from '../interfaces/index';
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
  txType: TxType;
}
export class Send {
  private api: AvnApiConfig;
  private awtManager: Awt;
  private queryApi: Query;
  private signerAddress: string;
  private feesMap: Fees;
  private nonceGuard: InMemoryLock;
  private paymentNonceId: string;

  constructor(api: AvnApiConfig, queryApi: Query, awtManager: Awt, nonceGuard: InMemoryLock, signerAddress: string) {
    this.api = api;
    this.awtManager = awtManager;
    this.queryApi = queryApi;
    this.signerAddress = signerAddress;
    this.nonceGuard = nonceGuard;
    this.feesMap = {};
    this.paymentNonceId = NonceUtils.getNonceId({ nonceType: NonceType.Payment, nonceParams: { user: this.signerAddress } });
  }

  async transferAvt(recipient: string, amount: string): Promise<string> {
    Utils.validateAccount(recipient);
    amount = Utils.validateAndConvertAmountToString(amount);
    const token = await this.queryApi.getAvtContractAddress();
    const methodArgs = { recipient, token, amount };
    const nonceInfo = { nonceType: NonceType.Token, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyAvtTransfer, nonceInfo)) as string;
  }

  async transferToken(recipient: string, token: string, amount: string): Promise<string> {
    Utils.validateAccount(recipient);
    Utils.validateEthereumAddress(token);
    amount = Utils.validateAndConvertAmountToString(amount);
    const methodArgs = { recipient, token, amount };
    const nonceInfo = { nonceType: NonceType.Token, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyTokenTransfer, nonceInfo)) as string;
  }

  async confirmTokenLift(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.Lifted;
    const methodArgs = { ethereumTransactionHash, eventType };
    const nonceInfo = { nonceType: NonceType.Confirmation, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyConfirmTokenLift, nonceInfo)) as string;
  }

  async mintEthereumBatchNft(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftMint;
    const methodArgs = { ethereumTransactionHash, eventType };
    const nonceInfo = { nonceType: NonceType.Confirmation, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyMintEthereumBatchNft, nonceInfo)) as string;
  }

  async transferEthereumNft(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftTransferTo;
    const methodArgs = { ethereumTransactionHash, eventType };
    const nonceInfo = { nonceType: NonceType.Confirmation, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyTransferEthereumNft, nonceInfo)) as string;
  }

  async cancelEthereumNftSale(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftCancelListing;
    const methodArgs = { ethereumTransactionHash, eventType };
    const nonceInfo = { nonceType: NonceType.Confirmation, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyCancelEthereumNftSale, nonceInfo)) as string;
  }

  async endEthereumBatchSale(ethereumTransactionHash: string): Promise<string> {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.NftEndBatchListing;
    const methodArgs = { ethereumTransactionHash, eventType };
    const nonceInfo = { nonceType: NonceType.Confirmation, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyEndEthereumBatchSale, nonceInfo)) as string;
  }

  async lowerToken(t1Recipient: string, token: string, amount: string): Promise<string> {
    Utils.validateEthereumAddress(t1Recipient);
    Utils.validateEthereumAddress(token);
    amount = Utils.validateAndConvertAmountToString(amount);
    const methodArgs = { t1Recipient, token, amount };
    const nonceInfo = { nonceType: NonceType.Token, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyTokenLower, nonceInfo)) as string;
  }

  async createNftBatch(totalSupply: number, royalties: Royalty[], t1Authority: string): Promise<string> {
    Utils.validateRoyalties(royalties);
    Utils.validateEthereumAddress(t1Authority);
    const methodArgs = { totalSupply, royalties, t1Authority };
    const nonceInfo = { nonceType: NonceType.Batch, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyCreateNftBatch, nonceInfo)) as string;
  }

  async mintSingleNft(externalRef: string, royalties: Royalty[], t1Authority: string): Promise<string> {
    Utils.validateStringIsPopulated(externalRef);
    Utils.validateRoyalties(royalties);
    Utils.validateEthereumAddress(t1Authority);
    const methodArgs = { externalRef, royalties, t1Authority };
    const nonceInfo = { nonceType: NonceType.None, nonceParams: {} };
    return (await this.proxyRequest(methodArgs, TxType.ProxyMintSingleNft, nonceInfo)) as string;
  }

  async mintBatchNft(batchId: string, index: number, owner: string, externalRef: string): Promise<string> {
    batchId = Utils.formatNftId(batchId);
    Utils.validateAccount(owner);
    Utils.validateStringIsPopulated(externalRef);
    const methodArgs = { batchId, index, owner, externalRef };
    const nonceInfo = { nonceType: NonceType.None, nonceParams: {} };
    return (await this.proxyRequest(methodArgs, TxType.ProxyMintBatchNft, nonceInfo)) as string;
  }

  async listFiatNftForSale(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    const market = Market.Fiat;
    const methodArgs = { nftId, market };
    const nonceInfo = { nonceType: NonceType.Nft, nonceParams: { nftId } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyListNftOpenForSale, nonceInfo)) as string;
  }

  async listEthereumNftForSale(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    const market = Market.Ethereum;
    const methodArgs = { nftId, market };
    const nonceInfo = { nonceType: NonceType.Nft, nonceParams: { nftId } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyListEthereumNftForSale, nonceInfo)) as string;
  }

  async listFiatNftBatchForSale(batchId: string): Promise<string> {
    batchId = Utils.formatNftId(batchId);
    const market = Market.Fiat;
    const methodArgs = { batchId, market };
    const nonceInfo = { nonceType: NonceType.Batch, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyListNftBatchForSale, nonceInfo)) as string;
  }

  async listEthereumNftBatchForSale(batchId: string): Promise<string> {
    batchId = Utils.formatNftId(batchId);
    const market = Market.Ethereum;
    const methodArgs = { batchId, market };
    const nonceInfo = { nonceType: NonceType.Batch, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyListEthereumNftBatchForSale, nonceInfo)) as string;
  }

  async transferFiatNft(recipient: string, nftId: string): Promise<string> {
    Utils.validateAccount(recipient);
    nftId = Utils.formatNftId(nftId);
    recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);
    const methodArgs = { nftId, recipient };
    const nonceInfo = { nonceType: NonceType.Nft, nonceParams: { nftId } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyTransferFiatNft, nonceInfo)) as string;
  }

  async endNftBatchSale(batchId: string): Promise<string> {
    batchId = Utils.formatNftId(batchId);
    const methodArgs = { batchId };
    const nonceInfo = { nonceType: NonceType.Batch, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyEndNftBatchSale, nonceInfo)) as string;
  }

  async cancelFiatNftListing(nftId: string): Promise<string> {
    nftId = Utils.formatNftId(nftId);
    const methodArgs = { nftId };
    const nonceInfo = { nonceType: NonceType.Nft, nonceParams: { nftId } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyCancelListFiatNft, nonceInfo)) as string;
  }

  async stake(amount: string): Promise<string> {
    amount = Utils.validateAndConvertAmountToString(amount);
    const stakingStatus = await this.queryApi.getStakingStatus(this.signerAddress);
    const nonceInfo = { nonceType: NonceType.Staking, nonceParams: { user: this.signerAddress } };

    if (stakingStatus === StakingStatus.isStaking) {
      const methodArgs = { amount };
      return (await this.proxyRequest(methodArgs, TxType.ProxyIncreaseStake, nonceInfo)) as string;
    } else {
      const targets = await this.queryApi.getValidatorsToNominate();
      Utils.validateStakingTargets(targets);
      const methodArgs = { amount, targets };
      return (await this.proxyRequest(methodArgs, TxType.proxyStakeAvt, nonceInfo)) as string;
    }
  }

  async unstake(unstakeAmount: string): Promise<string> {
    const amount = Utils.validateAndConvertAmountToString(unstakeAmount);
    const minimumFirstTimeStakingValue = await Utils.getMinimumStakingValue(this.queryApi);
    const accountInfo = await this.queryApi.getAccountInfo(this.signerAddress);
    const newStakedBalance = new BN(accountInfo?.stakedBalance).sub(new BN(amount));
    const nonceInfo = { nonceType: NonceType.Staking, nonceParams: { user: this.signerAddress } };
    if (newStakedBalance?.lt(minimumFirstTimeStakingValue)) {
      const methodArgs = {};
      return (await this.proxyRequest(methodArgs, TxType.ProxyScheduleLeaveNominators, nonceInfo)) as string;
    } else {
      const methodArgs = { amount };
      return (await this.proxyRequest(methodArgs, TxType.ProxyUnstake, nonceInfo)) as string;
    }
  }

  async withdrawUnlocked(): Promise<string> {
    const accountInfo = await this.queryApi.getAccountInfo(this.signerAddress);
    const methodArgs = {};
    const nonceInfo = { nonceType: NonceType.Staking, nonceParams: { user: this.signerAddress } };
    if (new BN(accountInfo?.stakedBalance).eq(new BN(accountInfo?.unlockedBalance))) {
      return (await this.proxyRequest(methodArgs, TxType.ProxyExecuteLeaveNominators, nonceInfo)) as string;
    } else {
      return (await this.proxyRequest(methodArgs, TxType.ProxyWithdrawUnlocked, nonceInfo)) as string;
    }
  }

  async scheduleLeaveNominators(): Promise<string> {
    const methodArgs = {};
    const nonceInfo = { nonceType: NonceType.Staking, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyScheduleLeaveNominators, nonceInfo)) as string;
  }

  async executeLeaveNominators(): Promise<string> {
    const methodArgs = {};
    const nonceInfo = { nonceType: NonceType.Staking, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyExecuteLeaveNominators, nonceInfo)) as string;
  }

  async registerHandler(handler: string, name: string): Promise<string> {
    Utils.validateAccount(handler);
    Utils.validateChainName(name);
    const methodArgs = { handler, name };
    const nonceInfo = { nonceType: NonceType.None, nonceParams: {} };
    return (await this.proxyRequest(methodArgs, TxType.ProxyRegisterHander, nonceInfo)) as string;
  }

  async submitCheckpoint(handler: string, checkpoint: string, chainId: number, checkpointOriginId: number): Promise<string> {
    Utils.validateAccount(handler);
    Utils.validateCheckpointFormat(checkpoint);
    const methodArgs = { handler, checkpoint, chainId, checkpointOriginId };
    const nonceInfo = { nonceType: NonceType.Anchor, nonceParams: { chainId } };
    return (await this.proxyRequest(methodArgs, TxType.ProxySubmitCheckpoint, nonceInfo)) as string;
  }

  async createMarketAndDeployPool(
    baseAssetEthAddress: string,
    oracle: string,
    period: CreateMarketBaseParams['period'],
    deadlines: CreateMarketBaseParams['deadlines'],
    metadata: CreateMarketBaseParams['metaData'],
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

    const nonceInfo = { nonceType: NonceType.Prediction_User, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyCreateMarketAndDeployPool, nonceInfo)) as string;
  }

  async reportMarketOutcome(marketId: string, assetIndex: number): Promise<string> {
    // The name of the property (marketId) is used to get the correct nonce so do not change it.
    // This is hacky and fragile. Come up with a better way to handle this.
    const outcome = {
      Categorical: assetIndex
    };

    const methodArgs = { marketId, outcome };
    const nonceInfo = { nonceType: NonceType.Prediction_Market, nonceParams: { marketId, user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyReportMarketOutcome, nonceInfo)) as string;
  }

  async redeemMarketShares(marketId: string): Promise<string> {
    // The name of the property (marketId) is used to get the correct nonce so do not change it.
    // This is hacky and fragile. Come up with a better way to handle this.
    const methodArgs = { marketId };
    const nonceInfo = { nonceType: NonceType.Prediction_Market, nonceParams: { marketId, user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyRedeemMarketShares, nonceInfo)) as string;
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
    const nonceInfo = { nonceType: NonceType.HybridRouter, nonceParams: { marketId, user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyBuyMarketOutcomeTokens, nonceInfo)) as string;
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
    const nonceInfo = { nonceType: NonceType.HybridRouter, nonceParams: { marketId, user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxySellMarketOutcomeTokens, nonceInfo)) as string;
  }

  async transferMarketToken(assetEthAddress: string, to: string, amount: string): Promise<string> {
    const methodArgs = {
      assetEthAddress,
      to,
      amount
    };
    const nonceInfo = { nonceType: NonceType.Prediction_User, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyTransferMarketTokens, nonceInfo)) as string;
  }

  async withdrawMarketTokens(assetEthAddress: string, amount: string): Promise<string> {
    const methodArgs = {
      assetEthAddress,
      amount
    };
    const nonceInfo = { nonceType: NonceType.Prediction_User, nonceParams: { user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyWithdrawMarketTokens, nonceInfo)) as string;
  }

  async registerNode(nodeId: string, nodeOwner: string, nodeSigningKey: string): Promise<string> {
    Utils.validateAccount(nodeId);
    Utils.validateAccount(nodeOwner);
    Utils.validateAccount(nodeSigningKey);

    nodeSigningKey = AccountUtils.convertToPublicKeyIfNeeded(nodeSigningKey);
    const blockNumber = await this.queryApi.getCurrentBlock();
    const methodArgs = {
      nodeId,
      nodeOwner,
      nodeSigningKey,
      blockNumber
    };
    const nonceInfo = { nonceType: NonceType.None, nonceParams: {} };
    return (await this.proxyRequest(methodArgs, TxType.ProxyRegisterNode, nonceInfo)) as string;
  }

  async addPredictionMarketLiquidity(marketId: number, poolSharesAmount: string, maxAmountsIn: string[]): Promise<string> {
    const blockNumber = await this.queryApi.getCurrentBlock();
    const methodArgs = {
      marketId,
      poolSharesAmount,
      maxAmountsIn,
      blockNumber
    };

    const nonceInfo = { nonceType: NonceType.None, nonceParams: {} };
    return (await this.proxyRequest(methodArgs, TxType.ProxyAddPredictionMarketLiquidity, nonceInfo)) as string;
  }

  async withdrawPredictionMarketFees(marketId: number): Promise<string> {
    const blockNumber = await this.queryApi.getCurrentBlock();
    const methodArgs = {
      marketId,
      blockNumber
    };

    const nonceInfo = { nonceType: NonceType.None, nonceParams: {} };
    return (await this.proxyRequest(methodArgs, TxType.ProxyWithdrawPredictionMarketLiquidityFees, nonceInfo)) as string;
  }

  async exitPredictionMarketLiquidity(
    marketId: number,
    currencyToken: string,
    poolSharesAmountOut: string,
    minAmountsOut: string[]
  ): Promise<string> {
    const blockNumber = await this.queryApi.getCurrentBlock();
    const methodArgs = {
      marketId,
      currencyToken,
      poolSharesAmountOut,
      minAmountsOut,
      blockNumber
    };
    const nonceInfo = { nonceType: NonceType.None, nonceParams: {} };
    const withdrawFeeParams = (await this.proxyRequest(
      { marketId, blockNumber },
      TxType.ProxyWithdrawPredictionMarketLiquidityFees,
      nonceInfo,
      true
    )) as ProxyParams;
    const exitMarketParams = (await this.proxyRequest(
      methodArgs,
      TxType.ProxyExitPredictionMarketLiquidity,
      nonceInfo,
      true
    )) as ProxyParams;
    const response = await this.postRequest(TxType.ProxyExitPredictionMarketLiquidity, [withdrawFeeParams, exitMarketParams]);
    const requestId = this.api.uuid();
    log.info(
      new Date(),
      ` Batch requestId: ${exitMarketParams.requestId} -> ${requestId}, ${withdrawFeeParams.requestId} -> ${requestId}`
    );
    log.info(new Date(), ` ${requestId} - Response: ${response}`);
    return response;
  }

  async lowerFromPredictionMarket(t1Recipient: string, assetEthAddress: string, tier1DecimalAdjustedAmount: string,): Promise<string> {
    Utils.validateEthereumAddress(t1Recipient);
    Utils.validateEthereumAddress(assetEthAddress);
    tier1DecimalAdjustedAmount = Utils.validateAndConvertAmountToString(tier1DecimalAdjustedAmount);

    log.error(`tier1DecimalAdjustedAmount: ${tier1DecimalAdjustedAmount}`);
    // Convert the amount into the correct decimal before requesting to lower.
    // While in PM, the amount is always 10 decimals but when lowering it is adjusted to the real token decimals on T1.
    const tokenMetadata = await this.queryApi.getAssetMetadata(assetEthAddress);
    if (!tokenMetadata) {
      throw new Error(`Invalid asset eth address: ${assetEthAddress}. Asset not found`);
    }
    let pmAmountToLower: BN = new BN(tier1DecimalAdjustedAmount);
    if (tokenMetadata.decimals > 10) {
       // we need to scale down amount to 10 decimals
       pmAmountToLower = pmAmountToLower.div(new BN(10).pow(new BN(tokenMetadata.decimals - 10)));
       log.error(`PM scaled down AdjustedAmount: ${pmAmountToLower}`);
    } else if (tokenMetadata.decimals < 10) {
      // we need to scale up amount to 10 decimals
      pmAmountToLower = pmAmountToLower.mul(new BN(10).pow(new BN(10 - tokenMetadata.decimals)));
      log.error(`PM scaled up AdjustedAmount: ${pmAmountToLower}`);
    }

    // amount must be adjusted to 10 decimal places
    const withdrawMethodArgs = {
      assetEthAddress,
      amount: pmAmountToLower.toString()
    };
    const withdrawNonceInfo = { nonceType: NonceType.Prediction_User, nonceParams: { user: this.signerAddress } };
    const withdrawProxyParams = (await this.proxyRequest(
      withdrawMethodArgs,
      TxType.ProxyWithdrawMarketTokens,
      withdrawNonceInfo,
      true
    )) as ProxyParams;

    // Amount must have the correct decimals for the token on T1
    const lowerMethodArgs = { t1Recipient, token: assetEthAddress, amount: tier1DecimalAdjustedAmount };
    const lowerNonceInfo = { nonceType: NonceType.Token, nonceParams: { user: this.signerAddress } };
    const lowerProxyParams = (await this.proxyRequest(
      lowerMethodArgs,
      TxType.ProxyTokenLower,
      lowerNonceInfo,
      true
    )) as ProxyParams;

    const response = await this.postRequest(TxType.ProxyLowerFromPredictionMarket, [withdrawProxyParams, lowerProxyParams]);
    const requestId = this.api.uuid();
    log.info(
      new Date(),
      ` Batch requestId: ${withdrawProxyParams.requestId} -> ${requestId}, ${lowerProxyParams.requestId} -> ${requestId}`
    );
    log.info(new Date(), ` ${requestId} - Response: ${response}`);
    return response;
  }

  async buyCompletePredictionMarketOutcomeTokens(marketId: string, amount: string): Promise<string> {
    const methodArgs = {
      marketId,
      amount
    };
    const nonceInfo = { nonceType: NonceType.Prediction_Market, nonceParams: { marketId, user: this.signerAddress } };
    return (await this.proxyRequest(methodArgs, TxType.ProxyBuyCompletePredictionMarketOutcomeTokens, nonceInfo)) as string;
  }

  async proxyRequest(
    methodArgs: any,
    transactionType: TxType,
    nonceInfo: NonceInfo,
    signOnly: boolean = false
  ): Promise<string | ProxyParams> {
    let proxyNonceData: NonceData, paymentNonceData: NonceData, proxyNonce: number, paymentNonce: number | undefined;
    const requestId = this.api.uuid();
    const nonceId = NonceUtils.getNonceId(nonceInfo);

    // Lock while we are sending the transaction to ensure we maintain a correct order
    const lockKey = `send-${this.signerAddress}-${NonceUtils.createLockKeyFromNonceInfo(nonceInfo)}`;
    await this.nonceGuard.lock(lockKey);

    log.info(``);
    log.info(new Date(), ` ${requestId} - Preparing to send ${transactionType} ${JSON.stringify(methodArgs)}`);

    try {
      const currencyToken = await this.api.paymentCurrencyToken(this.queryApi);
      // Handle locking of nonces. This is important to prevent multiple instances of the sdk from
      // accessing the same nonce concurrently
      if (nonceInfo.nonceType !== NonceType.None) {
        proxyNonceData = await this.api.nonceCache.lockNonce(this.signerAddress, nonceId, requestId);
        proxyNonce = await this.api.nonceCache.incrementNonce(
          proxyNonceData,
          this.signerAddress,
          NonceUtils.getNonceId(nonceInfo),
          requestId,
          NonceUtils.createNonceFetcher(nonceInfo, this.queryApi)
        );
      }

      if (this.api.hasSplitFeeToken() === false) {
        paymentNonceData = await this.api.nonceCache.lockNonce(this.signerAddress, this.paymentNonceId, requestId);
      }

      const params = await this.getProxyParams(
        proxyNonce,
        transactionType,
        paymentNonceData,
        methodArgs,
        requestId,
        currencyToken
      );
      paymentNonce = params?.paymentNonce;

      if (signOnly === true) {
        return params;
      }

      const response = await this.postRequest(transactionType, params);

      log.info(new Date(), ` ${requestId} - Response: ${response}`);
      return response;
    } catch (err) {
      log.error(new Date(), ` ${requestId} - Error sending transaction to the avn gateway: `, err);
      await this.decrementNonceIfRequired(nonceId, requestId, proxyNonceData?.lockId, proxyNonce);
      await this.decrementNonceIfRequired(this.paymentNonceId, requestId, paymentNonceData?.lockId, paymentNonce);
      throw err;
    } finally {
      log.debug(new Date(), ` ${requestId} - Unlocking all locks`);
      if (proxyNonceData) await this.api.nonceCache.unlockNonce(proxyNonceData.lockId, this.signerAddress, nonceId, requestId);

      if (paymentNonceData)
        await this.api.nonceCache.unlockNonce(paymentNonceData.lockId, this.signerAddress, this.paymentNonceId, requestId);

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
      response = await axios.post(endpoint, { jsonrpc: '2.0', id: requestId, method, params: params });
    } catch (err) {
      if (err.response?.status >= 500) {
        log.warn(
          new Date(),
          ` ${requestId} - First attempt at sending transaction to the gateway failed, retrying. Error: `,
          err
        );
        await Utils.sleep(RETRY_SEND_INTERVAL_MS);
        response = await axios.post(endpoint, { jsonrpc: '2.0', id: requestId, method, params: params });
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
    let params = { ...proxyArgs, requestId, user: this.signerAddress, proxySignature, currencyToken, txType };

    // Only populate paymentInfo if this is a self pay transaction
    if (this.api.hasSplitFeeToken() === false) {
      try {
        log.debug(new Date(), ` ${requestId} - Getting payment info. ${JSON.stringify(paymentNonceData)}`);
        paymentNonce = await this.api.nonceCache.incrementNonce(
          paymentNonceData,
          this.signerAddress,
          this.paymentNonceId,
          requestId,
          NonceUtils.createNonceFetcher(
            { nonceType: NonceType.Payment, nonceParams: { user: this.signerAddress } },
            this.queryApi
          )
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

        await this.decrementNonceIfRequired(this.paymentNonceId, requestId, paymentNonceData.lockId, paymentNonce);
        throw err;
      }
    }

    return params;
  }

  private async decrementNonceIfRequired(
    nonceId: string,
    requestId: string,
    lockId?: string,
    currentNonce?: number
  ): Promise<void> {
    if (lockId && currentNonce) {
      await this.api.nonceCache.setNonce(lockId, currentNonce - 1, this.signerAddress, nonceId, requestId);
    }
  }
}
