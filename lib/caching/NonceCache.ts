import { NonceType } from '../interfaces/index';
import { Query } from '../apis/query';
import { CachedNonceInfo, INonceCacheProvider, NonceData } from './index';
import { AccountUtils, Utils } from '../utils';
import log from 'loglevel';
import BN from 'bn.js';

const TX_PROCESSING_TIME_MS = 120000;
const NONCE_LOCK_POLL_INTERVAL_MS = 500;
const MAX_NONCE_LOCK_TIME_MS = TX_PROCESSING_TIME_MS + NONCE_LOCK_POLL_INTERVAL_MS;
const EXPIRY_UPDATE_ENUM = {
  DoNotUpdate: false,
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

  public async getNonceData(signerAddress: string, nonceId: string): Promise<NonceData | undefined> {
    signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
    return await this.cacheProvider.getNonceData(signerAddress, nonceId);
  }

  public async lockNonce(signerAddress: string, nonceId: string, requestId: string): Promise<NonceData> {
    signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
    log.debug(new Date(), ` ${requestId} - Locking nonce. signerAddress: ${signerAddress}, nonceId: ${nonceId}`);

    let cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceId);
    if (!cachedNonceInfo) throw new Error(`${requestId} - Nonce not initialised for user ${signerAddress}, Id: ${nonceId}`);

    if (cachedNonceInfo.lockAquired === false) {
      log.debug(
        new Date(),
        ` ${requestId} - Unable to aquire lock, waiting. signerAddress: ${signerAddress}, nonceId: ${nonceId}`
      );
      cachedNonceInfo = await this.waitForLockAndGetNonceInfo(signerAddress, nonceId, requestId);
    }

    log.debug(new Date(), ` ${requestId} - Locked nonce: ${JSON.stringify(cachedNonceInfo)}`);
    return cachedNonceInfo.data;
  }

  public async incrementNonce(
    nonceData: NonceData,
    signerAddress: string,
    nonceId: string,
    requestId: string,
    fnRefreshNonce: () => Promise<string>
  ): Promise<number> {
    try {
      signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
      const nonceIsExpired = this.nonceIsExpired(nonceData);

      if (nonceIsExpired) {
        log.debug(new Date(), ` ${requestId} - Nonce expired. Nonce data: ${JSON.stringify(nonceData)}.`);
        return await this.refreshNonceFromChain(nonceData.lockId, signerAddress, nonceId, nonceData, requestId, fnRefreshNonce);
      }

      return (
        await this.cacheProvider.incrementNonce(nonceData.lockId, signerAddress, nonceId, EXPIRY_UPDATE_ENUM.UpdateExpiry)
      ).nonce;
    } catch (err) {
      log.error(new Date(), ` ${requestId} - Error incrementing nonce in cache: `, err);
      throw err;
    }
  }

  public async unlockNonce(lockId: string, signerAddress: string, nonceId: string, requestId: string): Promise<void> {
    try {
      signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
      log.debug(
        new Date(),
        ` ${requestId} - Unlocking nonce. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceId: ${nonceId}`
      );
      await this.cacheProvider.unlockNonce(lockId, signerAddress, nonceId);
    } catch (err) {
      log.error(
        new Date(),
        ` ${requestId} - Error unlocking nonce. LockId: ${lockId}, signerAddress: ${signerAddress} nonceId: ${nonceId}`,
        err
      );
    }
  }

  public async setNonce(
    lockId: string,
    nonce: number,
    signerAddress: string,
    nonceId: string,
    requestId: string
  ): Promise<void> {
    try {
      signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
      log.debug(
        new Date(),
        ` ${requestId} - Setting nonce. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceId: ${nonceId}`
      );
      await this.cacheProvider.setNonce(lockId, signerAddress, nonceId, nonce);
    } catch (err) {
      log.error(
        new Date(),
        ` ${requestId} - Error setting nonce. LockId: ${lockId}, signerAddress: ${signerAddress} nonceId: ${nonceId}, nonce: ${nonce}`,
        err
      );
    }
  }

  private async refreshNonceFromChain(
    lockId: string,
    signerAddress: string,
    nonceId: string,
    nonceData: NonceData,
    requestId: string,
    fnRefreshNonce: () => Promise<string>
  ): Promise<number> {
    let nonceFromChain: number;
    console.log(`\n*** refreshNonceFromChain ${JSON.stringify(nonceData)}`);
    nonceFromChain = new BN(await fnRefreshNonce()).toNumber();
    console.log(`nonceFromChain: ${nonceFromChain} ***\n`);

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
        await this.cacheProvider.incrementNonce(lockId, signerAddress, nonceId, EXPIRY_UPDATE_ENUM.DoNotUpdate)
      ).nonce;

      await Utils.sleep(TX_PROCESSING_TIME_MS);
      return incrementedNonce;
    } else {
      await this.cacheProvider.setNonce(lockId, signerAddress, nonceId, nonceFromChain);
      return parseInt(nonceFromChain.toString());
    }
  }

  // We wait for a maximum of MAX_NONCE_LOCK_TIME_MS until a nonce lock is released
  private async waitForLockAndGetNonceInfo(
    signerAddress: string,
    nonceId: string,
    requestId: string
  ): Promise<CachedNonceInfo> {
    log.debug(new Date(), ` ${requestId} - Waiting for nonce to be unlocked. Max wait: ${MAX_NONCE_LOCK_TIME_MS}ms`);
    const maxIteration = Math.ceil(MAX_NONCE_LOCK_TIME_MS / NONCE_LOCK_POLL_INTERVAL_MS);

    for (let i = 0; i < maxIteration; i++) {
      await Utils.sleep(NONCE_LOCK_POLL_INTERVAL_MS);

      if (i + 1 === maxIteration) {
        // If this is the last iteration, check if we can force unlock
        await this.forceUnlockIfNonceIsExpired(signerAddress, nonceId, requestId);
      }

      const cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceId);
      if (cachedNonceInfo.lockAquired === true) {
        log.debug(new Date(), ` ${requestId} - Lock acquired after ${i} attempts. ${JSON.stringify(cachedNonceInfo.data)}\n`);
        return cachedNonceInfo;
      }
    }

    throw new Error(
      `[waitForLockAndGetNonceInfo]: ${requestId} - Unable to aquire nonce lock for ${signerAddress} (${nonceId})`
    );
  }

  private async forceUnlockIfNonceIsExpired(signerAddress: string, nonceId: string, requestId: string) {
    const nonceData = (await this.cacheProvider.getNonceAndLock(signerAddress, nonceId))?.data;
    const nonceIsExpired = this.nonceIsExpired(nonceData);
    if (nonceIsExpired) {
      log.debug(
        new Date(),
        ` ${requestId} - Locked nonce has expired, freeing lock. Locked nonce data: ${JSON.stringify(nonceData)}\n`
      );
      await this.unlockNonce(nonceData.lockId, signerAddress, nonceId, requestId);
    }
  }

  private nonceIsExpired(nonceData?: NonceData): boolean {
    return nonceData?.lastUpdated == undefined || Date.now() - nonceData?.lastUpdated >= TX_PROCESSING_TIME_MS;
  }
}
