import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { sanitizeClientStorage } from './lib/cacheManager';
import {
  PublicInfoPage,
  PublicRoute,
  parsePublicRoute,
} from './components/pages/PublicInfoPage';

// Run storage & cache sanitation on startup
sanitizeClientStorage();

function RootRouter() {
  const [publicRoute, setPublicRoute] = useState<PublicRoute | null>(() =>
    typeof window !== 'undefined' ? parsePublicRoute(window.location.pathname) : null
  );

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = parsePublicRoute(window.location.pathname);
      setPublicRoute(nextRoute);
      if (!nextRoute) {
        document.title = 'My Christmas World | Build with Magic';
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleNavigate = (path: PublicRoute | '/') => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    const nextRoute = parsePublicRoute(path);
    setPublicRoute(nextRoute);
    if (!nextRoute) {
      document.title = 'My Christmas World | Build with Magic';
    }
  };

  if (publicRoute) {
    return <PublicInfoPage route={publicRoute} onNavigate={handleNavigate} />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(<RootRouter />);
