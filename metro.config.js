const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite web worker imports ./wa-sqlite/wa-sqlite.wasm
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// OPFS / SharedArrayBuffer support for expo-sqlite on web
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      if (typeof req.url === 'string' && req.url.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
