const Query = require('./query.js');
const Send = require('./send.js');
const Poll = require('./poll.js');
class Apis {

    #avnApi;
    #awt;
    constructor(avnApi, awt, signerAddress) {
        this.#avnApi = avnApi;
        this.#awt = awt;
        this.signerAddress = signerAddress;
    }

    query = new Query(this.#avnApi, this.#awt)

    send = new Send(this.#avnApi, this.query, this.#awt, this.signerAddress)

    poll = new Poll(this.#avnApi, this.#awt)
}

module.exports = Apis;