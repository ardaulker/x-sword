// Building a match: the createGame options for the chosen setup, the state they make, and the view a match starts with.
// Pure functions; the controller keeps the options so a save or a replay link can rebuild the same match.

import { RULES_VERSION, createGame, createPuzzle } from '../../../engine/rules.js';
import type { GameState } from '../../../engine/rules.js';
import { DAILY, seedOf } from './daily';
import { PUZZLES } from './puzzles';
import type { Opts } from './record';
import { ME } from './names';
import type { Setup, View } from './controllerTypes';

export function buildOpts(s: Setup): Opts {
    if (s.puzzle != null) {
      const def = PUZZLES.find(p => p.id === s.puzzle) ?? PUZZLES[0];
      return { rules: RULES_VERSION, puzzle: { map: def.map, limit: def.par + 1, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink ?? null } };
    }
    if (s.daily) return { rules: RULES_VERSION, seats: [{ kind: 'human' }], neutralLevel: 'normal', seed: seedOf(s.daily), size: DAILY.boardSize, neutrals: DAILY.bots };
    const seats = Array.from({ length: s.players }, (_, i) =>
      i === ME ? { kind: 'human' } : { kind: 'bot', level: s.aiLevel });
    // On Easy you move first; on Normal and Hard your place in the order is random too.
    return {
      rules: RULES_VERSION, seats, neutralLevel: s.level, seed: Math.floor(Math.random() * 2 ** 31), firstSeat: s.level === 'easy' ? ME : null, keepGoing: true,
      size: s.boardSize, neutrals: s.bots,
      personas: s.players > 1 && !!s.personas, obstacles: !!s.obstacles, teams: s.players === 4 && !!s.teams,
      shrink: s.shrink ?? 'classic',
    };
}

export function makeState(o: Opts): GameState {
    return (o.puzzle ? createPuzzle({ ...(o.puzzle as object), rules: o.rules } as unknown as Parameters<typeof createPuzzle>[0]) : createGame(o as unknown as Parameters<typeof createGame>[0])) as GameState;
}

// The clock is frozen at 00:00 (clockEnd = clockStart) until GameController.startClock.
export function freshView(setup: Setup): View {
    return {
      phase: 'ready', sel: null, showThreats: false, timer: setup.moveSeconds,
      trails: [], lastMoves: [], bursts: [], slashes: [], floats: [], toast: null, banner: null, modeOverlay: false, sheet: null, inspect: null, bonus: null,
      bots: { done: 0, total: 0, currentId: null }, events: [],
      clockStart: Date.now(), clockEnd: Date.now(), watching: false, shake: 0, fall: null, hit: 0, countdown: null, version: 0,
    };
}
