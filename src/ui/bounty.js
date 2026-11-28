// 50단계 '현상금 사냥꾼' 화면(src/bounty). 읽기만 한다.
// boardView(s): 이번 달 화면 카드 '현상금 게시판' (이 고장에 걸린 사람들, 내가 쫓는 사람의 흔적)
// hunterView(s): '나' 화면 덩이 '현상금 사냥' (길드 등급·잡은 사람·산 채로/죽여서·잘못 잡음·원한·경쟁 사냥꾼·기록)
// 모양 (bountyInfo):
// { board[{name, crime, reward, alive (산 채로만 받나), seen, days, kind}],
//   chase{name, crime, reward, trail[{place, text}], near (0~100), left}|null,
//   me{rank, rankN, merit, next, nextRank, caught, killed, wrong, earned, rivals[{name, word}], grudges[{name, why}], log[{y,m,text}]}|null,
//   place }
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'bounty', variant, year: G.date.year, month: G.date.month }), '') : '');
export const withBountyGame = (g, fn) => { G = g; try { return fn(); } finally { G = null; } };

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);

function poster(b) {
  return `<li class="bh-poster">
    <b class="bh-name">${esc(b.name)}</b>
    <span class="bh-crime">${esc(b.crime ?? '')}</span>
    <span class="bh-reward">은화 ${b.reward}${b.alive ? ' · 산 채로' : ''}</span>
    ${b.seen ? `<span class="note">${esc(b.seen)}</span>` : ''}
  </li>`;
}

export function boardView(s) {
  const board = list(s?.board), c = s?.chase;
  if (!board.length && !c) return '';
  return `<section class="card bh-card">
    <h2>현상금 게시판${s.place ? ` <small>${esc(s.place)}</small>` : ''}</h2>
    ${c ? `<div class="bh-chase"><div class="pi-top"><b>쫓는 사람: ${esc(c.name)}</b><em>${c.left != null ? `${c.left}달 남음` : ''}</em></div>
      <p class="note">${esc([c.crime, c.reward ? `은화 ${c.reward}` : ''].filter(Boolean).join(' · '))}</p>
      ${c.near != null ? `<div class="wd-row kn-row"><span>흔적이 가까워진 정도</span>${bar(c.near, 'kin')}</div>` : ''}
      ${list(c.trail).length ? `<ol class="bh-trail">${c.trail.map((t) => `<li><b>${esc(t.place)}</b> ${esc(t.text ?? '')}</li>`).join('')}</ol>` : ''}
    </div>` : ''}
    ${board.length ? `<ul class="bh-board">${board.slice(0, 6).map(poster).join('')}</ul>` : ''}
    ${board.length > 6 ? `<details class="pl-more"><summary>더 걸린 사람 ${board.length - 6}</summary><ul class="bh-board">${board.slice(6).map(poster).join('')}</ul></details>` : ''}
  </section>`;
}

export function hunterView(s) {
  const m = s?.me;
  if (!m) return '';
  const src = art(s.chase ? 'trail' : 'board');
  const tally = [m.caught ? `산 채로 잡음 ${m.caught}` : '', m.killed ? `죽여서 넘김 ${m.killed}` : '', m.wrong ? `엉뚱한 사람 ${m.wrong}` : '', m.earned ? `번 돈 ${m.earned}닢` : ''].filter(Boolean).join(' · ');
  return `<div class="block bh-block">
    <h3>현상금 사냥 <small>${esc(m.rank ?? '')}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="현상금 사냥">` : ''}
    ${m.next ? `<div class="wd-row kn-row"><span>공 ${m.merit ?? 0} / ${m.next}${m.nextRank ? ` · 다 차면 ${esc(m.nextRank)}` : ''}</span>${bar((m.merit ?? 0) / m.next * 100, 'mana')}</div>` : ''}
    ${tally ? `<p class="note">${tally}</p>` : ''}
    ${list(m.rivals).length ? `<p class="note">경쟁 사냥꾼: ${m.rivals.map((r) => esc(typeof r === 'string' ? r : `${r.name}${r.word ? `(${r.word})` : ''}`)).join(', ')}</p>` : ''}
    ${list(m.grudges).length ? `<p class="note"><b class="down">나를 원망하는 사람</b> ${m.grudges.map((r) => esc(typeof r === 'string' ? r : `${r.name}${r.why ? `(${r.why})` : ''}`)).join(', ')}</p>` : ''}
    ${list(m.log).length ? `<details class="pl-more"><summary>사냥에서 있었던 일 ${m.log.length}가지</summary><ul class="pl-news">${m.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
