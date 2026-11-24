// 43단계 '마족으로 살기' 화면(src/demonkind demonkindInfo). 읽기만 한다.
// renderDemonland: 지도 화면 카드 (마대륙 고장 넷과 열림·지금 있는 곳, 세 마왕의 기세, 마대륙 소식)
// renderDemonkindBlock: '나' 화면 덩이 (섬기는 마왕과 서열·총애, 이 고장의 대우)
// 마족 집안 이야기(바라는 것·짐·어릴 적 사람)는 origin.js '태어난 집안' 덩이가 그린다.
import { demonkindInfo } from '../demonkind/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const LAND_ART = { bonehill: 'bones', chain: 'harbor', post: 'city', stone: 'outpost' };
const ALT = { bones: '짐승 뼈 울타리의 마족 마을', harbor: '얼음 해협을 마주한 마족 항구', city: '검은 돌 부두의 교역소', outpost: '잿빛 비석 아래 경계 마을' };
const TONE = { welcome: 'up', wary: 'warn', scorn: 'down', banned: 'down' };

export function renderDemonland(game) {
  const s = safe(() => demonkindInfo(game));
  if (!s || !s.opened) return '';
  const here = s.places.find((p) => p.here);
  const v = LAND_ART[here?.id] ?? 'bones';
  const src = safe(() => vignetteImage({ plate: 'demonland', variant: v, year: game.date.year, month: game.date.month }), '');
  return `<section class="card dk-map">
    <h2>마대륙 <small>${here ? `지금 ${esc(here.name)}` : '얼음 해협 너머'}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    <ul class="dk-places">${s.places.map((p) => `<li class="${p.here ? 'here' : ''}${p.open ? '' : ' shut'}"><b>${esc(p.name)}</b><span>${esc(p.kind)} · ${esc(p.lord)}</span>${p.here ? '<em>여기</em>' : p.open ? '' : '<em>길이 닫혔다</em>'}</li>`).join('')}</ul>
    ${s.lords.map((l) => `<div class="wd-row kn-row"><span>${esc(l.title)}${l.name.includes("마왕") ? "" : ` ${esc(l.name)}`} · ${esc(l.word)}</span>${bar(l.power, l.power < 30 ? 'low' : 'kin')}</div>`).join('')}
    ${s.news.length ? `<ul class="pl-news">${s.news.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul>` : ''}
  </section>`;
}

export function renderDemonkindBlock(game) {
  const s = safe(() => demonkindInfo(game));
  const m = s?.self;
  if (!m) return '';
  return `<div class="block dk-block">
    <h3>마왕 아래 <small>${esc(m.rankName)}</small></h3>
    <p>${m.lordName ? `<strong>${esc(m.lordName)}</strong>${esc(J(m.lordName, '을/를').slice(m.lordName.length))} 섬긴다` : '<strong>섬기는 마왕이 없다</strong>'}${m.named ? ' · 이름을 얻었다' : ''}</p>
    ${m.favor != null ? `<div class="wd-row kn-row"><span>총애 · ${esc(m.favorWord)}</span>${bar(m.favor, m.favor < 20 ? 'low' : 'mana')}</div>` : ''}
    <p class="note">${m.inDemonLand ? '마대륙에 있다.' : '마대륙 밖에 있다.'} 이 고장은 마족을 <b class="${TONE[m.treatment] ?? ''}">${esc(m.treatmentWord)}</b>.</p>
    ${s.log?.length ? `<details class="pl-more"><summary>마족으로 살며 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
