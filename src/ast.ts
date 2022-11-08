export enum Operator {
  Add,
  Sub,
  Mul,
  Div,
  Gt,
  GtEq,
  Lt,
  LtEq,
  Eq,
  And,
  Or,
  NotEq,
  Not
}

export type Span = [number, number];

enum Marker {
  TopLevel,
  Identifier,
  Variable,
  Import,
  Function,
  InfixExpression,
  PrefixExpression,
  IfExpression
}

export interface Node {
  span: Span,
  marker: Marker
}
export interface Identifier extends Node {
  inner: string
}
export interface TopLevel extends Node {
  imports: Import[],
  variables: Variable[],
  functions: Function[],
}

export interface Function extends Node {
  name: Identifier,
  arguments: [Identifier, Identifier][],
  returnType: Identifier,
  block: Node[]
}

export interface Import {
  path: Identifier[][] // Array of paths splited by backslash token
}

export interface Variable extends Node {
  mutable: boolean,
  type: Node,
  name: Identifier,
  value: Node,
}
export interface InfixExpression extends Node {
  operator: Operator,
  lhs: Node,
  rhs: Node
}
export interface PrefixExpression extends Node {
  operator: Operator,
  value: Node
}

export interface IfExpression {
  test: Node,
  consequent: Node,
  alternate: Node
}
