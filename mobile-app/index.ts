import './src/sentry'; // Sentry init (optional when EXPO_PUBLIC_SENTRY_DSN is set)
import { registerRootComponent } from 'expo';
import * as Sentry from '@sentry/react-native';

import App from './App';

const Root = Sentry.wrap(App);
registerRootComponent(Root);
