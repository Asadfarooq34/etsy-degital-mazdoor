/**
 * Token-bucket rate limiter honoring Etsy's limits: 5 requests/second,
 * 5,000 requests per sliding 24-hour window (PRD §4).
 * Every Etsy API call MUST go through `acquire()` first.
 */
export class RateLimiter {
  private qpsTokens: number;
  private lastQpsRefill: number;
  private readonly qpsMax = 5;
  /** Timestamps (ms) of requests in the current 24h window. */
  private readonly daily: number[] = [];

  constructor(private readonly qpdMax = 5000) {
    this.qpsTokens = this.qpsMax;
    this.lastQpsRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastQpsRefill) / 1000;
    this.qpsTokens = Math.min(this.qpsMax, this.qpsTokens + elapsedSec * this.qpsMax);
    this.lastQpsRefill = now;
    while (this.daily.length > 0 && now - this.daily[0]! > 24 * 3_600_000) {
      this.daily.shift();
    }
  }

  /** Resolves when a request slot is available; rejects if the daily quota is spent. */
  async acquire(): Promise<void> {
    for (;;) {
      this.refill();
      if (this.daily.length >= this.qpdMax) {
        throw new Error("daily Etsy quota exhausted (5000/24h) — backing off until window slides");
      }
      if (this.qpsTokens >= 1) {
        this.qpsTokens -= 1;
        this.daily.push(Date.now());
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /** For tests/monitoring. */
  usage(): { qpsTokens: number; dailyUsed: number; dailyMax: number } {
    this.refill();
    return { qpsTokens: this.qpsTokens, dailyUsed: this.daily.length, dailyMax: this.qpdMax };
  }
}
