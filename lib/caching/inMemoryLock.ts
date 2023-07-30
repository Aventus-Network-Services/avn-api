import log from 'loglevel';
export class InMemoryLock {
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
        log.debug(new Date(), ` - Locking resource with key: ${key}.`);
        this.locks[key].isLocked = true;
        resolve();
      };

      if (this.locks[key].isLocked) {
        log.debug(new Date(), ` - Resource locked, ${key} added to lock Queue.`);
        this.locks[key].requestQueue.push(request);
      } else {
        request();
      }
    });
  }

  unlock(key: string) {
    log.debug(new Date(), ` - Unlocking resource: ${key}.`);

    const lock = this.locks[key];
    if (!lock) {
      throw new Error(`No resource lock found for key: ${key}`);
    }

    lock.isLocked = false;

    const nextRequest = lock.requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}
