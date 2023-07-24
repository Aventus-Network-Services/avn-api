export default class InMemoryLock {
  private sameUserNonceDelayMs: number;
  private locks: { [key: string]: boolean };
  private requestQueue: (() => void)[];

  constructor(sameUserNonceDelayMs: number) {
    this.locks = {};
    this.requestQueue = [];
    this.sameUserNonceDelayMs = sameUserNonceDelayMs;
  }

  lock(key: string): Promise<void> {
    return new Promise(resolve => {
      const request = () => {
        console.log(` - L -Locking ${key}`);
        this.locks[key] = true;
        resolve();
      };

      if (this.locks[key] === true) {
        console.log(` - L -${key} added to lock Q`);
        this.requestQueue.push(request);
      } else {
        request();
      }
    });
  }

  async unlock(key: string) {
    this.locks[key] = false;
    console.log(` - L - Calling Unlock for: ${key}`);
    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      // We are here because multiple requests for the same user and nonce were attempted so create a delay
      // to prevent the nonce going to the gateway out of order
      await new Promise(resolve => setTimeout(resolve, this.sameUserNonceDelayMs));
    }
  }
}
