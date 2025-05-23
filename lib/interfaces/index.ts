import { NonceCache } from '../caching';
import { INonceCacheProvider, NonceCacheType } from '../caching';
import { Query } from '../apis/query';
import { LogLevelNames } from 'loglevel';
import { AxiosStatic } from 'axios';

// NOTE: Nonce types should not be per pallet, instead they should be based
// on the nonce storage item and parameters. Ex: Prediction has 2 nonces: (User based and Market based)
export enum NonceType {
  Token = 'token',
  Payment = 'payment',
  Staking = 'staking',
  Confirmation = 'confirmation',
  Nft = 'nft',
  Batch = 'batch',
  Anchor = 'anchor',
  Prediction_Market = 'prediction_Market',
  Prediction_User = 'prediction_User',
  HybridRouter = 'hybridRouter',
  None = 'none'
}

export interface NonceInfo {
  nonceType: NonceType;
  nonceParams: {};
}

export enum SetupMode {
  SingleUser,
  MultiUser,
  Offline
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
  paymentCurrencyToken?: string;
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
  paymentCurrencyToken(queryApi: Query): Promise<string>;
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

export type PredictionMarketConstants = {
  advisoryBond: number;
  validityBond: number;
  closeEarlyBlockPeriod: number;
  closeEarlyTimeFramePeriod: number;
  closeEarlyDisputeBond: number;
  closeEarlyProtectionTimeFramePeriod: number;
  closeEarlyProtectionBlockPeriod: number;
  closeEarlyRequestBond: number;
  disputeBond: number;
  maxDisputes: number;
  minDisputeDuration: number;
  maxDisputeDuration: number;
  maxCreatorFee: number;
  minCategories: number;
  maxCategories: number;
  outsiderBond: number;
  oracleBond: number;
  maxOracleDuration: number;
  minOracleDuration: number;
  maxGracePeriod: number;
  maxSwapFee: number;
};

export type PredictionMarketAsset = { CategoricalOutcome: [string, string] } | { ForeignAsset: string } | { Tru: null };

export enum Strategy {
  /// The trade is rolled back if it cannot be executed fully.
  ImmediateOrCancel = 0,
  /// Partially fulfills the order if possible, placing the remainder in the order book. Favors
  /// achieving a specific price rather than immediate execution.
  LimitOrder = 1
}

export enum MarketCreation {
  Permissionless = 'Permissionless',
  Advised = 'Advised'
}

export enum ScoringRule {
  AmmCdaHybrid = 'AmmCdaHybrid',
  Parimutuel = 'Parimutuel'
}

export enum MarketStatus {
  Proposed = 'Proposed',
  Active = 'Active',
  Closed = 'Closed',
  Reported = 'Reported',
  Disputed = 'Disputed',
  Resolved = 'Resolved'
}

export enum MarketDisputeMechanism {
  Authorized = 'Authorized',
  Court = 'Court'
}

export interface Report {
  at: number;
  by: string;
  outcome: OutcomeReport;
}

export type OutcomeReport = { Categorical: number } | { Scalar: string };

export type CreateMarketBaseParams = {
  // The base asset of the market.
  baseAsset: string; // AssetId
  //  How much does the creator take in fees pr trade in PerBill.
  // Its a value between 0 and 1 billion. Where 1 billion is 100% trade fee.
  creatorFee?: number | Uint8Array;
  // The resolver of the market outcome
  oracle: string;
  // The fee to swap in and out of the pool.
  swapFee: string;
  // Spot prices of the assets.
  spotPrices: Array<string>;
  // Market dispute mechanism.
  disputeMechanism?: 'Authorized';
  //Type of market, categorical or scalar
  marketType: {
    Categorical: number;
  };

  // The period of the market in tuple of timestamps or block numbers.
  period:
    | {
        // The start and end block of the market.
        Block: [number, number];
      }
    | {
        // The start and end timestamp of the market.
        Timestamp: [number, number];
      };

  deadlines: {
    // The number of blocks to wait after trading ends and before the oracle can resolve the market.
    grace_period: number;
    // The number of blocks to wait for the oracle to resolve the market.
    // If this period is exceeded, the market will go into open resolving where anyone can resolve the market.
    oracle_duration: number;
    // The number of blocks to await possible disputes after market is resolved.
    dispute_duration: number;
  };
  outcome: {
    Categorical: number;
  };
  metaData: {
    Sha3_384: string;
  };
};

export type MarketPeriod = { Block: [number, number] } | { Timestamp: [number, number] };

export interface MarketBonds {
  creation?: Bond;
  oracle?: Bond;
  outsider?: Bond;
  dispute?: Bond;
  close_request?: Bond;
  close_dispute?: Bond;
}

export interface Bond {
  who: string;
  value: string;
  is_settled: boolean;
}

export interface EarlyClose {
  old: MarketPeriod;
  new: MarketPeriod;
  state: EarlyCloseState;
}

export enum EarlyCloseState {
  ScheduledAsMarketCreator = 'ScheduledAsMarketCreator',
  ScheduledAsOther = 'ScheduledAsOther',
  Disputed = 'Disputed',
  Rejected = 'Rejected'
}

export interface Deadlines {
  grace_period: number;
  oracle_duration: number;
  dispute_duration: number;
}

export interface PredictionMarketInfo {
  marketId: number;
  baseAsset: PredictionMarketAsset;
  creator: string;
  creation: MarketCreation;
  creatorFee?: string;
  oracle: string;
  metaData: string;
  marketType: {
    Categorical: number;
  };
  period: MarketPeriod;
  deadlines: Deadlines;
  scoringRule: ScoringRule;
  status: MarketStatus;
  report?: Report;
  resolvedOutcome?: OutcomeReport;
  disputeMechanism?: MarketDisputeMechanism;
  bonds: MarketBonds;
  earlyClose?: EarlyClose;
}

export interface LiquidityNode {
  account?: string;
  stake: string;
  fees: string;
  descendantStake: string;
  lazyFees: string;
}
export interface PredictionMarketPoolInfo {
  accountId: string;
  reserves: Map<PredictionMarketAsset, string>;
  collateral: PredictionMarketAsset;
  liquidityParameter: string;
  liquiditySharesManager: {
    nodes: LiquidityNode[];
    accountToIndex: Record<string, number>;
    abandonedNodes?: number[];
  };
  swapFee: string;
}

export interface NodeManagerConfig {
  rewardAccount: string;
  nodeRegistrationTransactionLifetime: string;
  nodeRegistrar: string;
  heartbeatPeriodInBlocks: string;
  rewardAmount: string;
  rewardPeriodInBlocks: string;
  rewardEnabled: boolean;
}

export interface NodeManagerInfo {
  oldestUnpaidRewardPeriodIndex: number;
  lastCompletedRewardPeriodIndex: number;
  totalRegisteredNodes: number;
}
