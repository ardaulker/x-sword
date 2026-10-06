const { makeGame } = require('./harness');
const cls = (g, r, c) => [...g.els.board.children[r * 9 + c]._cls].filter(x => x !== 'cell');

// A. On the player's turn their moves are lit without hovering: green walk, red capture
{
  const g = makeGame(); g.api.initGame();
  const P = g.api.entities.find(e => e.id === 'P');
  const lit = g.api.getValidMoves(P, g.api.greenPhase).map(m => `${m.type}:${cls(g, m.r, m.c)}`);
  console.log('A) player moves lit at start:', [...new Set(lit)]);
  // inspecting a bot paints its walk cells orange
  const bot = g.api.entities.find(e => e.type === 'red' && g.api.getValidMoves(e, 'DUZ').some(m => m.type === 'walk'));
  g.els.board.children[bot.r * 9 + bot.c].listeners.mouseenter();
  const botLit = g.api.getValidMoves(bot, g.api.greenPhase).map(m => `${m.type}:${cls(g, m.r, m.c)}`);
  console.log('   bot inspected:', [...new Set(botLit)]);
  g.els.board.children[bot.r * 9 + bot.c].listeners.mouseleave();
  const back = g.api.getValidMoves(P, g.api.greenPhase).map(m => `${m.type}:${cls(g, m.r, m.c)}`);
  console.log('   after leaving the bot:', [...new Set(back)]);
}

// B. Dead bots are skipped: a round with all but bot 17 dead takes 500ms + 200ms, not 500 + 17*200
{
  const g = makeGame(); g.api.initGame();
  g.api.entities.forEach(e => { if (e.id !== 'P' && e.id !== 17) e.alive = false; });
  const bot = g.api.entities.find(e => e.id === 17);
  const P = g.api.entities.find(e => e.id === 'P');
  // park bot 17 far away so the round cannot end the game
  bot.r = 0; bot.c = 0; P.r = 8; P.c = 8;
  const m = g.api.getValidMoves(P, g.api.greenPhase).find(x => x.type === 'walk');
  g.api.handleClick(m.r, m.c);
  g.advance(700);
  console.log('B) round over after 700ms with 16 dead bots:', g.api.isPlayerTurn);
}

// C. Log wording over many games
{
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const g = makeGame(); g.api.initGame();
    let r = 0;
    while (!g.api.gameOver && r++ < 60) {
      const P = g.api.entities.find(e => e.id === 'P');
      const ms = g.api.getValidMoves(P, g.api.greenPhase);
      const m = ms.find(x => x.type === 'attack') || ms[Math.floor(Math.random() * ms.length)];
      g.api.handleClick(m.r, m.c); g.advance(10000);
    }
    g.logs().forEach(l => seen.add(l.replace(/\d+ numara/g, 'N numara')));
  }
  console.log('C) distinct log lines:\n   ' + [...seen].sort().join('\n   '));
}
