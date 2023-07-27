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
        log.debug(`[InMemoryLock]: Locking: ${key}. `, new Date());
        this.locks[key].isLocked = true;
        resolve();
      };

      if (this.locks[key].isLocked) {
        log.debug(`[InMemoryLock]: ${key} added to lock Queue. `, new Date());
        this.locks[key].requestQueue.push(request);
      } else {
        request();
      }
    });
  }

  unlock(key: string) {
    log.debug(`[InMemoryLock]: Calling Unlock for ${key}. `, new Date());

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
