'use strict';

import {AccountUtils, EthereumLogEventType, Market, StakingStatus, TxType, Utils} from '../utils';
import { NonceType } from '../interfaces/index';
import proxyApi = require('./proxy');
import BN from 'bn.js';

export class Send {
    private awtManager;
    private transferAvt;
    private transferToken;
    private confirmTokenLift;
    private lowerToken;
    private createNftBatch;
    private mintSingleNft;
    private mintBatchNft;
    private listFiatNftForSale;
    private listFiatNftBatchForSale;
    private transferFiatNft;
    private cancelFiatNftListing;
    private endNftBatchSale;
    private stake;
    private unstake;
    private scheduleLeaveNominators;
    private executeLeaveNominators;
    private withdrawUnlocked;
    private feesMap;
    constructor(api, queryApi, awtManager, signerAddress: string) {
        this.awtManager = awtManager;

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
    async proxyRequest(api, queryApi, apiSigner, methodArgs, transactionType, nonceType, retry) {
        // By default the user pays the relayer fees but this can be changed to any `payer`
        const payer = apiSigner;
        const relayer = await api.relayer(queryApi);

        let proxyArgs = Object.assign({ relayer, user: apiSigner, payer }, methodArgs);

        if (nonceType !== NonceType.None) {
            proxyArgs.nonce =
                nonceType === NonceType.Nft
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
    }
    async postRequest(api, signerAddress, method, params, retry) {
        if (retry === true) {
            console.log('Request failed - retrying...');
        }

        const endpoint = api.gateway + '/send';
        const awtToken = await this.awtManager.getToken();
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
    }
    async getRelayerFee(queryApi, relayer, payer, transactionType) {
        payer = AccountUtils.convertToPublicKeyIfNeeded(payer);
        if (!this.feesMap[relayer]) this.feesMap[relayer] = {};
        if (!this.feesMap[relayer][payer]) this.feesMap[relayer][payer] = await queryApi.getRelayerFees(relayer, payer);
        return this.feesMap[relayer][payer][transactionType];
    }
    async getPaymentNonceAndSignature(api, queryApi, signerAddress, paymentArgs, retry) {
        const { relayer, user, payer, proxySignature, transactionType } = paymentArgs;
        const paymentNonce = await api.nonceCache.getNonceAndIncrement(payer, NonceType.Payment, queryApi);
        const relayerFee = await this.getRelayerFee(queryApi, relayer, payer, transactionType);
        const feePaymentArgs = { relayer, user, proxySignature, relayerFee, paymentNonce, signerAddress };
        const feePaymentSignature = await proxyApi.generateFeePaymentSignature(feePaymentArgs, signerAddress, api);
        return { paymentNonce, feePaymentSignature };
    }
}

function transferAvt(api, queryApi, signerAddress) {
  return async function (recipient, amount) {
    Utils.validateAccount(recipient);
    amount = Utils.validateAndConvertAmountToString(amount);
    const token = await queryApi.getAvtContractAddress();
    const methodArgs = { recipient, token, amount };
    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyAvtTransfer, NonceType.Token);
  };
}

function transferToken(api, queryApi, signerAddress) {
  return async function (recipient, token, amount) {
    Utils.validateAccount(recipient);
    Utils.validateEthereumAddress(token);
    amount = Utils.validateAndConvertAmountToString(amount);
    const methodArgs = { recipient, token, amount };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyTokenTransfer, NonceType.Token);
  };
}

function confirmTokenLift(api, queryApi, signerAddress) {
  return async function (ethereumTransactionHash) {
    Utils.validateEthereumTransactionHash(ethereumTransactionHash);
    const eventType = EthereumLogEventType.Lifted;
    const methodArgs = { ethereumTransactionHash, eventType };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyConfirmTokenLift, NonceType.Confirmation);
  };
}

function lowerToken(api, queryApi, signerAddress) {
  return async function (t1Recipient, token, amount) {
    Utils.validateEthereumAddress(t1Recipient);
    Utils.validateEthereumAddress(token);
    amount = Utils.validateAndConvertAmountToString(amount);
    const methodArgs = { t1Recipient, token, amount };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyTokenLower, NonceType.Token);
  };
}

function createNftBatch(api, queryApi, signerAddress) {
  return async function (totalSupply, royalties, t1Authority) {
    Utils.validateNumber(totalSupply);
    Utils.validateRoyalties(royalties);
    Utils.validateEthereumAddress(t1Authority);
    const methodArgs = { totalSupply, royalties, t1Authority };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyCreateNftBatch, NonceType.Batch);
  };
}

