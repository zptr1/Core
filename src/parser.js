import { AtomTypes, Op, OpTokenMap, Token, Types } from "./constants.js";
import { CError, handleErrors } from "./errors.js";
import {
  Atom,
  Block,
  Expression,
  Fn,
  Identifier,
  IfInner,
  Import,
  List,
  TopLevel,
  Var,
} from "./ast.js";
import lineColumn from "line-column";

function formatType(kind, value) {
  // if (kind instanceof )
  if (kind == Token.Int) {
    if (value == 0) return "void";
    return value ? `i${value}` : "int";
  } else if (kind == Token.Float) {
    return value ? `f${value}` : "float";
  } else if (kind == Token.String) {
    return "str";
  } else if (kind == Token.Tilde) {
    return "auto";
  }
}

export class Parser {
  constructor(file, src, tokens) {
    this.src = src;
    this.file = file;
    this.tokens = tokens;
    this.i = 0;
  }

  next() {
    return this.tokens[this.i++];
  }

  peek(c = 1) {
    return this.tokens[this.i + c - 1];
  }
  
  current () {
    return this.peek(0) || this.peek(-1);
  }

  *read() {
    let c;
    while ((c = this.next())) yield c;
  }

  span(token) {
    const lc = lineColumn(this.src);
    const span = (token || this.current()).span.map((x) => lc.fromIndex(x - 1));
    return [span[0]?.line - 1, [span[0]?.col, span[1]?.col]];
  }

  readAdd() {
    const left = this.readSub();

    if (this.peek()?.kind == Token.Plus) {
      this.next();
      const right = this.readSub();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Add, left, right);
    }

