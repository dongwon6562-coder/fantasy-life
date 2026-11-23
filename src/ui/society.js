// 36단계 '도시의 사교계' 화면(src/society). 읽기만 한다.
// renderSociety: 사람들 화면 카드 (이 도시의 연회 집과 나와의 사이, 사교계 인물과 추문, 요즘 도는 말, 혼담). 도시에 있는 어른이거나 체면이 있을 때만.
// renderSocietyBlock: '나' 화면 덩이 (사교계에서의 체면, 열린 문, 후견인, 간 연회·연 연회, 초대가 끊긴 달, 기록)
import { societyInfo } from '../society/index.js';
import { playerAge } from '../game.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'society', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { feast: '저택의 연회', salon: '살롱의 저녁', ball: '무도회', shame: '등 돌린 사람들' };

export function renderSociety(game) {
  const s = safe(() => societyInfo(game));
  if (!s || (!s.hosts.length && !s.ton) || safe(() => playerAge(game), 0) < 16) return '';
  const v = s.hosts.some((h) => /살롱/.test(h.kind)) && !s.season ? 'salon' : s.season ? 'ball' : 'feast';
  const src = art(game, v);
  return `<section class="card so-card">
    <h2>사교계 <small>${esc(s.seasonWord)}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.access ? `<p class="note">아직 드나들 수 없다. 필요한 것: ${esc(s.access)}</p>` : ''}
    ${s.hosts.length ? `<ul class="ag-clues">${s.hosts.map((h) => `<li><b>${esc(h.name)}</b> · ${esc(h.kind)} · ${esc(h.prestige)} · ${h.open ? esc(h.tie) : '<span class="note">문이 열리지 않았다</span>'}</li>`).join('')}</ul>` : ''}
    ${s.figures.length ? `<p class="note">이름난 얼굴: ${s.figures.map((f) => `${esc(f.name)}(${esc(f.word)}${f.scandal ? ', 추문' : ''})`).join(', ')}</p>` : ''}
    ${s.talk.length ? `<ul class="news so-talk">${s.talk.slice().reverse().map((t) => `<li class="rumor">${esc(t.text)} <span class="note">· ${esc(t.place)}</span></li>`).join('')}</ul>` : ''}
    ${s.matches.length ? `<p class="note">맺어진 혼담: ${s.matches.map((x) => `${esc(J(x.a, '과/와'))} ${esc(x.b)}(${x.y}년)`).join(', ')}</p>` : ''}
  </section>`;
}

export function renderSocietyBlock(game) {
  const s = safe(() => societyInfo(game));
  if (!s || (!s.ton && !s.went && !s.hosted && !s.sponsor && !s.log.length)) return '';
  const chips = [];
  if (s.went) chips.push(['이번 철 연회', `${s.went}번`]);
  if (s.hosted) chips.push(['연 연회', `${s.hosted}번`, 'up']);
  if (s.shut) chips.push(['초대가 끊김', `${s.shut}달 더`, 'down']);
  const v = s.shut ? 'shame' : s.hosted ? 'feast' : s.kinds.some((k) => /살롱/.test(k)) ? 'salon' : 'ball';
  const src = art(game, v);
  return `<div class="block so-block">
    <h3>사교계</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    <div class="wd-row kn-row"><span>체면</span>${bar(s.ton, s.shut ? 'low' : 'kin')}<span class="v">${esc(s.tonWord)}</span></div>
    ${s.kinds.length ? `<p class="note">열린 문: ${s.kinds.map(esc).join(', ')}${s.dressed ? ' · 연회 옷을 갖췄다' : ''}</p>` : ''}
    ${s.sponsor ? `<p class="note">후견인: ${esc(s.sponsor)}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>연회에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
