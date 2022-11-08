import { Operator } from "./ast";
import { Nullable } from "./util";

export enum Token {
  Int,
  Float,
  String,
  Identifier,

  Plus,
  Minus,
  Asterisk,
  Slash,
  LParen,
  RParen,
  LBracket,
  RBracket,
  LCurly,
  RCurly,
  Bang,
  At,
  Hash,
  Dollar,
  Percent,
  Caret,
  Ampersand,
  Equals,
  VerticalBar,
  Dot,
  Comma,
  LCaret,
  RCaret,
  Semicolon,
  Colon,
  Tilde,
  Question,

  DoubleEq,
  NotEq,
  LtEq,
  GtEq,
  And,
  Or
}

export function operator(token: Token) : Nullable<Operator> {
  switch(token) {
    case Token.Plus: return Operator.Add;
    case Token.Minus: return Operator.Sub;
    case Token.Asterisk: return Operator.Mul;
    case Token.Slash: return Operator.Div;
    case Token.LCaret: return Operator.Lt;
    case Token.RCaret: return Operator.Gt;
    case Token.LtEq: return Operator.LtEq;
    case Token.GtEq: return Operator.GtEq;
    case Token.DoubleEq: return Operator.Eq;
    case Token.And: return Operator.And;
    case Token.Or: return Operator.Or;
    default: return null;
  }
}

export const CharTokenMap = {
  "+": Token.Plus,
  "-": Token.Minus,
  "*": Token.Asterisk,
  "/": Token.Slash,
  "(": Token.LParen,
  ")": Token.RParen,
  "[": Token.LBracket,
  "]": Token.RBracket,
  "{": Token.LCurly,
  "}": Token.RCurly,
  "!": Token.Bang,
  "@": Token.At,
  "#": Token.Hash,
  "$": Token.Dollar,
  "%": Token.Percent,
  "^": Token.Caret,
  "&": Token.Ampersand,
  "=": Token.Equals,
  "|": Token.VerticalBar,
  ".": Token.Dot,
  ",": Token.Comma,
  "<": Token.LCaret,
  ">": Token.RCaret,
  ";": Token.Semicolon,
  ":": Token.Colon,
  "~": Token.Tilde,
  "?": Token.Question,
};
