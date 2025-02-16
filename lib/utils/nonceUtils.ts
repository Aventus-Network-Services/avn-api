'use strict';

import { NonceInfo, NonceType } from '../interfaces';
import { Query } from '../apis';
import { createHash } from 'crypto';

export class NonceUtils {
  /**
   * Creates and returns a function that fetches a nonce based on the provided nonce information.
   * @param nonceInfo - Information about the nonce type and parameters.
   * @param queryApi - The API instance to use for fetching the nonce.
   * @returns A function that, when called, returns a promise resolving to the nonce string.
   */
  static createNonceFetcher(nonceInfo: NonceInfo, queryApi: Query): () => Promise<string> {
    if (!nonceInfo) throw new Error('Nonce info is required');

    const { nonceType, nonceParams } = nonceInfo;

    switch (nonceType) {
      case NonceType.Nft: {
        if (!nonceParams['nftId']) throw new Error('nftId is required for NonceType.Nft');
        return () => queryApi.getNftNonce(nonceParams['nftId']);
      }
      case NonceType.Anchor: {
        if (!nonceParams['chainId']) throw new Error('chainId is required for NonceType.Anchor');
        return () => queryApi.getAnchorNonce(nonceParams['chainId']);
      }
      case NonceType.Prediction_Market: {
        if (!nonceParams['marketId'] || !nonceParams['user']) {
          throw new Error('marketId and user are required for NonceType.Prediction_Market');
        }
        return () => queryApi.getPredictionMarketsNonce(nonceParams['marketId'], nonceParams['user']);
      }
      case NonceType.HybridRouter: {
        if (!nonceParams['marketId'] || !nonceParams['user']) {
          throw new Error('marketId and user are required for NonceType.HybridRouter');
        }
        return () => queryApi.getHybridRouterNonce(nonceParams['marketId'], nonceParams['user']);
      }
      case NonceType.Token:
      case NonceType.Payment:
      case NonceType.Staking:
      case NonceType.Batch:
      case NonceType.Confirmation:
      case NonceType.NodeManager:
      case NonceType.Prediction_User: {
        if (!nonceParams['user']) throw new Error(`user is required for NonceType ${nonceType}`);
        return () => queryApi.getUserNonce(nonceParams['user'], nonceType);
      }
      // TODO: Confirm if returning "0" is the desired behavior for NonceType.None
      case NonceType.None: {
        return () => Promise.resolve('0');
      }
      default: {
        throw new Error(`Invalid nonce type: ${nonceType}`);
      }
    }
  }

  static createLockKeyFromNonceInfo(nonceInfo: NonceInfo): string {
    const sortedParams: any = {};
    for (const key of Object.keys(nonceInfo.nonceParams).sort()) {
      sortedParams[key] = nonceInfo.nonceParams[key];
    }
    return `${nonceInfo.nonceType}-${createHash('sha256').update(JSON.stringify(sortedParams)).digest('hex')}`;
  }

  static getNonceId(nonceInfo: NonceInfo): string {
    return this.createLockKeyFromNonceInfo(nonceInfo);
  }
}
