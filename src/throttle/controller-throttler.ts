import type { ThrottleConfig } from './throttle.constants';

interface IpRecord {
  count: number;
  resetAt: number;
}

const MAX_ENTRIES = 10_000;
const SWEEP_INTERVAL_MS = 60_000;

export class ControllerThrottler {
  private readonly store = new Map<string, IpRecord>();
  private readonly limit: number;
  private readonly ttl: number;
  private nextSweepAt = 0;

  constructor(config: ThrottleConfig) {
    this.limit = config.limit;
    this.ttl = config.ttl;
  }

  /**
   * Check if the IP is allowed to proceed.
   * Returns true if allowed, false if rate limited.
   */
  check(ip: string): boolean {
    const now = Date.now();
    this.sweep(now);
    const record = this.store.get(ip);

    // No record or window expired — allow and start fresh
    if (!record || now >= record.resetAt) {
      this.ensureCapacity();
      this.store.set(ip, { count: 1, resetAt: now + this.ttl });
      return true;
    }

    // Within window — increment
    record.count++;

    if (record.count > this.limit) {
      return false;
    }

    return true;
  }

  /**
   * Evict expired records at most once per SWEEP_INTERVAL_MS. The scan is
   * deliberately not tied to the store being full: doing a full scan on every
   * request at the cap would turn the cap itself into a CPU amplifier.
   */
  private sweep(now: number): void {
    if (now < this.nextSweepAt) return;
    this.nextSweepAt = now + SWEEP_INTERVAL_MS;

    for (const [key, record] of this.store) {
      if (now >= record.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /** Keep the store bounded by evicting the oldest entry before an insert. */
  private ensureCapacity(): void {
    while (this.store.size >= MAX_ENTRIES) {
      const oldest = this.store.keys().next();
      if (oldest.done) break;
      this.store.delete(oldest.value);
    }
  }

  /** Seconds remaining until the rate limit resets for this IP */
  retryAfter(ip: string): number {
    const record = this.store.get(ip);
    if (!record) return 0;
    return Math.max(0, Math.ceil((record.resetAt - Date.now()) / 1000));
  }

  /** Remaining requests in the current window for this IP */
  remaining(ip: string): number {
    const now = Date.now();
    const record = this.store.get(ip);
    if (!record || now >= record.resetAt) return this.limit;
    return Math.max(0, this.limit - record.count);
  }
}
