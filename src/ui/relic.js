// 26단계 '용사 시대의 성유물' 화면(src/relic). 읽기만 한다. 지도 고장 칸의 소문 한 줄은 src/relic가 MAP_INFO로 붙인다.
// renderRelicNow: 이번 달 한 줄 (유물을 쥐었을 때)
// renderRelicBlock: '나' 화면 덩이 (쥔 유물과 그 값, 소문으로 아는 유물, 찾은·바친·판 수, 기록)
import { relicInfo, relicLine } from '../relic/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderRelicNow(game) {
  const line = safe(() => relicLine(game));
  if (!line) return '';
  const body = line.replace(/^성유물:\s*/, '');
  return `<section class="card rl-now"><p class="note"><b>성유물</b> ${esc(body)}</p></section>`;
}

export function renderRelicBlock(game) {
  const s = safe(() => relicInfo(game));
  if (!s) return '';
  const known = s.relics.filter((r) => r.known && !r.mine);
  const m = s.me ?? {};
  const chips = [];
  if (m.found) chips.push(['찾은 유물', `${m.found}`, 'up']);
  if (m.given) chips.push(['바친 유물', `${m.given}`]);
  if (m.sold) chips.push(['판 유물', `${m.sold}`]);
  if (m.fakes) chips.push(['속은 가짜', `${m.fakes}`, 'down']);
  if (!s.mine.length && !known.length && !chips.length && !s.log.length) return '';
  return `<div class="block rl-block">
    <h3>성유물</h3>
    ${s.mine.map((r) => `<div class="rl-item">
      <p><strong>${esc(r.name)}</strong> · ${esc(r.what)}${r.bond === '고름' ? ' · <b class="ok">나를 골랐다</b>' : r.bond === '거부' ? ' · <b class="warn">나를 거부했다</b>' : ''}</p>
      <p class="note">${esc(r.desc)}</p>
      ${r.price ? `<p class="note"><b class="warn">치르는 값</b> ${esc(r.price)}</p>` : ''}
    </div>`).join('')}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${known.length ? `<details class="pl-more"><summary>소문으로 아는 유물 ${known.length}가지</summary><ul class="pl-news">${known.map((r) => `<li><time>${esc(r.kind)}</time><span><strong>${esc(r.name)}</strong> (${esc(r.what)}) · ${esc(r.rumor)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>유물에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