    return left;
  }

  readSub() {
    const left = this.readMul();

    if (this.peek()?.kind == Token.Minus) {
      this.next();
      const right = this.readMul();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Sub, left, right);
    }

    return left;
  }

  readMul() {
    const left = this.readDiv();

    if (this.peek()?.kind == Token.Asterisk) {
      this.next();
      const right = this.readDiv();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Mul, left, right);
    }

    return left;
  }

  readDiv() {
    const left = this.readCond();

    if (this.peek()?.kind == Token.Slash) {
      this.next();
      const right = this.readCond();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Div, left, right);
    }

    return left;
  }

  readCond() {
    const left = this.readAtom();
    const peek = this.peek();

    if (peek?.kind in OpTokenMap) {
      this.next();
      const right = this.readAdd();

      if (!right) return;

      return new Expression(
        [left.span[0], right.span[1]],
        OpTokenMap[peek.kind],
        left,
        right
      );
    }

    return left;
  }

  readAtom() {
    const token = this.peek();

    switch (token.kind) {
      case Token.Int:
      case Token.Float:
      case Token.String:
        this.next();
        const atom = new Atom(token.span, formatType(token.kind), token.value);
        if (this.peek(2)?.kind == Token.Colon) {
          return this.readIdentifier(atom);
        } else {
          return atom;
        }
      case Token.Identifier:
        return this.readIdentifier();
      case Token.LParen:
        this.next();
        return this.readParentheses();
      default:
        new CError("invalid expression")
          .src(this.file, this.src)
          .ln(...this.span(token), `expected atom`)
          .raise();
    }
  }

  readIdentifier() {
    const path = [...arguments];
    const start = this.peek().span[0];
    let token;

    while ((token = this.peek())) {
      if (token.kind != Token.Identifier) break;

      path.push(this.next().value);

      if (this.peek().kind == Token.LParen) {
        this.next();
        path.push([this.readParentheses()]);

        if (this.peek()?.kind != Token.Colon) break;
        this.next();
      } else if (this.peek().kind != Token.Colon) break;
      else this.next();
    }

    return new Identifier([start, this.current().span[1]], path);
  }

  readVar(token, mut = false) {
    const name = this.next();

    if (this.peek()?.kind != Token.Semicolon) {
      if (this.next()?.kind != Token.Equals) {
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(this.current()), 'expected "="')
          .raise();
      } else {
        const value = this.readExpr();

        if (!value)
          new CError("invalid syntax")
            .src(this.file, this.src)
            .ln(...this.span(this.current()), "expected expression")
            .raise();
        else
          return new Var(
            [token.span[0] - mut, name.span[1]],
            token instanceof Identifier
              ? token
              : formatType(token.kind, token.value),
            name.value,
            value,
            mut
          );
      }
    } else if (!mut) {
      new CError("invalid expression")
        .src(this.file, this.src)
        .ln(
          ...this.span(this.peek()),
          "immutable variables must be declared with a value"
        )
        .raise();
    } else if (token.kind == Token.Tilde) {
      new CError("invalid expression")
        .src(this.file, this.src)
        .ln(
          ...this.span(this.peek()),
          "variables with no initial value must have a specified type"
        )
        .raise();
    } else {
      return new Var(
        [token.span[0] - mut, name.span[1]],
        token instanceof Identifier
          ? token
          : formatType(token.kind, token.value),
        name.value,
        null,
        mut
      );
    }
  }

  readParentheses() {
    const list = new List();
    const start = this.current();
    let closed = false;
    let token;

    while ((token = this.peek())) {
      if (token.kind == Token.RParen) {
        closed = true;
        break;
      }

      list.list.push(this.readExpr());

      if (!this.peek()) {
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(start), `parentheses were never closed`)
          .ln(...this.span(this.current()), "EOF", "note")
          .raise();
        break;
      } else if (this.peek().kind == Token.RParen) {
        closed = true;
        break;
      } else if (this.peek().kind != Token.Comma) {
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(this.peek()), `expected Comma or RParen`)
          .raise();
      }

      this.next();
    }

    if (!closed)
      new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(...this.span(start), `parentheses were never closed`)
        .ln(...this.span(this.current()), "EOF", "note")
        .raise();
    
    list.span = [start.span[0], this.current().span[1]];
    this.next();

    return list;
  }

  readExpr() {
    const token = this.next();

    if (Types.includes(token.kind) && this.peek()?.kind == Token.Identifier) {
      return this.readVar(
        token.kind == Token.Identifier ? this.readIdentifier(token) : token
      );
    } else if (
      token.kind == Token.Asterisk &&
      Types.includes(this.peek()?.kind) &&
      this.peek(2)?.kind == Token.Identifier
    ) {
      const type = this.next();
      return this.readVar(
        type.kind == Token.Identifier ? this.readIdentifier(type) : type,
        true
      );
    } else if (AtomTypes.includes(token.kind)) {
      this.i--;
      const e = this.readAdd();

      if (this.peek()?.kind == Token.Question) {
        this.next();
        const inner = new IfInner();

        if (this.peek()?.kind == Token.LCurly) {
          this.next();
          inner.ifTrue = this.readBlock();
        } else {
          inner.ifTrue = this.readExpr();
        }

        if (this.peek()?.kind == Token.Colon) {
          this.next();
          if (this.peek()?.kind == Token.LCurly) {
            this.next();
            inner.ifFalse = this.readBlock();
          } else {
            inner.ifFalse = this.readExpr();
          }
        }

        inner.span = [
          inner.ifTrue?.span?.[0],
          (inner.ifFalse || inner.ifTrue)?.span?.[1],
        ];

        return new Expression([e.span[0], inner.span[1]], Op.If, e, inner);
      } else if (this.peek()?.kind == Token.Equals) {
        if (!e instanceof Identifier)
          new CError("invalid expression")
            .src(this.file, this.src)
            .ln(
              ...this.span(this.next()),
              `cannot assign to ${e.constructor.name}`
            )
            .raise();
        else {
          this.next();
          const right = this.readExpr();

          if (right)
            return new Expression(
              [e?.span?.[0], right?.span?.[1]],
              Op.Set,
              e,
              right
            );
        }
      } else {
        return e;
      }
    } else if (token.kind == Token.LParen) {
      return this.readParentheses();
    } else if (token.kind == Token.RParen) {
      new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(
          ...this.span(token),
          `unexpected RParen (forgot to open parentheses?)`
        )
        .raise();
    } else {
      new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(...this.span(token), `unexpected ${Token[token.kind]}`)
        .raise();
    }
  }

  readBlock() {
    const block = new Block();
    const start = this.current();
    let closed = false;
    let token;

    while ((token = this.peek())) {
      if (token.kind == Token.RCurly) {
        closed = true;
        break;
      }

      block.expr.push(this.readExpr());

      if (!this.peek()) {
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(start), "block was never closed")
          .ln(...this.span(this.current()), "EOF", "note")
          .raise();
        break;
      } else if (this.peek()?.kind == Token.RCurly) {
        // block closed without semicolon at last line
        block.hasResult = true; // mark last expression as return value
        closed = true;
        break;
      } else if (
        this.peek()?.kind != Token.Semicolon &&
        this.current()?.kind != Token.RCurly
      ) {
        const peek = this.peek();

        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(peek), `unexpected ${Token[peek?.kind]}`)
          .ln(
            ...this.span(this.current()),
            peek?.kind == Token.RParen
              ? "missing LParen?"
              : "missing semicolon?"
          )
          .raise();
      }

      if (this.peek()?.kind == Token.Semicolon) this.next();
    }

    if (!closed)
      new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(...this.span(start), "block was never closed")
        .ln(...this.span(this.current()), "EOF", "note")
        .raise();

    block.span = [start.span[0], this.next()?.span?.[1]];

    return block;
  }

  readFunc(type, macro = false) {
    const func = new Fn();
    const start = this.current();

    const name = this.next();
    const token = this.next();

    func.type = type;
    func.name = name;
    func.macro = macro;

    if (token.kind == Token.LParen) {
      if (func.macro) {
        new CError("invalid expression")
          .src(this.file, this.src)
          .ln(...this.span(token), "macro function cannot have arguments")
          .raise();
      } else {
        todo;
      }
    } else if (token.kind == Token.LCurly) {
      func.expr = this.readBlock();
    } else
      return new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(...this.span(token), `expected LParen or LCurly`)
        .raise();

    func.span = [start.span[0] - macro, this.current()?.span?.[1]];

    return func;
  }

  readImport() {
    const imp = new Import();
    const start = this.current();

    for (const token of this.read()) {
      if (token.kind == Token.Identifier || token.kind == Token.String)
        imp.path.push(token.value);
      else if (token.kind != Token.Slash)
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(
            ...this.span(token),
            `unexpected ${Token[token.kind]} in import statement`
          )
          .raise();

      if (this.peek()?.kind == Token.Semicolon) break;
    }

    imp.span = [start.span[0], this.current().span[1]];
    return imp;
  }

  readTopLevel() {
    const token = this.next();

    if (Types.includes(token.kind) && this.peek()?.kind == Token.Identifier) {
      if (
        !this.peek(2) ||
        this.peek(2).kind == Token.Equals ||
        this.peek(2).kind == Token.Semicolon
      ) {
        return this.readVar(
          token.kind == Token.Identifier ? this.readIdentifier(token) : token
        );
      } else if ([Token.LParen, Token.LCurly].includes(this.peek(2)?.kind)) {
        return this.readFunc(
          token.kind == Token.Identifier ? this.readIdentifier(token) : token
        );
      } else {
        return new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(), "expected variable or function");
      }
    } else if (
      token.kind == Token.Asterisk &&
      Types.includes(this.peek()?.kind) &&
      this.peek(2)?.kind == Token.Identifier
    ) {
      const type = this.next();
      return this.readVar(
        type.kind == Token.Identifier ? this.readIdentifier(type) : type,
        true
      );
    } else if (
      token.kind == Token.At &&
      Types.includes(this.peek()?.kind) &&
      this.peek(2)?.kind == Token.Identifier
    ) {
      const type = this.next();
      return this.readFunc(
        type.kind == Token.Identifier ? this.readIdentifier(type) : type,
        true
      );
    } else if (token.kind == Token.Caret) {
      return this.readImport();
    } else {
      return new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(...this.span(token), `unexpected ${Token[token.kind]}`)
        .raise();
    }
  }

  parse() {
    const topLevel = new TopLevel();

    while (this.peek()) {
      topLevel.expr.push(this.readTopLevel());

      if (
        this.peek() &&
        this.peek().kind != Token.Semicolon &&
        this.current().kind != Token.RCurly
      ) {
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(
            ...this.span(this.peek()),
            `unexpected ${Token[this.peek()?.kind]}`
          )
          .ln(...this.span(this.current()), "missing semicolon?")
          .raise();
      } else if (this.peek()?.kind == Token.Semicolon) this.next();
      
      handleErrors();
    }

    return topLevel;
  }
}
