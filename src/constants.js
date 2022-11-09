import { Enum } from "./util.js";

export const Token = Enum(
  "Int",
  "Float",
  "String",
  "Identifier",

  "Plus",
  "Minus",
  "Asterisk",
  "Slash",
  "LParen",
  "RParen",
  "LBracket",
  "RBracket",
  "LCurly",
  "RCurly",
  "Bang",
  "At",
  "Hash",
  "Dollar",
  "Percent",
  "Caret",
  "Ampersand",
  "Equals",
  "VerticalBar",
  "Dot",
  "Comma",
  "LCaret",
  "RCaret",
  "Semicolon",
  "Colon",
  "Tilde",
  "Question",

  "Assert",
  "DoubleEq",
  "NotEq",
  "LtEq",
  "GtEq",
  "And",
  "Or"
);

export const Op = Enum(
  "Add",
  "Sub",
  "Mul",
  "Div",
  "GtEq",
  "LtEq",
  "Eq",
  "Gt",
  "Lt",
  "NotEq",
  "And",
  "Or",
  "If",
  "Set"
);

export const OpTokenMap = {
  [Token.Plus]: Op.Add,
  [Token.Minus]: Op.Sub,
  [Token.Asterisk]: Op.Mul,
  [Token.Slash]: Op.Div,
  [Token.GtEq]: Op.GtEq,
  [Token.LtEq]: Op.LtEq,
  [Token.DoubleEq]: Op.Eq,
  [Token.LCaret]: Op.Lt,
  [Token.RCaret]: Op.Gt,
  [Token.NotEq]: Op.NotEq,
  [Token.And]: Op.And,
  [Token.Or]: Op.Or,
};

export const EscapeChars = {
  n: "\n",
  r: "\r",
  t: "\t",
};

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
  $: Token.Dollar,
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

export const AtomTypes = [Token.Int, Token.Float, Token.String, Token.Identifier];
export const Types = [...AtomTypes, Token.Tilde];
