const { makeGame } = require('./harness');

// 1. Status bar text after start
{
  const g = makeGame(); g.api.initGame();
  console.log('1) Status bar after start:', JSON.stringify(g.els.statusBox.innerHTML));
}

// 2. Restart while bots are still moving
{
  const g = makeGame(); g.api.initGame();
  const p = g.api.entities.find(e => e.id === 'P');
  const m = g.api.getValidMoves(p, g.api.greenPhase)[0];
  g.api.handleClick(m.r, m.c);
  g.advance(1000);                  // bots 1..3 have moved
  g.api.initGame();                 // player presses "Restart"
  const before = g.api.greenPhase;
  g.advance(5000);                  // player has NOT moved in the new game
  console.log('2) Restart mid-round: phase', before, '->', g.api.greenPhase,
    '| new-game log:', JSON.stringify(g.logs()));
}

// 3. Many games: random player vs. "pick a move no bot can hit next" player
function playerSafeMoves(api, moves) {
  // a move is "safe" if no living bot could attack that square right after,
  // assuming the board stays as it is (ignores bots moving first)
  return moves.filter(m => {
    const snapshot = api.entities.map(e => ({ ...e }));
    const P = api.entities.find(e => e.id === 'P');
    const old = { r: P.r, c: P.c };
    const victim = m.target; if (victim) victim.alive = false;
    P.r = m.r; P.c = m.c;
    const threatened = api.entities.some(b => b.id !== 'P' && b.alive &&
      api.getValidMoves(b, api.greenPhase).some(x => x.type === 'attack' && x.target.id === 'P'));
    P.r = old.r; P.c = old.c; if (victim) victim.alive = true;
    return !threatened;
  });
}

function sim(policy, N) {
  let wins = 0, rounds = 0, playerKills = 0, botKills = 0, brokenLog = 0, killer = {};
  for (let i = 0; i < N; i++) {
    const g = makeGame(); g.api.initGame();
    let r = 0;
    while (!g.api.gameOver && r < 500) {
      const P = g.api.entities.find(e => e.id === 'P');
      let moves = g.api.getValidMoves(P, g.api.greenPhase);
      if (policy === 'smart') {
        const attacks = moves.filter(x => x.type === 'attack');
        const safe = playerSafeMoves(g.api, moves);
        const safeAttacks = safe.filter(x => x.type === 'attack');
        moves = safeAttacks.length ? safeAttacks : safe.length ? safe : attacks.length ? attacks : moves;
      }
      const m = moves[Math.floor(Math.random() * moves.length)];
      g.api.handleClick(m.r, m.c);
      g.advance(10000); r++;
    }
    const L = g.logs();
    for (const l of L) {
      if (!l.startsWith('⚔️')) continue;
      if (l.startsWith('⚔️ You took')) playerKills++; else botKills++;
      if (l.includes('{entity.num}')) brokenLog++;
      if (l.endsWith('took you!')) {
        const who = l.includes('Twin') ? 'twin' : 'bot';
        const dead = g.api.entities.find(e => e.id === 'P');
        // find the killer by position
        const k = g.api.entities.find(e => e.id !== 'P' && e.alive && e.r === dead.r && e.c === dead.c);
        const t = k ? k.type : who; killer[t] = (killer[t] || 0) + 1;
      }
    }
    if (g.api.entities.find(e => e.id === 'P').alive) wins++;
    rounds += r;
  }
  console.log(`3) ${policy} player, ${N} games: win ${(100 * wins / N).toFixed(1)}%,`,
    `avg rounds ${(rounds / N).toFixed(1)}, kills/game: player ${(playerKills / N).toFixed(1)}, bots ${(botKills / N).toFixed(1)},`,
    `broken kill lines ${brokenLog}, killed by`, killer);
}
sim('random', 2000);
sim('smart', 2000);
