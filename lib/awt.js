'use strict';

const common = require('./common.js');
const utils = require('./utils.js');
const AwtUtils = require('./awtUtils.js');

class Awt {
    constructor(api, signerAddress, options) {
        this.splitFeeOptions = {
            hasPayer: options.hasPayer,
            payerAddress: options.payerAddress
        }

        this.signerAddress = signerAddress;
        this.apiSigner = api.sign;
        this.awtToken;
    }

    async getToken() {
        if (!AwtUtils.tokenAgeIsValid(this.awtToken)) {
            console.log(` - Awt token for ${this.signerAddress} has expired, refreshing`);
            this.awtToken = await AwtUtils.generateAwtToken(
                this.splitFeeOptions,
                { sign: this.apiSigner, address: this.signerAddress }
            );
        }

        return this.awtToken;
    }
}


module.exports = Awt;