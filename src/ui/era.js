// 시대가 바뀌는 세계 화면 (src/era). 레오니아 연대기의 '시대' 칸: 지금 시대와 다음 시대까지,
// 나온 발명마다 장터에 들어온 물건과 새로 생긴 일, 우리 집 살림. 아직 안 나온 발명은 미리 보여 주지 않는다.
import { ERAS, ERA_AT } from '../world.js';
import { INVENTIONS } from '../history/powers.js';
import { GOODS, priceOf, eraJobIds, ERA_JOB_NEED } from '../era/index.js';
import { WORK } from '../jobs.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { esc } from './util.js';

const placeNm = (id) => PLACES[id]?.name ?? id;
const safe = (fn, d) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };

// 왕국 연표에서 그 발명이 나온 해를 찾는다
function yearOf(game, v) {
  const key = v.text.slice(0, 12);
  const e = (game.realm?.log ?? []).find((x) => x.text.startsWith('발명') && x.text.includes(key));
  return e ? e.y : null;
}

/** 우리 집 살림: '나' 화면 한 줄과 시대 칸에서 쓴다 */
export function ownedGoods(game) {
  const goods = game.era?.goods ?? {};
  return Object.entries(goods).filter(([id, n]) => n > 0 && GOODS[id]).map(([id, n]) => ({ id, n, ...GOODS[id] }));
}

export function renderEra(game) {
  const r = game.realm ?? {};
  const idx = r.era ?? 0;
  const tech = r.tech ?? 0;
  const next = ERA_AT[idx + 1];
  const pct = next != null ? Math.round(Math.max(0, Math.min(1, (tech - ERA_AT[idx]) / (next - ERA_AT[idx]))) * 100) : 100;
  const done = game.history?.inventions ?? [];
  const list = INVENTIONS.filter((v) => done.includes(v.id)).sort((a, b) => done.indexOf(a.id) - done.indexOf(b.id));
  const left = INVENTIONS.length - list.length;
  const here = L(game).place;
  const mine = safe(() => ownedGoods(game), []);

  const invRows = list.slice().reverse().map((v) => {
    const y = yearOf(game, v);
    const goods = Object.entries(GOODS).filter(([, d]) => d.need === v.id);
    const jobs = eraJobIds.filter((j) => ERA_JOB_NEED[j] === v.id || (j === 'millhand' && v.id === 'erngrind'));
    return `<li class="er-inv">
      <div class="top"><strong>${esc(v.text.split('.')[0])}</strong>${y ? `<time>${y}년</time>` : ''}</div>
      <p class="note">${esc(v.look)}</p>
      ${goods.length || jobs.length ? `<div class="er-tags">
        ${goods.map(([id, d]) => `<span class="chip goods${(game.era?.goods?.[id] ?? 0) > 0 ? ' own' : ''}">${esc(d.name)} <em>은화 ${safe(() => priceOf(game, id), d.price)}${d.where ? ` · ${d.where.map(placeNm).join('·')}` : ''}</em></span>`).join('')}
        ${jobs.map((j) => { const w = WORK[j]; const ps = w?.places ?? []; return w ? `<span class="chip job${ps.includes(here) ? ' here' : ''}">새 일: ${esc(w.name)}${ps.length ? ` <em>${ps.map(placeNm).join('·')}</em>` : ''}</span>` : ''; }).join('')}
      </div>` : ''}
    </li>`;
  }).join('');

  return `<div class="era">
    <ol class="er-steps">${ERAS.map((e, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><span>${esc(i <= idx ? e.name : '?')}</span></li>`).join('')}</ol>
    <div class="er-now">
      <h3>${esc(ERAS[idx]?.name ?? '')}</h3>
      <p>${esc(ERAS[idx]?.desc ?? '')}</p>
      ${next != null ? `<div class="wd-row"><span>다음 시대까지</span><span class="wd-bar invent"><i style="width:${pct}%"></i></span><span class="v">${pct < 25 ? '아직 멀다' : pct < 60 ? '조금씩' : pct < 90 ? '가까워졌다' : '머지않았다'}</span></div>` : '<p class="note">지금 알려진 가장 먼 시대에 닿았다.</p>'}
    </div>
    <h3 class="sub">우리 집 살림</h3>
    ${mine.length ? `<ul class="er-mine">${mine.map((g) => `<li><strong>${esc(g.name)}${g.n > 1 ? ` ×${g.n}` : ''}</strong><span class="note">${esc(g.desc)}</span></li>`).join('')}</ul>`
      : `<p class="note">${list.some((v) => Object.values(GOODS).some((d) => d.need === v.id)) ? "아직 새 물건이 없다. 할 일의 '새 물건 구경'에서 장터 좌판을 볼 수 있다." : '아직 장터에 새 물건이 들어오지 않았다.'}</p>`}
    <h3 class="sub">세상에 나온 것들</h3>
    ${invRows ? `<ol class="er-list">${invRows}</ol>` : '<p class="note">아직 세상을 바꾼 발명이 없다. 마석은 귀족과 마법사의 물건이다.</p>'}
    ${left ? `<p class="note">아직 아무도 모르는 것이 ${left}가지 더 있다고들 한다. 언제 나올지는 세상이 정한다.</p>` : ''}
  </div>`;
}
