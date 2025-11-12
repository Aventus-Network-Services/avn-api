const { AvnApi } = require('avn-api');
const assert = require('chai').assert;
const yargs = require('yargs');
const path = require('path');

let argv = yargs
  .usage('Run smoke tests using a given Gateway environment')
  .help('h')
  .alias('h', 'help')
  .demandOption('c')
  .describe('c', 'Configuration file with gateway parameters')
  .string('c')
  .alias('c', 'gateway').argv;

let gatewayFile = argv.gateway;

const testConfig = argv.tests_config
  ? require(argv.tests_config)
  : {
      ...require(path.resolve(__dirname, `./config/environments/${gatewayFile}.json`)),
      accounts: require(path.resolve(__dirname, `./config/accounts/${gatewayFile}.json`))?.accounts || {}
    };

const { gateway, token, accounts, avt } = testConfig || {};
console.log(`*** Test Configuration: ***\nGateway: ${gateway} - ERC20 Token: ${token}`);

async function avnApi(options) {
  options = options ?? {};
  const api = new AvnApi(gateway, options);

  await api.init();
  return api;
}

// keep alphabetical
module.exports = {
  ACCOUNTS: accounts,
  assert,
  avnApi,
  avt,
  sleep,
  token
};
