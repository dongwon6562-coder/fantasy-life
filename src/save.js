// 저장과 불러오기. 한 번뿐인 삶은 자동 저장 하나뿐, 자유 모드는 칸 세 개를 더 쓴다.
import { setNextId, getNextId } from './npc.js';
import { run as runHooks } from './hooks.js';
import { encodeSave, decodeSave } from './pack.js';
export { encodeSave, decodeSave };

const KEY = 'fantasy-life:';
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

// 사람 번호: 달 끝이 아니라 장면을 고르다 새 사람이 생겨도 저장에 지금 번호가 들어가게 (헤드 16단계)
const syncId = (game) => { game.nextId = Math.max(game.nextId ?? 0, getNextId()); };
// 불러올 때는 저장된 번호와 실제 가장 큰 번호 중 큰 쪽 다음부터 (예전 저장은 번호가 뒤처져 있을 수 있다)
export const safeNextId = (g) => Math.max(g.nextId ?? 0, 1 + Math.max(0, ...g.people.map((p) => p.id ?? 0)));

export function autosave(game) {
  syncId(game);
  safe(() => localStorage.setItem(KEY + 'auto', encodeSave(game)));
}
export function saveSlot(game, slot) {
  if (game.mode !== 'free') return false;
  syncId(game);
  return safe(() => { localStorage.setItem(KEY + 'slot' + slot, encodeSave(game)); return true; }, false);
}
export function load(key) {
  const g = safe(() => decodeSave(localStorage.getItem(KEY + key)));
  if (g) {
    setNextId(safeNextId(g));
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
