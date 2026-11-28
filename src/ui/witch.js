// 50단계 '숲의 마녀와 민간 주술' 화면(src/witch). 읽기만 한다.
// witchView(s): '나' 화면 덩이 '내 주술' (스승·아는 주술·주술의 손·고장별 눈길·속임수·낙인·대 잇기·기록)
// wisesView(s): '지도' 화면 카드 '마녀와 주술사' (고장의 마녀들, 수군거리는 고장, 마녀사냥, 소식)
import { witchInfo } from '../witch/index.js';
import { vignetteImage } from '../art/vignette.js';
import { icon } from '../art/icons.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'witch', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);
const ic = (n) => safe(() => icon(n, 16), '');

export function witchView(s) {
  const m = s?.me;
  if (!m || (!s.known && !list(m.log).length && !m.lore)) return '';
  const known = list(m.known);
  const v = s.hunt ? 'hunt' : known.length ? 'brew' : 'hut';
  const src = art(v);
  const looks = list(m.look);
  const tally = [m.clients ? `찾아온 사람 ${m.clients}` : '', m.hexes ? `건 저주 ${m.hexes}` : '', m.fraud ? `속임수 ${m.fraud}번` : ''].filter(Boolean).join(' · ');
  return `<div class="block wi-block">
    <h3>내 주술 <small>${esc(m.rank ?? '')}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="주술">` : ''}
    ${m.teacher || m.lineage ? `<p class="note">${[m.teacher ? `스승 ${m.teacher}` : '', m.lineage].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    <div class="wd-row kn-row"><span>주술의 손 · ${esc(m.loreWord ?? '')}</span>${bar(m.lore ?? 0, 'mana')}</div>
    ${known.length ? `<ul class="wi-charms">${known.map((k) => `<li${k.dark ? ' class="dark"' : ''}><div class="pi-top">${k.icon ? `<span class="wi-ic" aria-hidden="true">${ic(k.icon)}</span>` : ''}<b>${esc(k.name)}</b><em>${esc(k.word ?? '')}</em></div></li>`).join('')}</ul>` : ''}
    ${tally ? `<p class="note">${tally}</p>` : ''}
    ${looks.length ? `<p class="ac-h">마을의 눈길</p>${looks.map((l) => `<div class="wd-row kn-row"><span>${esc(l.name)} · ${esc(l.word ?? '')}</span>${bar(l.value ?? 50, (l.value ?? 50) < 45 ? 'warn' : 'kin')}</div>`).join('')}` : ''}
    ${s.heatHere >= 15 ? `<div class="wd-row kn-row"><span>이 고장의 수군거림</span>${bar(s.heatHere, s.heatHere >= 50 ? 'warn' : '')}</div>` : ''}
    ${m.mark ? `<p class="note"><b class="down">낙인</b> ${esc(m.mark)}</p>` : ''}
    ${s.hunt ? `<p class="note"><b class="down">마녀사냥</b> ${esc(s.hunt.text ?? '')}</p>` : ''}
    ${s.tower || s.faith ? `<p class="note">${[s.tower, s.faith].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    ${list(m.log).length ? `<details class="pl-more"><summary>주술로 있었던 일 ${m.log.length}가지</summary><ul class="pl-news">${m.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

function wiseRow(w) {
  const cls = w.kind === '진짜' ? 'up' : w.kind === '속임수' ? 'down' : 'plain';
  return `<li class="sx-one${w.gone ? ' gone' : ''}${w.teacher ? ' here' : ''}">
    <div class="pi-top"><b>${esc(w.name)}</b>${w.gone ? `<em class="down">${esc(w.word ?? '')}</em>` : w.kind ? `<em class="${cls}">${esc(w.kind)}</em>` : ''}</div>
    <p class="note">${[w.placeName, w.lineage, w.teacher ? '내 스승' : '', !w.gone ? w.word : ''].filter(Boolean).map(esc).join(' · ')}</p>
  </li>`;
}

export function wisesView(s) {
  const all = list(s?.wise);
  if (!all.length && !list(s?.hunts).length) return '';
  const live = all.filter((w) => !w.gone), gone = all.filter((w) => w.gone);
  const hunts = list(s.hunts), heat = list(s.heat);
  const src = art(hunts.length && hunts[0].y >= (G?.date.year ?? 0) - 1 ? 'hunt' : 'hut');
  return `<section class="card wi-card">
    <h2>마녀와 주술사</h2>
    ${src ? `<img class="blk-art" src="${src}" alt="마녀의 오두막">` : ''}
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    ${s.realm ? `<p class="note">${esc(s.realm)}</p>` : ''}
    ${heat.length ? `<p class="note"><b class="warn">수군거리는 고장</b> ${heat.map((h) => esc(`${h.placeName}(${h.word})`)).join(', ')}</p>` : ''}
    ${live.length ? `<ul class="pi-crews">${live.slice(0, 5).map(wiseRow).join('')}</ul>` : ''}
    ${live.length > 5 ? `<details class="pl-more"><summary>다른 주술사 ${live.length - 5}</summary><ul class="pi-crews">${live.slice(5).map(wiseRow).join('')}</ul></details>` : ''}
    ${hunts.length ? `<details class="pl-more"><summary>마녀사냥 ${hunts.length}번</summary><ul class="pl-news">${hunts.map((h) => `<li><time>${when(h)}</time><span>${esc(`${h.placeName} ${h.name}${h.me ? '(나)' : ''}: ${h.outcome}`)}</span></li>`).join('')}</ul></details>` : ''}
    ${gone.length ? `<details class="pl-more"><summary>떠난 주술사 ${gone.length}</summary><ul class="pi-crews">${gone.map(wiseRow).join('')}</ul></details>` : ''}
    ${list(s.news).length ? `<details class="pl-more"><summary>주술 소식 ${s.news.length}가지</summary><ul class="pl-news">${s.news.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

const withG = (g, fn) => { G = g; try { return fn(safe(() => witchInfo(g))); } finally { G = null; } };
export const renderWitchBlock = (game) => withG(game, witchView);
export const renderWisesMap = (game) => withG(game, wisesView);
