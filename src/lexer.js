import { Token, CharTokenMap, EscapeChars } from "./constants.js";
import { CError, handleErrors } from "./errors.js";

export default class Lexer {
  constructor(file, src) {
    this.file = file;
    this.src = src;
    this.tokens = [];
    this.idx = 0;
    this.col = 0;
    this.cols = [];
    this.ln = 0;
  }

  next() {
    this.col++;

    if (this.src[this.idx] == "\n") {
      this.cols.push(this.col);
      this.col = 0;
      this.ln++;
    }

    return this.src[this.idx++];
  }

  back() {
    this.idx--;
    this.col--;

    if (this.col < 0) {
      this.ln--;
      this.col = this.cols.pop();
    }
  }

  peek(c = 1) {
    return this.src[this.idx + c - 1];
  }

  *iter() {
    let c;
    while ((c = this.next())) yield c;
  }

  span() {
    return {
      idx: this.idx,
      col: this.col,
      ln: this.ln,
    };
  }

  token(kind, value, start, end) {
    this.tokens.push({
      kind,
      value,
      span: [start ?? this.idx, end ?? this.idx],
    });
  }

  readNumber() {
    const start = this.span();
    let raw = "",
      isFloat = false;

    this.back();

    for (const char of this.iter()) {
      if (char.match(/\d/)) {
        raw += char;
      } else if (char == ".") {
        if (isFloat)
          new CError("invalid syntax")
            .src(this.file, this.src)
            .ln(this.ln, [this.col, this.col], "unexpected token")
            .raise();

        raw += char;
        isFloat = true;
      } else break;
    }

    this.back();

    if (isFloat) this.token(Token.Float, parseFloat(raw), start.idx);
    else this.token(Token.Int, parseInt(raw), start.idx);
  }

  readString() {
    const start = this.span();
    let raw = "",
      escape = false,
      uChar = null,
      uCharC = null,
      closed = false;

    for (const char of this.iter()) {
      if (char == '"' && !escape) {
        closed = true;
        break;
      }

      if (char == "\\" && !escape) {
        escape = this.idx;
      } else if (escape && EscapeChars[char]) {
        raw += EscapeChars[char];
        escape = false;
      } else if (escape && char == "u") {
        uChar = "";
        uCharC = this.col;
        escape = false;
      } else if (uChar != null && char.match(/[\da-fA-F]/)) {
        uChar += char;

        if (uChar.length == 4) {
          raw += String.fromCharCode(parseInt(uChar, 16));
          uChar = null;
        }
      } else if (uChar != null) {
        uChar = null;
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(
            this.ln,
            [uCharC - 1, uCharC + 4],
            `invalid unicode escape sequence`
          )
          .raise();
      } else {
        raw += char;
        escape = false;
      }
    }

    if (!closed)
      new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(start.ln, [start.col, start.col], `string was never closed`)
        .ln(this.ln, [this.col, this.col], `EOF`, "note")
        .raise();

    this.token(Token.String, raw, start.idx);
  }

  readIdentifier() {
    const start = this.idx;
    let raw = "";

    this.back();

    for (const char of this.iter()) {
      if (char.match(/[a-zA-Z0-9_]/)) raw += char;
      else break;
    }

    this.back();
    this.token(Token.Identifier, raw, start);
  }

  read() {
    let unexpected = [];

    for (const char of this.iter()) {
      if (typeof char != "string" || char == " " || char.match(/[\s\r\n\t]/))
        continue;

      const next = this.peek();

      if (char == "/" && next == "/") {
        for (const char of this.iter()) if (char == "\n") break;
      } else if (char == "!" && next == "!") {
        this.token(Token.Assert);
        this.next();
      } else if (char == "=" && next == "=") {
        this.token(Token.DoubleEq);
        this.next();
      } else if (char == "<" && next == "=") {
        this.token(Token.LtEq);
        this.next();
      } else if (char == ">" && next == "=") {
        this.token(Token.GtEq);
        this.next();
      } else if (char == "&" && next == "&") {
        this.token(Token.And);
        this.next();
      } else if (char == "|" && next == "|") {
        this.token(Token.Or);
        this.next();
      } else if (char == "!" && next == "=") {
        this.token(Token.NotEq);
        this.next();
      } else if (CharTokenMap[char]) this.token(CharTokenMap[char]);
      else if (char == '"') this.readString();
      else if (char.match(/\d/) || (char == "." && next.match(/\d/)))
        this.readNumber();
      else if (char.match(/[a-zA-Z_]/)) this.readIdentifier();
      else {
        if (
          unexpected.length > 0 &&
          unexpected.at(-1)[0] == this.ln &&
          unexpected.at(-1)[1] == this.col - 1
        )
          unexpected.at(-1)[2]++;
        else unexpected.push([this.ln, this.col, this.col]);
      }
    }

    for (const [ln, start, end] of unexpected)
      new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(ln, [start, end], "unexpected token")
        .raise();

    handleErrors();

    return this.tokens;
  }
}
