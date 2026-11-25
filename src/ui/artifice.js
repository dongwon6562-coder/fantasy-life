// 45단계 '마도구 장인' 화면(src/artifice). 읽기만 한다.
// artificeView(s): '나' 화면 덩이 (솜씨, 내 공방과 제자, 받은 의뢰와 기한, 만든 마도구와 지금 누구 손에, 이름난 마도구, 마석 시세, 기록)
import { artificeInfo } from '../artifice/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'artifice', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const GRADE = ['', '하급', '중급', '상급', '명품', '전설'];

function work(w) {
  const g = w.gradeWord ?? GRADE[w.grade] ?? '';
  const who = w.holder ?? (w.mine ? null : w.owner);
  const where = w.stolen ? `<b class="down">도둑맞았다</b>${w.holder ? ` · ${esc(w.holder)} 손에` : ''}` : w.lost ? '<b class="down">행방을 모른다</b>' : w.worn ? '<b class="up">지니고 다닌다</b>' : w.mine && !w.holder ? '내 손에' : [who ? `${esc(who)} 손에` : '', w.where ? esc(w.where) : ''].filter(Boolean).join(' · ');
  return `<li class="af-work g${Math.min(5, w.grade ?? w.circle ?? 1)}">
    <div><b>${esc(w.name)}</b>${g ? `<small>${g}</small>` : ''}</div>
    <p class="note">${[w.kind, w.spell ? `${w.spell} 새김` : '', w.circle ? `${w.circle}서클` : '', w.maker && !w.mine ? `${w.maker} 작` : ''].filter(Boolean).map(esc).join(' · ')}${where ? ` · ${where}` : ''}</p>
  </li>`;
}

function order(o) {
  const late = o.left != null && o.left <= 1;
  return `<li><b>${esc(o.who)}</b> · ${esc(o.want)}${o.pay ? ` · 은화 ${o.pay}닢` : ''}${o.left != null ? ` · <span class="${late ? 'down' : ''}">${o.left > 0 ? `${o.left}달 남음` : '기한이 지났다'}</span>` : ''}</li>`;
}

export function renderArtificeBlock(game) { G = game; try { return artificeView(safe(() => artificeInfo(game))); } finally { G = null; } }

export function artificeView(s) {
  if (!s || (!s.skill && !s.shop && !s.works?.length && !s.log?.length)) return '';
  const sh = s.shop;
  const v = s.famous?.some((f) => f.mine && f.stolen) ? 'stolen' : s.job ? 'engrave' : sh?.apprentices?.length ? 'apprentice' : sh ? 'bench' : s.made ? 'engrave' : 'cut';
  const src = art(v);
  return `<div class="block af-block">
    <h3>마도구 장인 <small>${sh ? esc(sh.name) : s.rank ? esc(s.rank) : '공방 없음'}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="마도구 공방">` : ''}
    ${s.skill != null ? `<div class="wd-row kn-row"><span>새기는 솜씨${s.skillWord ? ` · ${esc(s.skillWord)}` : ''}</span>${bar(s.skill, 'mana')}</div>` : ''}
    ${sh ? `<p class="note"><b>${esc(sh.name)}</b>${sh.place ? ` · ${esc(sh.place)}` : ''}${sh.word ? ` · ${esc(sh.word)}` : ''}</p>${sh.apprentices?.length ? `<ul class="ag-clues">${sh.apprentices.map((a) => typeof a === 'string' ? `<li>제자 <b>${esc(a)}</b></li>` : `<li>${a.partner ? '동업자' : '제자'} <b>${esc(a.name)}</b>${a.word ? ` · ${esc(a.word)}` : ''}${a.skill != null ? ` · 솜씨 ${a.skill}` : ''}</li>`).join('')}</ul>` : ''}` : ''}
    ${s.job ? `<div class="wd-row kn-row"><span>새기는 중 · ${esc(s.job.name)}${s.job.circle ? ` (${s.job.circle}서클)` : ''}</span>${bar(s.job.prog, 'kin')}</div>` : ''}
    ${s.price ? `<p class="note">${typeof s.price === 'string' ? `마석 값 ${esc(s.price)}` : `${esc(s.price.word)} · 사면 ${s.price.buy}닢, 팔면 ${s.price.sell}닢`}${s.made ? ` · 새긴 것 ${s.made}` : ''}${s.blasts ? ` · 터뜨린 것 ${s.blasts}` : ''}</p>` : ''}
    ${s.orders?.length ? `<p class="note">받은 의뢰</p><ul class="ag-clues">${s.orders.map(order).join('')}</ul>` : ''}
    ${s.works?.length ? `<p class="note">지닌 마도구 ${s.works.length}</p><ul class="af-works">${s.works.map(work).join('')}</ul>` : ''}
    ${s.famous?.length ? `<details class="pl-more"><summary>이름난 마도구 ${s.famous.length}가지</summary><ul class="af-works">${s.famous.map(work).join('')}</ul></details>` : ''}
    ${s.past?.length ? `<p class="note">윗대의 공방: ${s.past.map((x) => `${x.y}년까지 ${x.made ? `${x.made}점 새김` : '마석만 다룸'}${x.shop ? `(${esc(x.shop)})` : ''}`).join(' · ')}</p>` : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>공방에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
