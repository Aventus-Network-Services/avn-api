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
  this.setSURI = suri => {
    this.options.suri = suri;
    this.awtToken = this.gateway ? Awt.generateAwtToken(this.options) : undefined;
    console.info(' - Suri updated');
  };

  this.awt = Awt;
  this.proxy = Proxy;
  this.utils = Utils;

  // TODO: do we want to allow changing SURI on the fly?
  const getSuri = () => {
    this.options.suri = this.options.suri ?? process.env.AVN_SURI;
    return this.options.suri;
  };

  if (this.gateway) {
    if (!getSuri()) throw new Error('Suri is not defined');

    this.signer = () => Utils.getSigner(getSuri());
    this.myAddress = () => this.signer().address;
    this.myPublicKey = () => Utils.convertToPublicKeyIfNeeded(this.myAddress());
    this.awtToken = Awt.generateAwtToken(this.options);

    const avnApi = {
      relayer: () => this.relayer,
      gateway: this.gateway,
      signer: () => this.signer(),
      hasSplitFeeToken: () => this.hasSplitFeeToken(),
      uuid: () => uuidv4(),
      axios: () => {
        if (!Awt.tokenAgeIsValid(this.awtToken)) {
          console.log(' - Awt token has expired, refreshing');
          this.awtToken = Awt.generateAwtToken(this.options);
        }

        // Add any middlewares here to configure global axios behaviours
        Axios.defaults.headers.common = { Authorization: `bearer ${this.awtToken}` };
        return Axios;
      }
    };

    this.query = new Query(avnApi);
    this.send = new Send(avnApi, this.query);
    this.poll = new Poll(avnApi);
    this.relayer = common.validateAccount(this.options.relayer ?? (await this.query.getDefaultRelayer()));
  }
};

AvnApi.prototype.hasSplitFeeToken = function () {
  if (!this.options) return false;
  if (this.options.hasPayer === true) return true;

  return !!this.options.payerAddress;
};

module.exports = AvnApi;
