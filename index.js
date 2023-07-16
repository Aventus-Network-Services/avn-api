const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { v4: uuidv4 } = require('uuid');
const Axios = require('axios');
const Query = require('./lib/query.js');
const Send = require('./lib/send.js');
const Poll = require('./lib/poll.js');
const Proxy = require('./lib/proxy.js');
const Awt = require('./lib/awt.js');
const Utils = require('./lib/utils.js');
const common = require('./lib/common.js');
const version = require('./package.json').version;options

class AvnApi {
    static SetupMode = {
        SingleUser: 'singleUser',
        MultiUser: 'multiUser'
    };

    static SigningMode = {
        SuriBased: 'suriBased',
        RemoteSigner: 'remoteSigner'
    };

    constructor(gateway, options) {
        validateOptions(options)

        this.#options = options;
        this.version = version;
        this.gateway = gateway;
        this.utils = Utils;
        this.proxy = Proxy;

        if (this.#options.signingMode === AvnApi.SigningMode.SuriBased) {
            this.#options.suri = this.#options.suri || process.env.AVN_SURI;
        }
    }

    async init() {
        await cryptoWaitReady();

        if (this.gateway) {
            const avnApi = this.#buildApi();

            if(this.#options.setupMode === AvnApi.SetupMode.SingleUser &&
                this.#options.signingMode === AvnApi.SigningMode.SuriBased)
            {
                this.#applySuriBasedSingleUserSetup(avnApi)
            } else {
                this.#setStandardFunctions(avnApi)
            }
        }
    }

    #buildApi() {
        const avnApi = {
            gateway: this.gateway,
            hasSplitFeeToken: () => this.#hasSplitFeeToken(),
            uuid: () => uuidv4(),
            axios: (token) => {
                console.log(`Axios called with token: ${token.substring(0, 8) + "..." + token.substring(token.length - (8))}`)
                // Add any middlewares here to configure global axios behaviours
                Axios.defaults.headers.common = { Authorization: `bearer ${token}` };
                return Axios;
            },
            relayer: async (signer) => {
                if (!this.relayer) {
                    this.relayer = !!this.#options.relayer || (await this.query(signer).getDefaultRelayer());
                }
                return this.relayer;
            },
            sign: async (data, signerAddress) => {
                if(this.#options.signingMode === AvnApi.SigningMode.RemoteSigner) {
                    return await this.#options.signer.sign(data, signerAddress)
                } else if(this.#options.signingMode === AvnApi.SigningMode.SuriBased) {
                    return this.signer.sign(data)
                }
            }
        };

        return avnApi;
    }

    #applySuriBasedSingleUserSetup(avnApi) {
        // Additional properties
        this.signer = Utils.getSigner(this.#options.suri);
        this.myAddress = this.signer.address;
        this.myPublicKey = Utils.convertToHexIfNeeded(Utils.convertToPublicKeyBytes(this.myAddress));

        // Standard functions
        this.query = () => new Query(
            avnApi,
            new Awt(avnApi, this.signer.address, this.#options)
        );

        this.send = () => new Send(
            avnApi,
            this.query(),
            new Awt(avnApi, this.signer.address, this.#options),
            this.signer.address
        );

        this.poll = () => new Poll(
            avnApi,
            new Awt(avnApi, this.signer.address, this.#options)
        );
    }

    #setStandardFunctions(avnApi) {
        // Standard functions
        this.query = (signerAddress) => new Query(
            avnApi,
            new Awt(avnApi, signerAddress, this.#options)
        );

        this.send = (signerAddress) => new Send(
            avnApi,
            this.query(signerAddress),
            new Awt(avnApi, signerAddress, this.#options),
            signerAddress
        );

        this.poll = (signerAddress) => new Poll(
            avnApi,
            new Awt(avnApi, signerAddress, this.#options)
        );
    }

    #hasSplitFeeToken() {
        if (!this.#options) return false;
        if (this.#options.hasPayer === true) return true;

        return !!this.#options.payerAddress;
    }
}

function validateOptions(options) {
    if(!options) throw new Error("You must specify a setup mode and a signing mode")

    if (options.relayer) {
        common.validateAccount(options.relayer);
    }

    switch(options.signingMode) {
        case AvnApi.SigningMode.RemoteSigner:
            if(process.env.AVN_SURI || options.suri) {
                throw new Error("In remote signer mode, a suri must not be specified")
            }
            if(!typeof options.sign === 'function') {
                throw new Error("In remote signer mode, you must specify a valid remote signer function")
            }
            break;
        case AvnApi.SigningMode.SuriBased:
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
        case AvnApi.SetupMode.SingleUser:
            break;
        case AvnApi.SetupMode.MultiUser:
            if(options.signingMode !== AvnApi.SigningMode.RemoteSigner) {
                throw new Error("In multi user mode, you must use a remote signer")
            }
            break;
        default:
            throw new Error("setup mode must be defined")
    }
}

module.exports = AvnApi;
