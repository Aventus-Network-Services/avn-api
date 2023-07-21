import { CachedNonceInfo, INonceCacheProvider, NonceData } from './index';
import { NonceType } from '../interfaces';

export class InMemoryNonceCacheProvider implements INonceCacheProvider {
  private nonceMap: { [x: string]: { [x: string]: NonceData } };
  constructor() {
    this.nonceMap = {};
  }

  async connect(): Promise<INonceCacheProvider> {
    return this;
  }

  async initUserNonceCache(signerAddress: string): Promise<void> {
    if (this.nonceMap[signerAddress] === undefined) {
      this.nonceMap[signerAddress] = Object.values(NonceType).reduce(
        (o, key) => ({
          ...o,
          [key]: {
            locked: false
          }
        }),
        {}
      );
    }
  }

  async isNonceLocked(signerAddress: string, nonceType: NonceType): Promise<boolean> {
    return this.nonceMap[signerAddress][nonceType].locked;
  }

  // Note: this is a "dirty" read from storage
  async getNonceData(signerAddress: string, nonceType: NonceType): Promise<NonceData | undefined> {
    return this.nonceMap[signerAddress][nonceType];
  }

  async getNonceAndLock(signerAddress: string, nonceType: NonceType): Promise<CachedNonceInfo> {
    const nonceData = this.nonceMap[signerAddress][nonceType];
    if (nonceData.locked === false) {
      const lockId = this.getLockId(signerAddress, nonceType, nonceData.nonce);
      this.nonceMap[signerAddress][nonceType].locked = true;
      this.nonceMap[signerAddress][nonceType].lockId = lockId;
      return { lockAquired: true, data: nonceData };
    }

    return { lockAquired: false, data: undefined };
  }

  async incrementNonce(
    lockId: string,
    signerAddress: string,
    nonceType: NonceType,
    updateLastUpdate: boolean
  ): Promise<NonceData> {
    if (this.nonceMap[signerAddress][nonceType].locked !== true || this.nonceMap[signerAddress][nonceType].lockId !== lockId) {
      throw new Error(
        `Invalid attempt to increment lock. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceType: ${nonceType}`
      );
    }

    this.nonceMap[signerAddress][nonceType].nonce += 1;
    if (updateLastUpdate === true) {
      this.nonceMap[signerAddress][nonceType].lastUpdated = Date.now();
    }

    return this.nonceMap[signerAddress][nonceType];
  }

  async unlockNonce(signerAddress: string, nonceType: NonceType): Promise<void> {
    this.nonceMap[signerAddress][nonceType].locked = false;
    this.nonceMap[signerAddress][nonceType].lockId = undefined;
  }

  async setNonce(lockId: string, signerAddress: string, nonceType: NonceType, nonce: number): Promise<void> {
    if (this.nonceMap[signerAddress][nonceType].locked !== true || this.nonceMap[signerAddress][nonceType].lockId !== lockId) {
      throw new Error(
        `Invalid attempt to set nonce. LockId: ${lockId}, signerAddress: ${signerAddress}, nonceType: ${nonceType}`
      );
    }

    this.nonceMap[signerAddress][nonceType] = { nonce: nonce, lastUpdated: Date.now(), locked: false };
  }

  private getLockId(signerAddress: string, nonceType: NonceType, nonce: number): string {
    return `${Date.now()}-${nonce}-${signerAddress}-${nonceType}`;
  }
}
