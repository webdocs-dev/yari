{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, flake-utils, nixpkgs }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs { inherit system; };
    in {
      devShell = pkgs.mkShell {
        name = "yari-devshell";

        nativeBuildInputs = with pkgs; [
          # Nodejs and JS dev tools
          nodejs
          yarn
          nodePackages.typescript-language-server
          nodePackages.vscode-css-languageserver-bin
          nodePackages.vscode-html-languageserver-bin

          # Required for building gifsicle and mozjpeg node packages
          autoconf
          automake
          libtool
          nasm
          pkg-config

          # Other tools
          git
          rustc
        ];
      };
    });
}
