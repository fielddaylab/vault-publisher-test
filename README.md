# vault-publisher-test

A stand-in for a Unity game repo, for testing [vault-publisher](https://github.com/VaultLearningGames/vault-publisher)
without a 45-minute Unity build. `simulate-build.mjs` writes Unity-style WebGL files in seconds (Brotli
WebAssembly, gzip JavaScript and data, a Unity 2019 `.unityweb` file).

- **Push any branch** → published to `https://cdn.vaultlearninggames-staging.org/fielddaylab/publisher-test/<branch>/`,
  then the workflow checks the CDN's headers. Open the URL in a browser for in-page ✅/❌ checks.
- **Delete the branch** → its preview is removed.
