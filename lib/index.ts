import { v4 } from 'uuid';
import Axios from 'axios';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Query } from './apis/query';
import { Send } from './apis/send.js';
import { Poll } from'./apis/poll.js';
import { ProxyNonceCache } from './caching/ProxyNonceCache.js';
import { InMemoryNonceCacheProvider } from './caching/inMemoryNonceCacheProvider';
import { Awt } from './awt/awt.js';
import Utils from './utils/utils.js';
import { version } from '../package.json';
import AwtUtils from './awt/awtUtils';
import * as common from './utils/common';

import {AvnApiConfig, AvnApiOptions, SigningMode, SetupMode, Signer} from './interfaces'
import { NonceCacheType } from './caching';


export * from './interfaces';
export * from './caching/index';

export class AvnApi {
    // Private field to store suri if provided by caller.
    private suri = undefined;
    private options: AvnApiOptions;
    public version: string;
    public gateway: string;
    public relayer: string;
    public utils: Utils;
    public awtUtils: AwtUtils;
    public apis: any;

    public signer: Signer;
    public myAddress: string;
    public myPublicKey: string

    constructor(gateway, options) {
        // Set default values
        options = options || {}
        options.setupMode = options.setupMode || SetupMode.SingleUser;
        options.signingMode = options.signingMode || SigningMode.SuriBased;

        validateOptions(options)

        this.options = options;
        this.version = version;
        this.gateway = gateway;
        this.utils = Utils;
        this.awtUtils = AwtUtils;

        if (this.options.signingMode === SigningMode.SuriBased) {
            this.suri = options.suri || process.env.AVN_SURI;
            // Prevent the suri from leaking if object is printed
            delete this.options.suri;
        }
    }

    async init() {
        await cryptoWaitReady();

        if (this.gateway) {
            const avnApi = await this.buildApiConfig();

            if(this.options.setupMode === SetupMode.SingleUser &&
                this.options.signingMode === SigningMode.SuriBased)
            {
                // Set additional properties
                this.signer = Utils.getSigner(this.suri!);
                this.myAddress = this.signer.address;
                this.myPublicKey = Utils.convertToHexIfNeeded(common.convertToPublicKeyBytes(this.myAddress));

                // Set apis
                this.apis = () => this.setStandardFunctions(avnApi, this.signer.address)
            } else {
                this.apis = (signerAddress: string) => this.setStandardFunctions(avnApi, signerAddress)
            }
        }
    }

    private async buildApiConfig(): Promise<AvnApiConfig> {
        const avnApi = {
            gateway: this.gateway,
            hasSplitFeeToken: () => this.hasSplitFeeToken(),
            uuid: () => v4(),
            axios: (token: string) => {
                //console.log(` - Axios called with token: ${token.substring(0, 8) + "..." + token.substring(token.length - (8))}`)
                // Add any middlewares here to configure global axios behaviours
                (Axios as any).defaults.headers.common = { Authorization: `bearer ${token}` };
                return Axios;
            },
            relayer: async (queryApi: Query) => {
                if (!this.relayer) {
                    this.relayer = this.options.relayer || (await queryApi.getDefaultRelayer());
                }
                return this.relayer;
            },
            sign: async (data: string, signerAddress: string) => {
                if(this.options.signingMode === SigningMode.RemoteSigner) {
                    return await this.options.signer.sign(data, signerAddress)
                } else if(this.options.signingMode === SigningMode.SuriBased) {
                    return this.signer.sign(data, this.signer.address)
                }
            },
            nonceCache: await this.buildNonceCache()
        };

        return avnApi;
    }

    private setStandardFunctions(avnApi: AvnApiConfig, signerAddress: string) {
        // Standard functions
        const awt = new Awt(avnApi, signerAddress, this.options);
        const query = new Query(avnApi, awt);
        return {
            query: query,
            send: new Send(avnApi, query, awt, signerAddress),
            poll: new Poll(avnApi, awt)
        }
    }

    private async buildNonceCache() {
        const cache = this.options.nonceCacheType === NonceCacheType.Remote
            ? new ProxyNonceCache(this.options.cacheProvider)
            : new ProxyNonceCache(new InMemoryNonceCacheProvider());

        await cache.init();
        return cache;
    }

    private hasSplitFeeToken() {
        if (!this.options) return false;
        if (this.options.hasPayer === true) return true;
        return !!this.options.payerAddress;
    }
}

function validateOptions(options) {
    if(!options) throw new Error("You must specify a setup mode and a signing mode")

    if (options.relayer) {
        common.validateAccount(options.relayer);
    }

    if (options.nonceCacheType === NonceCacheType.Remote) {
        if(!options.cacheProvider)
        {
            throw new Error("You must specify a cache provider interface with a 'connect', 'resetNonce', 'getNonce' and 'getNonceAndIncrement' functions");
        }
    }

    switch(options.signingMode) {
        case SigningMode.RemoteSigner:
            if(process.env.AVN_SURI || options.suri) {
                throw new Error("In remote signer mode, a suri must not be specified")
            }
            if(typeof options.signer.sign !== 'function') {
                throw new Error("In remote signer mode, you must specify a valid remote signer function")
            }
            break;
        case SigningMode.SuriBased:
            if(options.signer) {
                throw new Error("In suri mode, a remote signer must not be specified")
            }
            if(!process.env.AVN_SURI && !options.suri) {
                throw new Error("In suri mode, you must specify a valid suri")
            }
            break;
        default:
            throw new Error("Signing mode must be defined")
    }

    switch(options.setupMode) {
        case SetupMode.SingleUser:
            break;
        case SetupMode.MultiUser:
            if(options.signingMode !== SigningMode.RemoteSigner) {
                throw new Error("In multi user mode, you must use a remote signer")
            }
            break;
        default:
            throw new Error("setup mode must be defined")
    }
}
