// Runs the game's <script> against a tiny fake DOM with a virtual clock.
const fs = require('fs');
const src = fs.readFileSync(process.env.GAME_FILE || require('path').join(__dirname, '..', 'index.html'), 'utf8');
const script = src.split('<script>')[1].split('</script>')[0];

class El {
  constructor(id) { this.id = id; this.children = []; this._cls = new Set(); this.dataset = {}; this.style = {}; this.listeners = {}; this._html = ''; this.innerText = ''; this.scrollTop = 0; this.scrollHeight = 0; }
  set className(v) { this._cls = new Set(v.split(/\s+/).filter(Boolean)); }
  get className() { return [...this._cls].join(' '); }
  get classList() { const s = this._cls; return { add: (...a) => a.forEach(x => s.add(x)), remove: (...a) => a.forEach(x => s.delete(x)), contains: x => s.has(x) }; }
  set innerHTML(v) { this._html = v; if (v === '') this.children = []; }
  get innerHTML() { return this._html; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, f) { this.listeners[t] = f; }
}

function makeGame() {
  const els = { board: new El('board'), logList: new El('logList'), statusBox: new El('statusBox'), clockBox: new El('clockBox'), rulesModal: new El('rulesModal') };
  const document = {
    getElementById: id => els[id],
    createElement: () => new El(),
    querySelectorAll: sel => (sel === '.cell' ? els.board.children : []),
  };
  let now = 0; const timers = [];
  const setTimeout = (fn, ms) => timers.push({ at: now + ms, fn });
  const advance = ms => {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      if (!timers.length || timers[0].at > end) break;
      const t = timers.shift(); now = t.at; t.fn();
    }
    now = end;
  };
  const window = {};
  const api = new Function('document', 'window', 'setTimeout', 'setInterval', 'clearInterval',
    script + '\nreturn { initGame, handleClick, getValidMoves, get entities(){return entities}, get greenPhase(){return greenPhase}, get isPlayerTurn(){return isPlayerTurn}, get gameOver(){return gameOver} };'
  )(document, window, setTimeout, () => 0, () => {});
  const logs = () => els.logList.children.map(c => c.innerText);
  return { api, els, advance, logs, timersLeft: () => timers.length };
}

module.exports = { makeGame };
