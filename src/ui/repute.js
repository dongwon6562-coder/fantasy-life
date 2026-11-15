// 10단계 평판과 소문 화면: '나' 화면의 평판 덩이. src/repute의 reputeInfo만 읽는다.
import { reputeInfo } from '../repute/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
// 가운데에서 좌우로 뻗는 막대 (-100 ~ 100)
const twoway = (v) => {
  const w = Math.min(50, Math.abs(v) / 2);
  return `<span class="rp-two ${v < 0 ? 'neg' : 'pos'}"><i style="${v < 0 ? `right:50%` : `left:50%`};width:${w}%"></i></span>`;
};

export function renderReputeBlock(game) {
  const r = safe(() => reputeInfo(game));
  if (!r) return '';
  const anyAxis = r.axes.some((a) => a.word);
  if (!r.fame && !r.places.length && !r.rumors.length && !r.nick && !anyAxis) return '';
  const axes = r.axes.map((a) => `<div class="rp-axis"><span class="nm">${esc(a.name)}</span>${twoway(a.val)}<span class="w ${a.val < -11 ? 'neg' : a.val > 11 ? 'pos' : ''}">${esc(a.word ?? '별말 없다')}</span></div>`).join('');
  const others = r.places.filter((p) => p.id !== r.place);
  const rumor = (x) => `<li class="${x.good ? 'good' : 'bad'}${x.lie ? ' lie' : ''}"><span class="rp-q">“${esc(x.text)}”</span>
      <span class="note">${esc(x.from)}에서 시작 · ${x.reach}곳에 퍼짐${x.lie ? ` · <b class="warn">헛소문</b>${x.source ? ` (${esc(x.source)}이 퍼뜨렸다)` : ''}` : ''}</span>
      <span class="rp-str">${bar(x.strength, x.good ? 'rp-good' : 'low')}</span></li>`;
  return `<div class="block repute-block">
    <h3>평판${r.nick ? ` <small>별명 “${esc(r.nick)}”${r.nickPlace ? ` · ${esc(r.nickPlace)}에서 붙음` : ''}</small>` : ''}</h3>
    <div class="wd-row rp-fame"><span>${esc(r.placeName)}</span>${bar(r.fame, 'court')}<span class="v">${esc(r.fameWord)}</span></div>
    ${r.fame >= 5 ? `<div class="rp-axes">${axes}</div>` : '<p class="note">이 고장 사람들은 아직 나를 잘 모른다.</p>'}
    ${r.rumors.length ? `<h4 class="ct-h">여기서 도는 내 소문</h4><ul class="rp-rumors">${r.rumors.map(rumor).join('')}</ul>` : ''}
    ${others.length ? `<details class="rp-more"><summary>다른 고장에서의 평 ${others.length}곳</summary><ul class="rp-places">${others.map((p) => `<li><div class="top"><strong>${esc(p.name)}</strong><span class="note">${esc(p.fameWord)}</span></div>
        <div class="wd-row"><span>아는 정도</span>${bar(p.fame, 'court')}<span class="v">${p.fame}</span></div>
        ${p.word ? `<span class="note ${p.good < 0 ? 'neg' : ''}">“${esc(p.word)}”는 말이 돈다</span>` : ''}</li>`).join('')}</ul></details>` : ''}
  </div>`;
}
