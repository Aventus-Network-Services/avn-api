import { v4 } from 'uuid';
import Axios, { AxiosInstance, AxiosStatic } from 'axios';
import { cryptoWaitReady, isEthereumAddress } from '@polkadot/util-crypto';
import { Query, Send, Poll } from './apis';
import { NonceCache, InMemoryNonceCacheProvider, NonceData } from './caching';
import { Awt, AwtUtils } from './awt';
import { AccountUtils, NonceUtils, Utils } from './utils';
import { version } from '../package.json';
import { AvnApiConfig, AvnApiOptions, SigningMode, SetupMode, Signer, NonceType } from './interfaces';
import { NonceCacheType, InMemoryLock } from './caching';
import { setLogLevel } from './logger';
import log from 'loglevel';
import ProxyUtils from './apis/proxy';

interface Apis {
  query: Query;
  send: Send;
  poll: Poll;
  proxyNonce: (signerAddress: string, nonceId: string) => Promise<NonceData | undefined>;
}

export type { Apis };

export class AvnApi {
  // Hide this field because it contains sensitive data
  #suri = undefined;

  private options: AvnApiOptions;

  public version: string;
  public gateway: string;
  public relayer: string;
  public accountUtils: AccountUtils;
  public nonceUtils: NonceUtils;
  public awtUtils: AwtUtils;
  public proxyUtils: ProxyUtils;
  public apis: (signerAddress: string) => Promise<Apis>;
  public signer: Signer;
  public myAddress: string;
  public myPublicKey: string;
  public paymentCurrencyToken: string;
  private signerEthereumAddress: Map<string, string> = new Map();

  constructor(gateway?: string, options?: AvnApiOptions) {
    // Set default values
    options = this.setDefaultOptions(options);

    validateOptions(gateway, options);

    this.options = options;
    this.version = version;
    this.gateway = gateway;
    this.accountUtils = AccountUtils;
    this.nonceUtils = NonceUtils;

    if (this.options.signingMode === SigningMode.SuriBased) {
      this.#suri = options.suri || process?.env?.AVN_SURI;
      // Prevent the suri from leaking if object is printed
      delete this.options.suri;
    }
  }

