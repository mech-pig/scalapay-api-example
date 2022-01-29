let
  nixpkgs = builtins.fetchGit {
    name = "nixos-unstable-2022-01-05";
    url = "https://github.com/NixOS/nixpkgs/";
    ref = "refs/heads/nixos-unstable";
    rev = "78cd22c1b8604de423546cd49bfe264b786eca13";
  };

  pkgs = import nixpkgs {};
in
  pkgs.mkShell {
    buildInputs = [
      pkgs.httpie
      pkgs.nodejs-16_x
    ];
  }