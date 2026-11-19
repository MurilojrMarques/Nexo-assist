const UNSAFE_TAIL = /[\s*#•\-–—]*$/;

const OPENING_FILLER =
  /^(?:(?:claro|certo|perfeito|ótimo|ótima pergunta|com certeza|sem problemas|beleza|entendi|entendido|olá|oi)(?:\s*,\s*\p{L}+)?[!.,]\s*)+/iu;

const CLOSING_FILLER =
  /(?:fico à disposição|estou à disposição|qualquer (?:outra )?dúvida|espero ter ajudado|se precisar de mais alguma coisa|se precisar de algo mais|estou aqui para ajudar)/i;

export function polish(text: string, atLineStart: boolean): string {
  const source = atLineStart ? `\n${text}` : text;
  const cleaned = source
    .replace(/\n[ \t]*#{1,6}[ \t]+/g, "\n")
    .replace(/\n[ \t]*[-*•][ \t]+/g, "\n")
    .replace(/\*\*|__/g, "")
    .replace(/(\d)[ \t]*[–—][ \t]*(\d)/g, "$1 a $2")
    .replace(/\n[ \t]*[—–][ \t]*/g, "\n")
    .replace(/[ \t]*[—–][ \t]*/g, ", ")
    .replace(/[ \t]+-[ \t]+/g, ", ")
    .replace(/,[ \t]*([,.;:!?])/g, "$1")
    .replace(/[ \t]+,/g, ",");

  return atLineStart ? cleaned.slice(1) : cleaned;
}

export function plainText(text: string): string {
  return polish(text.trim(), true).replace(/\s*\n+\s*/g, " ").trim();
}

export class StreamPolisher {
  private pending = "";
  private atLineStart = true;

  push(chunk: string): string {
    const buffer = this.pending + chunk;
    const cut = buffer.search(UNSAFE_TAIL);
    this.pending = buffer.slice(cut);
    return this.release(buffer.slice(0, cut));
  }

  flush(): string {
    const rest = this.pending.trimEnd();
    this.pending = "";
    return this.release(rest);
  }

  private release(text: string): string {
    if (!text) {
      return "";
    }

    const out = polish(text, this.atLineStart);
    this.atLineStart = false;
    return out;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function stripOpeningFiller(text: string): string {
  const stripped = text.replace(OPENING_FILLER, "");
  return stripped.trim() === "" ? text : capitalize(stripped);
}

export function stripClosingFiller(text: string): string {
  let result = text.trim();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const last = result.match(/(?:^|[.!?\n])\s*([^.!?\n]+[.!?]*)$/);

    if (!last?.[1] || !CLOSING_FILLER.test(last[1]) || last[1].length === result.length) {
      break;
    }

    result = result.slice(0, result.length - last[1].length).trim();
  }

  return result;
}

export function finalizeReply(text: string): string {
  return stripClosingFiller(text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n"));
}

export type ComposerOptions = { holdLimit?: number };

export class ReplyComposer {
  private polisher = new StreamPolisher();
  private text = "";
  private held = "";
  private holding = true;
  private needsSeparator = false;
  private emitted = false;
  private readonly holdLimit: number;

  constructor(
    private readonly emit: (delta: string) => void,
    options: ComposerOptions = {},
  ) {
    this.holdLimit = options.holdLimit ?? 160;
  }

  delta(raw: string): void {
    this.write(this.polisher.push(raw));
  }

  toolCalled(announcementOnly: boolean): void {
    if (this.holding && announcementOnly) {
      this.held = "";
      this.polisher = new StreamPolisher();
      return;
    }

    this.write(this.polisher.flush());
    this.release();
  }

  stepFinished(): void {
    this.write(this.polisher.flush());
    this.release();
    this.polisher = new StreamPolisher();
    this.holding = true;
    this.needsSeparator = this.text.trim() !== "";
  }

  finish(): string {
    this.stepFinished();
    return finalizeReply(this.text);
  }

  private write(out: string): void {
    if (!out) {
      return;
    }

    if (!this.holding) {
      this.send(out);
      return;
    }

    this.held += out;

    if (this.held.length >= this.holdLimit) {
      this.release();
    }
  }

  private release(): void {
    const held = this.held;
    this.held = "";
    this.holding = false;
    this.send(held);
  }

  private send(out: string): void {
    let piece = this.emitted ? out : stripOpeningFiller(out.trimStart());

    if (piece.trim() === "" && !this.emitted) {
      return;
    }

    if (this.needsSeparator) {
      piece = `\n\n${piece.trimStart()}`;
      this.needsSeparator = false;
    }

    this.emitted = true;
    this.text += piece;
    this.emit(piece);
  }
}
