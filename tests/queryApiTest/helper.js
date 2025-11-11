require('ts-node/register');
const { AvnApi } = require('../../lib/avnApi');
const assert = require('chai').assert;
const BN = require('bn.js');
const path = require('path');

let argv = require('yargs')
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
      ...require(path.resolve(__dirname, `../config/environments/${gatewayFile}.json`)),
      accounts: require(path.resolve(__dirname, `../config/accounts/${gatewayFile}.json`))?.accounts || {}
    };

const { gateway, token, accounts } = testConfig;

async function avnApi(options) {
  options = options ?? {};
  const api = new AvnApi(gateway, options);

  await api.init();
  return api;
}

function bnEquals(a, b) {
  return assert.equal(new BN(a).toString(), new BN(b).toString());
}

//alphabetical order 
module.exports = {
  ACCOUNTS: accounts,
  assert,
  avnApi,
  token,
  bnEquals
};