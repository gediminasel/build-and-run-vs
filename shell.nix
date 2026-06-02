{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShellNoCC {
  packages = with pkgs; [
    nodejs_26
    typescript-language-server
    typescript
  ];
}