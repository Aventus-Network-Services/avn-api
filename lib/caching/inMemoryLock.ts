export default class InMemoryLock {
  private isLocked: boolean;
  private requestQueue: (() => void)[];

  constructor() {
    this.isLocked = false;
    this.requestQueue = [];
  }

  lock(traceId: string): Promise<void> {
    console.log(` - L -Locking ${traceId}`)
    return new Promise(resolve => {
      const request = () => {
        console.log(` - L -[UnLocking ${traceId}]`)
        this.isLocked = true;
        resolve();
      };

      if (this.isLocked) {
        console.log(` - L -${traceId} added to lock Q`)
        this.requestQueue.push(request);
      } else {
        // Wait for 1 sec to give the transaction time to be sent to the chain

          request();

      }
    });
  }

  unlock(traceId: string) {
    console.log(` - L - Calling Unlock for: ${traceId}`)
    this.isLocked = false;
    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}
