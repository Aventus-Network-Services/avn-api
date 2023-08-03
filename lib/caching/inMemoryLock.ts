import log from 'loglevel';
const MAX_LOCK_TIME_MS: number = 1000 * 60 * 2;
export class InMemoryLock {
  private locks: { [key: string]: { isLocked: boolean; ttl: number; requestQueue: (() => void)[] } };

  constructor() {
    this.locks = {};
  }

  lock(key: string): Promise<void> {
    return new Promise(resolve => {
      if (!this.locks[key]) {
        this.locks[key] = { isLocked: false, ttl: Number.MAX_SAFE_INTEGER, requestQueue: [] };
      }

      const request = () => {
        log.debug(new Date(), ` - Locking resource with key: ${key}.`);
        this.locks[key].isLocked = true;
        this.locks[key].ttl = Date.now() + MAX_LOCK_TIME_MS;
        resolve();
      };

      if (this.locks[key].isLocked && Date.now() < this.locks[key].ttl) {
        log.debug(new Date(), ` - Resource locked, ${key} added to lock Queue.`);
        this.locks[key].requestQueue.push(request);
      } else {
        if (Date.now() >= this.locks[key].ttl) {
          log.debug(new Date(), ` - Resource max lock exceeded for key: ${key}. Unlocking`);
        }
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
    this.locks[key].ttl = Number.MAX_SAFE_INTEGER;

    const nextRequest = lock.requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}
