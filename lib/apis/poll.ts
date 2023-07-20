'use strict';

import {Utils} from '../utils';
import {Awt} from '../awt'
import {AvnApiConfig} from '../interfaces/index'

export class Poll{
    private api: AvnApiConfig;
    private awtManager: Awt;

    constructor(api: AvnApiConfig, awtManager: Awt) {
        this.api = api;
        this.awtManager = awtManager;
    }

    async requestState(requestId: string) {
        Utils.validateRequestId(requestId);
        return await this.postRequest(this.api, 'requestState', { requestId });
    }

    async postRequest(api: AvnApiConfig, method: string, params: any) {
        const endpoint = api.gateway + '/poll';
        const awtToken = await this.awtManager.getToken();
        const response = await api.axios(awtToken).post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });
        return response.data.result || response.data.error.message;
    };
}