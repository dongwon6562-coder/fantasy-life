// 49단계 '경비대와 치안' 화면(src/watch). 읽기만 한다.
// watchView(s): '나' 화면 덩이 '경비대' (계급·소속·상관과 동료·맡은 사건·잡은 사람·뇌물·원한·기록)
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'watch', variant, year: G.date.year, month: G.date.month }), '') : '');
export const withWatchGame = (g, fn) => { G = g; try { return fn(); } finally { G = null; } };

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);
const txt = (x) => (typeof x === 'string' ? x : x?.text ?? '');

function caseRow(c) {
  return `<li class="wt-case${c.solved ? ' solved' : c.cold ? ' cold' : ''}">
    <div class="pi-top"><b>${esc(c.name ?? c.what)}</b><em class="${c.solved ? 'up' : c.cold ? 'down' : 'plain'}">${c.solved ? '풀었다' : c.cold ? '묻혔다' : c.left != null ? `${c.left}달 남음` : '캐는 중'}</em></div>
    ${c.clue != null || c.text ? `<p class="note">${c.text ? esc(c.text) : ''}${c.clue != null ? `${c.text ? ' · ' : ''}실마리 ${c.clue}` : ''}${c.suspect ? ` · 의심 가는 사람 ${esc(c.suspect)}` : ''}</p>` : ''}
    ${c.prog != null && !c.solved && !c.cold ? bar(c.prog, 'kin') : ''}
  </li>`;
}

export function watchView(s) {
  if (!s || (!s.rank && !list(s.cases).length && !list(s.log).length)) return '';
  const open = list(s.cases).filter((c) => !c.solved && !c.cold), done = list(s.cases).filter((c) => c.solved || c.cold);
  const v = open.length ? 'case' : s.gate ? 'gate' : 'patrol';
  const src = art(v);
  return `<div class="block wt-block">
    <h3>경비대 <small>${esc(s.rank ?? '')}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="경비대">` : ''}
    ${s.unit || s.place ? `<p class="note">${[s.unit, s.place, s.since ? `${s.since}년부터` : ''].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    ${s.merit != null ? `<div class="wd-row kn-row"><span>공${s.next ? ` · 다음 계급 ${esc(s.next)}` : ''}</span>${bar(s.merit, 'mana')}</div>` : ''}
    ${s.boss || list(s.mates).length ? `<p class="note">${s.boss ? `상관 <b>${esc(txt(s.boss) || s.boss.name)}</b>` : ''}${s.boss && list(s.mates).length ? ' · ' : ''}${list(s.mates).length ? `동료 ${s.mates.map((m) => esc(typeof m === 'string' ? m : m.name)).join(', ')}` : ''}</p>` : ''}
    ${s.town ? `<p class="note">이 고장 치안: ${esc(txt(s.town))}</p>` : ''}
    ${open.length ? `<p class="note">맡은 사건 ${open.length}</p><ul class="wt-cases">${open.map(caseRow).join('')}</ul>` : ''}
    ${s.caught != null || s.bribes != null ? `<p class="note">${s.caught != null ? `잡은 사람 ${s.caught}` : ''}${s.caught != null && s.bribes ? ' · ' : ''}${s.bribes ? `<b class="warn">눈감아 준 일 ${s.bribes}</b>` : ''}</p>` : ''}
    ${list(s.grudges).length ? `<p class="note"><b class="down">나를 원망하는 사람</b> ${s.grudges.map((x) => esc(typeof x === 'string' ? x : x.name)).join(', ')}</p>` : ''}
    ${done.length ? `<details class="pl-more"><summary>지난 사건 ${done.length}</summary><ul class="wt-cases">${done.map(caseRow).join('')}</ul></details>` : ''}
    ${list(s.log).length ? `<details class="pl-more"><summary>경비대에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
