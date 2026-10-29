import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { sanitizeClientStorage } from './lib/cacheManager';

// Run storage & cache sanitation on startup
sanitizeClientStorage();

createRoot(document.getElementById('root')!).render(<App />);
