// Players you blocked (by display name, kept on this device only). A blocked player's name is replaced by "Blocked player"
// in rooms and matches, and the rooms they host are left out of the public lobby list.
// Names are all the game knows about another player (no account, no id), so this is a convenience, not a ban.

const KEY = 'xsword-blocked';
const norm = (name: string) => name.trim().toLocaleLowerCase();

const read = (): string[] => { try { const d = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return Array.isArray(d) ? d.filter(x => typeof x === 'string') : []; } catch { return []; } };
const write = (list: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-200))); } catch { /* private tab */ } };

export const blockedNames = () => read();
export const isBlocked = (name: string | null | undefined) => !!name && read().includes(norm(name));
export function block(name: string) { const n = norm(name); if (n && !read().includes(n)) write([...read(), n]); }
export function unblock(name: string) { write(read().filter(x => x !== norm(name))); }
