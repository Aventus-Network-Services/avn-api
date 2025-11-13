const { AvnApi } = require('avn-api');
const assert = require('chai').assert;
const path = require('path');
const BN = require('bn.js');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .usage('Run smoke tests using a given Gateway environment')
  .help('h')
  .alias('h', 'help')
  .demandOption('c')
  .describe('c', 'Configuration file with gateway parameters')
  .string('c')
  .alias('c', 'gateway')
  .parse();

const gatewayFile = argv.gateway;

const testConfig = argv.tests_config
  ? require(argv.tests_config)
  : {
      ...require(path.resolve(__dirname, `./config/environments/${gatewayFile}.json`)),
      accounts: require(path.resolve(__dirname, `./config/accounts/${gatewayFile}.json`))?.accounts || {}
    };

const { gateway, token, accounts, avt } = testConfig || {};
console.log(`*** Test Configuration: ***\nGateway: ${gateway} - ERC20 Token: ${token}`);

const MAX_WAIT_TIME_IN_MINUTES = 5;
const WAIT_INTERVAL_IN_SECS = 1;

async function avnApi(options) {
  options = options ?? {};
  const api = new AvnApi(gateway, options);

  await api.init();
  return api;
}

function bnEquals(a, b) {
  return assert.equal(new BN(a).toString(), new BN(b).toString());
}

async function confirmStatus(pollApi, requestId, expectedStatus, optionalTimeoutInMinutes) {
  console.log(`   - max polling wait: [${optionalTimeoutInMinutes ?? MAX_WAIT_TIME_IN_MINUTES}] minutes`);
  if (!requestId) throw new Error('RequestId cannot be null');
  let response, status;

  for (i = 0; i < ((optionalTimeoutInMinutes ?? MAX_WAIT_TIME_IN_MINUTES) * 60) / WAIT_INTERVAL_IN_SECS; i++) {
    await sleep(WAIT_INTERVAL_IN_SECS * 1000);
    response = await pollApi.requestState(requestId);
    status = response.status;
    // TODO: Remove " && status !== undefined" once dev env is reset
    if (!['Pending', 'AwaitingToSend', 'Validating', 'Transaction not found', undefined].includes(status)) {
      assert.equal(status, expectedStatus);
      console.log('   - Finished in ', i * WAIT_INTERVAL_IN_SECS, ' sec');
      return response;
    }
  }

  assert.equal(status, expectedStatus);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// keep alphabetical
module.exports = {
  ACCOUNTS: accounts,
  assert,
  avnApi,
  avt,
  bnEquals,
  BN,
  confirmStatus,
  sleep,
  token
};
