// 저장과 불러오기. 한 번뿐인 삶은 자동 저장 하나뿐, 자유 모드는 칸 세 개를 더 쓴다.
import { setNextId } from './npc.js';
import { run as runHooks } from './hooks.js';
import { encodeSave, decodeSave } from './pack.js';
export { encodeSave, decodeSave };

const KEY = 'fantasy-life:';
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

export function autosave(game) {
  safe(() => localStorage.setItem(KEY + 'auto', encodeSave(game)));
}
export function saveSlot(game, slot) {
  if (game.mode !== 'free') return false;
  return safe(() => { localStorage.setItem(KEY + 'slot' + slot, encodeSave(game)); return true; }, false);
}
export function load(key) {
  const g = safe(() => decodeSave(localStorage.getItem(KEY + key)));
  if (g) {
    setNextId(g.nextId ?? 1 + Math.max(...g.people.map((p) => p.id)));
    runHooks('migrate', g);
  }
  return g;
}
export function summary(key) {
  const g = safe(() => decodeSave(localStorage.getItem(KEY + key)));
  if (!g) return null;
  const meP = g.people.find((p) => p.id === g.player.id);
  return { name: g.player.name, year: g.date.year, month: g.date.month, age: Math.floor(meP.ageMonths / 12), mode: g.mode, over: g.over };
}
export function clearAuto() { safe(() => localStorage.removeItem(KEY + 'auto')); }
