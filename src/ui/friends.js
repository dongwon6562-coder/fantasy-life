// 35단계 '평생의 벗' 화면(src/friends). 읽기만 한다.
// renderFriends: 사람들 화면 카드 (지금의 벗과 깊이, 떨어져 지낸 해, 꿔 준 돈, 멀어지거나 떠난 벗, 선대의 벗, 눈에 띄는 남들의 우정, 기록)
import { friendsInfo } from '../friends/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const TAG = { cold: '', broken: 'foe', dead: 'dark', sworn: 'ally' };

export function renderFriends(game) {
  const s = safe(() => friendsInfo(game));
  if (!s || (!s.friends.length && !s.past.length && !s.elders.length)) return '';
  const thisYear = game.date.year;
  const recentDead = (s.log ?? []).some((n) => thisYear - n.y <= 1 && /떠났|숨을|장례|무덤/.test(n.text));
  const v = recentDead ? 'funeral' : s.friends.some((f) => f.apart) ? 'reunion' : s.past.some((f) => f.state === 'cold' || f.state === 'broken') && !s.friends.length ? 'apart' : 'cup';
  const art = safe(() => vignetteImage({ plate: 'friend', variant: v, year: game.date.year, month: game.date.month }), '');
  const ALT = { funeral: '벗을 보내는 날', reunion: '오랜만에 만난 벗', apart: '멀어진 벗', cup: '벗과 나누는 술잔' };
  return `<section class="card fr-card">
    <h2>벗 <small>${s.friends.length ? `${s.friends.length}명` : ''}</small></h2>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[v]}">` : ''}
    ${s.friends.map((f) => `<div class="fr-one">
      <p><strong>${esc(f.name)}</strong> · ${esc(f.where)} · ${f.since}년째${f.place ? ` · ${esc(f.place)}` : ''}${f.job ? ` · ${esc(f.job)}` : ''}</p>
      <div class="wd-row kn-row"><span>${esc(f.word)}</span>${bar(f.depth, 'kin')}<span class="v">${f.depth}</span></div>
      ${f.apart || f.debt ? `<p class="note">${f.apart ? `${f.apart}년째 얼굴을 못 봤다` : ''}${f.apart && f.debt ? ' · ' : ''}${f.debt ? `${esc(f.debt.kind)} 은화 ${f.debt.amt}닢` : ''}</p>` : ''}
    </div>`).join('')}
    ${!s.friends.length ? '<p class="note">지금 곁에 벗이라 부를 사람이 없다.</p>' : ''}
    ${s.past.length ? `<p class="fr-past">${s.past.map((f) => `<span class="ct-tag ${TAG[f.state] ?? ''}">${esc(f.name)} · ${esc(f.word)}</span>`).join(' ')}</p>` : ''}
    ${s.lost ? `<p class="note">먼저 보낸 벗 ${s.lost}명</p>` : ''}
    ${s.elders.length ? `<p class="note">선대의 벗: ${s.elders.map((e) => `${esc(e.name)}${e.from ? `(${esc(e.from)}의 벗)` : ''}`).join(', ')}</p>` : ''}
    ${s.npc.length ? `<p class="note">눈에 띄는 남들의 우정: ${s.npc.map((x) => `${esc(J(x.a, '과/와'))} ${esc(x.b)}`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>벗과 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
