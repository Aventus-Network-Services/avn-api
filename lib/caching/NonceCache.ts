import { NonceType } from '../interfaces/index';
import { Query } from '../apis/query';
import { CachedNonceInfo, INonceCacheProvider, NonceData } from './index';
import { AccountUtils, Utils } from '../utils';
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

  constructor(cacheProvider: INonceCacheProvider) {
    this.cacheProvider = cacheProvider;
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

  public async lockNonce(signerAddress: string, nonceType: NonceType, requestId: string): Promise<NonceData> {
    signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
    log.debug(new Date(), ` ${requestId} - Locking nonce. signerAddress: ${signerAddress}, nonceType: ${nonceType}`);

    let cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceType);
    if (!cachedNonceInfo) throw new Error(`${requestId} - Nonce not initialised for user ${signerAddress}, type: ${nonceType}`);

    if (cachedNonceInfo.lockAquired === false) {
      log.debug(
        new Date(),
        ` ${requestId} - Unable to aquire lock, waiting. signerAddress: ${signerAddress}, nonceType: ${nonceType}`
      );
      cachedNonceInfo = await this.waitForLockAndGetNonceInfo(signerAddress, nonceType, requestId);
    }

    log.debug(new Date(), ` ${requestId} - Locked nonce: ${JSON.stringify(cachedNonceInfo)}`);
    return cachedNonceInfo.data;
  }

  public async incrementNonce(
    nonceData: NonceData,
    signerAddress: string,
    nonceType: NonceType,
    queryApi: Query,
    requestId: string
  ): Promise<number> {
    try {
      signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
      const nonceIsExpired = nonceData.lastUpdated == undefined || Date.now() - nonceData.lastUpdated >= TX_PROCESSING_TIME_MS;

      if (nonceIsExpired) {
        log.debug(new Date(), ` ${requestId} - Nonce expired. Nonce data: ${JSON.stringify(nonceData)}.`);
        return await this.refreshNonceFromChain(nonceData.lockId, signerAddress, nonceType, nonceData, queryApi, requestId);
      }

      return (
        await this.cacheProvider.incrementNonce(nonceData.lockId, signerAddress, nonceType, EXPIRY_UPDATE_ENUM.UpdateExpiry)
      ).nonce;
    } catch (err) {
      log.error(new Date(), ` ${requestId} - Error incrementing nonce in cache: `, err);
      throw err;
    }
  }

  public async unlockNonce(lockId: string, signerAddress: string, nonceType: NonceType, requestId: string): Promise<void> {
    try {
      signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
      log.debug(
        new Date(),
        ` ${requestId} - Unlocking nonce. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceType: ${nonceType}`
      );
      await this.cacheProvider.unlockNonce(lockId, signerAddress, nonceType);
    } catch (err) {
      log.error(
        new Date(),
        ` ${requestId} - Error unlocking nonce. LockId: ${lockId}, signerAddress: ${signerAddress} nonceType: ${nonceType}`,
        err
      );
    }
  }

  public async setNonce(
    lockId: string,
    nonce: number,
    signerAddress: string,
    nonceType: NonceType,
    requestId: string
  ): Promise<void> {
    try {
      signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
      log.debug(
        new Date(),
        ` ${requestId} - Setting nonce. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceType: ${nonceType}`
      );
      await this.cacheProvider.setNonce(lockId, signerAddress, nonceType, nonce);
    } catch (err) {
      log.error(
        new Date(),
        ` ${requestId} - Error setting nonce. LockId: ${lockId}, signerAddress: ${signerAddress} nonceType: ${nonceType}, nonce: ${nonce}`,
        err
      );
    }
  }

  private async refreshNonceFromChain(
    lockId: string,
    signerAddress: string,
    nonceType: NonceType,
    nonceData: NonceData,
    queryApi: Query,
    requestId: string
  ): Promise<number> {
    const nonceFromChain = parseInt(await queryApi.getNonce(signerAddress, nonceType));
    if (nonceData.nonce > 0 && nonceData.nonce === nonceFromChain) {
      // The chain should always be nonce + 1 so do not reset yet, instead:
      //  - Ignore the nonce from chain
      //  - Do not update the expiry
      //  - Give a chance for the chain to create a block
      log.warn(
        new Date(),
        ` ${requestId} - Nonce expired but on-chain nonce ${nonceFromChain} is the same as last nonce used ${nonceData.nonce}.`
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
    requestId: string
  ): Promise<CachedNonceInfo> {
    log.debug(new Date(), ` ${requestId} - Waiting for nonce to be unlocked. Max wait: ${MAX_NONCE_LOCK_TIME_MS}ms`);
    for (let i = 0; i < Math.ceil(MAX_NONCE_LOCK_TIME_MS / NONCE_LOCK_POLL_INTERVAL_MS); i++) {
      await Utils.sleep(NONCE_LOCK_POLL_INTERVAL_MS);
      const cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceType);
      if (cachedNonceInfo.lockAquired === true) {
        log.debug(new Date(), ` ${requestId} - Lock aquired after ${i} attempts. ${JSON.stringify(cachedNonceInfo.data)}\n`);
        return cachedNonceInfo;
      }
    }

    throw new Error(
      `[waitForLockAndGetNonceInfo]: ${requestId} - Unable to aquire nonce lock for ${signerAddress} (${nonceType})`
    );
  }
}
