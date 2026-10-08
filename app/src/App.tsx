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
import { legacyLevel } from './game/legacy';

const SETUP_KEY = 'xsword-app-setup';

function loadSetup(): Setup {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
    if (s) { s.level = legacyLevel(s.level ?? ''); if (s.aiLevel) s.aiLevel = legacyLevel(s.aiLevel); }
    if (s && [1, 2, 3, 4].includes(s.players) && ['easy', 'normal', 'hard'].includes(s.level)) {
      // A save from an old version had no per-player-count board/bot choice: fall back to the defaults.
      return s.aiLevel ? { ...DEFAULT_SETUP, ...s } : { ...DEFAULT_SETUP, players: s.players, level: s.level };
    }
  } catch {
    // No save, or a broken one: start with the defaults.
  }
  return DEFAULT_SETUP;
}

function saveSetup(s: Setup) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(s));
  } catch {
    // A private tab may not keep saves; the game still works.
  }
}

// Screens are chosen by the #/ in the address bar; the phone's back button returns to the previous screen.
// #/join/CODE is an invite link: opening it joins that room. #/replay/CODE opens a replay.
// Links shared before the English rename use the old Turkish paths; they still work (LEGACY).
type Screen = 'menu' | 'play' | 'rules' | 'settings' | 'multiplayer' | 'room' | 'match' | 'join' | 'stats' | 'puzzles' | 'replay' | 'profile';
const SCREENS: Screen[] = ['play', 'rules', 'settings', 'multiplayer', 'room', 'match', 'stats', 'puzzles', 'profile'];
const LEGACY: Record<string, Screen> = {
  oyun: 'play', kurallar: 'rules', ayarlar: 'settings', cok: 'multiplayer', oda: 'room', mac: 'match',
  istatistik: 'stats', bulmaca: 'puzzles', profil: 'profile', katil: 'join', izle: 'replay',
};
// The route and its argument (invite or replay code): "join/ABCDE" → ['join', 'ABCDE'].
function readRoute(): [Screen, string] {
  const [head, ...rest] = location.hash.replace(/^#\//, '').split('/');
  const s = (LEGACY[head] ?? head) as Screen;
  if (s === 'join' || s === 'replay') return [s, rest.join('/')];
  return [SCREENS.includes(s) ? s : 'menu', ''];
}
const readScreen = () => readRoute()[0];
const go = (s: Screen, replace = false) => {
  const hash = s === 'menu' ? '#/' : `#/${s}`;
  if (replace) { history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  else location.hash = hash;
};

const noRoom = { subscribe: () => () => {}, getSnapshot: () => null };

export function App() {
  const [ctl] = useState(() => new GameController(loadSetup()));
  // The last "New game" setup: "Quick match" repeats it (a puzzle or daily start changes ctl.setup, but not this).
  const [lastSetup, setLastSetup] = useState(loadSetup);
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

  // Single-device game: entering the screen starts the match (or resumes a kept one); leaving pauses and keeps it.
  useEffect(() => {
    if (screen !== 'play') return;
    if (ctl.canResume) ctl.unpark(); else ctl.newGame(ctl.setup);
    return () => { ctl.leave(); setTick(n => n + 1); }; // so "Continue" shows on the menu
  }, [ctl, screen]);

  // Leaving the room screens (lobby, match) for another screen closes the room. Only screen changes are checked:
  // the room is created right before the address changes.
  const roomRef = useRef(room);
  roomRef.current = room;
  const joined = useRef('');
  useEffect(() => {
    if (screen === 'room' || screen === 'match' || screen === 'join' || !roomRef.current) return;
    roomRef.current.close();
    setRoom(null);
    joined.current = '';
  }, [screen]);

  // Invite link: join the room and go to the lobby. The code is read while rendering; joining happens once.
  const joinCode = screen === 'join' ? readRoute()[1].toUpperCase() : '';
  useEffect(() => {
    if (!joinCode || joined.current === joinCode) return;
    joined.current = joinCode;
    if (isCode(joinCode)) { roomRef.current?.close(); setRoom(new GuestRoom(ctl, joinCode)); go('room', true); }
    else go('multiplayer', true);
  }, [ctl, joinCode]);

  // A lobby or match address without a room goes back; the screen follows when the match starts or returns to the lobby.
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
    if (!s.daily && s.puzzle == null) { saveSetup(s); setLastSetup(s); }
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
  if (screen === 'replay') return <ReplayScreen code={readRoute()[1]} onBack={() => go('menu')} />;
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
  return <MainMenu setup={lastSetup} onStart={start} onResume={ctl.canResume ? () => go('play') : undefined} resumeInfo={ctl.canResume ? ctl.resumeInfo : undefined}
    onPuzzles={() => go('puzzles')} onStats={() => go('stats')} onProfile={() => go('profile')} onTutorial={() => start({ ...ctl.setup, players: 1, daily: null, puzzle: 201 })}
    onDaily={() => start({ ...ctl.setup, players: 1, level: 'normal', daily: todayKey(), puzzle: null })} onMultiplayer={() => go('multiplayer')} onSettings={() => go('settings')} />;
}
