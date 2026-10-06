import { useEffect, useState } from 'react';
import { DEFAULT_SETUP, GameController } from './game/controller';
import type { Setup } from './game/controller';
import { GameScreen } from './screens/GameScreen';
import { MainMenu } from './screens/MainMenu';

const SETUP_KEY = 'xsword-app-setup';

function loadSetup(): Setup {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
    if (s && [1, 2, 3, 4].includes(s.players) && ['kolay', 'normal', 'zor'].includes(s.level)) return { ...DEFAULT_SETUP, ...s };
  } catch {
    // Kayıt yoksa ya da bozuksa varsayılanla başla.
  }
  return DEFAULT_SETUP;
}

function saveSetup(s: Setup) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(s));
  } catch {
    // Gizli sekmede kayıt tutulamayabilir; oyun yine çalışır.
  }
}

// Ekranlar adres çubuğundaki #/ ile seçilir; telefonun geri tuşu menüye döndürür.
type Screen = 'menu' | 'oyun';
const readScreen = (): Screen => (location.hash === '#/oyun' ? 'oyun' : 'menu');
const go = (s: Screen) => { location.hash = s === 'menu' ? '/' : `/${s}`; };

export function App() {
  const [ctl] = useState(() => new GameController(loadSetup()));
  const [screen, setScreen] = useState<Screen>(readScreen);
  if (import.meta.env.DEV) (window as unknown as { xsword: GameController }).xsword = ctl;

  useEffect(() => {
    const onHash = () => setScreen(readScreen());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Oyun ekranına girince maç başlar, çıkınca durur.
  useEffect(() => {
    if (screen !== 'oyun') return;
    ctl.newGame(ctl.setup);
    return () => ctl.dispose();
  }, [ctl, screen]);

  const start = (s: Setup) => {
    saveSetup(s);
    if (screen === 'oyun') ctl.newGame(s);
    else { ctl.setup = s; go('oyun'); }
  };

  if (screen === 'oyun') return <GameScreen ctl={ctl} onNewGame={start} onHome={() => go('menu')} />;
  return <MainMenu setup={ctl.setup} onStart={start} />;
}
