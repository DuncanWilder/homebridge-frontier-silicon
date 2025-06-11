declare module 'wifiradio' {
  class WifiRadio {
    constructor(ip: string, pin: string);
    getPower(): Promise<string>;
    setPower(state: number): Promise<void>;
  }
  export = WifiRadio;
}

declare module 'polling-to-event' {
  interface PollingOptions {
    longpolling?: boolean;
    interval?: number;
    longpollEventName?: string;
  }

  function pollingToEvent(
    pollingFunc: (done: (error: Error | null, result?: unknown) => void) => void,
    options?: PollingOptions
  ): NodeJS.EventEmitter;

  export = pollingToEvent;
}
