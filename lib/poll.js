'use strict';

const common = require('./common.js');

function Poll(api) {
  this.requestState = generateFunction(requestState, api);
}

function requestState(api) {
  return async function (requestId) {
    common.validateRequestId(requestId);

    return await this.postRequest(api, 'requestState', { requestId });
  };
}

function generateFunction(functionName, api) {
  return functionName(api);
}

Poll.prototype.postRequest = async function (api, method, params) {
  const endpoint = api.gateway + '/poll';
  const response = await (await api.axios()).post(endpoint, { jsonrpc: '2.0', id: api.uuid(), method: method, params: params });
  return response.data.result || response.data.error.message;
};

module.exports = Poll;
