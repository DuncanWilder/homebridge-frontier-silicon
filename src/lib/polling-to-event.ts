import { EventEmitter } from 'node:events';

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      return false;
    }
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    return aKeys.length === bKeys.length && aKeys.every(key =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }
  return false;
}

type PollingCallback = (error: Error | null, ...results: unknown[]) => void;
type PollingFunction = (done: PollingCallback) => void;

export interface PollingOptions {
  interval?: number;
  eventName?: string;
  longpollEventName?: string;
  longpolling?: boolean;
}

const DEFAULTS: Required<PollingOptions> = {
  interval: 1000,
  eventName: 'poll',
  longpollEventName: 'longpoll',
  longpolling: false,
};

export default function pollingtoevent(func: PollingFunction, options?: PollingOptions): EventEmitter {
  return new PollingToEvent(func, options);
}

class PollingToEvent extends EventEmitter {
  private timer?: NodeJS.Timeout;
  private paused = false;
  private firstPoll = true;
  private lastParams?: unknown[];
  private readonly options: Required<PollingOptions>;

  constructor(private readonly func: PollingFunction, options?: PollingOptions) {
    super();
    this.options = { ...DEFAULTS, ...options };
    this.start();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  clear() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private start() {
    const done: PollingCallback = (err, ...params) => {
      if (err) {
        this.emit('error', err);
        return;
      }
      if (this.paused) {
        return;
      }

      this.emit(this.options.eventName, ...params);

      const shouldCompare = this.firstPoll || this.options.longpolling;
      if (shouldCompare && !deepEqual(params, this.lastParams)) {
        this.emit(this.options.longpollEventName, ...params);
        this.lastParams = params;
      }

      this.firstPoll = false;
    };

    this.func(done);
    this.timer = setInterval(() => {
      if (!this.paused) {
        this.func(done);
      }
    }, this.options.interval);
  }
}
