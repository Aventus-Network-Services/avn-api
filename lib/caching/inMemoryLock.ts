export default class InMemoryLock {
  private sameUserNonceDelayMs: number;
  private locks: { [key: string]: { isLocked: boolean; requestQueue: (() => void)[] } };

  constructor(sameUserNonceDelayMs: number) {
    this.locks = {};
    this.sameUserNonceDelayMs = sameUserNonceDelayMs;
  }

  lock(key: string): Promise<void> {
    return new Promise(resolve => {
      if (!this.locks[key]) {
        this.locks[key] = { isLocked: false, requestQueue: [] };
      }

      const request = () => {
        console.log(` - L -Locking ${key}`);
        this.locks[key].isLocked = true;
        resolve();
      };

      if (this.locks[key].isLocked) {
        console.log(` - L -${key} added to lock Q`);
        this.locks[key].requestQueue.push(request);
      } else {
        request();
      }
    });
  }

  async unlock(key: string) {
    console.log(` - L - Calling Unlock for: ${key}`);

    const lock = this.locks[key];

    if (!lock) {
      throw new Error(`No lock found for key: ${key}`);
    }

    const nextRequest = lock.requestQueue.shift();

    console.log(`....waiting ${this.sameUserNonceDelayMs} ms to unlock`, new Date())
    await new Promise(resolve => setTimeout(resolve, this.sameUserNonceDelayMs));
    console.log("....unlock done: ", new Date())

    lock.isLocked = false;
    // We are here because multiple requests for the same user and nonce were attempted so create a delay
    // to prevent the nonce going to the gateway out of order
    if (nextRequest) {
        nextRequest();
    }

  }
}
