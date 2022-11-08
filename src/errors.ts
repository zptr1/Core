import { config } from "./config.js";
import { rgb, hsv2rgb } from "./util.js";
import cl from "cli-color";

const errors = [];
const src = {};
let errorCount = 0;

const ErrorTypes = {
  error: {
    label: "ERROR",
    clr: cl.redBright,
  },
  note: {
    label: "NOTE",
    clr: cl.blueBright,
  },
};

let errorHue = 0;

export class CError {
  constructor(message) {
    this.data = {
      message,
      ln: [],
    };
  }

  get _source() {
    return src[this.data.file];
  }

  src(f, s) {
    this.data.file = f;
    if (!(f in src))
      src[f] = s
        .split("\n")
        .map((x) => x.split("//"))
        .map((x) =>
          x.length > 1
            ? x.slice(0, -1).join("//") + cl.blackBright("//" + x.at(-1)) // highlight comments
            : x[0]
        );

    return this;
  }

  ln(n, span, extra, type = "error") {
    this.data.ln.push({
      n: n + 1,
      span: span ? [span[0] - 1, span[1] - 1] : null,
      extra,
      type,
      color: rgb(...hsv2rgb((errorHue += 10), 65, 85)),
    });
    return this;
  }

  extend({ data }) {
    this.data.ln.push(...data.ln);
    return this;
  }

  generate(type) {
    if (type == "simple") return this.generateSimple();
    if (type == "extended") return this.generateExtended();
    if (type == "json") return JSON.stringify(this.toJSON());
    return this.generateDefault();
  }

  generateDefault() {
    const out = [""];
    const primary = cl.xterm(203);
    const padding = Math.max(...this.data.ln.map((x) => x.n.toString().length));

    out.push(
      `${cl.black.bgXterm(203)(this.data.message)} at ${cl.blackBright(
        this.data.file
      )}`
    );
    out.push(` ${" ".repeat(padding)} ${primary("┃")}`);

    const groups = this.data.ln
      .sort((a, b) => a.n - b.n)
      .reduce((p, c) => {
        p.length > 0 && c.n == p.at(-1)[0].n ? p.at(-1).push(c) : p.push([c]);

        return p;
      }, []);

    for (const group of groups.slice(0, config.error.limit)) {
      const first = group[0];

      if (!first.n) continue;

      const lineNo = Math.min(first.n, this._source.length);
      const pad = padding - lineNo.toString().length;
      const src = this._source[lineNo - 1];

      out.push(` ${" ".repeat(pad)}${primary(lineNo)} ${primary("┃")} ${src}`);

      const spans = group
        .filter((x) => x.span)
        .sort((a, b) => a.span[0] - b.span[0]);

      const dup = [];

      for (let i = spans.length - 1; i >= 0; i--) {
        const span = spans[i];
        const size = span.span[1] - span.span[0];

        if (dup.includes(span.span.join(","))) continue;
        dup.push(span.span.join(","));

        out.push(
          " " +
            " ".repeat(padding) +
            primary(" ┃") +
            " ".repeat(span.span[0] + 1) +
            span.color("^" + "Ⲻ".repeat(size)) +
            ` ${
              size + span.extra.length > 50
                ? `\n ${" ".repeat(padding)} ${primary("┃")} ${" ".repeat(
                    span.span[0]
                  )}${span.color(span.extra)}`
                : span.color(span.extra)
            }`
        );
      }
    }

    return out.join("\n");
  }

  generateSimple() {
    const out = [];

    out.push(
      `${cl.bold(this.data.message)} @ ${cl.blackBright(this.data.file)}`
    );

    for (const ln of this.data.ln)
      out.push(
        `${ErrorTypes[ln.type].clr(ErrorTypes[ln.type].label)}:${cl.blackBright(
          `${ln.n}:${ln.span[0] + 1}`
        )}: ${ln.extra}`
      );

    return out.join("\n");
  }

  generateExtended() {
    return (
      this.generateDefault() +
      "\n\n" +
      this.generateSimple().split("\n").slice(1).join("\n")
    );
  }

  toJSON() {
    return {
      message: this.data.message,
      file: this.data.file,
      lines: this.data.ln.map((x) => ({
        type: x.type,
        message: x.extra,
        line: x.n,
        span: x.span,
      })),
    };
  }

  raise() {
    if (errorCount++ > 200) {
      // fix
      console.warn("too many errors");
      return handleErrors();
    }

    const other = errors.find(
      (x) => x.file == this.file && x.data.message == this.data.message
    );

    if (other) other.extend(this);
    else errors.push(this);
  }
}

export function handleErrors() {
  if (errors.length == 0) return;

  for (const error of errors.slice(0, Math.floor(config.error.limit / 2)))
    console.error(error.generate(config.error.displayStyle));

  console.error(cl.blackBright("\nAborting due to previous errors"));
  process.exit(1);
}
