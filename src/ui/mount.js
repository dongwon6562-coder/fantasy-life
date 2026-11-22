// 32단계 '하늘의 짐승 기수' 화면(src/mount). 읽기만 한다. 지도 고장 칸의 둥지·날개대 탑은 src/mount가 MAP_INFO로 붙인다.
// renderMountCard: '사람들' 화면 카드 (내 하늘 짐승마다 자람·나는 솜씨·정·떨어진 일·출격·상처, 품는 알)
// renderMountBlock: '나' 화면 덩이 (타고 다니는 짐승, 날개대 자리, 아는 둥지, 묻은 짐승, 기록)
import { mountInfo } from '../mount/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderMountCard(game) {
  const s = safe(() => mountInfo(game));
  if (!s || (!s.beasts.length && !s.eggs.length)) return '';
  const variant = s.beasts.length ? (s.riding ? 'above' : 'tame') : 'nest';
  const art = safe(() => vignetteImage({ plate: 'mount', variant, year: game.date.year, month: game.date.month }), '');
  const ALT = { above: '하늘 짐승 등에서 내려다본 땅', tame: '하늘 짐승을 길들이는 마당', nest: '벼랑 둥지의 알' };
  return `<section class="card mt-card">
    <h2>하늘 짐승 <small>${s.beasts.length ? `${s.beasts.length}마리` : `알 ${s.eggs.length}`}</small></h2>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[variant]}">` : ''}
    ${s.beasts.length ? `<ul class="kn-list">${s.beasts.map((a) => `<li class="kn-kid mt-beast"><div class="kn-txt" style="grid-column:1/-1">
      <div class="top"><strong>${esc(a.name)}</strong><span class="note">${esc(a.kindName)} · ${a.age}살 · ${esc(a.stage)}${a.name === s.riding ? ' · 타고 다닌다' : ''}</span></div>
      <div class="wd-row kn-row"><span>나는 솜씨</span>${bar(a.flight, 'kin')}<span class="v">${a.flight}</span></div>
      <div class="wd-row kn-row"><span>정</span>${bar(a.bond, a.bond < 30 ? 'low' : 'kin')}<span class="v">${a.bond}</span></div>
      <span class="note">${[a.hatchedBy ? `${a.hatchedBy}의 품에서 깸` : '', a.sorties ? `출격 ${a.sorties}번` : '', a.falls ? `떨어뜨린 일 ${a.falls}번` : '', a.wounds ? `상처 ${a.wounds}` : ''].filter(Boolean).map(esc).join(' · ')}</span>
    </div></li>`).join('')}</ul>` : ''}
    ${s.eggs.length ? `${s.eggs.map((e) => `<div class="wd-row kn-row"><span>품는 ${esc(e.name)}${e.warm ? '' : ' · 식어 간다'}</span>${bar(e.prog / Math.max(1, e.hatch) * 100, e.warm ? 'kin' : 'low')}</div>`).join('')}` : ''}
  </section>`;
}

export function renderMountBlock(game) {
  const s = safe(() => mountInfo(game));
  if (!s) return '';
  const m = s.me ?? {}, B = s.band;
  if (!s.beasts.length && !s.eggs.length && !B.member && !s.nests.length && !s.graves.length && !s.log.length) return '';
  const chips = [];
  if (m.flights) chips.push(['날아오른 날', `${m.flights}`]);
  if (m.couriers) chips.push(['하늘 편지', `${m.couriers}번`]);
  if (m.sorties) chips.push(['출격', `${m.sorties}번`]);
  if (m.hatched) chips.push(['깨운 알', `${m.hatched}`, 'up']);
  if (m.falls) chips.push(['떨어진 일', `${m.falls}번`, 'down']);
  const art = B.member ? safe(() => vignetteImage({ plate: 'mount', variant: 'wings', year: game.date.year, month: game.date.month }), '') : '';
  return `<div class="block mt-block">
    <h3>하늘 기수</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="날개를 펼친 하늘 짐승">` : ''}
    ${s.riding ? `<p><strong>${esc(J(s.riding, '을/를'))} 타고 다닌다</strong></p>` : ''}
    ${B.member ? `<p class="note">${esc(B.name)} ${esc(B.member.rank)} · 출격 ${B.member.sorties}번 · 대장 ${esc(B.captain)} · 기수 ${B.riders}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.nests.length ? `<p class="note">아는 둥지: ${s.nests.map((n) => `${esc(n.name)}(${esc(n.placeName)}, ${esc(n.kind)}${n.eggs > 0 ? `, 알 ${n.eggs}` : ''})`).join(', ')}</p>` : ''}
    ${s.graves.length ? `<p class="note">묻은 짐승: ${s.graves.map((x) => `${esc(x.name)}(${esc(x.kind)}, ${x.y}년${x.how ? `, ${esc(x.how)}` : ''})`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>하늘 짐승과 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
