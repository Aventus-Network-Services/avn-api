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

function bnEquals(a, b) {
  return assert.equal(new BN(a).toString(), new BN(b).toString());
}

// keep alphabetical
module.exports = {
  ACCOUNTS: accounts,
  assert,
  avnApi,
  avt,
  bnEquals,
  BN,
  token
};
