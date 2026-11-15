// 생애 책: 한 삶을 한 권의 책처럼 넘겨 본다 (표지 → 나이대별 장 → 큰 고비 → 남긴 것 → 가문 → 맺음).
// 삶이 끝난 화면, 대 잇기 창의 돌아보기, 연대기 '가문' 탭의 연표에서 연다.
// 화면 전체를 다시 그리지 않고 책 창만 따로 그린다. 규칙은 읽기만 한다.
import { L } from '../adventure/core.js';
import { me, playerAge, family, knownPeople } from '../game.js';
import { byId } from '../npc.js';
import { portrait } from '../art/portrait.js';
import { lifeTimeline, deedsOf } from './legacy.js';
import { reducedMotion } from './settings.js';
import { esc } from './util.js';

const PER_PAGE = 7;
const BANDS = [
  [0, 14, '어린 날', '세상이 집과 골목만 하던 때'],
  [15, 29, '젊은 날', '스스로 길을 고르기 시작한 때'],
  [30, 49, '한창때', '이름과 짐이 함께 무거워진 때'],
  [50, 999, '늘그막', '지나온 길이 앞길보다 길어진 때'],
];

let getGame = () => null;
let state = null; // { game, i, pages, at, el, prevFocus }

/** 책 단추 html. i: ancestors 안의 자리 (지금 사는 사람이면 ancestors.length) */
export const bookButton = (i, label = '생애 책 펼치기', cls = 'ghost') => `<button class="${cls} book-open" data-book="${i}">${esc(label)}</button>`;

/** 한 번만 부른다. 어디서든 [data-book] 단추를 누르면 책이 열린다. */
export function initBook(gameGetter) {
  getGame = gameGetter;
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-book]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const g = getGame();
    if (g) openBook(g, +b.dataset.book);
  }, true);
}

/* ---------- 책 내용 ---------- */
function lifeOf(game, i) {
  const anc = L(game).ancestors;
  const rec = anc[i];
  if (rec) return { ...rec, person: byId(game, rec.id), living: false };
  const age = playerAge(game);
  return { name: game.player.name, lastName: game.player.lastName, id: game.player.id, born: game.date.year - age, died: null, age, cause: null, summary: null, person: me(game), living: true };
}

function chunk(list, n) { const out = []; for (let k = 0; k < list.length; k += n) out.push(list.slice(k, k + n)); return out; }

const line = (e) => `<li><span class="bk-age">${e.age >= 0 ? `${e.age}살` : ''}</span><span>${esc(e.text)}${e.n > 1 ? ` <em>외 ${e.n - 1}번</em>` : ''}</span></li>`;

