// 저장 칸 관리 (처음 화면과 설정 화면). save.js의 저장 형식은 그대로 쓰고, 칸을 늘리고 보관만 더한다.
// - 'auto': 지금 하는 삶의 자동 저장 (한 번뿐인 삶은 이것 하나뿐)
// - 'life-<시각>': 새 삶을 시작하거나 다른 삶을 불러올 때, 하던 삶을 지우지 않고 옮겨 두는 칸.
//   한 번뿐인 삶도 그 삶의 '하나뿐인 저장'이 자리만 옮기는 것이라 되돌리기는 생기지 않는다(복사본을 남기지 않는다).
// - 'slot1'~'slot6': 자유 모드에서 손으로 저장하는 칸.
import { load, saveSlot, decodeSave, flushSave } from '../save.js';

const KEY = 'fantasy-life:';
export const SLOT_COUNT = 6;
const QUOTA = 5 * 1024 * 1024; // 브라우저·폰 앱 저장 공간은 대개 5MB 안팎
const ls = () => { try { flushSave(); return window.localStorage; } catch { return null; } }; // 기다리던 자동 저장을 먼저 끝낸다 (save.js autosaveSoon)
const raw = (k) => { try { return ls()?.getItem(KEY + k) ?? null; } catch { return null; } };

// 같은 삶인지: 새 삶을 시작할 때 화면이 붙이는 uid. 예전 저장은 처음 태어난 사람과 태어난 해로 가린다.
export function lifeId(g) {
  if (g.uid) return g.uid;
  const first = g.life?.ancestors?.[0];
  const meP = g.people?.find((p) => p.id === g.player?.id);
  const born = first ? first.born : g.date.year - Math.floor((meP?.ageMonths ?? 0) / 12);
  return `${first?.id ?? g.player?.id}|${born}|${g.player?.familyId ?? ''}|${g.mode}`;
}
export const newUid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

function info(key, text) {
  try {
    const g = decodeSave(text);
    const meP = g.people.find((p) => p.id === g.player.id);
    return {
      key, kb: Math.round(text.length * 2 / 1024),
      id: lifeId(g), name: g.player.name, lastName: g.player.lastName,
      age: Math.floor((meP?.ageMonths ?? 0) / 12), year: g.date.year, month: g.date.month,
      mode: g.mode, over: !!g.over, gen: g.life?.gen ?? 1, race: meP?.race ?? 'human',
      shelved: key.startsWith('life-') ? +key.slice(5) : null,
      savedAt: g.savedAt ?? null,
    };
  } catch { return { key, broken: true, kb: Math.round(text.length * 2 / 1024) }; }
}

/** 저장된 모든 칸. auto, 보관된 삶(최근 것부터), 손 저장 칸 순서. */
export function listSaves() {
  const s = ls();
  if (!s) return { auto: null, lives: [], slots: [], used: 0 };
  let used = 0;
  const lives = [];
  let auto = null;
  const slots = Array.from({ length: SLOT_COUNT }, () => null);
  for (let i = 0; i < s.length; i++) {
    const full = s.key(i);
    if (!full?.startsWith(KEY)) continue;
    const k = full.slice(KEY.length);
    const t = s.getItem(full) ?? '';
    used += (full.length + t.length) * 2;
    if (k === 'auto') auto = info(k, t);
    else if (k.startsWith('life-')) lives.push(info(k, t));
    else if (/^slot\d+$/.test(k)) { const n = +k.slice(4); if (n >= 1 && n <= SLOT_COUNT) slots[n - 1] = info(k, t); }
  }
  lives.sort((a, b) => (b.shelved ?? 0) - (a.shelved ?? 0));
  return { auto, lives, slots, used, quota: QUOTA };
}

/** 지금 하는 삶(auto)을 보관 칸으로 옮긴다. 끝난 삶이나 빈 칸이면 하지 않는다. 실패하면 false. */
export function shelveAuto({ keepOver = false } = {}) {
  const t = raw('auto');
  if (!t) return true;
  const a = info('auto', t);
  if (a.broken || (a.over && !keepOver)) return true;
  const s = ls();
  // 같은 삶이 이미 보관돼 있으면 그 칸을 새것으로 바꾼다 (같은 삶이 둘로 늘지 않게)
  const same = listSaves().lives.find((l) => l.id === a.id);
  const key = same ? same.key : `life-${Date.now()}`;
  try { s.setItem(KEY + key, t); s.removeItem(KEY + 'auto'); return true; } catch { return false; }
}

/** 보관된 삶을 다시 지금 하는 삶으로. 하던 삶은 보관 칸으로 옮긴다. */
export function resumeLife(key) {
  const t = raw(key);
  if (!t) return null;
  if (key !== 'auto') {
    if (!shelveAuto()) return null;
    try { ls().setItem(KEY + 'auto', t); ls().removeItem(KEY + key); } catch { return null; }
  }
  return load('auto');
}

/** 자유 모드 손 저장 칸을 불러온다. 하던 삶은 보관해 두고, 불러온 것이 새 auto가 된다. */
export function loadSlot(n) {
  const t = raw('slot' + n);
  if (!t) return null;
  const a = raw('auto');
  // 하던 삶이 같은 삶의 자유 모드라면 보관하지 않는다 (예전 저장으로 돌아가는 것이 자유 모드의 뜻)
  if (a && info('auto', a).id !== info('slot' + n, t).id && !shelveAuto()) return null;
  try { ls().setItem(KEY + 'auto', t); } catch { return null; }
  return load('auto');
}

export function writeSlot(game, n) {
  game.savedAt = Date.now();
  return saveSlot(game, n);
}

export function removeSave(key) {
  try { ls()?.removeItem(KEY + key); return true; } catch { return false; }
}

export const kbText = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.round(b / 1024)}KB`);
