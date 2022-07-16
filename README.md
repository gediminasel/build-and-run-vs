# Build and Run

Build programs automatically and run them with input from source code comments.

- Different build and run commands for different languages.
- Project specific commands (in project settings).
- Run untitled (not saved) files.
- Any language.
- Fully customizable.
- Multiple runs.
- Format code.

Remember to add key bindings.

Contributions are welcome (please create an issue first and discuss it).

## Configuration

Example configuration (supports both global `settings.json` or local `.vscode/settings.json`):

```json
"buildAndRun": {
	"cpp": {
		"build": "g++ -std=gnu++17 -Wall -Wextra -O2 \"${file}\" -o \"${file_base_name}.exe\"",
		"debugBuild": "g++ -std=gnu++17 -Wall -Wextra -g -O0 \"${file}\" -o \"${file_base_name}.exe\"",
		"inputBegin": "/*input\n",
		"inputEnd": "*/",
		"run": "\"${file_base_name}.exe\"",
		"debug": "gdb -q -ex \"set print thread-events off\" -ex run -ex \"bt -entry-values compact -frame-arguments scalar -full\" \"${file_base_name}.exe\"",
		"ext": "cpp",
		"format": "AStyle.exe --indent=tab --mode=c --project=none"
	},
	"python": {
		"inputBegin": "'''input\n",
		"inputEnd": "'''",
		"run": "python -Xutf8 -u \"${file}\"",
		"ext": "py",
		"format": "black.exe -"
	}
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
```
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