  async init() {
    await cryptoWaitReady();
    setLogLevel(this.options.defaultLogLevel);

    if (this.gateway) {
      this.awtUtils = AwtUtils;
      this.proxyUtils = ProxyUtils;

      const avnApi = await this.buildApiConfig();

      if (this.options.setupMode === SetupMode.SingleUser && this.options.signingMode === SigningMode.SuriBased) {
        // Set additional properties
        this.signer = Utils.getSignerFromSuri(this.#suri!);
        this.myAddress = this.signer.address;
        this.myPublicKey = Utils.convertToHexIfNeeded(AccountUtils.convertToPublicKeyBytes(this.myAddress));

        // Set apis
        this.apis = async () => await this.setStandardFunctions(avnApi, this.signer.address);
      } else {
        this.apis = async (signerAddress: string) => {
          if (isEthereumAddress(signerAddress)) {
            const derivedSigner = AccountUtils.derivedSignerAddress(signerAddress);
            this.signerEthereumAddress.set(derivedSigner, signerAddress);
            signerAddress = derivedSigner;
          }
          return await this.setStandardFunctions(avnApi, signerAddress);
        };
      }
    }
  }

  private setDefaultOptions(options?: AvnApiOptions): AvnApiOptions {
    options = options || {};
    options.setupMode = options.setupMode || SetupMode.SingleUser;
    options.signingMode = options.signingMode || SigningMode.SuriBased;
    options.defaultLogLevel = options.defaultLogLevel || 'info';

    if (!options.nonceCacheOptions) {
      options.nonceCacheOptions = {
        nonceCacheType: NonceCacheType.Local
      };
    }
    return options;
  }

  private async buildApiConfig(): Promise<AvnApiConfig> {
    const avnApi = {
      gateway: this.gateway,
      hasSplitFeeToken: () => this.hasSplitFeeToken(),
      uuid: () => v4(),
      axios: (token: string): AxiosStatic => {
        log.debug(
          new Date(),
          ` - Axios called with token: ${token.substring(0, 8) + '...' + token.substring(token.length - 8)}`
        );
        // Add any middlewares here to configure global axios behaviours
        (Axios as AxiosInstance).defaults.headers.common = { Authorization: `bearer ${token}` };
        return Axios;
      },
      relayer: async (queryApi: Query) => {
        if (!this.relayer) {
          this.relayer = this.options.relayer || (await queryApi.getDefaultRelayer());
        }
        return this.relayer;
      },
      sign: async (data: string, signerAddress: string) => {
        if (this.options.signingMode === SigningMode.RemoteSigner) {
          return await this.options.signer.sign(data, this.signerEthereumAddress.get(signerAddress) || signerAddress);
        } else if (this.options.signingMode === SigningMode.SuriBased) {
          return this.signer.sign(data, this.signer.address);
        }
      },
      paymentCurrencyToken: async (queryApi: Query) => {
        if (!this.paymentCurrencyToken) {
          this.paymentCurrencyToken = this.options.paymentCurrencyToken || (await queryApi.getNativeCurrencyToken());
        }
        return this.paymentCurrencyToken;
      },
      nonceCache: await this.buildNonceCache()
    };

    return avnApi;
  }

  private async setStandardFunctions(avnApi: AvnApiConfig, signerAddress: string): Promise<Apis> {
    // Standard functions
    const awt = new Awt(avnApi, signerAddress, this.options);
    const query = new Query(avnApi, awt);
    const nonceGuard = new InMemoryLock();
    await avnApi.nonceCache.setNonceCacheForUserIfRequired(signerAddress);

    return {
      query: query,
      send: new Send(avnApi, query, awt, nonceGuard, signerAddress),
      poll: new Poll(avnApi, awt),
      proxyNonce: async (signerAddress: string, nonceId: string) => await avnApi.nonceCache.getNonceData(signerAddress, nonceId)
    };
  }

  private async buildNonceCache() {
    const cache =
      this.options.nonceCacheOptions.nonceCacheType === NonceCacheType.Remote
        ? new NonceCache(this.options.nonceCacheOptions.cacheProvider)
        : new NonceCache(new InMemoryNonceCacheProvider());

    await cache.init();
    return cache;
  }

  private hasSplitFeeToken() {
    if (!this.options) return false;
    if (this.options.hasPayer === true) return true;
    return !!this.options.payerAddress;
  }
}

function validateOptions(gatewayUrl: string, options?: AvnApiOptions) {
  if (!options) throw new Error('You must specify a setup mode and a signing mode');

  if (options.relayer) {
    Utils.validateAccount(options.relayer);
  }

  if (options.nonceCacheOptions.nonceCacheType === NonceCacheType.Remote) {
    if (!options.nonceCacheOptions.cacheProvider) {
      throw new Error(
        'With a remote cache, you must specify a cache provider interface that implements an INonceCacheProvider'
      );
    }
  }

  switch (options.signingMode) {
    case SigningMode.RemoteSigner:
      if (process?.env?.AVN_SURI || options.suri) {
        throw new Error('In remote signer mode, a suri must not be specified');
      }
      if (typeof options.signer.sign !== 'function') {
        throw new Error('In remote signer mode, you must specify a valid remote signer function');
      }
      if (options.setupMode === SetupMode.SingleUser && !options.signer.address) {
        throw new Error('In Single user, remote signer mode, you must specify an address for the signer');
      }
      break;
    case SigningMode.SuriBased:
      if (options.signer) {
        throw new Error('In suri mode, a remote signer must not be specified');
      }
      if (options.setupMode !== SetupMode.Offline && !process?.env?.AVN_SURI && !options.suri) {
        throw new Error(
          'In suri mode, you must specify a valid suri. Run the sdk in offline mode if you do not want to specify a suri or a signer'
        );
      }
      break;
    default:
      throw new Error('Signing mode must be defined');
  }

  switch (options.setupMode) {
    case SetupMode.SingleUser:
      if (!gatewayUrl) {
        throw new Error('In Single user mode, you must specify a gateway url');
      }
      break;
    case SetupMode.MultiUser:
      if (options.signingMode !== SigningMode.RemoteSigner) {
        throw new Error('In multi user mode, you must use a remote signer');
      }
      if (!gatewayUrl) {
        throw new Error('In multi user mode, you must specify a gateway url');
      }
      break;
    case SetupMode.Offline:
      if (gatewayUrl) {
        log.warn('Warning: Gateway url is ignored in offline mode');
      }
      break;
    default:
      throw new Error('setup mode must be defined');
  }
}
