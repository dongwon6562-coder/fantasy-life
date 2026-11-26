// 47단계 '학자의 길' 화면(src/scholar). 읽기만 한다.
// scholarView(s): '나' 화면 덩이 '내 서재' (학식, 학파, 쓴 책(지금 어디 남았나·틀린 기록), 읽은 책, 쓰는 중인 책, 제자와 강의, 기록)
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'scholar', variant, year: G.date.year, month: G.date.month }), '') : '');
export const withGame = (g, fn) => { G = g; try { return fn(); } finally { G = null; } };

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
// 책 갈래
export const BOOK_KIND = { history: '역사서', geo: '지리서', nature: '박물지', lore: '고대어 풀이', translate: '번역', copy: '필사본', essay: '논설', other: '책' };
const kindWord = (k) => BOOK_KIND[k] ?? k ?? '책';

function book(b) {
  const where = b.lost ? '<b class="down">남은 것이 없다</b>' : b.banned ? '<b class="down">금서가 되었다</b>' : b.copies != null ? `${b.copies}부 남음` : '';
  return `<li class="sc-book${b.wrong ? ' wrong' : ''}">
    <div><b>${esc(b.name)}</b><small>${esc(kindWord(b.kind))}${b.y ? ` · ${b.y}년` : ''}</small></div>
    <p class="note">${[b.author && !b.mine ? `${esc(b.author)} 지음` : '', b.where ? esc(b.where) : '', where, b.readers ? `읽은 사람 ${b.readers}` : '', b.wrong ? '<b class="warn">틀린 기록이 섞였다</b>' : ''].filter(Boolean).join(' · ')}</p>
  </li>`;
}

export function scholarView(s) {
  if (!s || (s.lore == null && !s.wrote?.length && !s.read?.length && !s.log?.length)) return '';
  const v = s.job ? 'write' : s.school ? 'debate' : s.wrote?.length ? 'shelf' : 'library';
  const src = art(v);
  const sch = s.school ? (typeof s.school === 'string' ? { name: s.school } : s.school) : null;
  return `<div class="block sc-block">
    <h3>내 서재 <small>${s.rank ? esc(s.rank) : sch ? esc(sch.name) : '책 읽는 사람'}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="서재">` : ''}
    ${s.lore != null ? `<div class="wd-row kn-row"><span>학식${s.loreWord ? ` · ${esc(s.loreWord)}` : ''}</span>${bar(s.lore, 'mana')}</div>` : ''}
    ${sch ? `<p class="note">학파 <b>${esc(sch.name)}</b>${sch.word ? ` · ${esc(sch.word)}` : ''}${sch.rival ? ` · 맞서는 쪽 ${esc(sch.rival)}` : ''}</p>` : ''}
    ${s.job ? `<div class="wd-row kn-row"><span>쓰는 중 · ${esc(s.job.name)}${s.job.kind ? ` (${esc(kindWord(s.job.kind))})` : ''}</span>${bar(s.job.prog ?? 0, 'kin')}</div>` : ''}
    ${s.wrote?.length ? `<p class="note">내가 쓴 책 ${s.wrote.length}</p><ul class="af-works sc-books">${s.wrote.map((b) => book({ ...b, mine: true })).join('')}</ul>` : ''}
    ${s.read?.length ? `<details class="pl-more"><summary>읽은 책 ${s.read.length}권</summary><ul class="af-works sc-books">${s.read.map(book).join('')}</ul></details>` : ''}
    ${s.pupils?.length ? `<p class="note">강의를 듣는 이: ${s.pupils.map((p) => esc(typeof p === 'string' ? p : p.name)).join(', ')}</p>` : ''}
    ${s.great?.length ? `<details class="pl-more"><summary>이름난 학자 ${s.great.length}</summary><ul class="ag-clues">${s.great.map((x) => `<li><b>${esc(x.name)}</b>${x.word ? ` · ${esc(x.word)}` : ''}</li>`).join('')}</ul></details>` : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>서재에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
