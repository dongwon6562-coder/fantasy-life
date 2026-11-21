// 28단계 '정령과 계약' 화면(src/spirit). 읽기만 한다. 지도 고장 칸의 정령 자리는 src/spirit가 MAP_INFO로 붙인다.
// renderSpiritNow: 이번 달 한 줄 (계약이나 깨진 계약이 남았을 때)
// renderSpiritBlock: '나' 화면 덩이 (정령을 보는 눈, 계약과 그 조건·받은 것·마음, 깨진 계약이 남긴 것, 아는 정령, 기록)
import { spiritInfo, spiritLine } from '../spirit/index.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderSpiritNow(game) {
  const line = safe(() => spiritLine(game));
  if (!line) return '';
  const s = safe(() => spiritInfo(game));
  if (s?.pact) return `<section class="card sp-now"><p class="note"><b>정령 계약</b> ${esc(s.pact.name)} · ${esc(s.pact.favorWord)}</p></section>`;
  if (s?.curse) return `<section class="card sp-now"><p class="note"><b class="warn">깨진 계약</b> ${esc(s.curse.name)} · ${esc(s.curse.text)}${s.curse.years ? ` · 앞으로 ${s.curse.years}해` : ''}</p></section>`;
  return `<section class="card sp-now"><p class="note">${esc(line)}</p></section>`;
}

export function renderSpiritBlock(game) {
  const s = safe(() => spiritInfo(game));
  if (!s) return '';
  const m = s.me ?? {};
  if (!s.sight && !s.pact && !s.curse && !m.pacts && !s.log.length) return '';
  const chips = [];
  if (m.seen) chips.push(['마주친 정령', `${m.seen}`]);
  if (m.pacts) chips.push(['맺은 계약', `${m.pacts}`]);
  if (m.broken) chips.push(['깨진 계약', `${m.broken}`, 'down']);
  const P = s.pact, C = s.curse;
  return `<div class="block sp-block">
    <h3>정령</h3>
    <p class="note">정령을 보는 눈 · <strong>${esc(s.sightWord)}</strong></p>
    ${P ? `<div class="sp-pact">
      <p><strong>${esc(P.name)}</strong> · ${esc(P.home)}${P.years ? ` · 계약한 지 ${P.years}해` : ''}</p>
      <p class="note"><b>지킬 것</b> ${esc(P.term)}</p>
      <p class="note"><b>받는 것</b> ${esc(P.gift)}</p>
      <div class="wd-row kn-row"><span>정령의 마음 · ${esc(P.favorWord)}</span>${bar(P.favor, P.favor < 20 ? 'low' : 'kin')}</div>
      ${P.breaches ? `<p class="note"><b class="warn">어긴 일</b> ${P.breaches}번</p>` : ''}
    </div>` : ''}
    ${C ? `<p class="note"><b class="warn">${esc(C.heavy ? `${C.name}의 무거운 앙갚음` : `${J(C.name, '이/가')} 남긴 것`)}</b> ${esc(C.text)}${C.years ? ` · 앞으로 ${C.years}해` : ''}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.known.length ? `<details class="pl-more"><summary>아는 정령 ${s.known.length}</summary><ul class="ag-clues">${s.known.map((k) => `<li><strong>${esc(k.name)}</strong> · ${esc(k.home)} · ${esc(k.mood)}<br><span class="note">${esc(k.desc)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>정령에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
