const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const hmrNative = path.join(__dirname, 'node_modules/expo/src/async-require/hmr.native.ts');
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform &&
    platform !== 'web' &&
    moduleName === './hmr' &&
    context.originModulePath.includes(`${path.sep}async-require${path.sep}`)
  ) {
    return { type: 'sourceFile', filePath: hmrNative };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// expo-sqlite web worker imports ./wa-sqlite/wa-sqlite.wasm
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
if (!config.resolver.assetExts.includes('csv')) {
  config.resolver.assetExts.push('csv');
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
