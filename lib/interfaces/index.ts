import { NonceCache } from '../caching';
import { INonceCacheProvider, NonceCacheType } from '../caching';
import { Query } from '../apis/query';
import { LogLevelNames } from 'loglevel';
import { AxiosStatic } from 'axios';

export enum NonceType {
  Token = 'token',
  Payment = 'payment',
  Staking = 'staking',
  Confirmation = 'confirmation',
  Nft = 'nft',
  Batch = 'batch',
  None = 'none'
}

export enum SetupMode {
  SingleUser,
  MultiUser
}

export enum SigningMode {
  SuriBased,
  RemoteSigner
}

export interface AvnAccount {
  mnemonic: string;
  seed: string;
  address: string;
  publicKey: string;
}

export interface Signer {
  sign: ApiSigner;
  address?: string;
}

export interface NonceCacheOptions {
  nonceCacheType?: NonceCacheType;
  cacheProvider?: INonceCacheProvider;
}

export interface AvnApiOptions {
  gateway?: string;
  relayer?: string;
  signer?: Signer;
  suri?: string;
  signingMode?: SigningMode;
  setupMode?: SetupMode;
  nonceCacheOptions?: NonceCacheOptions;
  hasPayer?: boolean;
  payerAddress?: string;
  defaultLogLevel?: LogLevelNames;
}

export interface IAwt {
  pk: string;
  iat: string;
  hasPayer: boolean;
  payer: string;
  sig: string;
}

export type ApiSigner = AvnApiConfig['sign'];

export interface AvnApiConfig {
  gateway: string;
  hasSplitFeeToken(): boolean;
  uuid(): string;
  axios(token: string): AxiosStatic;
  relayer(queryApi: Query): Promise<string>;
  sign(data: string, signerAddress: string): Promise<string>;
  nonceCache: NonceCache;
}

export interface SplitFeeConfig {
  hasPayer: boolean;
  payerAddress?: string;
}

export interface Royalty {
  recipient_t1_address: string;
  rate: {
    parts_per_million: number;
  };
}
