// 33단계 '옷감과 재봉사' 화면(src/cloth). 읽기만 한다.
// renderClothNow: 이번 달 접는 카드 (가게·실·천·입은 옷·이 철 유행). 실이나 천, 베틀, 가게가 있을 때만.
// renderClothBlock: '나' 화면 덩이 (바느질 솜씨, 지은 것·판 것, 길드, 물려준 가게, 기록)
import { clothInfo } from '../cloth/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const list = (xs) => xs.map((x) => `${esc(x.name)} ${x.n}`).join(', ');
const wearText = (w) => `${w.color ? `${esc(w.color)} ` : ''}${esc(w.what)}${w.for ? ` · ${esc(w.for)}의 일로` : ''}`;

export function renderClothNow(game, ui = {}) {
  const s = safe(() => clothInfo(game));
  if (!s || (!s.shop && !s.yarn.length && !s.bolts.length && !s.loom)) return '';
  const S = s.shop;
  const bolts = s.bolts.reduce((a, b) => a + b.n, 0);
  const sub = S ? (S.inStyle ? '유행을 탔다' : '유행이 지났다') : bolts ? `천 ${bolts}필` : s.yarn.length ? '실을 잣는 중' : '베틀이 있다';
  return `<details class="card workshop cl-card"${ui.clOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${S ? '재봉 가게' : '옷감'}</span><strong>${esc(S ? S.name : s.rank)}</strong></span>
      <span class="ws-demand ${S && !S.inStyle ? 'down' : 'up'}">${esc(sub)}</span>
    </summary>
    <div class="ws-body">
      ${S ? `<p class="note">${esc(S.place)} · ${S.since}년부터 · 이름값 ${S.rep}${S.guild ? ' · 길드 가게' : ' · <b class="warn">길드 밖</b>'}${S.back ? ' · 뒷방이 있다' : ''}${S.apprentice ? ` · 도제 ${esc(S.apprentice)}` : ''}${S.owed ? ` · 외상 은화 ${S.owed}닢` : ''}</p>` : ''}
      ${s.yarn.length ? `<p class="note">실: ${list(s.yarn)}</p>` : ''}
      ${s.bolts.length ? `<p class="note">천: ${list(s.bolts)}</p>` : ''}
      ${s.loom ? '<p class="note">집에 베틀이 있다.</p>' : ''}
      ${s.wear ? `<p class="note">입은 옷: ${wearText(s.wear)}</p>` : ''}
      <p class="note">이 철 유행: ${esc(s.fashion.name)}${s.fashion.dye ? ` (${esc(s.fashion.dye)})` : ''}${s.fashion.mine ? ' · 내가 퍼뜨렸다' : ''}</p>
    </div>
  </details>`;
}

export function renderClothBlock(game) {
  const s = safe(() => clothInfo(game));
  if (!s || (!s.hand && !s.made && !s.shop && !s.past.length && !s.log.length)) return '';
  const chips = [];
  if (s.made) chips.push(['지은 옷', `${s.made}벌`]);
  if (s.sold) chips.push(['판 옷', `${s.sold}벌`]);
  if (s.earned) chips.push(['번 돈', `은화 ${s.earned}닢`, 'up']);
  if (s.guild.me) chips.push(['길드', '길드장', 'up']);
  else if (s.guild.member) chips.push(['길드', `회비 ${s.guild.dues}닢`]);
  const variant = s.shop ? 'shop' : s.fashion.mine || s.wear?.color ? 'dye' : 'loom';
  const art = safe(() => vignetteImage({ plate: 'cloth', variant, year: game.date.year, month: game.date.month }), '');
  const ALT = { shop: '재봉 가게의 재단대', dye: '염색 통과 물든 천', loom: '베틀 앞의 저녁' };
  return `<div class="block cl-block">
    <h3>옷감과 바느질</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[variant]}">` : ''}
    ${s.hand ? `<div class="wd-row kn-row"><span>바느질 솜씨 · ${esc(s.rank)}</span>${bar(s.hand, 'kin')}<span class="v">${s.hand}</span></div>` : ''}
    ${s.shop ? `<p><strong>${esc(s.shop.name)}</strong> · ${esc(s.shop.place)} · ${s.shop.since}년부터</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.guild.master ? `<p class="note">재봉 길드장: ${esc(s.guild.master)}</p>` : ''}
    ${s.fashion.mine ? `<p class="note">${J(s.fashion.name, '이/가')} 거리에 퍼진 건 내 손에서 시작됐다.</p>` : ''}
    ${s.past.length ? `<ul class="ag-clues">${s.past.slice().reverse().map((p) => `<li>${esc(p.name)} · ${esc(p.place)} · ${p.since}~${p.y}년${p.to ? ` · ${esc(p.to)}에게 넘어감` : ' · 문을 닫음'}</li>`).join('')}</ul>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>바늘과 베틀로 지난 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
