export enum NonceCacheType {
  Local,
  Remote
}

export interface CachedNonceInfo {
  lockAquired: boolean;
  data: NonceData;
}

export interface NonceData {
  nonce: number;
  lastUpdated: number;
  locked: boolean;
  lockId?: string;
}

export interface INonceCacheProvider {
  connect(): Promise<INonceCacheProvider>;
  initUserNonceCache(signerAddress: string): Promise<void>;
  getNonceAndLock(signerAddress: string, nonceType: string): Promise<CachedNonceInfo>;
  getNonceData(signerAddress: string, nonceType: string): Promise<NonceData>;
  incrementNonce(lockId: string, signerAddress: string, nonceType: string, updateLastUpdate: boolean): Promise<NonceData>;
  isNonceLocked(signerAddress: string, nonceType: string): Promise<boolean>;
  unlockNonce(signerAddress: string, nonceType: string): Promise<void>;
  setNonce(lockId: string, signerAddress: string, nonceType: string, nonce: number): Promise<void>;
}
