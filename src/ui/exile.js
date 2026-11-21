// 24단계 '유배와 망명' 화면(src/exile). 읽기만 한다.
// renderExileNow: 이번 달 화면. 유배 중이면 큰 카드(유배지·남은 해·사면 기운·그곳 사람들과의 정), 망명 중이면 한 줄.
// renderExileBlock: '나' 화면 덩이 (받아 준 나라에 진 빚, 망명 궁정과 귀환 모의, 쫓기는 몸, 세상의 망명 궁정, 지난 일, 기록)
import { exileInfo } from '../exile/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderExileNow(game) {
  const s = safe(() => exileInfo(game));
  if (!s) return '';
  const B = s.banish;
  if (B) {
    return `<section class="card exile-now bad">
    <h2>유배 <small>${esc(B.site)} · ${B.years ? `${B.years}해째` : '올해부터'}</small></h2>
    <p class="note">${esc(B.from)}에서 ${B.why === '정쟁' ? '정쟁에 밀려' : '죄를 지어'} 왔다 · ${B.left ? `남은 형기 ${B.left}해` : '형기는 다 찼다'}${B.sneak ? ' · <b class="warn">몰래 돌아와 숨어 있다</b>' : ''}</p>
    <div class="wd-row kn-row"><span>사면 · ${esc(B.word)}</span>${bar(B.pardon, 'kin')}</div>
    <div class="wd-row kn-row"><span>유배지 사람들과의 정</span>${bar(B.ties, B.ties < 20 ? 'low' : 'kin')}</div>
  </section>`;
  }
  const A = s.asylum, C = s.court;
  if (C) return `<section class="card exile-now"><p class="note"><b>망명 궁정</b> ${esc(String(C.name).includes(C.prince) ? C.name : `${C.prince}의 ${C.name}`)} (${esc(C.host)}) · 나는 ${esc(C.rank)} · ${esc(C.word)}</p></section>`;
  if (A) return `<section class="card exile-now"><p class="note"><b>망명</b> ${esc(A.realm)}에 몸을 맡긴 지 ${A.years}해 · 진 빚 ${esc(A.word)}</p></section>`;
  return '';
}

export function renderExileBlock(game) {
  const s = safe(() => exileInfo(game));
  if (!s) return '';
  const T = s.tally;
  const chips = [];
  if (T.banished) chips.push(['유배', `${T.banished}번`, 'down']);
  if (T.pardoned) chips.push(['사면받음', `${T.pardoned}번`, 'up']);
  if (T.escaped) chips.push(['유배지를 빠져나옴', `${T.escaped}번`]);
  if (T.fled) chips.push(['망명', `${T.fled}번`]);
  if (T.served) chips.push(['망명 궁정을 섬긴 달', `${T.served}`]);
  if (T.plots) chips.push(['귀환 모의', `${T.plots}번`]);
  const A = s.asylum, C = s.court;
  if (!chips.length && !A && !C && !s.banish && !s.log.length) return '';
  return `<div class="block exile-block">
    <h3>유배와 망명</h3>
    ${s.hunted ? '<p class="note"><b class="warn">고국에서 쫓기는 몸이다</b></p>' : ''}
    ${A ? `<div class="wd-row kn-row"><span>${esc(A.realm)}에 진 빚 · ${esc(A.word)}</span>${bar(A.debt, A.debt >= 40 ? 'low' : 'kin')}</div><p class="note">${esc(A.from)}에서 건너왔다 · ${A.years}해째</p>` : ''}
    ${C ? `<div class="wd-row kn-row"><span>${esc(C.prince)}의 귀환 모의 · ${esc(C.word)}</span>${bar(C.plot, 'kin')}</div><p class="note">${esc(C.name)} · ${esc(C.host)} · 나는 ${esc(C.rank)}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.courts.length && !C ? `<details class="pl-more"><summary>남의 나라에 차린 망명 궁정 ${s.courts.length}곳</summary><ul class="am-rows">${s.courts.map((x) => `<li><strong>${esc(x.name)}</strong> <span class="note">${esc(x.prince)} · ${esc(x.host)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>떠돈 자리 ${s.past.length}곳</summary><ul class="pl-news">${s.past.slice().reverse().map((x) => `<li><time>${x.y}년</time><span>${esc(x.text)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>유배와 망명에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
