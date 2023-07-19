'use strict';

import AwtUtils from './awtUtils';
import { AvnApiConfig } from '../interfaces';

export class Awt {
    private splitFeeOptions: { hasPayer: boolean; payerAddress: string; };
    private signerAddress: string;
    private apiSigner: AvnApiConfig["sign"];
    private awtToken: string;

    constructor(api: AvnApiConfig, signerAddress: string, options) {
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