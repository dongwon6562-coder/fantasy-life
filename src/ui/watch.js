// 49단계 '경비대와 치안' 화면(src/watch). 읽기만 한다.
// watchView(s): '나' 화면 덩이 '경비대' (계급·소속·상관과 동료·맡은 사건·잡은 사람·뇌물·원한·기록)
import { watchInfo } from '../watch/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'watch', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);
const txt = (x) => (typeof x === 'string' ? x : x?.text ?? '');

function caseRow(c) {
  const sus = Array.isArray(c.suspect) ? c.suspect.join(', ') : c.suspect;
  const state = c.solved ? ['up', '풀었다'] : c.wrong ? ['down', '엉뚱한 사람을 잡았다'] : c.cold ? ['down', '묻혔다'] : ['plain', c.left != null ? (c.left > 0 ? `${c.left}달 남음` : '기한이 다 됐다') : '캐는 중'];
  const done = c.solved || c.cold || c.wrong;
  return `<li class="wt-case${c.solved ? ' solved' : done ? ' cold' : ''}">
    <div class="pi-top"><b>${esc(c.name ?? c.what)}</b><em class="${state[0]}">${state[1]}</em></div>
    ${!done && (c.text || c.clue != null || sus) ? `<p class="note">${[c.text && !String(c.name ?? '').includes(c.text) ? c.text : '', c.clue != null ? `실마리 ${c.clue}` : '', sus ? `의심 가는 사람 ${sus}` : ''].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    ${c.prog && !done ? bar(c.prog, 'kin') : ''}
  </li>`;
}

export function watchView(s) {
  if (!s || (!s.member && !list(s.cases).length && !list(s.log).length && !s.caught)) return '';
  const cases = list(s.cases), open = cases.filter((c) => !c.solved && !c.cold && !c.wrong), done = cases.filter((c) => c.solved || c.cold || c.wrong);
  const v = open.length ? 'case' : s.member ? 'patrol' : 'gate';
  const src = art(v);
  const tw = s.town && typeof s.town === 'object' ? s.town : null;
  const tally = [s.solved ? `푼 사건 ${s.solved}` : '', s.caught ? `잡은 사람 ${s.caught}` : '', s.wrong ? `잘못 잡은 사람 ${s.wrong}` : '', s.coldN ? `묻힌 사건 ${s.coldN}` : ''].filter(Boolean).join(' · ');
  return `<div class="block wt-block">
    <h3>경비대 <small>${esc(s.rank ?? (s.member ? '' : '떠났다'))}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="경비대">` : ''}
    ${s.member && (s.unit || s.place) ? `<p class="note">${[s.place, s.unit, s.since ? `${Math.floor((s.since - 1) / 12)}년부터` : '', s.policy ? `방침 ${s.policy}` : ''].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    ${s.member && s.next ? `<div class="wd-row kn-row"><span>공 ${s.merit} / ${s.next}${s.nextRank ? ` · 다 차면 ${esc(s.nextRank)}` : ''}</span>${bar(s.merit / s.next * 100, 'mana')}</div>` : ''}
    ${s.member && (s.boss || list(s.mates).length) ? `<p class="note">${s.boss ? `상관 <b>${esc(txt(s.boss) || s.boss.name)}</b>` : ''}${s.boss && list(s.mates).length ? ' · ' : ''}${list(s.mates).length ? `동료 ${s.mates.map((m) => esc(typeof m === 'string' ? m : m.name)).join(', ')}` : ''}</p>` : ''}
    ${tw ? `<div class="wd-row kn-row"><span>지금 있는 ${esc(tw.name)} 치안 · ${esc(tw.word ?? '')}</span>${bar(tw.order ?? 0, (tw.order ?? 0) < 42 ? 'warn' : 'kin')}</div>` : s.town ? `<p class="note">이 고장 치안: ${esc(txt(s.town))}</p>` : ''}
    ${open.length ? `<p class="note">맡은 사건 ${open.length}</p><ul class="wt-cases">${open.map(caseRow).join('')}</ul>` : ''}
    ${tally || s.bribes ? `<p class="note">${tally}${tally && s.bribes ? ' · ' : ''}${s.bribes ? `<b class="warn">뒷돈 ${s.bribes}번</b>` : ''}</p>` : ''}
    ${list(s.grudges).length ? `<p class="note"><b class="down">나를 원망하는 사람</b> ${s.grudges.map((x) => (typeof x === 'string' ? esc(x) : `${esc(x.name)}${x.crime ? `(${esc(x.crime)})` : ''}${x.out ? ' · 풀려났다' : ''}`)).join(', ')}</p>` : ''}
    ${done.length ? `<details class="pl-more"><summary>지난 사건 ${done.length}</summary><ul class="wt-cases">${done.map(caseRow).join('')}</ul></details>` : ''}
    ${list(s.log).length ? `<details class="pl-more"><summary>경비대에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

export function renderWatchBlock(game) { G = game; try { return watchView(safe(() => watchInfo(game))); } finally { G = null; } }
