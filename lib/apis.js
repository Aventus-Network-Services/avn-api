const Query = require('./query.js');
const Send = require('./send.js');
const Poll = require('./poll.js');
class Apis {
    #awt;
    constructor(avnApi, awt, signerAddress) {
        //this.#awt = awt;

        this.query = new Query(avnApi, awt)
        this.send = new Send(avnApi, this.query, awt, signerAddress)
        this.poll = new Poll(avnApi, awt)
    }
}

module.exports = Apis;