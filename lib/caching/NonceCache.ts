import { NonceType } from '../interfaces/index';
import { Query } from '../apis/query';
import { CachedNonceInfo, INonceCacheProvider, NonceData } from './index';
import { AccountUtils, Utils } from '../utils';
import { InMemoryLock } from './inMemoryLock';
import log from 'loglevel';

const TX_PROCESSING_TIME_MS = 120000;
const NONCE_LOCK_POLL_INTERVAL_MS = 500;
const MAX_NONCE_LOCK_TIME_MS = TX_PROCESSING_TIME_MS + NONCE_LOCK_POLL_INTERVAL_MS;
const EXPIRY_UPDATE_ENUM = {
  DoNotUpade: false,
  UpdateExpiry: true
};

export class NonceCache {
  private cacheProvider: INonceCacheProvider;
  private nonceGuard: InMemoryLock;

  constructor(cacheProvider: INonceCacheProvider, sameUserNonceDelayMs: number) {
    this.cacheProvider = cacheProvider;
    this.nonceGuard = new InMemoryLock(sameUserNonceDelayMs);
  }

  public async init() {
    this.cacheProvider = await this.cacheProvider.connect();
  }

  public async setNonceCacheForUserIfRequired(signerAddress: string) {
    signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
    await this.cacheProvider.initUserNonceCache(signerAddress);
  }

  public async getNonceData(signerAddress: string, nonceType: NonceType): Promise<NonceData | undefined> {
    signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
    return await this.cacheProvider.getNonceData(signerAddress, nonceType);
  }

  public async getNonceAndIncrement(
    signerAddress: string,
    nonceType: NonceType,
    queryApi: Query,
    traceId: string
  ): Promise<number> {
    signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

    log.debug(`[NonceCache]: ${traceId} - getNonceAndIncrement ${signerAddress} (${nonceType})`);
    const lockTraceId = `${signerAddress}${nonceType}`;
    await this.nonceGuard.lock(lockTraceId);

    log.debug(`[NonceCache]: ${traceId} - getNonceAndLock ${signerAddress} (${nonceType})`);

    let cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceType);
    if (!cachedNonceInfo) throw new Error(`${traceId} - Nonce not initialised for user ${signerAddress}, type: ${nonceType}`);

    try {
      if (cachedNonceInfo.lockAquired === false) {
        log.debug(`[NonceCache]: ${traceId} - Nonce for ${signerAddress} (${nonceType}) is locked.`);
        cachedNonceInfo = await this.waitForLockAndGetNonceInfo(signerAddress, nonceType, traceId);
      }

      return await this.validateNonceAndIncrement(
        cachedNonceInfo.data.lockId,
        signerAddress,
        nonceType,
        cachedNonceInfo.data,
        queryApi,
        traceId
      );
    } catch (err) {
      log.error(`[NonceCache]: ${traceId} - Error getting nonce from cache: ${err.toString()}`);
      throw err;
    } finally {
      // whatever happens, release the locks
      log.debug(`[NonceCache]: ${traceId} - Unlocking all locks`);
      await this.cacheProvider.unlockNonce(signerAddress, nonceType);
      await this.nonceGuard.unlock(lockTraceId);
    }
  }

  private async validateNonceAndIncrement(
    lockId: string,
    signerAddress: string,
    nonceType: NonceType,
    nonceData: NonceData,
    queryApi: Query,
    traceId: string
  ): Promise<number> {
    const nonceIsExpired = nonceData.lastUpdated == undefined || Date.now() - nonceData.lastUpdated >= TX_PROCESSING_TIME_MS;

    if (nonceIsExpired) {
      log.debug(`[validateNonceAndIncrement]: Nonce expired. Last updated: ${nonceData.lastUpdated}. Now: `, Date.now());
      return await this.refreshNonceFromChain(lockId, signerAddress, nonceType, nonceData, queryApi, traceId);
    } else {
      return (await this.cacheProvider.incrementNonce(lockId, signerAddress, nonceType, EXPIRY_UPDATE_ENUM.UpdateExpiry)).nonce;
    }
  }

  private async refreshNonceFromChain(
    lockId: string,
    signerAddress: string,
    nonceType: NonceType,
    nonceData: NonceData,
    queryApi: Query,
    traceId: string
  ): Promise<number> {
    const nonceFromChain = parseInt(await queryApi.getNonce(signerAddress, nonceType));
    if (nonceData.nonce > 0 && nonceData.nonce === nonceFromChain) {
      // The chain should always be nonce + 1 so do not reset yet, instead:
      //  - Ignore the nonce from chain
      //  - Do not update the expiry
      //  - Give a chance for the chain to create a block
      log.warn(
        `[refreshNonceFromChain]: ${traceId} - Nonce expired but on-chain nonce ${nonceFromChain} is the same as last nonce used ${nonceData.nonce}.`
      );
      const incrementedNonce = (
        await this.cacheProvider.incrementNonce(lockId, signerAddress, nonceType, EXPIRY_UPDATE_ENUM.DoNotUpade)
      ).nonce;

      await Utils.sleep(TX_PROCESSING_TIME_MS);
      return incrementedNonce;
    } else {
      await this.cacheProvider.setNonce(lockId, signerAddress, nonceType, nonceFromChain);
      return parseInt(nonceFromChain.toString());
    }
  }

  // We wait for a maximum of MAX_NONCE_LOCK_TIME_MS until a nonce lock is released
  private async waitForLockAndGetNonceInfo(
    signerAddress: string,
    nonceType: string,
    traceId: string
  ): Promise<CachedNonceInfo> {
    log.debug(`[waitForLockAndGetNonceInfo]: ${traceId} - Max wait: ${MAX_NONCE_LOCK_TIME_MS}`);
    for (let i = 0; i < Math.ceil(MAX_NONCE_LOCK_TIME_MS / NONCE_LOCK_POLL_INTERVAL_MS); i++) {
      await Utils.sleep(NONCE_LOCK_POLL_INTERVAL_MS);
      const cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceType);
      if (cachedNonceInfo.lockAquired === true) {
        log.debug(`[waitForLockAndGetNonceInfo]: ${traceId} - Lock aquired. ${JSON.stringify(cachedNonceInfo.data)}\n`);
        return cachedNonceInfo;
      }
    }

    throw new Error(`Unable to aquire nonce lock for ${signerAddress} (${nonceType})`);
  }
}
