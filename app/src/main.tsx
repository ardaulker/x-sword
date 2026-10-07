import '../../design/tokens/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applySettings } from './game/settings';
import { bootPlatform } from './game/platform';

applySettings();
void bootPlatform(); // telefon uygulamasında Game Center / Play Games girişi; web'de bir şey yapmaz

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
