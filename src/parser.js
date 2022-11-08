import { Op, OpTokenMap, Token } from "./constants.js";
import { CError, handleErrors } from "./errors.js";
import {
  Atom,
  Expression,
  Fn,
  Identifier,
  IfInner,
  Import,
  TopLevel,
  Var,
} from "./ast.js";
import lineColumn from "line-column";

function formatType(kind, value) {
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

  *read() {
    let c;
    while ((c = this.next())) yield c;
  }

  span(token) {
    const lc = lineColumn(this.src);
    const span = (token || this.peek(0)).span.map((x) => lc.fromIndex(x));
    return [span[0]?.line - 1, [span[0]?.col - 1, span[1]?.col - 1]];
  }

  _readAdd() {
    const left = this._readSub();

    if (this.peek()?.kind == Token.Plus) {
      this.next();
      const right = this._readSub();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Add, left, right);
    }

    return left;
  }

  _readSub() {
    const left = this._readMul();

    if (this.peek()?.kind == Token.Minus) {
      this.next();
      const right = this._readMul();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Sub, left, right);
    }

    return left;
  }

  _readMul() {
    const left = this._readDiv();

    if (this.peek()?.kind == Token.Asterisk) {
      this.next();
      const right = this._readDiv();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Mul, left, right);
    }

    return left;
  }

  _readDiv() {
    const left = this._readCond();

    if (this.peek()?.kind == Token.Slash) {
      this.next();
      const right = this._readCond();

      if (!right) return;

      return new Expression([left.span[0], right.span[1]], Op.Div, left, right);
    }

    return left;
  }

  _readCond() {
    const left = this._readAtom();
    const peek = this.peek();
  
    if (peek?.kind in OpTokenMap) {
      this.next();
      const right = this._readAdd();

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

  _readAtom() {
    const token = this.peek();

    switch (token.kind) {
      case Token.Int:
      case Token.Float:
      case Token.String:
        this.next();
        const atom = new Atom(token.span, formatType(token.kind), token.value);
        if (this.peek(2)?.kind == Token.Colon) {
          return this._readIdentifier(atom);
        } else {
          return atom;
        }
      case Token.Identifier:
        return this._readIdentifier();
      default:
        new CError("invalid expression")
          .src(this.file, this.src)
          .ln(...this.span(token), `expected atom`)
          .raise();
    }
  }

  _readIf() {
    const inner = new IfInner();

    if (this.peek()?.kind == Token.LCurly) {
      this.next();
      inner.ifTrue = this.parseBlock();
    } else {
      inner.ifTrue = this.parseExpr();
    }

    if (this.peek()?.kind == Token.Colon) {
      this.next();
      if (this.peek()?.kind == Token.LCurly) {
        this.next();
        inner.ifFalse = this.parseBlock();
      } else {
        inner.ifFalse = this.parseExpr();
      }
    }

    inner.span = [
      inner.ifTrue?.span?.[0],
      (inner.ifFalse || inner.ifTrue)?.span?.[1],
    ];

    return inner;
  }

  _readIdentifier() {
    const path = [...arguments];
    const start = this.peek().span[0];
    let token;

    while ((token = this.peek())) {
      if (token.kind != Token.Identifier) break;

      path.push(this.next().value);

      if (this.peek().kind == Token.LParen) path.push(this.parseExpr(true));

      if (this.peek().kind != Token.Colon) break;

      this.next();
    }

    return new Identifier([start, this.peek(0).span[1]], path);
  }

  parseExpr(paren = false) {
    const expr = [];

    for (const token of this.read()) {
      let previous = expr.at(-1);

      switch (token.kind) {
        case Token.RParen:
          if (paren) return expr;
          else {
            new CError("invalid expression")
              .src(this.file, this.src)
              .ln(
                ...this.span(token),
                "unexpected RParen (perhabs you forgot to open parentheses)"
              )
              .raise();
          }

        case Token.Semicolon:
          return expr;

        case Token.Int:
        case Token.Float:
        case Token.String:
        case Token.Tilde:
          if (this.peek()?.kind == Token.Identifier) {
            const name = this.next();

            if (this.next()?.kind != Token.Equals) {
              new CError("invalid expression")
                .src(this.file, this.src)
                .ln(...this.span(this.peek(0)), 'expected "="')
                .raise();
            } else {
              const value = this.parseExpr();

              if (!value || value.length == 0)
                new CError("invalid expression")
                  .src(this.file, this.src)
                  .ln(...this.span(this.peek(0)), "expected expression")
                  .raise();
              else
                expr.push(
                  new Var(
                    [token.span[0], name.span[1]],
                    formatType(token.kind, token.value),
                    name.value,
                    value,
                    previous?.kind == "Op" && previous?.op == "Mul"
                  )
                );
            }

            break;
          }

        case Token.Int:
        case Token.Float:
        case Token.String:
        case Token.Identifier:
          this.i--;
          const e = this._readAdd();

          if (this.peek()?.kind == Token.Question) {
            this.next();
            const inner = new IfInner();

            if (this.peek()?.kind == Token.LCurly) {
              this.next();
              inner.ifTrue = this.parseBlock();
            } else {
              inner.ifTrue = this.parseExpr();
            }

            if (this.peek()?.kind == Token.Colon) {
              this.next();
              if (this.peek()?.kind == Token.LCurly) {
                this.next();
                inner.ifFalse = this.parseBlock();
              } else {
                inner.ifFalse = this.parseExpr();
              }
            }

            inner.span = [
              inner.ifTrue?.span?.[0],
              (inner.ifFalse || inner.ifTrue)?.span?.[1],
            ];
          
            expr.push(
              new Expression(
                [e.span[0], inner.span[1]],
                Op.If,
                e, inner
              )
            );
          } else {
            expr.push(e);
          }
          break;
        case Token.LParen:
          expr.push(this.parseExpr(true));
          break;

        case Token.Identifier:
          this.i--;
          expr.push(this._readIdentifier());
          break;

        default:
          new CError("invalid expression")
            .src(this.file, this.src)
            .ln(...this.span(token), `unexpected ${Token[token.kind]}`)
            .raise();
      }

      if (expr.length > 0 && !paren) return expr;
      if (this.peek()?.kind == Token.Semicolon && !paren) break;
      if (this.peek()?.kind == Token.RCurly) break;
    }

    return expr;
  }

  parseBlock() {
    // parse block
    const block = [];
    let token;

    while ((token = this.peek())) {
      if (token.kind == Token.RCurly) break;

      block.push(this.parseExpr());
    }

    this.next();
    return block;
  }

  parse() {
    // parse top level (imports, variables, functions)
    const topLevel = new TopLevel();

    for (const token of this.read()) {
      switch (token.kind) {
        case Token.Semicolon:
          break;

        case Token.Int:
        case Token.Float:
        case Token.String:
        case Token.Tilde:
          if (this.peek()?.kind == Token.Identifier) {
            const name = this.next();
            const next = this.next();

            const dup =
              topLevel.variables.find((x) => x.name == name.value) ||
              topLevel.functions.find((x) => x.name == name.value);

            if (dup) {
              new CError("duplicated object name")
                .src(this.file, this.src)
                .ln(...this.span(name), "cannot redefine object")
                .ln(
                  ...this.span(dup),
                  `'${name.value}' already defined here`,
                  "note"
                )
                .raise();
            }

            if (next.kind == Token.Equals) {
              topLevel.variables.push(
                new Var(
                  name.span,
                  formatType(token.kind, token.value),
                  name.value,
                  this.parseExpr()
                )
              );
            } else if (next.kind == Token.LCurly) {
              topLevel.functions.push(
                new Fn(
                  name.span,
                  formatType(token.kind, token.value),
                  name.value,
                  this.parseBlock()
                )
              );
            } else {
              new CError("invalid syntax")
                .src(this.file, this.src)
                .ln(
                  ...this.span(next),
                  `expected Equals or LCurly but got ${Token[next.kind]}`
                )
                .raise();
            }

            break;
          } else {
            new CError("invalid syntax")
              .src(this.file, this.src)
              .ln(...this.span(token), `unexpected ${Token[token.kind]}`)
              .raise();
          }
          break;

        case Token.LCaret:
          const path = [];
          let tok;

          while ((tok = this.peek())) {
            if (tok.kind == Token.Identifier) path.push(tok.value);
            else if (tok.kind != Token.Slash) break;

            this.next();
          }

          topLevel.imports.push(
            new Import([token.span[0], tok.span[1] - 1], path)
          );

          break;

        default:
          new CError("invalid syntax")
            .src(this.file, this.src)
            .ln(...this.span(token), `unexpected ${Token[token.kind]}`)
            .raise();
      }
    }

    handleErrors();
    return topLevel;
  }
}
