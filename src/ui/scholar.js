// 47단계 '학자의 길' 화면(src/scholar). 읽기만 한다.
// scholarView(s): '나' 화면 덩이 '내 서재' (학식, 학파, 쓴 책(지금 어디 남았나·틀린 기록), 읽은 책, 쓰는 중인 책, 제자와 강의, 기록)
import { scholarInfo } from '../scholar/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'scholar', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
// 책 갈래
export const BOOK_KIND = { history: '역사서', geo: '지리서', nature: '박물지', lore: '고대어 풀이', translate: '번역', copy: '필사본', essay: '논설', other: '책' };
const kindWord = (k) => BOOK_KIND[k] ?? k ?? '책';

function book(b) {
  const where = b.lost ? '<b class="down">남은 것이 없다</b>' : b.banned ? '<b class="down">금서가 되었다</b>' : b.copies != null ? `${b.copies}부 남음` : '';
  const head = [kindWord(b.kind), b.subject, b.y ? `${b.y}년` : ''].filter(Boolean).map(esc).join(' · ');
  return `<li class="af-work sc-book${b.wrong ? ' wrong' : ''}">
    <div><b>${esc(b.name)}</b>${head ? `<small>${head}</small>` : ''}</div>
    <p class="note">${[b.ancestor ? '윗대가 씀' : b.author && !b.mine ? `${esc(b.author)} 지음` : '', b.where ? esc(b.where) : '', where, b.word ? esc(b.word) : '', b.readers ? `읽은 사람 ${b.readers}` : ''].filter(Boolean).join(' · ')}</p>
    ${b.wrong ? `<p class="note sc-wrong"><b class="warn">틀린 기록 ${b.wrong}</b>${b.wrongText?.length ? ` · ${b.wrongText.slice(0, 2).map(esc).join(' · ')}` : ''}</p>` : ''}
  </li>`;
}

export function scholarView(s) {
  if (!s || (!s.line && !s.read?.length && !s.notes?.length && !s.log?.length && !s.draft)) return '';
  const v = s.draft ? 'write' : s.school ? 'debate' : s.wrote?.length ? 'shelf' : 'library';
  const src = art(v);
  const sch = s.school ? (typeof s.school === 'string' ? { name: s.school } : s.school) : null;
  const job = s.job ? `${s.job.where ? `${s.job.where} ` : ''}${s.job.kind ?? ''} ${s.job.name ?? ''}`.trim() : '';
  return `<div class="block sc-block">
    <h3>내 서재 <small>${s.rank ? esc(s.rank) : sch ? esc(sch.name) : '책 읽는 사람'}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="서재">` : ''}
    ${s.lore != null ? `<div class="wd-row kn-row"><span>학식${s.loreWord ? ` · ${esc(s.loreWord)}` : ''}</span>${bar(s.lore, 'mana')}</div>` : ''}
    ${sch ? `<p class="note">학파 <b>${esc(sch.name)}</b>${sch.word ? ` · ${esc(sch.word)}` : ''}${sch.rival ? ` · 맞서는 쪽 ${esc(sch.rival)}` : ''}</p>` : ''}
    ${s.great ? `<p class="note"><b class="up">${esc(s.great)}</b></p>` : ''}
    ${job ? `<div class="wd-row kn-row"><span>서고 일 · ${esc(job)}</span>${bar(s.job.prog ?? 0, 'kin')}</div>` : ''}
    ${s.draft ? `<div class="wd-row kn-row"><span>원고 · ${esc([s.draft.kind, s.draft.subject].filter(Boolean).join(' · '))}</span>${bar(s.draft.prog ?? 0, 'kin')}</div>` : ''}
    ${((ns) => ns.length ? `<p class="note">모아 둔 자료 ${ns.length}가지: ${ns.slice(0, 5).map((n) => `${esc(n.subject)} ${n.n}`).join(' · ')}${ns.length > 5 ? ' 외' : ''}</p>` : '')((s.notes ?? []).filter((n) => n.subject && n.subject !== 'null').sort((a, b) => b.n - a.n))}
    ${s.here ? `<p class="note">이 고장 서고 <b>${esc(s.here.name)}</b>${s.here.line ? ` · ${esc(s.here.line)}` : ''}${s.here.censor ? ` · <span class="down">${esc(s.here.censor)}</span>` : ''}</p>` : ''}
    ${s.wrote?.length ? `<p class="note">내 집안이 쓴 책 ${s.wrote.length}</p><ul class="af-works sc-books">${s.wrote.slice(0, 3).map((b) => book({ ...b, mine: true })).join('')}</ul>${s.wrote.length > 3 ? `<details class="pl-more"><summary>나머지 ${s.wrote.length - 3}권</summary><ul class="af-works sc-books">${s.wrote.slice(3).map((b) => book({ ...b, mine: true })).join('')}</ul></details>` : ''}` : ''}
    ${s.read?.length ? `<details class="pl-more"><summary>읽은 책 ${s.read.length}권</summary><ul class="af-works sc-books">${s.read.map(book).join('')}</ul></details>` : ''}
    ${s.pupils?.length ? `<details class="pl-more"><summary>강의를 들은 이 ${s.pupils.length}</summary><ul class="ag-clues">${s.pupils.map((p) => typeof p === 'string' ? `<li>${esc(p)}</li>` : `<li><b>${esc(p.name)}</b>${p.fate ? ` · ${esc(p.fate)}` : ''}</li>`).join('')}</ul></details>` : ''}
    ${s.greats?.length ? `<details class="pl-more"><summary>이름난 학자 ${s.greats.length}</summary><ul class="ag-clues">${s.greats.map((x) => `<li><b>${esc(x.name)}</b>${x.school ? ` · ${esc(x.school)}` : ''}${x.me ? ' · <b class="up">나</b>' : ''}</li>`).join('')}</ul></details>` : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>서재에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

export function renderScholarBlock(game) { G = game; try { return scholarView(safe(() => scholarInfo(game))); } finally { G = null; } }
