import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DEFAULT_SETUP, GameController } from './game/controller';
import type { Setup } from './game/controller';
import { GuestRoom, HostRoom } from './net/room';
import type { AnyRoom } from './net/room';
import { isCode } from './net/protocol';
import { GameScreen } from './screens/GameScreen';
import { LobbyScreen, MultiplayerEntry } from './screens/Lobby';
import { MainMenu } from './screens/MainMenu';
import { RulesScreen } from './screens/RulesScreen';

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

// Ekranlar adres çubuğundaki #/ ile seçilir; telefonun geri tuşu bir önceki ekrana döndürür.
// #/katil/KOD davet linkidir: açınca o odaya katılır.
type Screen = 'menu' | 'oyun' | 'kurallar' | 'cok' | 'oda' | 'mac' | 'katil';
const SCREENS: Screen[] = ['oyun', 'kurallar', 'cok', 'oda', 'mac'];
function readScreen(): Screen {
  const h = location.hash.replace(/^#\//, '');
  if (h.startsWith('katil/')) return 'katil';
  return SCREENS.find(s => s === h) ?? 'menu';
}
const go = (s: Screen, replace = false) => {
  const hash = s === 'menu' ? '#/' : `#/${s}`;
  if (replace) { history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  else location.hash = hash;
};

const noRoom = { subscribe: () => () => {}, getSnapshot: () => null };

export function App() {
  const [ctl] = useState(() => new GameController(loadSetup()));
  const [screen, setScreen] = useState<Screen>(readScreen);
  const [room, setRoom] = useState<AnyRoom | null>(null);
  if (import.meta.env.DEV) (window as unknown as { xsword: GameController }).xsword = ctl;
  const roomView = useSyncExternalStore(room?.subscribe ?? noRoom.subscribe, room?.getSnapshot ?? noRoom.getSnapshot);

  useEffect(() => {
    const onHash = () => setScreen(readScreen());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Tek cihazda oyun: ekrana girince maç başlar, çıkınca durur.
  useEffect(() => {
    if (screen !== 'oyun') return;
    ctl.newGame(ctl.setup);
    return () => ctl.dispose();
  }, [ctl, screen]);

  // Oda ekranlarından (lobi, maç) başka bir ekrana geçince oda kapanır. Yalnız ekran değişince bakılır:
  // oda, adres değişmeden hemen önce kurulur.
  const roomRef = useRef(room);
  roomRef.current = room;
  const joined = useRef('');
  useEffect(() => {
    if (screen === 'oda' || screen === 'mac' || screen === 'katil' || !roomRef.current) return;
    roomRef.current.close();
    setRoom(null);
    joined.current = '';
  }, [screen]);

  // Davet linki: odaya katıl ve lobiye geç. Kod ekran çizilirken okunur; katılma bir kez olur.
  const joinCode = screen === 'katil' ? location.hash.replace(/^#\/katil\//, '').toUpperCase() : '';
  useEffect(() => {
    if (!joinCode || joined.current === joinCode) return;
    joined.current = joinCode;
    if (isCode(joinCode)) { roomRef.current?.close(); setRoom(new GuestRoom(ctl, joinCode)); go('oda', true); }
    else go('cok', true);
  }, [ctl, joinCode]);

  // Odasız lobi ya da maç adresi açılırsa geri gönder; maç başlayınca ya da lobiye dönülünce ekran izler.
  useEffect(() => {
    if (!room) {
      if (screen === 'oda') go('cok', true);
      if (screen === 'mac') go('menu', true);
      return;
    }
    if (roomView?.status === 'playing' && screen === 'oda') go('mac');
    if (roomView?.status === 'lobby' && screen === 'mac') go('oda', true);
  }, [room, roomView?.status, screen]);

  const start = (s: Setup) => {
    saveSetup(s);
    if (screen === 'oyun') ctl.newGame(s);
    else { ctl.setup = s; go('oyun'); }
  };

  const hostRoom = room instanceof HostRoom ? room : null;

  if (screen === 'oyun') return <GameScreen ctl={ctl} onNewGame={start} onHome={() => go('menu')} />;
  if (screen === 'kurallar') return <RulesScreen onBack={() => go('menu')} />;
  if (screen === 'mac' && room) {
    return (
      <GameScreen
        ctl={ctl} onNewGame={start} onHome={() => go('menu')}
        net={{ onLeave: () => go('menu'), onRematch: hostRoom ? () => hostRoom.backToLobby() : undefined }}
      />
    );
  }
  if (screen === 'oda' && room) {
    return <LobbyScreen room={room} onLeave={() => go('cok')} onStart={() => hostRoom?.start(ctl.setup.moveSeconds)} />;
  }
  if (screen === 'cok') {
    return (
      <MultiplayerEntry
        error=""
        onBack={() => go('menu')}
        onHost={() => { room?.close(); setRoom(new HostRoom(ctl, ctl.setup.level)); go('oda'); }}
        onJoin={code => { room?.close(); setRoom(new GuestRoom(ctl, code)); go('oda'); }}
      />
    );
  }
  return <MainMenu setup={ctl.setup} onStart={start} onRules={() => go('kurallar')} onMultiplayer={() => go('cok')} />;
}
