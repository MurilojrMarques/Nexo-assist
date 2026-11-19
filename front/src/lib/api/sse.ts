export type ServerEvent = {
  event: string;
  data: unknown;
};

function parseBlock(block: string): ServerEvent | null {
  let event = "message";
  const data: string[] = [];

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).trimStart());
    }
  }

  if (data.length === 0) {
    return null;
  }

  try {
    return { event, data: JSON.parse(data.join("\n")) };
  } catch {
    return null;
  }
}

export async function* readServerEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ServerEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");

      while (boundary !== -1) {
        const parsed = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);

        if (parsed) {
          yield parsed;
        }

        boundary = buffer.indexOf("\n\n");
      }
    }

    const last = parseBlock(buffer);

    if (last) {
      yield last;
    }
  } finally {
    reader.releaseLock();
  }
}
