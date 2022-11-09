# Constants and variables
```
^ io;
32 FUNNI_NUMBER = 69420;
0 main {
  32 anothr_funni_numbr = 1337;
  io:puts(FUNNI_NUMBER + another_funni_numbr);
}
```

# Mutable variables
```
^ io;
0 main {
  *32 i = 0;
  
  i += 10;
  i--;
  
  io:puts(i:as_str());
}
```

# Truth machine (conditions, loops)
```
0 main {
  "" inp = io:prompt();
  
  inp == "1" ? {
    loop: {
      io:puts("1");
      loop
    }
  } : {
    io:puts("0");
  }
}
```

# Macros
```
^ math;
^ io;

@.32 my_macro { math:rand() } 

0 main {
  .32 x = my_macro;
  .32 y = my_macro;

  io:puts(x:as_str());
  io:puts(y:as_str());
}
```

```
@16 id(A) { 1 }
@16 id(B) { 2 }
@16 id(C) { 3 }

0 main {
  16 x = id(A) + id(B) + id(C);
  
  !! x == 6;
}
```

```
^ io/puts;
0 main {
  inline_macro: {
    2 + 2
  }

  puts(inline_macro); // 4
}
```

# Type definitions
```
^ io;
^ types;

void main {
  io:puts("Hello world");
}
```
```
$ void = 0;
$ bool = 8;
$ str = "";
$ i64 = 64;
$ f32 = .32;
```

# Exports
```
^ io;
^ 0 prn ("" a, "" b) {
  io:puts("Hello world");
}
```
```
^ io/puts;
^ my_lib/add;

0 main {
  io:puts(add(2, 4));
}
```