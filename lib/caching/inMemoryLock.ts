export default class InMemoryLock {
  private isLocked: boolean;
  private requestQueue: (() => void)[];

  constructor() {
    this.isLocked = false;
    this.requestQueue = [];
  }

  lock(key: string): Promise<void> {
    console.log(` - L -Locking ${key}`)
    return new Promise(resolve => {
      const request = () => {
        console.log(` - L -[UnLocking ${key}]`)
        this.isLocked = true;
        resolve();
      };

      if (this.isLocked) {
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
    this.isLocked = false;
    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}
