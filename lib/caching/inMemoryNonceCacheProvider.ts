import { CachedNonceInfo, INonceCacheProvider, NonceData } from './index';
import { NonceType } from '../interfaces';

export class InMemoryNonceCacheProvider implements INonceCacheProvider {
  private nonceMap: { [x: string]: { [x: string]: NonceData; }; };
  constructor() {
    this.nonceMap = {};
  }

  async connect(): Promise<INonceCacheProvider> {
    return this;
  }

  async isNonceLocked(signerAddress: string, nonceType: NonceType): Promise<boolean> {
    if (this.isUndefined(signerAddress, nonceType)) return false;
    return this.nonceMap[signerAddress][nonceType].locked;
  }

  async getNonceAndLock(signerAddress: string, nonceType: NonceType): Promise<CachedNonceInfo> {
    if (this.isUndefined(signerAddress, nonceType)) return undefined;

    const nonceData = this.nonceMap[signerAddress][nonceType];
    if (nonceData.locked === false) {
      this.nonceMap[signerAddress][nonceType].locked = true;
      return { lockAquired: true, data: nonceData };
    }

    return { lockAquired: false, data: undefined };
  }

  async incrementNonce(signerAddress: string, nonceType: NonceType, updateLastUpdate: boolean): Promise<NonceData> {
    if (this.isUndefined(signerAddress, nonceType)) throw new Error(`Nonce missing for ${signerAddress}, type: ${nonceType}`);

    this.nonceMap[signerAddress][nonceType].nonce += 1;
    if (updateLastUpdate === true) {
      this.nonceMap[signerAddress][nonceType].lastUpdated = Date.now();
    }

    return this.nonceMap[signerAddress][nonceType];
  }

  async unlockNonce(signerAddress: string, nonceType: NonceType): Promise<void> {
    this.nonceMap[signerAddress][nonceType].locked = false;
  }

  async setNonce(signerAddress: string, nonceType: NonceType, nonce: number): Promise<void> {
    if (this.nonceMap[signerAddress] === undefined) {
      this.nonceMap[signerAddress] = { nonceType: undefined };
    }

    this.nonceMap[signerAddress][nonceType] = { nonce: nonce, lastUpdated: Date.now(), locked: false };
  }

  private isUndefined(signerAddress: string, nonceType: NonceType): boolean {
    if (this.nonceMap[signerAddress] === undefined || this.nonceMap[signerAddress][nonceType] === undefined) {
      return true;
    }

    return false;
  }
}
