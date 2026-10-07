import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DEFAULT_SETUP, GameController } from './game/controller';
import type { Setup } from './game/controller';
import { todayKey } from './game/daily';
import { GuestRoom, HostRoom } from './net/room';
import type { AnyRoom } from './net/room';
import { isCode } from './net/protocol';
import { GameScreen } from './screens/GameScreen';
import { LobbyScreen, MultiplayerEntry } from './screens/Lobby';
import { MainMenu } from './screens/MainMenu';
import { RulesScreen } from './screens/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';
import { PuzzleScreen } from './screens/PuzzleScreen';
import { ReplayScreen } from './screens/ReplayScreen';
import { ProfileScreen } from './screens/ProfileScreen';

const SETUP_KEY = 'xsword-app-setup';

function loadSetup(): Setup {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
    if (s && [1, 2, 3, 4].includes(s.players) && ['easy', 'normal', 'hard'].includes(s.level)) {
      // Eski sürümden kalan kayıtta tahta/bot sayısı oyuncu sayısına göre seçilmemişti: varsayılana dön.
      return s.aiLevel ? { ...DEFAULT_SETUP, ...s } : { ...DEFAULT_SETUP, players: s.players, level: s.level };
    }
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
type Screen = 'menu' | 'play' | 'rules' | 'settings' | 'multiplayer' | 'room' | 'match' | 'join' | 'stats' | 'puzzles' | 'replay' | 'profile';
const SCREENS: Screen[] = ['play', 'rules', 'settings', 'multiplayer', 'room', 'match', 'stats', 'puzzles', 'profile'];
function readScreen(): Screen {
  const h = location.hash.replace(/^#\//, '');
  if (h.startsWith('katil/')) return 'join';
  if (h.startsWith('izle/')) return 'replay';
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
  const [, setTick] = useState(0);
  if (import.meta.env.DEV) (window as unknown as { xsword: GameController }).xsword = ctl;
  const roomView = useSyncExternalStore(room?.subscribe ?? noRoom.subscribe, room?.getSnapshot ?? noRoom.getSnapshot);

  useEffect(() => {
    const onHash = () => setScreen(readScreen());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Tek cihazda oyun: ekrana girince maç başlar (saklanan varsa sürer), çıkınca duraklatılıp saklanır.
  useEffect(() => {
    if (screen !== 'play') return;
    if (ctl.canResume) ctl.unpark(); else ctl.newGame(ctl.setup);
    return () => { ctl.leave(); setTick(n => n + 1); }; // menüde "Devam et" görünsün
  }, [ctl, screen]);

  // Oda ekranlarından (lobi, maç) başka bir ekrana geçince oda kapanır. Yalnız ekran değişince bakılır:
  // oda, adres değişmeden hemen önce kurulur.
  const roomRef = useRef(room);
  roomRef.current = room;
  const joined = useRef('');
  useEffect(() => {
    if (screen === 'room' || screen === 'match' || screen === 'join' || !roomRef.current) return;
    roomRef.current.close();
    setRoom(null);
    joined.current = '';
  }, [screen]);

  // Davet linki: odaya katıl ve lobiye geç. Kod ekran çizilirken okunur; katılma bir kez olur.
  const joinCode = screen === 'join' ? location.hash.replace(/^#\/katil\//, '').toUpperCase() : '';
  useEffect(() => {
    if (!joinCode || joined.current === joinCode) return;
    joined.current = joinCode;
    if (isCode(joinCode)) { roomRef.current?.close(); setRoom(new GuestRoom(ctl, joinCode)); go('room', true); }
    else go('multiplayer', true);
  }, [ctl, joinCode]);

  // Odasız lobi ya da maç adresi açılırsa geri gönder; maç başlayınca ya da lobiye dönülünce ekran izler.
  useEffect(() => {
    if (!room) {
      if (screen === 'room') go('multiplayer', true);
      if (screen === 'match') go('menu', true);
      return;
    }
    if (roomView?.status === 'playing' && screen === 'room') go('match');
    if (roomView?.status === 'lobby' && screen === 'match') go('room', true);
  }, [room, roomView?.status, screen]);

  const start = (s: Setup) => {
    if (!s.daily && s.puzzle == null) saveSetup(s);
    if (screen === 'play') ctl.newGame(s);
    else { ctl.discardParked(); ctl.setup = s; go('play'); }
  };

  const hostRoom = room instanceof HostRoom ? room : null;

  if (screen === 'play') return <GameScreen ctl={ctl} onNewGame={start} onHome={() => go('menu')} onPuzzles={() => go('puzzles')} />;
  if (screen === 'stats') return <StatsScreen onBack={() => go('menu')} />;
  if (screen === 'profile') return <ProfileScreen onBack={() => go('menu')} onStats={() => go('stats')} />;
  if (screen === 'puzzles') {
    return <PuzzleScreen onBack={() => go('menu')} onPick={id => start({ ...ctl.setup, players: 1, daily: null, puzzle: id })} />;
  }
  if (screen === 'replay') return <ReplayScreen code={location.hash.replace(/^#\/izle\//, '')} onBack={() => go('menu')} />;
  if (screen === 'rules') return <RulesScreen onBack={() => go('menu')} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => go('menu')} onRules={() => go('rules')} />;
  if (screen === 'match' && room) {
    return (
      <GameScreen
        ctl={ctl} onNewGame={start} onHome={() => go('menu')}
        net={{ onLeave: () => go('menu'), onRematch: hostRoom ? () => hostRoom.backToLobby() : undefined }}
      />
    );
  }
  if (screen === 'room' && room) {
    return <LobbyScreen room={room} onLeave={() => go('multiplayer')} onStart={() => hostRoom?.start(ctl.setup.moveSeconds)} />;
  }
  if (screen === 'multiplayer') {
    return (
      <MultiplayerEntry
        error=""
        onBack={() => go('menu')}
        onHost={() => { room?.close(); setRoom(new HostRoom(ctl, ctl.setup.level)); go('room'); }}
        onJoin={code => { room?.close(); setRoom(new GuestRoom(ctl, code)); go('room'); }}
      />
    );
  }
  return <MainMenu setup={ctl.setup} onStart={start} onResume={ctl.canResume ? () => go('play') : undefined} resumeInfo={ctl.canResume ? ctl.resumeInfo : undefined}
    onPuzzles={() => go('puzzles')} onStats={() => go('stats')} onProfile={() => go('profile')} onTutorial={() => start({ ...ctl.setup, players: 1, daily: null, puzzle: 201 })}
    onDaily={() => start({ ...ctl.setup, players: 1, level: 'normal', daily: todayKey(), puzzle: null })} onRules={() => go('rules')} onMultiplayer={() => go('multiplayer')} onSettings={() => go('settings')} />;
}
