import 'react-native-gesture-handler';
import './src/lib/nativeDevShim';
import { installTextCodecPolyfill } from './src/lib/textCodecPolyfill';
import { registerRootComponent } from 'expo';
import App from './App';

installTextCodecPolyfill();
registerRootComponent(App);
