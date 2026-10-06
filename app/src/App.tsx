import { useEffect, useState } from 'react';
import { DEFAULT_SETUP, GameController } from './game/controller';
import type { Setup } from './game/controller';
import { GameScreen } from './screens/GameScreen';

const SETUP_KEY = 'xsword-app-setup';

function loadSetup(): Setup {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
    if (s && [2, 3, 4].includes(s.players) && ['kolay', 'normal', 'zor'].includes(s.level)) return { ...DEFAULT_SETUP, ...s };
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

export function App() {
  const [ctl] = useState(() => new GameController(loadSetup()));
  if (import.meta.env.DEV) (window as unknown as { xsword: GameController }).xsword = ctl;

  useEffect(() => {
    ctl.start();
    return () => ctl.dispose();
  }, [ctl]);

  const newGame = (s: Setup) => {
    saveSetup(s);
    ctl.newGame(s);
  };

  return <GameScreen ctl={ctl} onNewGame={newGame} />;
}
