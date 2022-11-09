import { Op } from "./constants.js";

class Ast {
  constructor(span) {
    this.span = span;
  }
}

export class TopLevel extends Ast {
  constructor(expr = []) {
    super();

    this.expr = expr;
  }
}

export class Import extends Ast {
  constructor(span, path = []) {
    super(span);

    this.path = path;
  }
}

export class Var extends Ast {
  constructor(span, type, name, value, mutable = false) {
    super(span);

    this.type = type;
    this.name = name;
    this.value = value;
    this.mutable = mutable;
  }
}

export class Fn extends Ast {
  constructor(span, type, name, expr = [], macro = false) {
    super(span);

    this.type = type;
    this.name = name;
    this.expr = expr;
    this.macro = macro;
  }
}

export class Expression extends Ast {
  constructor(span, op, left, right) {
    super(span);

    this.op = Op[op];
    this.left = left;
    this.right = right;
  }
}

export class Identifier extends Ast {
  constructor(span, path) {
    super(span);

    this.path = path;
  }
}

export class Atom extends Ast {
  constructor(span, type, value) {
    super(span);

    this.type = type;
    this.value = value;
  }
}

export class IfInner extends Ast {
  constructor(span, ifTrue, ifFalse) {
    super(span);

    this.ifTrue = ifTrue;
    this.ifFalse = ifFalse;
  }
}

export class Block extends Ast {
  constructor (span, expr = [], hasResult = false) {
    super(span);

    this.expr = expr;
    this.hasResult = hasResult;
  }
}

export class List extends Ast {
  constructor (span, list = []) {
    super(span);

    this.list = list;
  }
}