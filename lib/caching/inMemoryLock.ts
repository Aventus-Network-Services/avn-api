class InMemoryLock {
    private isLocked: boolean;
    private requestQueue: (() => void)[];

    constructor() {
      this.isLocked = false;
      this.requestQueue = [];
    }

    lock(): Promise<void> {
      return new Promise((resolve) => {
        const request = () => {
          this.isLocked = true;
          resolve();
        };

        if (this.isLocked) {
            console.log("Resource locked, adding to the queue")
          this.requestQueue.push(request);
        } else {
          request();
        }
      });
    }

    unlock() {
      this.isLocked = false;
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        console.log("Processing next item from locked queue")
        nextRequest();
      }
    }
  }