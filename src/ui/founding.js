// 32단계 '내 나라 세우기' 화면(src/founding). 읽기만 한다.
// renderFoundingBlock: '나' 화면 덩이 (세운 나라: 이름·수도·대·정통성·안정·관·법·신하·이웃의 인정·전쟁, 나라를 세울 형편, 지난 나라, 기록)
// renderFoundings: 지도 화면 카드 (요즘 새로 선 나라들과 무너진 나라들)
// renderFoundingChron: 연대기 '레오니아' 칸 위 (세운 나라의 왕들 차례, 새로 서고 무너진 나라들)
import { foundingInfo } from '../founding/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const news = (list) => `<ul class="pl-news">${list.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul>`;

export function renderFoundingBlock(game) {
  const s = safe(() => foundingInfo(game));
  if (!s || (!s.realm && !s.ready && !s.past.length)) return '';
  const R = s.realm, Q = s.ready;
  // 나라가 흔들리면 무너진 왕좌, 관을 썼으면 대관, 막 세웠으면 선포
  const variant = R ? (R.stab < 25 ? 'fallen' : /썼|받았/.test(R.crown) && !/아직/.test(R.crown) ? 'crown' : 'proclaim') : s.past.length ? 'fallen' : '';
  const art = variant ? safe(() => vignetteImage({ plate: 'founding', variant, year: game.date.year, month: game.date.month }), '') : '';
  const ALT = { proclaim: '광장에서 새 나라를 선포하는 날', crown: '새 왕의 대관식', fallen: '무너진 왕좌' };
  return `<div class="block fd-block">
    <h3>내 나라</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[variant]}">` : ''}
    ${R ? `<p><strong>${esc(R.name)}</strong> · ${esc(R.title)} · 수도 ${esc(R.capital)}</p>
      <p class="note">${R.y}년에 ${esc(J(R.founder, '이/가'))} 세움 · ${R.years ? `${R.years}해째` : '올해 세움'}${R.gen > 1 ? ` · ${R.gen}대` : ''} · ${esc(R.crown)}${R.law ? ` · 법: ${esc(R.law)}` : ''}</p>
      <div class="wd-row kn-row"><span>정통성 · ${esc(R.legitWord)}</span>${bar(R.legit, R.legit < 30 ? 'low' : 'kin')}</div>
      <div class="wd-row kn-row"><span>나라 형편 · ${esc(R.stabWord)}</span>${bar(R.stab, R.stab < 30 ? 'low' : 'kin')}</div>
      ${R.war ? `<p class="note"><b class="warn">${esc(J(R.war.realm, '과/와'))} 전쟁 ${R.war.months}달째</b> · ${esc(R.war.word)}</p>` : ''}
      ${R.council.length ? `<ul class="ag-clues fd-council">${R.council.map((c) => `<li>${esc(c.role)} ${esc(c.name)} · ${esc(c.word)}</li>`).join('')}</ul>` : ''}
      ${R.recog.length ? `<p class="note">${R.recog.map((x) => `${esc(x.realm)}: ${esc(x.word)}`).join(' · ')}</p>` : ''}` : ''}
    ${!R && Q ? `<p class="note">${esc(Q.place)}에서(${esc(Q.base)}) 나라를 세울 수 ${Q.ok ? '<strong>있다</strong>' : '있을지도 모른다'}${Q.missing.length ? ` · 모자란 것: ${Q.missing.map(esc).join(', ')}` : ''}${Q.causes.length ? ` · 명분: ${Q.causes.map(esc).join(', ')}` : ''}</p>` : ''}
    ${s.past.length ? `<p class="note">지난 나라: ${s.past.map((p) => `${esc(p.name)} (${p.y0}~${p.y1}년${p.how ? `, ${esc(p.how)}` : ''})`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>나라에 있었던 일 ${s.log.length}가지</summary>${news(s.log.slice().reverse())}</details>` : ''}
  </div>`;
}

export function renderFoundings(game) {
  const s = safe(() => foundingInfo(game));
  if (!s || (!s.world.length && !s.fallen.length && !s.realm)) return '';
  const R = s.realm;
  return `<section class="card fd-card">
    <h2>새로 선 나라들 <small>${s.world.length + (R ? 1 : 0)}곳</small></h2>
    <ul class="ag-clues">
      ${R ? `<li class="mine"><strong>${esc(R.name)}</strong> · 수도 ${esc(R.capital)} · ${R.y}년 · 내 나라</li>` : ''}
      ${s.world.map((w) => `<li><strong>${esc(w.name)}</strong> · ${esc(w.place)} · ${w.y}년${w.by ? ` · ${esc(J(w.by, '이/가'))} 세움` : ''}</li>`).join('')}
    </ul>
    ${s.fallen.length ? `<p class="note">무너진 나라: ${s.fallen.map((w) => `${esc(w.name)} (${esc(w.place)}, ${w.y}~${w.fall}년)`).join(', ')}</p>` : ''}
  </section>`;
}

export function renderFoundingChron(game) {
  const s = safe(() => foundingInfo(game));
  const R = s?.realm;
  if (!s || (!R && !s.past.length && !s.world.length && !s.fallen.length)) return '';
  return `<section class="card fd-chron">
    <h2>세워진 나라들 <small>${R ? esc(R.name) : '이 땅의 새 왕관들'}</small></h2>
    ${R?.reign?.length ? `<h3 class="sub">${esc(R.name)}의 ${esc(R.title)}들</h3><ol class="fd-reign">${R.reign.map((x) => `<li><b>${esc(x.name)}</b> · ${x.y}년부터</li>`).join('')}</ol>` : ''}
    ${s.past.length ? `<p class="note">집안이 세웠던 나라: ${s.past.map((p) => `${esc(p.name)} ${p.y0}~${p.y1}년${p.gens > 1 ? ` (${p.gens}대)` : ''}`).join(', ')}</p>` : ''}
    ${s.world.length || s.fallen.length ? `<ul class="pl-news">${[...s.world.map((w) => ({ y: w.y, t: `${J(w.name, '이/가')} ${w.place}에서 서다` })), ...s.fallen.map((w) => ({ y: w.fall, t: `${w.place}의 ${J(w.name, '이/가')} 무너지다` }))].sort((a, b) => b.y - a.y).map((x) => `<li><time>${x.y}년</time><span>${esc(x.t)}</span></li>`).join('')}</ul>` : ''}
  </section>`;
}
