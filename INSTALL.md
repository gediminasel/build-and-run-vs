# Build and Run Installation

1. Install [Visual Studio Code](https://code.visualstudio.com/Download).
2. Install compilers and/or interpreters. Make sure they are added to PATH.
3. Install Build and Run extension from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=glelesius.build-and-run).
4. Configure B&R extension in VS Code. (See [README](README.md))
5. Add key bindings for `B&R` commands. (See [VSC docs](https://code.visualstudio.com/docs/getstarted/keybindings))

## Installing G++/Python on Ubuntu/Debian

~~~bash
sudo apt install g++
sudo apt install python
~~~

## Installing G++ on Windows

1. Go to [WinLibs](https://winlibs.com/).
2. Scroll down to Download -> Release versions -> UCRT runtime.
3. Click on Latest Win64 Zip archive.
4. Unzip downloaded file.
5. Move resulting `mingw64` folder to `C:\Program Files`.
6. Search `Edit the system environment variables` in Windows.
7. Click `Environment variables`.
8. In `System Variables` double click on Path
9. Click `New` and enter `C:\Program Files\mingw64\bin`.
10. Save everything and restart your computer.

## Installing Python on Windows

1. Download [Python](https://www.python.org/downloads/)
2. Install. Make sure to check `Add python.exe to PATH`. If you forgot, reinstall.
3. Restart your computer.
