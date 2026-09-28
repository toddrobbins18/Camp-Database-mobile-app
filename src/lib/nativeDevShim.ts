import { Platform } from 'react-native';

/**
 * React Native sets `global.window = global` but does not define `window.location`.
 * Expo dev mode loads the web HMR client when `window` exists, which crashes on
 * `window.location.protocol`. Patch location on native before Expo initializes.
 */
if (Platform.OS !== 'web' && __DEV__) {
  const w = globalThis as typeof globalThis & {
    window?: typeof globalThis & { location?: Partial<Location> };
  };

  if (typeof w.window !== 'undefined') {
    const loc = w.window.location;
    if (!loc || typeof loc.protocol !== 'string') {
      w.window.location = {
        protocol: 'http:',
        host: 'localhost:8081',
        hostname: 'localhost',
        port: '8081',
        href: 'http://localhost:8081/',
        origin: 'http://localhost:8081',
        pathname: '/',
        search: '',
        hash: '',
      } as Location;
    }
  }
}
