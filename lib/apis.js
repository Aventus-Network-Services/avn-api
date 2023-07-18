const Query = require('./lib/query.js');
const Send = require('./lib/send.js');
const Poll = require('./lib/poll.js');
class Apis {

    #avnApi;
    #awt;
    constructor(avnApi, awt, signerAddress) {
        this.#avnApi = avnApi;
        this.#awt = awt;
        this.signerAddress = signerAddress;
    }

    query = new Query(this.#avnApi, this.#awt)

    send = new Send(this.#avnApi, this.query(), this.#awt, signerAddress)

    poll = new Poll(this.#avnApi, this.#awt)
}

module.exports = Apis;