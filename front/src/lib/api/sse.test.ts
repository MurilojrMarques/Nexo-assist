import { describe, expect, it } from "vitest";
import { readServerEvents } from "./sse";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect(chunks: string[]) {
  const events = [];

  for await (const event of readServerEvents(streamOf(chunks))) {
    events.push(event);
  }

  return events;
}

describe("readServerEvents", () => {
  it("lê eventos inteiros mesmo quando chegam quebrados entre pedaços", async () => {
    const events = await collect(['event: text\ndata: {"del', 'ta":"Oi"}\n\nevent: done\ndata: {}\n\n']);

    expect(events).toEqual([
      { event: "text", data: { delta: "Oi" } },
      { event: "done", data: {} },
    ]);
  });

  it("ignora o heartbeat e blocos sem dados", async () => {
    const events = await collect([": ping\n\n", "event: step\ndata: {\"id\":1}\n\n"]);

    expect(events).toEqual([{ event: "step", data: { id: 1 } }]);
  });

  it("aceita quebras de linha no formato CRLF", async () => {
    const events = await collect(["event: text\r\ndata: {\"delta\":\"a\"}\r\n\r\n"]);

    expect(events).toEqual([{ event: "text", data: { delta: "a" } }]);
  });
});
