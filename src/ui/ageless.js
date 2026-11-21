// 27단계 '불로' 화면(src/ageless). 읽기만 한다. agelessInfo가 null이면(불로도 아니고 잃은 적도 없으면) 아무것도 그리지 않는다.
// renderAgelessNow: 이번 달 한 줄 (불로인 동안)
// renderAgelessBlock: '나' 화면 덩이 (걸은 길, 멈춘 몸 나이와 실제 나이, 바꿔 쓴 이름들, 집안에 남은 잃은 불로)
import { agelessInfo } from '../ageless/core.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const KIND = { free: '대가 없는 길', price: '대가를 치르는 길', forbidden: '금지된 길' };

export function renderAgelessNow(game) {
  const s = safe(() => agelessInfo(game));
  if (!s?.ageless) return '';
  const extra = s.realAge != null && s.realAge > s.at ? ` · 세상 나이로는 ${s.realAge}살` : '';
  return `<section class="card ag-now"><p class="note"><b>늙지 않는 몸</b> 몸은 ${s.at}살에 멈췄다${extra}${s.years ? ` · 멈춘 지 ${s.years}해` : ''}</p></section>`;
}

export function renderAgelessBlock(game) {
  const s = safe(() => agelessInfo(game));
  if (!s) return '';
  const chips = [];
  if (s.ageless) {
    chips.push(['멈춘 몸 나이', `${s.at}살`]);
    if (s.realAge != null) chips.push(['세상 나이', `${s.realAge}살`]);
    if (s.years) chips.push(['멈춘 지', `${s.years}해`]);
  }
  const pathName = s.pathName ?? '알 수 없는 길';
  return `<div class="block ag-block">
    <h3>늙지 않는 몸</h3>
    ${s.ageless ? `<p><strong>${esc(pathName)}</strong>${s.kind && KIND[s.kind] ? ` · <span class="${s.kind === 'free' ? '' : 'ag-price'}">${KIND[s.kind]}</span>` : ''}</p>
    ${s.blurb ? `<p class="note">${esc(s.blurb)}</p>` : ''}
    <p class="note">늙지 않을 뿐이다. 칼과 병과 굶주림으로는 여전히 죽는다.</p>` : '<p class="note">불로를 잃거나 내려놓은 일이 집안 이야기로 남았다.</p>'}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.names.length ? `<details class="pl-more"><summary>바꿔 쓴 이름 ${s.names.length}개</summary><ul class="pl-news">${s.names.map((x) => `<li><time>${x.y}년</time><span>${esc(x.name)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.lost.length ? `<details class="pl-more"${s.ageless ? '' : ' open'}><summary>잃은 불로 ${s.lost.length}번</summary><ul class="pl-news">${s.lost.map((x) => `<li><time>${x.y}년</time><span>${esc(J(x.pathName && x.pathName !== x.path ? x.pathName : '불로', '을/를'))} 잃었다${x.why ? ` · ${esc(x.why)}` : ''}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
