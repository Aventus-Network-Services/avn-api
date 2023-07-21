import { NonceType } from '../interfaces/index';
import { Query } from '../apis/query';
import { INonceCacheProvider, NonceData } from './index';
import { AccountUtils, Utils } from '../utils';

const TX_PROCESSING_TIME_MS = 120000;
const NONCE_LOCK_POLL_INTERVAL_MS = 500;
const MAX_NONCE_LOCK_TIME_MS = TX_PROCESSING_TIME_MS + NONCE_LOCK_POLL_INTERVAL_MS;
const EXPIRY_UPDATE_ENUM = {
  DoNotUpade: false,
  UpdateExpiry: true
};

export class ProxyNonceCache {
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

  public async getNonceAndIncrement(signerAddress: string, nonceType: NonceType, queryApi: Query): Promise<number> {
    signerAddress = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

    let cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceType);
    if (!cachedNonceInfo) throw new Error(`Nonce not initialised for user ${signerAddress}, type: ${nonceType}`)

    try {
        if (cachedNonceInfo.lockAquired === false) {
            console.log(`Nonce for ${signerAddress}, ${nonceType} is locked, waiting for it to be released...`);
            await this.waitForLock(signerAddress, nonceType);
            cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceType);
        }

        return await this.validateNonceAndIncrement(cachedNonceInfo.data.lockId, signerAddress, nonceType, cachedNonceInfo.data, queryApi);
    } catch (err) {
      console.error(`Error getting nonce from cache: `, err.toString());
      throw err;
    } finally {
      // whatever happens, release the lock
      await this.cacheProvider.unlockNonce(signerAddress, nonceType);
    }
  }

  private async validateNonceAndIncrement(
    lockId: string,
    signerAddress: string,
    nonceType: NonceType,
    nonceData: NonceData,
    queryApi: Query
  ): Promise<number> {
    const nonceIsExpired = nonceData.lastUpdated == undefined || Date.now() - nonceData.lastUpdated >= TX_PROCESSING_TIME_MS;

    if (nonceIsExpired) {
      return await this.refreshNonceFromChain(lockId, signerAddress, nonceType, nonceData, queryApi);
    } else {
      return (await this.cacheProvider.incrementNonce(lockId, signerAddress, nonceType, EXPIRY_UPDATE_ENUM.UpdateExpiry)).nonce;
    }
  }

  private async refreshNonceFromChain(
    lockId: string,
    signerAddress: string,
    nonceType: NonceType,
    nonceData: NonceData,
    queryApi: Query
  ): Promise<number> {
    const nonceFromChain = parseInt(await queryApi.getNonce(signerAddress, nonceType));
    if (nonceData.nonce > 0 && nonceData.nonce === nonceFromChain) {
      // The chain should always be nonce + 1 so do not reset yet, instead:
      //  - Ignore the nonce from chain
      //  - Do not update the expiry
      //  - Give a chance for the chain to create a block
      console.warn(`Nonce expired but on-chain nonce ${nonceFromChain} is the same as last nonce used ${nonceData.nonce}.`);
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
  private async waitForLock(signerAddress: string, nonceType: string) {
    for (let i = 0; i < Math.ceil(MAX_NONCE_LOCK_TIME_MS / NONCE_LOCK_POLL_INTERVAL_MS); i++) {
      await Utils.sleep(NONCE_LOCK_POLL_INTERVAL_MS);
      // check if lock is released
      const isNonceLocked = await this.cacheProvider.isNonceLocked(signerAddress, nonceType);
      if (isNonceLocked === false) {
        return;
      }
    }

    console.warn(
      `Timeout expired waiting for nonce to be unlocked, forcing to unlock. Signer: ${signerAddress}, nonceType: ${nonceType}.`
    );
    await this.cacheProvider.unlockNonce(signerAddress, nonceType);
  }
}
