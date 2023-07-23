export default class InMemoryLock {
  private locks: { [key: string]: { isLocked: boolean; requestQueue: (() => void)[] } };

  constructor() {
    this.locks = {};
  }

  lock(key: string): Promise<void> {
    return new Promise(resolve => {
      if (!this.locks[key]) {
        this.locks[key] = { isLocked: false, requestQueue: [] };
      }

      const request = () => {
        this.locks[key].isLocked = true;
        resolve();
      };

      if (this.locks[key].isLocked) {
        this.locks[key].requestQueue.push(request);
      } else {
        // Wait for 1 sec to give the transaction time to be sent to the chain
        setTimeout(() => {
            request();
        }, 1000);
      }
    });
  }

  unlock(key: string) {
    const lock = this.locks[key];
    if (!lock) {
      throw new Error(`No lock found for key: ${key}`);
    }

    lock.isLocked = false;
    const nextRequest = lock.requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}
