// 17단계 '법과 재판' 화면(src/law). 읽기만 한다.
// renderLawNow: 이번 달 화면 카드 (걸린 재판이 있을 때)
// renderLawBlock: '나' 화면 덩이 (이 고장의 법, 고발할 일, 법 솜씨, 집안의 낙인, 재판 성적, 지난 재판, 기록)
import { lawInfo } from '../law/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const REC = [['won', '이긴 재판', false], ['lost', '진 재판', true], ['pleaded', '죄를 인정함', true], ['combat', '결투 재판', false], ['ordeal', '신명 재판', false], ['bribed', '뇌물', true], ['judged', '재판관으로', false], ['witness', '증인으로', false], ['lies', '거짓 증언', true], ['pleas', '변론 맡음', false], ['pardons', '사면', false]];

const caseLi = (c) => `<li class="${c.state === '졌다' ? 'bad' : ''}"><div class="top"><strong>${esc(c.charge)}</strong><span class="note">${esc(c.state)}</span></div>
      <span class="note">${esc(c.role)}${c.other ? ` · 상대 ${esc(c.other)}` : ''} · ${esc(c.place)}${c.form ? ` · ${esc(c.form)}` : ''}${c.evidence ? ` · ${esc(c.evidence)}` : ''}</span>
      ${c.verdict ? `<span class="note">${esc(c.verdict)}</span>` : ''}</li>`;

/** 이번 달 화면 카드 */
export function renderLawNow(game) {
  const s = safe(() => lawInfo(game));
  if (!s?.open.length) return '';
  return `<section class="card law-now bad">
    <h2>법과 재판 <small>${esc(s.here.realm)} · ${esc(s.here.court)}</small></h2>
    <ul class="ct-houses lw-cases">${s.open.map(caseLi).join('')}</ul>
    <p class="note">재판관: ${esc(s.here.judge)}${s.here.forms.length ? ` · 이 법정에서 가능한 것: ${s.here.forms.map(esc).join(', ')}` : ''}${s.here.advocate ? ' · 변론인을 쓸 수 있다' : ''}</p>
  </section>`;
}

/** '나' 화면 덩이 */
export function renderLawBlock(game) {
  const s = safe(() => lawInfo(game));
  if (!s) return '';
  const chips = REC.filter(([k]) => s.rec[k]).map(([k, name, down]) => [name, `${s.rec[k]}`, down]);
  const any = chips.length || s.grievances.length || s.skill >= 1 || s.stain >= 1 || s.past.length || s.log.length || s.open.length;
  const H = s.here;
  const lawHere = `<details class="pl-more"><summary>이 고장의 법 · ${esc(H.realm)}</summary><div class="lw-here">
      <p class="note"><b>${esc(H.court)}</b> · 재판관: ${esc(H.judge)}</p>
      ${H.sum ? `<p class="note">${esc(H.sum)}</p>` : ''}
      ${H.forms.length ? `<p class="note">가릴 수 있는 길: ${H.forms.map(esc).join(', ')}${H.advocate ? ' · 변론인을 쓸 수 있다' : ' · 변론인은 설 수 없다'}</p>` : ''}</div></details>`;
  if (!any) return '';
  return `<div class="block law-block">
    <h3>법과 재판</h3>
    ${s.skillWord ? `<div class="wd-row kn-row"><span>법 솜씨 · ${esc(s.skillWord)}</span>${bar(s.skill, 'mana')}</div>` : ''}
    ${s.stain >= 1 ? `<div class="wd-row kn-row"><span>집안의 낙인${s.stainWord ? ` · ${esc(s.stainWord)}` : ''}</span>${bar(s.stain, 'low')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.grievances.length ? `<p class="note">고발할 수 있는 일: ${s.grievances.map((x) => `${esc(x.other)}의 ${esc(x.charge)} (${esc(x.place)})`).join(', ')}. 할 일의 '고발하기'로 법정에 세운다.</p>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 재판 ${s.past.length}가지</summary><ul class="ct-houses lw-cases">${s.past.map(caseLi).join('')}</ul></details>` : ''}
    ${lawHere}
    ${s.log.length ? `<details class="pl-more"><summary>법정에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
