import { AtomTypes, Op, OpTokenMap, Token } from "./constants.js";
import { CError, handleErrors } from "./errors.js";
import {
  Atom,
  Block,
  Expression,
  Fn,
  FnArg,
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

  current() {
    return this.peek(0) || this.peek(-1);
  }

  *iter() {
    let c;
    while ((c = this.next())) yield c;
  }

  span(token) {
    const lc = lineColumn(this.src);
    const span = (token?.span || this.current()?.span || []).map((x) => lc.fromIndex(x - 1));
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
        if (this.peek()?.kind == Token.Dot) {
          this.next();
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

  readIdentifier(callable = true) {
    const path = [...arguments];
    const start = this.peek().span[0];
    let token;

    while ((token = this.peek())) {
      if (token.kind != Token.Identifier) break;

      path.push(this.next().value);

      if (callable && this.peek().kind == Token.LParen) {
        this.next();
        path.push([this.readParentheses()]);

        if (this.peek()?.kind != Token.Colon) break;
        this.next();
      } else if (this.peek().kind != Token.Dot) break;
      else this.next();
    }

    return new Identifier([start, this.current()?.span?.[1]], path);
  }

  readVar(mutable = false) {
    const name = this.readIdentifier();
    const variable = new Var();

    variable.name = name;
    variable.mutable = mutable;

    if (this.peek().kind == Token.Colon) {
      this.next();
      variable.type = this.readType();
    }

    if (this.peek()?.kind != Token.Semicolon) {
      if (this.next()?.kind != Token.Equals) {
        return new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(this.current()), 'expected "="')
          .raise();
      } else {
        variable.value = this.readExpr();
      }
    } else if (!mutable) {
      return new CError("invalid expression")
        .src(this.file, this.src)
        .ln(
          ...this.span(this.peek()),
          "immutable variables must be declared with a value"
        )
        .raise();
    } else if (!variable.type) {
      return new CError("invalid expression")
        .src(this.file, this.src)
        .ln(
          ...this.span(this.peek()),
          "variables with no initial value must have a specified type"
        )
        .raise();
    }

    variable.span = [name.span?.[0], this.current()?.span?.[1]];
    
    return variable;
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

    if (
      token.kind == Token.Identifier &&
      [Token.Colon, Token.Equals, Token.Semicolon].includes(this.peek()?.kind)
    ) {
      this.i--;
      return this.readVar();
    } else if (
      token.kind == Token.Asterisk &&
      this.peek()?.kind == Token.Identifier
    ) {
      return this.readVar(true);
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
      const expr = this.readParentheses();

      if (this.peek()?.kind == Token.Dot) {
        this.next();
        return this.readIdentifier(expr);
      }

      return expr;
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

  readFuncArgs() {
    const list = new List();
    const start = this.current();
    let closed = false;
    let token;

    while ((token = this.peek())) {
      if (token.kind == Token.RParen) {
        closed = true;
        break;
      }

      const name = this.next();

      if (name?.kind != Token.Identifier) {
        new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(name), `expected identifier`)
          .raise();
      } else {
        const arg = new FnArg();
        arg.name = name.value;

        if (this.peek()?.kind == Token.Colon) {
          this.next();
          arg.type = this.readType();
        }

        if (this.peek()?.kind == Token.Equals) {
          this.next();
          arg.defaultValue = this.readExpr();
        }

        arg.span = [name.span?.[0], this.current()?.span?.[1]];
        list.list.push(arg);
      }

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

  readFunc(macro = false) {
    const func = new Fn();
    const name = this.readIdentifier(false);

    func.name = name;
    func.macro = macro;

    if (this.peek()?.kind == Token.LParen) {
      this.next();
      
      if (func.macro) {
        return new CError("invalid expression")
          .src(this.file, this.src)
          .ln(...this.span(), "macro function cannot have arguments")
          .raise();
      }
      
      func.args = this.readFuncArgs();
    }

    if (this.peek()?.kind == Token.RArrow) {
      this.next();
      func.type = this.readType();
    }

    if (this.peek()?.kind == Token.LCurly) {
      this.next();
      func.expr = this.readBlock();
    }

    if (!func.expr)
      return new CError("invalid syntax")
        .src(this.file, this.src)
        .ln(...this.span(), `expected block`)
        .raise();

    func.span = [name?.span?.[0], this.current()?.span?.[1]];

    return func;
  }

  readType() {
    const token = this.peek();

    // todo: union and tuple types
    if (token.kind == Token.String) {
      this.next();
      return "str";
    } else if (token.kind == Token.Int && token.value == 0) {
      this.next();
      return "void";
    } else if (token.kind == Token.Int) {
      this.next();
      return `i${token.value}`;
    } else if (token.kind == Token.Float) {
      this.next();
      return `f${token.value}`;
    } else if (token.kind == Token.Identifier) return this.readIdentifier();
  }

  readImport() {
    const imp = new Import();
    const start = this.current();

    for (const token of this.iter()) {
      if (token.kind == Token.Identifier || token.kind == Token.String) {
        imp.path.push(token.value);
      } else {
        new CError("invalid expression")
          .src(this.file, this.src)
          .ln(...this.span(token), `unexpected ${Token[token.kind]}`)
          .raise();
      }

      if (this.peek()?.kind != Token.Slash) break;
    }

    imp.span = [start.span[0], this.current().span[1]];
    return imp;
  }

  readTopLevel() {
    const token = this.next();

    if (token.kind == Token.Identifier) {
      const peek = this.peek();

      if (
        !peek ||
        [Token.Colon, Token.Equals, Token.Semicolon].includes(peek.kind)
      ) {
        this.i--; // needed for readIdentifier
        return this.readVar();
      } else if (
        [Token.LParen, Token.RArrow, Token.LCurly].includes(peek?.kind)
      ) {
        this.i--;
        return this.readFunc();
      } else {
        return new CError("invalid syntax")
          .src(this.file, this.src)
          .ln(...this.span(), "expected variable or function");
      }
    } else if (
      token.kind == Token.Asterisk &&
      this.peek()?.kind == Token.Identifier
    ) {
      return this.readVar(true);
    } else if (
      token.kind == Token.At &&
      this.peek()?.kind == Token.Identifier
    ) {
      return this.readFunc(true);
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
