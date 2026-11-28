// 41단계 사람들 화면 '족보 나무': 초상을 가지로 이은 그림.
// 위에서 아래로 친할아버지 내외 → 아버지 내외(어머니 쪽 외가는 작게) → 나와 형제자매 → 내 자식 → 손주.
// 한 집(내외)마다 아래로 줄기가 내려가고, 자식들은 가로 가지에 매달린다. 넓으면 가로로 밀어 본다(탭 넘기기와 겹치지 않게 data-noswipe).
// 초상을 누르면 인물 수첩(data-ws-person). 읽기만 한다.
import { me, playerAge } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const MAX_KIDS = 8;   // 한 가지에 매다는 자식 수 (넘으면 '외 n명')
const MAX_GRAND = 6;

const P = (g, id) => (id == null ? null : safe(() => byId(g, id)));
const kidsOf = (g, p) => (p?.childIds ?? []).map((id) => P(g, id)).filter(Boolean)
  .sort((a, b) => (b.ageMonths ?? 0) - (a.ageMonths ?? 0));
const spouseOf = (g, p) => P(g, p?.spouseId);

function card(g, p, { role = '', self = false, small = false } = {}) {
  if (!p) return '';
  const age = safe(() => (p.id === g.player.id ? playerAge(g) : ageYears(p)), null);
  const img = safe(() => portrait(g, p, { size: small ? 40 : 54, bust: true }), '');
  const attrs = self ? '' : ` data-ws-person="${p.id}" role="button" tabindex="0"`;
  return `<div class="ftn${self ? ' me' : ''}${p.alive === false ? ' dead' : ''}${small ? ' sm' : ''}"${attrs}>
    <span class="ftn-pic">${img}</span>
    <span class="ftn-name">${esc(p.name)}${p.alive === false ? ' <i>†</i>' : ''}</span>
    <span class="ftn-sub">${esc(role)}${age != null && p.alive !== false ? `${role ? ' · ' : ''}${age}살` : ''}</span>
  </div>`;
}

function couple(g, a, b, opt = {}) {
  return `<div class="ft-pair">${card(g, a, opt.a)}${b ? `<span class="ft-knot" aria-hidden="true"></span>${card(g, b, opt.b)}` : ''}</div>`;
}

/** 한 집: 내외 + 아래로 매단 자식들 (li 하나) */
function house(g, a, b, kids, opt = {}) {
  return `<li>${couple(g, a, b, opt)}${kids ? `<ul>${kids}</ul>` : ''}</li>`;
}

function kidList(g, list, { me: meId, limit = MAX_KIDS, role, deeper } = {}) {
  const shown = list.slice(0, limit), more = list.length - shown.length;
  return shown.map((k) => (deeper && k.id === meId ? deeper(k) : `<li>${card(g, k, { role: role?.(k), small: true })}</li>`)).join('')
    + (more > 0 ? `<li><div class="ftn more"><span class="ftn-name">외 ${more}명</span></div></li>` : '');
}

export function renderFamTree(game) {
  const g = game;
  const m = safe(() => me(g));
  if (!m) return '';
  const fa = P(g, m.fatherId), mo = P(g, m.motherId);
  const sp = spouseOf(g, m);
  const kids = kidsOf(g, m);
  const sibs = [...new Set([...(fa?.childIds ?? []), ...(mo?.childIds ?? [])])].map((id) => P(g, id)).filter(Boolean)
    .sort((a, b) => (b.ageMonths ?? 0) - (a.ageMonths ?? 0));
  if (!fa && !mo && !sp && !kids.length) return '';
  const sexWord = (p, mw, fw) => (p.sex === 'f' ? fw : mw);
  const kidRole = (k) => sexWord(k, '아들', '딸');
  const meF = m.sex === 'f';
  const sibRole = (k) => ((k.ageMonths ?? 0) > (m.ageMonths ?? 0) ? sexWord(k, meF ? '오빠' : '형', meF ? '언니' : '누나') : sexWord(k, '남동생', '여동생'));

  // 내 집: 나와 배우자, 그 아래 자식들, 자식마다 손주
  const myHouse = () => {
    const grand = (k) => {
      const gk = kidsOf(g, k), ks = spouseOf(g, k);
      if (!gk.length && !ks) return `<li>${card(g, k, { role: kidRole(k), small: true })}</li>`;
      return house(g, k, ks, gk.length ? kidList(g, gk, { limit: MAX_GRAND, role: () => '손주' }) : '', { a: { role: kidRole(k), small: true }, b: { role: k.sex === 'f' ? '사위' : '며느리', small: true } });
    };
    const shown = kids.slice(0, MAX_KIDS);
    return house(g, m, sp, kids.length ? shown.map(grand).join('') + (kids.length > MAX_KIDS ? `<li><div class="ftn more"><span class="ftn-name">외 ${kids.length - MAX_KIDS}명</span></div></li>` : '') : '',
      { a: { self: true, role: '나' }, b: { role: sexWord(sp ?? {}, '남편', '아내'), small: false } });
  };

  // 부모 대: 나와 형제자매가 매달린다
  const childLis = sibs.length ? kidList(g, sibs.some((s) => s.id === m.id) ? sibs : [m, ...sibs], { me: m.id, limit: 99, role: sibRole, deeper: myHouse }) : myHouse();
  const parentsHouse = fa || mo
    ? house(g, fa ?? mo, fa ? mo : null, childLis, { a: { role: fa ? '아버지' : '어머니' }, b: { role: '어머니' } })
    : null;

  // 할아버지 대 (아버지 쪽이 있으면 그쪽, 없으면 어머니 쪽)
  const top = fa ?? mo;
  const gf = P(g, top?.fatherId), gm = P(g, top?.motherId);
  let tree = parentsHouse ?? myHouse();
  if (parentsHouse && (gf || gm)) tree = house(g, gf ?? gm, gf ? gm : null, tree, { a: { role: gf ? '할아버지' : '할머니', small: true }, b: { role: '할머니', small: true } });
  // 외가: 아버지가 있을 때 어머니의 부모는 따로 작게
  const og = fa && mo ? [P(g, mo.fatherId), P(g, mo.motherId)].filter(Boolean) : [];

  const gens = 1 + (fa || mo ? 1 : 0) + (gf || gm ? 1 : 0) + (kids.length ? 1 : 0) + (kids.some((k) => (k.childIds ?? []).length) ? 1 : 0);
  return `<section class="card ftree-card">
    <h2>${esc(g.player.lastName ?? '')} 집안 족보 <small>${gens}대</small></h2>
    <div class="ftree-scroll" data-noswipe><ul class="ftree">${tree}</ul></div>
    ${og.length ? `<p class="note ftree-side"><b>외가</b> ${og.map((p) => `<span class="ft-og" data-ws-person="${p.id}" role="button" tabindex="0">${esc(p.name)}${p.alive === false ? " †" : ""}</span>`).join(' · ')}</p>` : ''}
    <p class="note">초상을 누르면 인물 수첩이 열린다. 넓으면 옆으로 밀어 본다.</p>
  </section>`;
}
