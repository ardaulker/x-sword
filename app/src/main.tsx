import '../../design/tokens/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applySettings } from './game/settings';
import { bootPlatform } from './game/platform';

applySettings();
void bootPlatform(); // Game Center / Play Games sign-in in the phone app; does nothing on the web

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
