import type { Scheduler } from "../types";

export class RafScheduler implements Scheduler {
  private readonly pending = new Map<() => void, number>();

  request(task: () => void) {
    if (this.pending.has(task)) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      this.pending.delete(task);
      task();
    });
    this.pending.set(task, frame);
  }

  cancel(task: () => void) {
    const frame = this.pending.get(task);
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      this.pending.delete(task);
    }
  }

  destroy() {
    this.pending.forEach((frame) => cancelAnimationFrame(frame));
    this.pending.clear();
  }
}
