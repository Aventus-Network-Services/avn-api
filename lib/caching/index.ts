export enum  NonceCacheType {
    Local,
    Remote
};

export interface CachedNonceInfo {
    lockAquired: boolean,
    data: NonceData
}

export interface NonceData {
    nonce: number,
    lastUpdated: Date,
    locked: boolean
}

export interface INonceCacheProvider {
    connect(): Promise<INonceCacheProvider>,
    isNonceLocked(signerAddress: string, nonceType: string): Promise<boolean>
    getNonceAndLock(signerAddress: string, nonceType: string): Promise<CachedNonceInfo>
    incrementNonce(signerAddress: string, nonceType: string, updateLastUpdate: boolean): Promise<NonceData>
    unlockNonce(signerAddress: string, nonceType: string): Promise<void>
    setNonce(signerAddress: string, nonceType: string, nonce: number): Promise<void>
}