function mintSingleNft(api, queryApi, signerAddress) {
  return async function (externalRef, royalties, t1Authority) {
    Utils.validateStringIsPopulated(externalRef);
    Utils.validateRoyalties(royalties);
    Utils.validateEthereumAddress(t1Authority);
    const methodArgs = { externalRef, royalties, t1Authority };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyMintSingleNft, NonceType.None);
  };
}

function mintBatchNft(api, queryApi, signerAddress) {
  return async function (batchId, index, owner, externalRef) {
    batchId = Utils.validateNftId(batchId);
    Utils.validateNumber(index);
    Utils.validateAccount(owner);
    Utils.validateStringIsPopulated(externalRef);
    const methodArgs = { batchId, index, owner, externalRef };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyMintBatchNft, NonceType.None);
  };
}

function listFiatNftForSale(api, queryApi, signerAddress) {
  return async function (nftId) {
    nftId = Utils.validateNftId(nftId);
    const market = Market.Fiat;
    const methodArgs = { nftId, market };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyListNftOpenForSale, NonceType.Nft);
  };
}

function listFiatNftBatchForSale(api, queryApi, signerAddress) {
  return async function (batchId) {
    batchId = Utils.validateNftId(batchId);
    const market = Market.Fiat;
    const methodArgs = { batchId, market };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyListNftBatchForSale, NonceType.Batch);
  };
}

function transferFiatNft(api, queryApi, signerAddress) {
  return async function (recipient, nftId) {
    Utils.validateAccount(recipient);
    nftId = Utils.validateNftId(nftId);
    recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);
    const methodArgs = { nftId, recipient };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyTransferFiatNft, NonceType.Nft);
  };
}

function endNftBatchSale(api, queryApi, signerAddress) {
  return async function (batchId) {
    batchId = Utils.validateNftId(batchId);
    const methodArgs = { batchId };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyEndNftBatchSale, NonceType.Batch);
  };
}

function cancelFiatNftListing(api, queryApi, signerAddress) {
  return async function (nftId) {
    nftId = Utils.validateNftId(nftId);
    const methodArgs = { nftId };

    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyCancelListFiatNft, NonceType.Nft);
  };
}

function stake(api, queryApi, signerAddress) {
  return async function (amount) {
    amount = Utils.validateAndConvertAmountToString(amount);
    const stakingStatus = await queryApi.getStakingStatus(signerAddress);

    if (stakingStatus === StakingStatus.isStaking) {
      const methodArgs = { amount };
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyIncreaseStake, NonceType.Staking);
    } else {
      const targets = await queryApi.getValidatorsToNominate();
      Utils.validateStakingTargets(targets);
      const methodArgs = { amount, targets };
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.proxyStakeAvt, NonceType.Staking);
    }
  };
}

function unstake(api, queryApi, signerAddress) {
  return async function (unstakeAmount) {
    const amount = Utils.validateAndConvertAmountToString(unstakeAmount);
    const minimumFirstTimeStakingValue = await Utils.getMinimumStakingValue(queryApi);
    const accountInfo = await queryApi.getAccountInfo(signerAddress);
    let newStakedBalance = new BN(accountInfo?.stakedBalance).sub(new BN(amount));

    if (newStakedBalance?.lt(minimumFirstTimeStakingValue)) {
      const methodArgs = {};
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyScheduleLeaveNominators, NonceType.Staking);
    } else {
      const methodArgs = { amount };
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyUnstake, NonceType.Staking);
    }
  };
}

function withdrawUnlocked(api, queryApi, signerAddress) {
  return async function () {
    const accountInfo = await queryApi.getAccountInfo(signerAddress);
    const methodArgs = {};

    if (new BN(accountInfo?.stakedBalance).eq(new BN(accountInfo?.unlockedBalance))) {
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyExecuteLeaveNominators, NonceType.Staking);
    } else {
      return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyWithdrawUnlocked, NonceType.Staking);
    }
  };
}

function scheduleLeaveNominators(api, queryApi, signerAddress) {
  return async function () {
    const methodArgs = {};
    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyScheduleLeaveNominators, NonceType.Staking);
  };
}

function executeLeaveNominators(api, queryApi, signerAddress) {
  return async function () {
    const methodArgs = {};
    return await this.proxyRequest(api, queryApi, signerAddress, methodArgs, TxType.ProxyExecuteLeaveNominators, NonceType.Staking);
  };
}

function generateFunction(functionName, api, queryApi, signerAddress) {
  return functionName(api, queryApi, signerAddress);
}