function buildPages(game, i) {
  const life = lifeOf(game, i);
  const anc = L(game).ancestors;
  const isLast = i === anc.length - 1 || life.living;
  const gen = i + 1;
  const house = life.lastName ?? game.player.lastName;
  const pages = [];
  const face = (p, size, scars) => (p ? portrait(game, p, { size, scars: scars ? game.player.scars ?? [] : [] }) : '');
  const epithet = (life.summary ?? '').split(', ').filter(Boolean)[0] ?? '';
  // 표지
  pages.push({ kind: 'cover', html: `<div class="bk-cover">
      <span class="bk-house">${esc(house)} 가문 · ${gen}대</span>
      <div class="bk-face">${face(life.person, 120, isLast)}</div>
      <h2>${esc(life.name)} ${esc(life.lastName ?? '')}</h2>
      ${epithet ? `<p class="bk-epi">${esc(epithet)}</p>` : ''}
      <p class="bk-years">용사력 ${life.born}년 ~ ${life.living ? '' : `${life.died}년`}</p>
      <p class="bk-small">${life.living ? `${life.age}살, 아직 쓰이는 중인 책` : `${life.age}살${life.cause ? ` · ${esc(life.cause)}` : ''}`}</p>
    </div>` });
  // 나이대별 장
  let items = [];
  try { items = lifeTimeline(game, i); } catch (e) { console.error(e); }
  let chap = 0;
  for (const [a, b, title, sub] of BANDS) {
    const part = items.filter((e) => e.age >= a && e.age <= b);
    if (!part.length) continue;
    chap++;
    const pgs = chunk(part, PER_PAGE);
    pgs.forEach((pg, k) => pages.push({ kind: 'chapter', html: `<div class="bk-chap">
        ${k === 0 ? `<span class="bk-no">제${chap}장</span><h3>${title}</h3><p class="bk-sub">${sub}</p>` : `<span class="bk-no">제${chap}장 ${title} · 이어서</span>`}
        <ol class="bk-lines">${pg.map(line).join('')}</ol>
      </div>` }));
  }
  if (!chap) pages.push({ kind: 'chapter', html: '<div class="bk-chap"><h3>남은 기록</h3><p class="bk-sub">오래된 일은 잊혔다. 이 삶에 대해 적힌 것이 많지 않다.</p></div>' });
  // 큰 고비
  const deeds = (() => { try { return deedsOf(game, i, life.name); } catch (e) { console.error(e); return []; } })();
  if (deeds.length) pages.push({ kind: 'deeds', html: `<div class="bk-chap"><span class="bk-no">덧붙임</span><h3>큰 고비들</h3>
      <ol class="bk-deeds">${deeds.slice(-10).map((d) => `<li><b>${d.age}살</b><span>${esc(d.text)}</span></li>`).join('')}</ol></div>` });
  // 남긴 것: 요약, 배우자, 자식, 가까웠던 사람
  const p = life.person;
  const sp = p?.spouseId != null ? byId(game, p.spouseId) : null;
  const kids = (p?.childIds ?? []).map((id) => byId(game, id)).filter(Boolean);
  const facts = (life.summary ?? '').split(', ').filter(Boolean);
  const close = isLast ? knownPeople(game).filter((x) => x.id !== sp?.id && !kids.includes(x) && (x.affection ?? 0) >= 50).sort((a, b) => b.affection - a.affection).slice(0, 3) : [];
  const who = (x, note) => `<li>${portrait(game, x, { size: 48 })}<span><strong>${esc(x.name)}</strong><span class="bk-small">${esc(note)}${x.alive ? '' : ' · 세상을 떠남'}</span></span></li>`;
  pages.push({ kind: 'legacy', html: `<div class="bk-chap"><span class="bk-no">맺으며</span><h3>남긴 것</h3>
      ${facts.length ? `<div class="bk-facts">${facts.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : '<p class="bk-sub">세상에 크게 남은 이름은 없다. 그래도 한 사람의 삶이었다.</p>'}
      ${sp || kids.length || close.length ? `<ul class="bk-people">
        ${sp ? who(sp, '배우자') : ''}
        ${kids.map((k) => who(k, k.sex === 'm' ? '아들' : '딸')).join('')}
        ${close.map((x) => who(x, '가까웠던 사람')).join('')}
      </ul>` : ''}
    </div>` });
  // 가문: 이 책까지 이어진 대들
  if (anc.length > 1 || (!life.living && game.over)) {
    const gens = anc;
    pages.push({ kind: 'house', html: `<div class="bk-chap"><span class="bk-no">족보</span><h3>${esc(house)} 가문</h3><p class="bk-sub">${esc(family(game)?.name ?? '')}에서 시작한 집안</p>
        <ol class="bk-tree">${gens.map((a, k) => `<li class="${k === i ? 'me' : ''}"><span class="bk-gen">${k + 1}대</span><span><strong>${esc(a.name)}</strong><span class="bk-small">${a.born}~${a.died}년 · ${a.age}살${a.summary ? ` · ${esc(a.summary.split(', ')[0])}` : ''}</span></span></li>`).join('')}
        ${!game.over && game.player.alive !== false ? `<li class="${life.living ? 'me' : ''}"><span class="bk-gen">${anc.length + 1}대</span><span><strong>${esc(game.player.name)}</strong><span class="bk-small">살아 있음 · ${playerAge(game)}살</span></span></li>` : ''}</ol></div>` });
  }
  // 맺음
  pages.push({ kind: 'end', html: `<div class="bk-end">
      <svg class="bk-orn" viewBox="0 0 120 20" width="120" height="20" aria-hidden="true"><path d="M2 10H46M74 10H118" stroke="currentColor" stroke-width="1"/><path d="M60 3L67 10L60 17L53 10Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="60" cy="10" r="2" fill="currentColor"/><circle cx="49" cy="10" r="1.4" fill="currentColor"/><circle cx="71" cy="10" r="1.4" fill="currentColor"/></svg>
      <p>${life.living ? '이 책의 뒷장은 아직 비어 있다.' : game.over && isLast ? `${esc(house)} 가문의 이야기는 여기서 끝난다.` : '이야기는 다음 사람에게 이어진다.'}</p>
      <p class="bk-small">${life.living ? `용사력 ${game.date.year}년 ${game.date.month}월에 펼쳐 봄` : `용사력 ${life.died}년에 덮인 책`}</p>
    </div>` });
  return pages;
}

/* ---------- 책 창 ---------- */
export function openBook(game, i) {
  closeBook();
  const pages = buildPages(game, i);
  const el = document.createElement('div');
  el.className = 'book-ov';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', '생애 책');
  document.body.appendChild(el);
  state = { game, i, pages, at: 0, el, prevFocus: document.activeElement };
  draw();
  el.querySelector('[data-bk="next"]')?.focus();
  document.addEventListener('keydown', onKey);
}

export function closeBook() {
  if (!state) return;
  document.removeEventListener('keydown', onKey);
  state.el.remove();
  try { state.prevFocus?.focus?.(); } catch { /* 없어진 단추 */ }
  state = null;
}

function onKey(e) {
  if (!state) return;
  if (e.key === 'Escape') { e.preventDefault(); closeBook(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
}

function go(d) {
  if (!state) return;
  const n = Math.max(0, Math.min(state.pages.length - 1, state.at + d));
  if (n === state.at) return;
  state.dir = d;
  state.at = n;
  draw();
}

function draw() {
  const { el, pages, at, dir } = state;
  const last = pages.length - 1;
  el.innerHTML = `<div class="book">
      <div class="bk-top"><span class="bk-count">${at + 1} / ${pages.length}</span><button class="ghost sm bk-x" data-bk="close" aria-label="책 덮기">덮기</button></div>
      <article class="bk-page ${pages[at].kind}${dir && !reducedMotion() ? (dir > 0 ? ' turn-next' : ' turn-prev') : ''}" aria-live="polite">${pages[at].html}</article>
      <div class="bk-nav">
        <button class="ghost" data-bk="prev"${at === 0 ? ' disabled' : ''}>앞장</button>
        <div class="bk-dots" aria-hidden="true">${pages.map((_, k) => `<i class="${k === at ? 'on' : ''}"></i>`).join('')}</div>
        ${at < last ? '<button class="primary" data-bk="next">다음 장</button>' : '<button class="primary" data-bk="close">책 덮기</button>'}
      </div>
    </div>`;
  el.querySelectorAll('[data-bk]').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const k = b.dataset.bk;
    if (k === 'close') closeBook(); else go(k === 'next' ? 1 : -1);
  });
  // 바깥(어두운 곳)을 누르면 덮는다
  el.onclick = (e) => { if (e.target === el) closeBook(); };
  // 손가락으로 넘기기
  const page = el.querySelector('.bk-page');
  let sx = null, sy = null;
  page.onpointerdown = (e) => { sx = e.clientX; sy = e.clientY; };
  page.onpointerup = (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  };
}
