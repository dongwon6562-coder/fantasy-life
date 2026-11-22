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

// 같은 삶인지: 새 삶을 시작할 때 화면이 붙이는 uid. 예전 저장은 처음 태어난 사람과 태어난 해로 가린다.
export function lifeId(g) {
  if (g.uid) return g.uid;
  const first = g.life?.ancestors?.[0];
  const meP = g.people?.find((p) => p.id === g.player?.id);
  const born = first ? first.born : g.date.year - Math.floor((meP?.ageMonths ?? 0) / 12);
  return `${first?.id ?? g.player?.id}|${born}|${g.player?.familyId ?? ''}|${g.mode}`;
}

// 저장 칸 하나의 보기용 정보 (처음 화면·저장 화면)
export function infoOf(key, text, g) {
  const meP = g.people.find((p) => p.id === g.player.id);
  return {
    key, kb: Math.round(text.length * 2 / 1024),
    id: lifeId(g), name: g.player.name, lastName: g.player.lastName,
    age: Math.floor((meP?.ageMonths ?? 0) / 12), year: g.date.year, month: g.date.month,
    mode: g.mode, over: !!g.over, gen: g.life?.gen ?? 1, race: meP?.race ?? 'human',
    shelved: key.startsWith('life-') ? +key.slice(5) : null,
    savedAt: g.savedAt ?? null,
  };
}
function sumOf(g) {
  const meP = g.people.find((p) => p.id === g.player.id);
  return { name: g.player.name, year: g.date.year, month: g.date.month, age: Math.floor(meP.ageMonths / 12), mode: g.mode, over: g.over, scene: g.sceneArgs ?? null };
}
// 저장하면서 보기용 정보도 같이 적어 둔다: 다음에 켤 때 처음 화면이 저장을 풀지 않는다
function writeSave(key, game) {
  const text = encodeSave(game);
  localStorage.setItem(KEY + key, text);
  safe(() => { putInfo('info:' + key, text, infoOf(key, text, game)); if (key === 'auto') putInfo('sum:auto', text, sumOf(game)); });
}

export function autosave(game) {
  cancelSoon();
  syncId(game);
  safe(() => writeSave('auto', game));
}
// 한 달 넘기기에서는 화면을 먼저 그리고 저장은 바로 뒤에 한다 (31단계 헤드: 오래 한 판은 저장 한 번이 폰에서 0.2~0.3초).
// 저장을 읽거나 지우는 곳(load·summary·clearAuto·저장 화면), 앱이 뒤로 갈 때는 기다리던 저장을 먼저 끝낸다.
let soonGame = null, soonTimer = null;
function cancelSoon() { if (soonTimer) clearTimeout(soonTimer); soonTimer = null; soonGame = null; }
export function flushSave() { if (soonGame) autosave(soonGame); }
export function autosaveSoon(game) {
  if (typeof setTimeout === 'undefined' || typeof document === 'undefined') return autosave(game);
  soonGame = game;
  if (soonTimer) clearTimeout(soonTimer);
  soonTimer = setTimeout(flushSave, 60);
}
if (typeof document !== 'undefined') {
  try {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
    window.addEventListener('pagehide', flushSave);
  } catch { /* 옛 브라우저 */ }
}
export function saveSlot(game, slot) {
  if (game.mode !== 'free') return false;
  syncId(game);
  return safe(() => { writeSave('slot' + slot, game); return true; }, false);
}
export function load(key) {
  flushSave();
  const g = safe(() => decodeSave(localStorage.getItem(KEY + key)));
  if (g) {
    setNextId(safeNextId(g));
    runHooks('migrate', g);
  }
  return g;
}
export function summary(key) {
  flushSave();
  const text = safe(() => localStorage.getItem(KEY + key));
  if (!text) return null;
  return cachedInfo('sum:' + key, text, () => { const g = safe(() => decodeSave(text)); return g ? sumOf(g) : null; });
}

// 처음 화면은 저장 칸마다 이름·나이만 보이는데, 그걸 위해 오래 한 판 저장을 통째로 풀고 있었다 (폰에서 칸마다 0.1~0.2초).
// 풀어 본 결과를 저장 글의 지문(길이와 몇 군데 조각)과 함께 적어 두고, 저장이 그대로면 다시 풀지 않는다 (32단계 헤드).
const META = KEY + 'meta';
let metaMem = null;
const sigOf = (t) => `${t.length}:${t.slice(0, 24)}:${t.slice(t.length >> 1, (t.length >> 1) + 24)}:${t.slice(-48)}`;
const metaOf = () => (metaMem ??= safe(() => JSON.parse(localStorage.getItem(META) ?? '{}')) ?? {});
export function cachedInfo(key, text, make) {
  if (typeof localStorage === 'undefined') return make();
  const sig = sigOf(text);
  const hit = metaOf()[key];
  if (hit && hit.s === sig) return hit.v;
  const v = make();
  putInfo(key, text, v, sig);
  return v;
}
function putInfo(key, text, v, sig = sigOf(text)) {
  if (typeof localStorage === 'undefined') return;
  if (v && !v.broken) {
    metaMem = metaOf();
    metaMem[key] = { s: sig, v };
    // 없어진 칸의 기록은 지운다
    const have = new Set(safe(() => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)), []));
    for (const k of Object.keys(metaMem)) if (!have.has(KEY + k.replace(/^[a-z]+:/, ''))) delete metaMem[k];
    safe(() => localStorage.setItem(META, JSON.stringify(metaMem)));
  }
  return v;
}
export function clearAuto() { cancelSoon(); safe(() => localStorage.removeItem(KEY + 'auto')); }
