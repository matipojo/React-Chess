const { createRequire } = require("module");

// CRA's webpack plugin resolves this config from react-scripts' real path
// under .pnpm. Use the same copy so eslint-plugin-react is not loaded twice.
const resolveFromCra = createRequire(
  require.resolve("react-scripts/config/webpack.config.js")
);

module.exports = {
  extends: [
    resolveFromCra.resolve("eslint-config-react-app"),
    resolveFromCra.resolve("eslint-config-react-app/jest"),
  ],
};
