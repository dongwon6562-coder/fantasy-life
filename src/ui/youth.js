// 어린 시절 카드 (src/childhood). 자라는 동안엔 이번 달 화면에 접는 칸, 어른이 되면 '나' 화면의 한 덩이.
import { childhoodOf, KNOWN } from '../childhood/index.js';
import { knownOf } from '../childhood/state.js';
import { ACTIONS } from '../actions.js';
import { JOBS } from '../data.js';
import { byId } from '../npc.js';
import { playerAge } from '../game.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const PARTED = { dead: '세상을 떠났다', moved: '마을을 떠났다', broken: '사이가 틀어졌다' };
const SCHOOL = ['', '예배당 글방에 다니기 시작했다', '글을 외워 사제 앞에서 읊었다', ''];
const GRIEF = { stone: '울지 않았다', tears: '목이 쉬도록 울었다', question: '죽으면 어디로 가는지 물었다' };

function facts(game) {
  const c = childhoodOf(game);
  if (!c) return null;
  const knownId = c.knownAs && c.knownAs !== 'self' ? c.knownAs : (playerAge(game) < 15 ? knownOf(game) : null);
  const top = Object.entries(c.counts ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, n]) => [ACTIONS.find((a) => a.id === id)?.name ?? id, n]);
  const friend = c.friend != null ? byId(game, c.friend) : null;
  const b = c.bestie ?? {};
  const school = c.school ?? {};
  const schoolLine = school.letter === 'taken' ? '사제의 추천서를 받았다' : school.letter === 'declined' ? '추천서를 사양했다' : SCHOOL[school.stage] ?? '';
  const tastes = Object.keys(c.tastes ?? {}).map((j) => JOBS[j]?.name ?? j);
  const death = c.firstDeath && !c.firstDeath.skip ? c.firstDeath : null;
  return { known: knownId ? KNOWN[knownId]?.name : null, settled: !!c.knownAs, top, friend, b, schoolLine, tastes, death };
}

function rows(game, f) {
  const out = [];
  if (f.friend) {
    const tag = f.b.parted ? PARTED[f.b.parted] ?? '' : f.b.promise ? '약속을 나눈 사이' : f.b.den ? '비밀 기지를 같이 쓰는 사이' : '소꿉친구';
    out.push(`<div class="yt-friend" data-ws-person="${f.friend.id}" role="button" tabindex="0">${portrait(game, f.friend, { size: 40 })}<div><span class="lbl">소꿉친구</span><strong>${esc(f.friend.name)}</strong><span class="note">${esc(tag)}</span></div></div>`);
  }
  const dl = [];
  if (f.schoolLine) dl.push(['글방', f.schoolLine]);
  if (f.tastes.length) dl.push(['맛본 일', f.tastes.join(', ')]);
  if (f.death) dl.push(['첫 장례', `${f.death.name} (${f.death.y}년)${GRIEF[f.death.grief] ? `, ${GRIEF[f.death.grief]}` : ''}`]);
  if (f.top.length) dl.push(['가장 많이 한 일', f.top.map(([n, k]) => `${n} ${k}번`).join(', ')]);
  if (dl.length) out.push(`<dl class="yt-dl">${dl.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`);
  return out.join('');
}

/** 자라는 동안(3~14살) 이번 달 화면에 나오는 접는 카드 */
export function renderYouthCard(game, ui = {}) {
  const age = playerAge(game);
  if (age < 3 || age >= 15) return '';
  let f = null;
  try { f = facts(game); } catch (e) { console.error(e); }
  if (!f) return '';
  const body = rows(game, f);
  return `<details class="card youth"${ui.ytOpen ? ' open' : ''}>
    <summary><span class="lbl">자라는 중</span><strong>${esc(f.known ? `마을 사람들 눈에는 ${f.known}` : '아직 어떤 아이인지 모른다')}</strong></summary>
    <div class="yt-body">${body || '<p class="note">아직 남은 기억이 많지 않다.</p>'}
      <p class="note">어릴 때 가장 많이 한 일로 마을이 기억하는 아이가 정해진다. 열다섯 살에 굳는다.</p></div>
  </details>`;
}

/** '나' 화면의 어린 시절 덩이 (열다섯 살 이후) */
export function renderYouthBlock(game) {
  if (playerAge(game) < 15) return '';
  let f = null;
  try { f = facts(game); } catch (e) { console.error(e); }
  if (!f || (!f.known && !f.friend && !f.schoolLine && !f.tastes.length && !f.death)) return '';
  return `<div class="block youth-block">
    <h3>어린 시절</h3>
    ${f.known ? `<p class="yt-known">${esc(f.known)}</p>` : ''}
    ${rows(game, { ...f, top: [] })}
  </div>`;
}
