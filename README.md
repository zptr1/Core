# Core

A general-purpose programming language with no keywords (WIP)

This language does not work yet - only lexer and unfinished parser are available.

However, feel free to contribute if you'd like to! 

## Milestones

- [x] Lexer
- [x] Error Formatting
- [ ] Parser (WIP)
- [ ] Type Checking
- [ ] Compiler
- [ ] Standard Library
- [ ] Package Manager
- [ ] Optimized
- [ ] Self-Hosted

### Parser Progress

* [x] top-level
* [x] functions, imports, constants
* [x] expressions
* [x] variable declarations
* [x] function calls
* [x] if
* [x] macros
* [x] mutable variables
* [ ] type declarations
* [ ] list variables
* [ ] function arguments
* [ ] loops (aka inline macros)
* [ ] idk i forgor

## Examples

```
^ io;
0 main {
  io:puts("Hello, World!");
}
```

```
^ io;
0 main {
  "" name = io:prompt("Enter your name: ");
  32 age = io:prompt("Enter your age: "):as_i32();

  io:puts("Hello, " + name + "!");
}
```

```
^ io;
0 main {
  16 i = 0;

  a: {
    io:puts((i++):as_str());
    i < 100 ? a;
  }
}
```