{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShellNoCC {
  packages = with pkgs; [
    nodejs_24
    nodePackages.npm
    nodePackages.typescript-language-server
    typescript
  ];
}