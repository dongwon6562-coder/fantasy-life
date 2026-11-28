// 50단계 '자유도시 의회와 길드 정치' 화면(src/council). 읽기만 한다.
// councilView(s): '나' 화면 덩이 '도시 의회' (내 자리·길드·파벌 의석·다가오는 표결·내 표밭·기록)
// councilsView(s): '지도' 화면 카드 '자유도시 의회' (도시마다 수장과 파벌 판도, 최근 표결)
// 모양 (councilInfo):
// { line, mine{city, seat, guild, guildRank, faction, votes, need, nextSeat, since, ally, foe, log[{y,m,text}]}|null,
//   cities[{name, head, faction, seats[{name, n, mine}], word, vote{what, when, stand}|null, last{what, result}|null}],
//   news[{y,m,text}] }
import { councilInfo } from '../council/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'council', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);

const FCLS = ['f0', 'f1', 'f2', 'f3', 'f4'];
function seatsBar(seats) {
  const all = list(seats), tot = all.reduce((a, x) => a + (x.n || 0), 0);
  if (!tot) return '';
  return `<div class="cn-seats" role="img" aria-label="${esc(all.map((x) => `${x.name} ${x.n}석`).join(', '))}">${all.map((x, i) => `<i class="${FCLS[i % 5]}${x.mine ? ' mine' : ''}" style="flex:${x.n}"></i>`).join('')}</div>
    <p class="note cn-legend">${all.map((x, i) => `<span class="${FCLS[i % 5]}${x.mine ? ' mine' : ''}">${esc(x.name)} ${x.n}</span>`).join(' ')}</p>`;
}

export function councilView(s) {
  const m = s?.mine;
  if (!m) return '';
  const src = art(m.rank >= 3 ? 'hall' : 'guild');
  return `<div class="block cn-block">
    <h3>도시 의회 <small>${esc(m.seat ?? '')}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="의회">` : ''}
    <p class="note">${[m.city, m.guild && m.guild !== m.faction ? m.guild : '', m.faction ? `${m.faction} 파벌` : '', m.since ? `${m.since}해째` : '올해부터'].filter(Boolean).map(esc).join(' · ')}</p>
    ${m.standing != null ? `<div class="wd-row kn-row"><span>조합 안 무게 · ${esc(m.standWord ?? '')}</span>${bar(m.standing, 'mana')}</div>` : ''}
    ${m.need ? `<p class="note">${m.nextSeat ? `<b>다음 자리 ${esc(m.nextSeat)}</b> · ` : ''}${esc(m.need)}</p>` : ''}
    ${m.rank >= 3 && m.votes ? `<p class="note">내 표: ${esc(m.votes)}</p>` : ''}
    ${m.ally || m.foe ? `<p class="note">${m.ally ? `내 편 <b>${esc(m.ally)}</b>` : ''}${m.ally && m.foe ? ' · ' : ''}${m.foe ? `<b class="down">맞수</b> ${esc(m.foe)}` : ''}</p>` : ''}
    ${m.dirty ? `<p class="note"><b class="warn">${esc(m.dirty)}</b></p>` : ''}
    ${list(m.log).length ? `<details class="pl-more"><summary>의회에서 있었던 일 ${m.log.length}가지</summary><ul class="pl-news">${m.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

function cityRow(c) {
  return `<li class="cn-city">
    <div class="pi-top"><b>${esc(c.name)}</b>${c.word ? `<em>${esc(c.word)}</em>` : ''}</div>
    ${c.head ? `<p class="note">수장 <b>${esc(c.head)}</b>${c.faction ? ` · ${esc(c.faction)}` : ''}</p>` : ''}
    ${seatsBar(c.seats)}
    ${c.vote ? `<p class="note"><b>다음 표결</b> ${esc(c.vote.what)}${c.vote.when ? ` · ${esc(c.vote.when)}` : ''}${c.vote.stand ? ` · ${esc(c.vote.stand)}` : ''}</p>` : ''}${c.last ? `<p class="note">지난 표결: ${esc(c.last.what)} → ${esc(c.last.result)}</p>` : ''}
    ${list(c.laws).length ? `<details class="pl-more"><summary>이 도시의 법 ${c.laws.length}</summary><ul class="pi-retired">${c.laws.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
  </li>`;
}

export function councilsView(s) {
  const all = list(s?.cities);
  if (!all.length) return '';
  const src = art('vote');
  return `<section class="card cn-card">
    <h2>자유도시 의회</h2>
    ${src ? `<img class="blk-art" src="${src}" alt="의회">` : ''}
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    <ul class="pi-crews">${all.map(cityRow).join('')}</ul>
    ${list(s.banned).length ? `<p class="note"><b class="down">나를 쫓아낸 도시</b> ${s.banned.map(esc).join(' · ')}</p>` : ''}
    ${list(s.news).length ? `<details class="pl-more"><summary>의회 소식 ${s.news.length}가지</summary><ul class="pl-news">${s.news.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

const withG = (g, fn) => { G = g; try { return fn(safe(() => councilInfo(g))); } finally { G = null; } };
export const renderCouncilBlock = (game) => withG(game, councilView);
export const renderCouncilsMap = (game) => withG(game, councilsView);
