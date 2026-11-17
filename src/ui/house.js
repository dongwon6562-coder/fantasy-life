// 17단계 '내 집 마련과 살림' 화면(src/house). 읽기만 한다. '나' 화면 덩이 ('집과 재산' 장부 바로 위).
// 잠자리, 짓는 중인 집, 가진 집(이름·내력·방과 살림), 이웃, 이사, 판 집·불탄 집, 기록.
import { houseStatus } from '../house/index.js';
import { HOME_NAMES } from '../places.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const BUILD_MONTHS = { hut: 3, house: 6, rebuild: 4 }; // src/house/build.js BUILDS의 months
const moodWord = (m) => (m >= 25 ? '사이가 좋다' : m >= 8 ? '인사를 나눈다' : m > -8 ? '데면데면하다' : m > -25 ? '껄끄럽다' : '원수 같다');

export function renderHouseBlock(game) {
  const s = safe(() => houseStatus(game));
  if (!s) return '';
  if (!s.homes.length && !s.build && !s.lost.length && !s.moving && !s.log.length) return '';
  const B = s.build;
  const total = B ? BUILD_MONTHS[B.kind] ?? Math.max(1, B.monthsLeft) : 1;
  const home = (h) => {
    const bits = [`${esc(h.placeName)}${h.here ? ' · 여기' : ''}`];
    if (h.built) bits.push(`${h.built}년부터${h.by ? ` (${esc(h.by)})` : ''}`);
    if (h.gens > 1) bits.push(`${h.gens}대째`);
    return `<li class="${h.here ? 'here' : ''}"><div class="top"><strong>${esc(h.name)}</strong><span class="note">${esc(h.kindWord)}</span></div>
      <span class="note">${bits.join(' · ')}${h.worth ? ` · 값 은화 ${h.worth}닢` : ''}</span>
      ${h.rooms.length ? `<div class="hs-rooms">${h.rooms.map((r) => `<span class="chip" title="${esc(r.desc)}">${esc(r.name)}</span>`).join('')}<span class="note">${h.rooms.length}/${h.roomCap}칸</span></div>` : `<span class="note">들인 살림이 없다 (${h.roomCap}칸까지)</span>`}
      ${h.marks.length ? `<span class="note">집에 남은 흔적: ${h.marks.map(esc).join(', ')}</span>` : ''}</li>`;
  };
  return `<div class="block house-block">
    <h3>내 집 마련</h3>
    <p class="note">잠자리: <b>${esc(HOME_NAMES[s.sleep] ?? '어딘가')}</b>${s.moving ? ` · ${esc(s.moving.toName)}로 이사하는 중` : ''}</p>
    ${B ? `<div class="hs-build"><div class="wd-row kn-row"><span>${esc(B.placeName)}에 ${esc(B.name)} 짓는 중 · ${B.monthsLeft ? `${B.monthsLeft}달 남음` : '곧 다 지음'}</span>${bar(((total - B.monthsLeft) / total) * 100, 'kin')}</div></div>` : ''}
    ${s.homes.length ? `<ul class="ct-houses hs-homes">${s.homes.map(home).join('')}</ul>` : ''}
    ${s.neighbor ? `<p class="note">옆집 ${esc(s.neighbor.name)}: ${moodWord(s.neighbor.mood)}${s.neighbor.quarrels ? ` · 다툰 일 ${s.neighbor.quarrels}번` : ''}</p>` : ''}
    ${s.moves || s.built ? `<p class="note">${[s.built ? `지은 집 ${s.built}채` : '', s.moves ? `이사 ${s.moves}번` : ''].filter(Boolean).join(' · ')}</p>` : ''}
    ${s.lost.length ? `<details class="pl-more"><summary>떠나보낸 집 ${s.lost.length}채</summary><ul class="pl-news">${s.lost.map((x) => `<li><time>${x.year}년</time><span>${esc(x.placeName)} ${esc(x.name)} · ${esc(x.how)}${x.gens > 1 ? ` · ${x.gens}대 살던 집` : ''} · 되사려면 은화 ${x.buyback}닢</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>집에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
