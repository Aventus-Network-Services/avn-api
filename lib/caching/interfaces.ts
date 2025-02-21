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
  // Connect to the cache
  connect(): Promise<INonceCacheProvider>;
  // Setup a new cache object for the user. This will only be called once per user during the initialisation of the 'apis()'
  initUserNonceCache(signerAddress: string): Promise<void>;
  // Lock the nonce and return the nonce info
  getNonceAndLock(signerAddress: string, nonceId: string): Promise<CachedNonceInfo>;
  // Read the current nonce data.
  getNonceData(signerAddress: string, nonceId: string): Promise<NonceData>;
  // Increment nonce by 1. Should only succeed if lockId matches the active lock.
  incrementNonce(lockId: string, signerAddress: string, nonceId: string, updateLastUpdate: boolean): Promise<NonceData>;
  // Unlock nonce. Should only succeed if lockId matches the active lock.
  unlockNonce(lockId: string, signerAddress: string, nonceId: string): Promise<void>;
  // Reset nonce to a different value. Should only succeed if lockId matches the active lock.
  setNonce(lockId: string, signerAddress: string, nonceId: string, nonce: number): Promise<void>;
}
