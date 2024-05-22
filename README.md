# Build and Run

Build programs automatically and run them with input from source code comments.

- Different build and run commands for different languages.
- Project specific commands (in project settings).
- Run untitled (not saved) files.
- Any language.
- Fully customizable.
- Multiple runs.
- Format code.
- Compare with expected output.

Remember to add key bindings.

Contributions are welcome (please create an issue first and discuss it).

## Installation

Install from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=glelesius.build-and-run).
See [INSTALL.md](INSTALL.md) for more details.

## Configuration

Example configuration (supports both global `settings.json` or local `.vscode/settings.json`),
don't just replace everything, add this inside settings object:

```json
"buildAndRun": {
    "cpp": {
        "build": "g++ -std=gnu++20 -Wall -Wextra -O2 \"${file}\" -o \"${file_base_name}.exe\"",
        "debugBuild": "g++ -std=gnu++20 -Wall -Wextra -g -O0 \"${file}\" -o \"${file_base_name}.exe\"",
        "inputBegin": "/*input\n",
        "inputEnd": "*/",
        "outputBegin": "/*output\n",
        "outputEnd": "*/",
        "run": "\"${file_base_name}.exe\"",
        "debug": "gdb -q -ex \"set print thread-events off\" -ex run -ex \"bt -entry-values compact -frame-arguments scalar -full\" \"${file_base_name}.exe\"",
        "ext": "cpp",
        "format": "astyle --indent=tab --mode=c --project=none"
    },
    "python": {
        "inputBegin": "\"\"\"input\n",
        "inputEnd": "\"\"\"",
        "outputBegin": "\"\"\"output\n",
        "outputEnd": "\"\"\"",
        "run": "python -Xutf8 -u \"${file}\"",
        "ext": "py",
        "format": "ruff check - --fix | ruff format --line-length 120 -"
    }
}
```

Full list of language names can be found at [VSC docs](https://code.visualstudio.com/docs/languages/identifiers).

For more details on what each option does, please read comments in [src/settings.ts](src/settings.ts)

In command strings you can use the following variables:

`${file}` will be replaced by the currently open file.  
`${file_path}` by the currently open file's directory.  
`${file_base_name}` by `${file}` without extension.  
`${workspace_path}` by the path of the first folder of the workspace
(or `${file_path}` if no workspace is open).

## Commands

List of commands (run by pressing `ctrl+shift+P` or add a key binding):

```txt
B&R: Build and Run with input
B&R: Build
B&R: Build and Debug with input
B&R: Kill running program
B&R: Format
B&R: Cleanup temp files
```

## Input from comments

C++ example:

```cpp
#include <bits/stdc++.h>
/*input
a
*/
/*input
b
*/
int main() {
    std::string x; std::cin >> x; std::cout << x << x;
}
```

Example output (program executed twice, with different inputs):

```txt
[Built in 0.612s]
aa
[Finished in 0.037s]
bb
[Finished in 0.039s]
```

Python example:

```py
'''input
a
'''
'''input
b
'''
x = input()
print(x, x, sep='')
```
