import Lexer from "./lexer.js";
import { inspect } from "util";
import { resolve } from "path";
import { readFile } from "fs/promises";
import { Parser } from "./parser.js";
import { args } from "./config.js";

if (args.positionals.length < 1) {
  console.error("usage: core <file>");
  process.exit(1);
}

const file = resolve(args.positionals[0]);
const src = (await readFile(file)).toString();

const tokens = new Lexer(file, src).read();
const parser = new Parser(file, src, tokens);

console.log(
  inspect(parser.parse(), {
    colors: true,
    depth: 20,
    compact: true,
  })
);
