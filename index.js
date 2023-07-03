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

function AvnApi(gateway, options) {
  this.version = version;
  this.awtToken;
  if (gateway) this.gateway = gateway;
  this.options = options || {};
}

AvnApi.prototype.init = async function () {
  await cryptoWaitReady();
  // TODO: do we want to allow changing SURI on the fly?

  console.log("the update works");

  const setupSigner = () => {
    this.options.suri = this.options.suri || process.env.AVN_SURI;

    const hasRemoteSigner = apiHasRemoteSigner(this.options);
    if (hasRemoteSigner === true) {
      this.options.signer.publicKey = Utils.convertToPublicKeyBytes(this.options.signer.address);
    }

    if (!this.options.suri && !hasRemoteSigner) {
      throw new Error('Invalid signer. Please pass a SURI, set AVN_SURI environment variable or specify a remote signer');
    }
  };

  this.setSURI = async suri => {
    if (!suri) throw new Error('Suri is a mandatory field');

    console.log("SETTING SURI");

    this.options.suri = suri;
    this.options.signer = undefined;
    this.awtToken = this.gateway ? await Awt.generateAwtToken(this.options, this.signer()) : undefined;
    console.info(' - Suri updated');
  };

  this.setSigner = async signer => {
    if (!signer || !signer.address || typeof signer.sign !== 'function') {
      throw new Error('Signer must be an object with a sign function and an address function');
    }

    this.options.suri = undefined;

    signer.publicKey = Utils.convertToPublicKeyBytes(signer.address);

    this.options.signer = signer;
    this.awtToken = this.gateway ? await Awt.generateAwtToken(this.options, signer) : undefined;
    console.info('\t - Signer updated');
  };

  this.awt = Awt;
  this.proxy = Proxy;
  this.utils = Utils;

  setupSigner();

  this.signer = () => (apiHasRemoteSigner(this.options) ? this.options.signer : Utils.getSigner(this.options.suri));
  this.myAddress = () => this.signer().address;
  this.myPublicKey = () => Utils.convertToHexIfNeeded(this.signer().publicKey);

  if (this.gateway) {
    this.awtToken = await Awt.generateAwtToken(this.options, this.signer());

    const avnApi = {
      relayer: () => this.relayer,
      gateway: this.gateway,
      signer: () => this.signer(),
      hasSplitFeeToken: () => this.hasSplitFeeToken(),
      uuid: () => uuidv4(),
      axios: async () => {
        if (!Awt.tokenAgeIsValid(this.awtToken)) {
          console.log(' - Awt token has expired, refreshing');
          this.awtToken = await Awt.generateAwtToken(this.options, this.signer());
        }

        // Add any middlewares here to configure global axios behaviours
        Axios.defaults.headers.common = { Authorization: `bearer ${this.awtToken}` };
        return Axios;
      }
    };

    this.query = new Query(avnApi);
    this.send = new Send(avnApi, this.query);
    this.poll = new Poll(avnApi);
    this.relayer = common.validateAccount(this.options.relayer || (await this.query.getDefaultRelayer()));
  }
};

AvnApi.prototype.hasSplitFeeToken = function () {
  if (!this.options) return false;
  if (this.options.hasPayer === true) return true;

  return !!this.options.payerAddress;
};

function apiHasRemoteSigner(options) {
  if (!options.signer) return false;

  return !!options.signer.address && typeof options.signer.sign === 'function';
}

module.exports = AvnApi;
