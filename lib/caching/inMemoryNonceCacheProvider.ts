import { CachedNonceInfo, INonceCacheProvider, NonceData } from './index';
import { NonceType } from '../interfaces';
import { InMemoryLock } from '../caching';

export class InMemoryNonceCacheProvider implements INonceCacheProvider {
  private nonceGuard: InMemoryLock;
  private nonceMap: { [x: string]: { [x: string]: NonceData } };
  constructor() {
    this.nonceMap = {};
    this.nonceGuard = new InMemoryLock();
  }

  async connect(): Promise<INonceCacheProvider> {
    return this;
  }

  async initUserNonceCache(signerAddress: string): Promise<void> {
    if (this.nonceMap[signerAddress] === undefined) {
      this.nonceMap[signerAddress] = {};
    }
  }

  // Note: this is a "dirty" read from storage
  async getNonceData(signerAddress: string, nonceId: string): Promise<NonceData> {
    const userCache = this.nonceMap[signerAddress];
    if (userCache && userCache[nonceId]) {
      return userCache[nonceId];
    }

    return { nonce: 0, locked: false, lockId: undefined, lastUpdated: 0 };
  }

  async getNonceAndLock(signerAddress: string, nonceId: string): Promise<CachedNonceInfo> {
    const lockKey = `memNonceCache-${signerAddress}${nonceId}`;
    await this.nonceGuard.lock(lockKey);

    try {
      const nonceData = await this.getNonceData(signerAddress, nonceId);
      if (nonceData.locked === true) {
        return { lockAquired: false, data: nonceData };
      }

      const lockId = this.getLockId(signerAddress, nonceId, nonceData.nonce);
      nonceData.locked = true;
      nonceData.lockId = lockId;
      return { lockAquired: true, data: nonceData };
    } finally {
      this.nonceGuard.unlock(lockKey);
    }
  }

  async incrementNonce(lockId: string, signerAddress: string, nonceId: string, updateLastUpdate: boolean): Promise<NonceData> {
    const nonceData = await this.getNonceData(signerAddress, nonceId);
    if (nonceData.locked !== true || nonceData.lockId !== lockId) {
      throw new Error(
        `Invalid attempt to increment lock. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceId: ${nonceId}`
      );
    }

    nonceData.nonce += 1;
    if (updateLastUpdate === true) {
      nonceData.lastUpdated = Date.now();
    }

    return nonceData;
  }

  async unlockNonce(lockId: string, signerAddress: string, nonceId: string): Promise<void> {
    const nonceData = await this.getNonceData(signerAddress, nonceId);
    if (nonceData.locked !== true || nonceData.lockId !== lockId) {
      throw new Error(
        `Invalid attempt to unlock nonce. Current nonce data: ${JSON.stringify(
          nonceData
        )}. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceId: ${nonceId}`
      );
    }

    nonceData.locked = false;
    nonceData.lockId = undefined;
  }

  async setNonce(lockId: string, signerAddress: string, nonceId: string, nonce: number): Promise<void> {
    const nonceData = await this.getNonceData(signerAddress, nonceId);
    if (nonceData.locked !== true || nonceData.lockId !== lockId) {
      throw new Error(`Invalid attempt to set nonce. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceId: ${nonceId}`);
    }

    nonceData.nonce = nonce;
    nonceData.lastUpdated = Date.now();
  }

  private getLockId(signerAddress: string, nonceId: string, nonce: number): string {
    return `${Date.now()}-${nonce}-${signerAddress}-${nonceId}`;
  }
}
