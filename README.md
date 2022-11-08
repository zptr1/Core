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
- [ ] Optimized
- [ ] Self-Hosted

## Examples

```
< io;
0 main {
  io:puts("Hello, World!");
}
```

```
< io;
0 main {
  "" name = io:prompt("Enter your name: ");
  32 age = io:prompt("Enter your age: "):as_i32();

  io:puts("Hello, " + name + "!");
}
```

```
< io;
0 main {
  16 i = 0;

  a: {
    io:puts((i++):as_str());
    i < 100 ? a;
  }
}
```