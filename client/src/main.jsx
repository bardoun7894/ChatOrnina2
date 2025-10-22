import 'regenerator-runtime/runtime';
import { createRoot } from 'react-dom/client';

try {
  import('./locales/i18n').catch((error) => {
    console.error('Error loading i18n:', error);
  });
} catch (error) {
  console.error('Error importing i18n:', error);
}

import App from './App';
import './style.css';
import './mobile.css';
import { ApiErrorBoundaryProvider } from './hooks/ApiErrorBoundaryContext';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/copy-tex.js';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ApiErrorBoundaryProvider>
    <App />
  </ApiErrorBoundaryProvider>,
);
