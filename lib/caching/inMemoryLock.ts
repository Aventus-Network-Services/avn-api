export default class InMemoryLock {
  private locks: { [key: string]: boolean };
  private requestQueue: (() => void)[];

  constructor() {
    this.locks = {};
    this.requestQueue = [];
  }

  lock(key: string): Promise<void> {
    console.log(` - L -Locking ${key}`)
    return new Promise(resolve => {
      const request = () => {
        console.log(` - L -[UnLocking ${key}]`)
        this.locks[key] = true;
        resolve();
      };

      if (this.locks[key] === true) {
        console.log(` - L -${key} added to lock Q`)
        this.requestQueue.push(request);
      } else {
        // Wait for 1 sec to give the transaction time to be sent to the chain
        setTimeout(() => {
          request();
        }, 1000);
      }
    });
  }

  unlock(key: string) {
    this.locks[key] = false;
    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}
