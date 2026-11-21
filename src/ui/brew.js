// 28단계 '양조장' 화면(src/brew). 읽기만 한다.
// renderBrewNow: 이번 달 화면 접는 카드 (술통이나 양조장이 있을 때: 양조장 이름·이름값·증류기·세금·납품 약속, 술통마다 익은 정도와 값, 재료, 금주령)
// renderBrewBlock: '나' 화면 덩이 (빚는 솜씨, 빚은·판 술과 번 돈, 이름난 술, 기록)
import { brewStatus } from '../brew/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

const caskRow = (c) => {
  const st = c.state === '식초가 되었다' ? `<b class="warn">${esc(c.state)}</b>` : c.state === '가장 좋을 때다' ? `<b class="ok">${esc(c.state)}</b>` : esc(c.state);
  return `<li>${esc(c.name)} · ${c.year}년 ${esc(c.taste)} · ${st}${c.value ? ` · 은화 ${c.value}닢쯤` : ''}</li>`;
};

export function renderBrewNow(game, ui = {}) {
  const s = safe(() => brewStatus(game));
  if (!s || (!s.casks.length && !s.cellar)) return '';
  const P = s.cellar;
  const best = s.casks.filter((c) => c.state === '가장 좋을 때다').length;
  const sour = s.casks.filter((c) => c.state === '식초가 되었다').length;
  const sub = sour ? `식초가 된 통 ${sour}` : best ? `가장 좋을 때인 통 ${best}` : `술통 ${s.casks.length}개`;
  return `<details class="card workshop brew-card"${ui.brewOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${P ? '내 양조장' : '술통'}</span><strong>${esc(P ? P.name : `빚는 솜씨 ${s.skill}`)}</strong></span>
      <span class="ws-demand ${sour ? 'down' : 'up'}">${esc(sub)}</span>
    </summary>
    <div class="ws-body">
      ${s.banned ? '<p class="note"><b class="warn">금주령</b> 흉년이라 술을 팔지 못한다.</p>' : ''}
      ${P ? `<p class="note">${esc(P.place)}${P.gens > 1 ? ` · ${P.gens}대째` : ''}${P.still ? ' · 증류기 있음' : ''} · 술 세금 ${P.taxRate}%${P.taxOwed ? ` · <b class="warn">밀린 세금 은화 ${P.taxOwed}닢</b>` : ''} · 지난번 은화 ${P.last}닢</p>
      <div class="wd-row kn-row"><span>이름 · ${esc(P.fameWord)}</span>${bar(P.fame, P.fame < 20 ? 'low' : 'kin')}</div>
      ${P.contract ? `<p class="note">납품 약속: ${esc(P.contract.name)}에 ${esc(P.contract.drink)}, 남은 ${P.contract.left}통</p>` : ''}` : ''}
      <p class="note">술통 ${s.casks.length}/${s.cap}</p>
      ${s.casks.length ? `<ul class="ag-clues br-casks">${s.casks.map(caskRow).join('')}</ul>` : ''}
      ${s.stock.length ? `<p class="note">재료: ${s.stock.map((x) => `${esc(x.name)} ${x.n}`).join(', ')}</p>` : ''}
    </div>
  </details>`;
}

export function renderBrewBlock(game) {
  const s = safe(() => brewStatus(game));
  if (!s) return '';
  const chips = [];
  if (s.brewed) chips.push(['빚은 술', `${s.brewed}통`]);
  if (s.sold) chips.push(['판 술', `${s.sold}통`]);
  if (s.earned) chips.push(['번 돈', `은화 ${s.earned}닢`, 'up']);
  return `<div class="block brew-block">
    <h3>양조장</h3>
    ${s.skill >= 1 ? `<div class="wd-row kn-row"><span>빚는 솜씨 ${s.skill}</span>${bar(s.skill, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.named.length ? `<p class="note">이름난 술: ${s.named.map((n) => `<strong>${esc(n.name)}</strong>`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>술에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
