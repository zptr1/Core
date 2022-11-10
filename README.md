# Core

A general-purpose programming language with no keywords (WIP)

This language does not work yet - only lexer and unfinished parser are available.

However, feel free to contribute if you'd like to! 

## Milestones

- [x] Lexer
- [x] Error Formatter
- [ ] Parser (WIP)
- [ ] HIR
- [ ] Type Checker
- [ ] LLVM IR
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
* [x] function arguments
* ~~[ ] type declarations~~
* [ ] inline macro declarations
* [ ] arrays
* [ ] idk i forgor

## Examples

```
^ io;

main {
  io.puts("Hello, World!");
}
```

```
^ io;

main {
  name = io.prompt("Enter your name: ");
  age = io.prompt("Enter your age: ").as_i32();

  io.puts("Hello, " + name + "!");
}
```

```
^ io;

main {
  *i = 0;

  @a {
    io.puts((i++).as_str());
    i < 100 ? a;
  }
}
```