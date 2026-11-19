import type { Response } from "express";

const HEARTBEAT_MS = 15_000;

export class SseStream {
  private opened = false;
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(private readonly res: Response) {}

  get started(): boolean {
    return this.opened;
  }

  send(event: { type: string } & Record<string, unknown>): void {
    this.open();

    if (this.res.writableEnded || this.res.destroyed) {
      return;
    }

    const { type, ...data } = event;
    this.res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  end(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }

    if (this.opened && !this.res.writableEnded) {
      this.res.write("event: done\ndata: {}\n\n");
      this.res.end();
    }
  }

  private open(): void {
    if (this.opened) {
      return;
    }

    this.opened = true;
    this.res.status(200);
    this.res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    this.res.setHeader("Cache-Control", "no-store, no-transform");
    this.res.setHeader("Connection", "keep-alive");
    this.res.setHeader("X-Accel-Buffering", "no");
    this.res.flushHeaders();
    this.heartbeat = setInterval(() => {
      if (!this.res.writableEnded && !this.res.destroyed) {
        this.res.write(": ping\n\n");
      }
    }, HEARTBEAT_MS);
    this.heartbeat.unref();
  }
}
