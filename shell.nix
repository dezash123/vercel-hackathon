with import <nixpkgs> {};
mkShell {
  buildInputs = [
    docker-compose
    nodejs
    corepack
  ];
}