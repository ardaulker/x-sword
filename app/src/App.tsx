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
    if (s && [1, 2, 3, 4].includes(s.players) && ['kolay', 'normal', 'zor'].includes(s.level)) {
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
type Screen = 'menu' | 'oyun' | 'kurallar' | 'ayarlar' | 'cok' | 'oda' | 'mac' | 'katil' | 'istatistik' | 'bulmaca' | 'izle' | 'profil';
const SCREENS: Screen[] = ['oyun', 'kurallar', 'ayarlar', 'cok', 'oda', 'mac', 'istatistik', 'bulmaca', 'profil'];
function readScreen(): Screen {
  const h = location.hash.replace(/^#\//, '');
  if (h.startsWith('katil/')) return 'katil';
  if (h.startsWith('izle/')) return 'izle';
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
    if (screen !== 'oyun') return;
    if (ctl.canResume) ctl.unpark(); else ctl.newGame(ctl.setup);
    return () => { ctl.leave(); setTick(n => n + 1); }; // menüde "Devam et" görünsün
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
    if (!s.daily && s.puzzle == null) saveSetup(s);
    if (screen === 'oyun') ctl.newGame(s);
    else { ctl.discardParked(); ctl.setup = s; go('oyun'); }
  };

  const hostRoom = room instanceof HostRoom ? room : null;

  if (screen === 'oyun') return <GameScreen ctl={ctl} onNewGame={start} onHome={() => go('menu')} onPuzzles={() => go('bulmaca')} />;
  if (screen === 'istatistik') return <StatsScreen onBack={() => go('menu')} />;
  if (screen === 'profil') return <ProfileScreen onBack={() => go('menu')} onStats={() => go('istatistik')} />;
  if (screen === 'bulmaca') {
    return <PuzzleScreen onBack={() => go('menu')} onPick={id => start({ ...ctl.setup, players: 1, daily: null, puzzle: id })} />;
  }
  if (screen === 'izle') return <ReplayScreen code={location.hash.replace(/^#\/izle\//, '')} onBack={() => go('menu')} />;
  if (screen === 'kurallar') return <RulesScreen onBack={() => go('menu')} />;
  if (screen === 'ayarlar') return <SettingsScreen onBack={() => go('menu')} onRules={() => go('kurallar')} />;
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
  return <MainMenu setup={ctl.setup} onStart={start} onResume={ctl.canResume ? () => go('oyun') : undefined} resumeInfo={ctl.canResume ? ctl.resumeInfo : undefined}
    onPuzzles={() => go('bulmaca')} onStats={() => go('istatistik')} onProfile={() => go('profil')} onTutorial={() => start({ ...ctl.setup, players: 1, daily: null, puzzle: 201 })}
    onDaily={() => start({ ...ctl.setup, players: 1, level: 'normal', daily: todayKey(), puzzle: null })} onRules={() => go('kurallar')} onMultiplayer={() => go('cok')} onSettings={() => go('ayarlar')} />;
}
