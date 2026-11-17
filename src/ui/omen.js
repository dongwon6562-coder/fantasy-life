// 16단계 '예언과 징조' 화면(src/omen). 읽기만 한다.
// renderOmen: 지도 화면 카드 (세 예언, 지금 도는 징조, 꼬리별, 지나간 징조, 내 예언 성적)
// renderOmenNow: 이번 달 화면 한 줄 카드 (내 집안에 예언 속 사람이 있거나 새 징조가 돌 때, omenLine)
import { omenInfo, omenLine } from '../omen/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

const signLi = (x) => `<li><div class="top"><strong>${esc(x.short)}</strong><span class="note">${x.end ? esc(x.end) : x.months > 0 ? `${x.months}달째` : '이번 달'}</span></div>
      <span class="note">${esc(x.text)}</span>
      ${x.read ? `<span class="note om-read">풀이: ${esc(x.judged ?? '')}${x.portent ? ` · ${esc(x.portent)}` : ''}${x.preached ? ' · 사람들에게 알렸다' : ''}</span>` : ''}</li>`;

/** 지도 화면 카드 */
export function renderOmen(game) {
  const s = safe(() => omenInfo(game));
  if (!s) return '';
  const P = s.prophet;
  const tags = [];
  for (const m of s.mine) tags.push([`${m.pro} 속 사람: ${m.who}`, 'gift']);
  if (P.title) tags.push([P.title, P.title === '거짓 예언자' ? 'dark' : 'heir']);
  if (P.banned) tags.push(['예언하는 것을 금지당했다', 'dark']);
  if (s.loreWord) tags.push([`징조 풀이: ${s.loreWord}`, '']);
  const pro = (x) => `<li class="${x.chosen?.name === '나' ? 'mine' : ''}"><div class="top"><strong>${esc(x.name)}</strong><span class="note">${x.status !== x.beliefWord ? esc(x.status) : ''}</span></div>
      <span class="note om-words">${esc(x.words)}</span>
      <span class="note">${esc(x.from)}</span>
      <div class="wd-row kn-row"><span>믿는 사람 · ${esc(x.beliefWord)}</span>${bar(x.belief, 'mana')}</div>
      ${x.chosen ? `<span class="note om-chosen">예언 속 사람으로 지목됨: <b>${esc(x.chosen.name)}</b>${x.chosen.by ? ` (${esc(x.chosen.by)}가 지목)` : ''} · ${esc(x.chosen.stance)}</span>` : ''}</li>`;
  return `<section class="card omen-card">
    <h2>예언과 징조 <small>징조를 믿는 세상 · ${esc(s.beliefWord)}</small></h2>
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${s.signs.length ? `<h3 class="sub">지금 도는 징조</h3><ul class="ct-houses om-signs">${s.signs.map(signLi).join('')}</ul>` : '<p class="note">요즘은 하늘도 땅도 조용하다.</p>'}
    ${s.comets.length ? `<p class="note">꼬리별이 뜬 해: ${s.comets.map((y) => `${y}년`).join(', ')}</p>` : ''}
    <details class="pl-more"><summary>세상에 도는 예언 ${s.prophecies.length}가지</summary><ul class="ct-houses om-pros">${s.prophecies.map(pro).join('')}</ul></details>
    ${P.preached ? `<p class="note">내가 한 예언 ${P.preached}번 · 맞힘 ${P.right} · 어긋남 ${P.wrong}</p>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지나간 징조 ${s.past.length}가지</summary><ul class="ct-houses om-signs">${s.past.map(signLi).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>예언과 징조에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

/** 이번 달 화면 한 줄 */
export function renderOmenNow(game) {
  const line = safe(() => omenLine(game), '');
  if (!line) return '';
  return `<section class="card omen-now"><p class="note"><b>예언과 징조</b> ${esc(line)} <span class="om-more">자세한 것은 지도 화면에.</span></p></section>`;
}
