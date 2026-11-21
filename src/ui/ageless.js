// 27단계 '불로' 화면(src/ageless). 읽기만 한다. agelessInfo가 null이면(불로도 아니고 잃은 적도 없으면) 아무것도 그리지 않는다.
// renderAgelessNow: 이번 달 한 줄 (불로인 동안)
// renderAgelessBlock: '나' 화면 덩이 (걸은 길, 멈춘 몸 나이와 실제 나이, 바꿔 쓴 이름들, 집안에 남은 잃은 불로)
import { agelessInfo } from '../ageless/core.js';
import { seventhInfo } from '../ageless/seventh.js';
import { sealbreathInfo } from '../ageless/sealbreath.js';
import { vesselInfo } from '../ageless/vessel.js';
import { imprintInfo } from '../ageless/imprint.js';
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

// 길마다 들은 조각과 그 길의 형편. 조건은 알려 주지 않고, 들은 것만 보여 준다.
function pathBits(game, path) {
  const out = [];
  const sv = safe(() => seventhInfo(game));
  if (sv?.clues?.length) out.push(`<details class="pl-more"><summary>노아에 얽힌 조각 ${sv.clues.length}개</summary><ul class="ag-clues">${sv.clues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>`);
  if (sv?.failed && path !== 'seventh') out.push('<p class="note">그 밤의 시험을 넘기지 못했다.</p>');
  const sb = safe(() => sealbreathInfo(game));
  if (sb?.heard && path !== 'sealbreath') out.push(`<p class="note">늙지 않게 한다는 숨의 소문${sb.wedge ? `: ${esc(sb.wedge)}` : ''}</p>`);
  if (sb?.hunted) out.push(`<p class="note"><b class="warn">봉인을 지키는 이들이 쫓는다</b> · 앞으로 ${sb.hunted}달쯤</p>`);
  const vs = safe(() => vesselInfo(game));
  if (vs?.active) out.push(`<div class="wd-row kn-row"><span>그릇이 삭은 정도</span><span class="wd-bar ${vs.rot >= 60 ? 'low' : ''}"><i style="width:${Math.max(0, Math.min(100, vs.rot))}%"></i></span></div>`);
  if (vs?.bodies?.length) out.push(`<details class="pl-more"><summary>옮겨 간 몸 ${vs.bodies.length}</summary><ul class="pl-news">${vs.bodies.map((b) => `<li><time>${b.y}년</time><span>${esc(b.name)}</span></li>`).join('')}</ul></details>`);
  const im = safe(() => imprintInfo(game));
  if (im?.chain?.length) out.push(`<details class="pl-more"><summary>새김으로 이어 온 몸 ${im.chain.length}</summary><ul class="pl-news">${im.chain.map((c) => `<li><time>${c.y}년</time><span>${esc(c.was)} → ${esc(c.name)}</span></li>`).join('')}</ul></details>`);
  return out.join('');
}

export function renderAgelessBlock(game) {
  const s = safe(() => agelessInfo(game));
  const bits = pathBits(game, s?.ageless ? s.path : null);
  if (!s) return bits ? `<div class="block ag-block"><h3>늙지 않는 몸</h3><p class="note">늙지 않는다는 이야기를 몇 조각 들었다.</p>${bits}</div>` : '';
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
    ${bits}
    ${s.names.length ? `<details class="pl-more"><summary>바꿔 쓴 이름 ${s.names.length}개</summary><ul class="pl-news">${s.names.map((x) => `<li><time>${x.y}년</time><span>${esc(x.name)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.lost.length ? `<details class="pl-more"${s.ageless ? '' : ' open'}><summary>잃은 불로 ${s.lost.length}번</summary><ul class="pl-news">${s.lost.map((x) => `<li><time>${x.y}년</time><span>${esc(J(x.pathName && x.pathName !== x.path ? x.pathName : '불로', '을/를'))} 잃었다${x.why ? ` · ${esc(x.why)}` : ''}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
