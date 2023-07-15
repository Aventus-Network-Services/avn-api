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
const version = require('./package.json').version;

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

        this.options = options;
        this.version = version;
        this.gateway = gateway;
        this.utils = Utils;
        this.proxy = Proxy;

        if (this.options.signingMode === AvnApi.SigningMode.SuriBased) {
            this.options.suri = this.options.suri || process.env.AVN_SURI;
        }
    }

    /*
        - Single user mode can use remote or suri signing
        - multi user mode can only use remote signing
    */
    async init() {
        await cryptoWaitReady();

        if (this.gateway) {
            const signFunc = async (data, signerAddress) => {
                if(this.options.signingMode === AvnApi.SigningMode.RemoteSigner) {
                    //console.log("remote sign")
                    return await this.options.signer.sign(data, signerAddress)
                } else if(this.options.signingMode === AvnApi.SigningMode.SuriBased) {
                    //console.log("suri sign")
                    return this.signer.sign(data)
                }
            };

            const avnApi = {
                gateway: this.gateway,
                hasSplitFeeToken: () => this.hasSplitFeeToken(),
                uuid: () => uuidv4(),
                axios: (token) => {
                    console.log("Axio called with token: ", token)
                    // Add any middlewares here to configure global axios behaviours
                    Axios.defaults.headers.common = { Authorization: `bearer ${token}` };
                    return Axios;
                },
                relayer: async (signer) => {
                    if (!this.relayer) {
                        this.relayer = !!this.options.relayer || (await this.query(signer).getDefaultRelayer());
                    }
                    return this.relayer;
                },
                sign: async (data, signerAddress) => await signFunc(data, signerAddress)
            };

            if(this.options.setupMode === AvnApi.SetupMode.SingleUser) {
                if (this.options.signingMode === AvnApi.SigningMode.SuriBased) {
                    this.signer = Utils.getSigner(this.options.suri);
                    this.myAddress = this.signer.address;
                    this.myPublicKey = Utils.convertToHexIfNeeded(Utils.convertToPublicKeyBytes(this.myAddress));
                }
            }

            if (this.options.signingMode === AvnApi.SigningMode.SuriBased) {
                this.query = () => new Query(avnApi, new Awt(avnApi, this.signer.address, this.options), this.signer.address);
                this.send = () => new Send(avnApi, new Query(avnApi, this.signer.address), this.signer.address);
                this.poll = () => new Poll(avnApi, this.signer.address);
            } else {
                this.query = (signerAddress) => new Query(avnApi, new Awt(avnApi, signerAddress, this.options), signerAddress);
                this.send = (signerAddress) => new Send(avnApi, new Query(avnApi, signerAddress), signerAddress);
                this.poll = (signerAddress) => new Poll(avnApi, signerAddress);
            }
        }
    }

    hasSplitFeeToken() {
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
