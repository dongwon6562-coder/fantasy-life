// 18단계 '학원과 시험' 화면(src/school). 읽기만 한다.
// renderSchoolBlock: '나' 화면 덩이 (얻은 자격, 다니는 학원, 이 고장에서 볼 수 있는 시험, 동문, 지난 시험, 기록)
// renderSchoolNow: 이번 달 화면 한 줄 (이 고장에서 볼 수 있는 시험이 있을 때)
import { schoolInfo } from '../school/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderSchoolNow(game) {
  const s = safe(() => schoolInfo(game));
  if (!s?.open.length) return '';
  return `<section class="card school-now"><p class="note"><b>시험</b> 이 고장에서 볼 수 있다: ${s.open.map((e) => esc(e.name)).join(', ')}. 할 일의 '시험 보기'로 나간다.</p></section>`;
}

export function renderSchoolBlock(game) {
  const s = safe(() => schoolInfo(game));
  if (!s) return '';
  const A = s.academy;
  const any = A || s.titles.length || s.exams.length || s.alumni.length || s.parentAlumni.length || s.banned.length || s.log.length || s.open.length;
  if (!any) return '';
  const alum = (x) => `<li><time>${x.year}년</time><span><button class="sc-name" data-ws-person="${x.id}">${esc(x.name)}</button>${x.rival ? ' · <b class="warn">맞수</b>' : ''} · ${esc(x.status)}</span></li>`;
  return `<div class="block school-block">
    <h3>학원과 시험</h3>
    ${s.titles.length ? `<div class="ct-tags">${s.titles.map((t) => `<span class="ct-tag gift">${esc(t)}</span>`).join('')}</div>` : ''}
    ${A ? `<div class="sc-acad"><div class="top"><strong>${esc(A.name)}</strong><span class="note">${esc(A.state)}${A.scholar ? ' · 장학생' : ''}</span></div>
      <span class="note">${esc(A.place)} · ${A.year}년 입학${A.state === '다니는 중' ? ` · ${A.grade}학년${A.fee && !A.scholar ? ` · 해마다 은화 ${A.fee}닢` : ''}` : ''}${A.fails ? ` · 떨어진 학년 시험 ${A.fails}번` : ''}</span>
      ${A.state === '다니는 중' ? `<div class="wd-row kn-row"><span>올해 들은 수업 ${A.work}번${A.work >= 6 ? ' · 준비됨' : ''}</span>${bar((A.work / 6) * 100, A.work >= 3 ? 'kin' : 'low')}</div>` : ''}</div>` : ''}
    ${s.open.length ? `<p class="note ok">이 고장에서 볼 수 있는 시험: ${s.open.map((e) => `${esc(e.name)}${e.why ? ` (${esc(e.why)})` : ''}`).join(', ')}</p>` : ''}
    ${s.banned.length ? `<p class="note warn">한동안 볼 수 없는 시험: ${s.banned.map(esc).join(', ')}</p>` : ''}
    ${s.alumni.length ? `<details class="pl-more"><summary>동문 ${s.alumni.length}명${s.alumni.some((x) => x.rival) ? ' · 맞수 있음' : ''}</summary><ul class="pl-news">${s.alumni.map(alum).join('')}</ul></details>` : ''}
    ${s.parentAlumni.length ? `<p class="note">부모의 동문: ${s.parentAlumni.map(esc).join(', ')}</p>` : ''}
    ${s.exams.length ? `<details class="pl-more"><summary>지난 시험 ${s.exams.length}번</summary><ul class="pl-news">${s.exams.map((e) => `<li><time>${e.year}년</time><span>${esc(e.name)} · ${esc(e.place)} · <b>${esc(e.result)}</b>${e.how ? ` · ${esc(e.how)}` : ''}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>배움에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
