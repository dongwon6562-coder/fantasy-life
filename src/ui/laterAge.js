// 34단계 '그 뒤 시대' 화면. 읽기만 한다.
// renderLater: 지도 카드 '새 기술과 세력' (마탑·성광교·상단·왕실이 새 기술에 서는 법, 마석 고갈 걱정; src/later_era)
// renderCity: 지도 카드 '공장 거리' (공장 도시의 북적임·품삯·파업, 사라지는 일과 새 일; src/cityday)
// renderNewage: 지도 카드 '새 시대의 사람들' (신흥 부자와 기운 옛 가문, 기계에 대한 분노, 신문과 여론, 비밀 모임, 옛 방식을 지키는 마을; src/newage)
// renderLaterBlock: '나' 화면 덩이 '새 시대' (파업·칼럼·모임·마석 사재기·비행선… 내가 겪은 일과 기록)
import { laterInfo } from '../later_era/index.js';
import { cityInfo } from '../cityday/index.js';
import { newageInfo } from '../newage/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const has = (g, id) => !!g.history?.inventions?.includes(id);
const art = (g, plate, variant) => safe(() => vignetteImage({ plate, variant, year: g.date.year, month: g.date.month }), '');
const img = (src, alt) => (src ? `<img class="blk-art" src="${src}" alt="${esc(alt)}">` : '');
const news = (log) => `<ul class="pl-news">${log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul>`;

export function renderLater(game) {
  const s = safe(() => laterInfo(game));
  if (!s || ((game.realm?.era ?? 0) < 1 && !s.deplete)) return '';
  const v = has(game, 'railroad') ? 'rail' : has(game, 'press') ? 'press' : has(game, 'streetlamp') ? 'lamp' : 'bench';
  const ALT = { rail: '쇠수레 길을 놓는 사람들', press: '인쇄소', lamp: '처음 켜진 가로등', bench: '공방의 시제품' };
  return `<section class="card la-map">
    <h2>새 기술과 세력 <small>${esc(s.era)}</small></h2>
    ${img(art(game, 'tech', v), ALT[v])}
    ${s.sides.map((x) => `<div class="wd-row kn-row"><span>${esc(x.name)}</span>${bar((x.stance + 100) / 2, x.stance < -10 ? 'low' : 'kin')}<span class="v">${esc(x.word)}</span></div>`).join('')}
    ${s.deplete ? `<div class="wd-row kn-row"><span>마석 고갈 걱정</span>${bar(s.deplete, s.deplete >= 45 ? 'low' : 'kin')}<span class="v">${s.deplete}</span></div><p class="note">${esc(s.depleteWord)}</p>` : ''}
    ${s.sides.some((x) => x.last) ? `<ul class="ag-clues">${s.sides.filter((x) => x.last).map((x) => `<li><b>${esc(x.name)}</b> ${esc(typeof x.last === 'string' ? x.last : x.last.text ?? '')}</li>`).join('')}</ul>` : ''}
  </section>`;
}

export function renderCity(game) {
  const s = safe(() => cityInfo(game));
  if (!s || (!s.factory && !s.fading.length)) return '';
  const strike = s.towns.some((t) => t.strike);
  const v = strike ? 'strike' : s.factory ? (game.life?.home === 'rent' ? 'tenement' : 'mill') : 'idle';
  const ALT = { strike: '닫힌 공장 문', tenement: '셋방 골목', mill: '공장 안', idle: '일을 잃은 마부' };
  return `<section class="card ct-map">
    <h2>공장 거리</h2>
    ${img(art(game, 'city', v), ALT[v])}
    ${s.towns.length ? `<ul class="ag-clues">${s.towns.map((t) => `<li><b>${esc(t.name)}</b> · ${esc(t.crowd)} · 품삯 ${t.wage}%${t.strike ? ' · <b class="warn">파업 중</b>' : ''}</li>`).join('')}</ul>` : ''}
    ${s.newJobs.length ? `<p class="note">새로 생긴 일: ${s.newJobs.map(esc).join(', ')}</p>` : ''}
    ${s.fading.length ? `<p class="note">사라져 가는 일: ${s.fading.map(esc).join(', ')}</p>` : ''}
    ${s.blacklisted.length ? `<p class="note"><b class="warn">공장 명부에 이름이 올라</b> 일자리를 못 얻는 곳: ${s.blacklisted.map(esc).join(', ')}</p>` : ''}
  </section>`;
}

export function renderNewage(game) {
  const s = safe(() => newageInfo(game));
  if (!s || !Object.values(s.open).some(Boolean)) return '';
  const rows = [];
  if (s.rich.length) rows.push(`<li><b>새로 돈을 번 집안</b> ${s.rich.map((x) => `${esc(x.name)}(${esc(x.trade)}, ${esc(x.place)})`).join(', ')}</li>`);
  if (s.old.length) rows.push(`<li><b>기운 옛 가문</b> ${s.old.map((x) => `${esc(x.name)} · ${esc(x.fate)}`).join(', ')}</li>`);
  if (s.anger.length) rows.push(`<li><b>기계에 대한 분노</b> ${s.anger.map((x) => `${esc(x.place)}: ${/망치/.test(x.word) ? `<b class="warn">${esc(x.word)}</b>` : esc(x.word)}`).join(' · ')}</li>`);
  if (s.breaks.length) rows.push(`<li><b>기계를 부순 밤</b> ${s.breaks.map((x) => `${esc(x.place)} ${x.y}년`).join(', ')}</li>`);
  if (s.papers.length) rows.push(`<li><b>신문</b> ${s.papers.map((p) => `${esc(p.name)}(${esc(p.place)}, ${esc(p.lean)})`).join(', ')}</li>`);
  if (s.societies.length) rows.push(`<li><b>입소문 나는 모임</b> ${s.societies.map((x) => `${esc(x.name)} · ${esc(x.idea)} · ${esc(x.place)}${x.mine ? ' · 내가 든 곳' : ''}`).join(', ')}</li>`);
  if (s.shops.length) rows.push(`<li><b>새 공방과 조합</b> ${s.shops.map((x) => `${esc(x.place)} ${esc(x.shop)}: ${esc(x.end)}`).join(', ')}</li>`);
  const vill = s.villages.filter((x) => x.v != null);
  const v = s.anger.some((x) => x.v >= 60) || s.breaks.length ? 'breakers' : s.societies.some((x) => x.mine) ? 'meeting' : s.press || s.papers.length ? 'paper' : 'quarrel';
  const ALT = { breakers: '기계를 부수는 밤', meeting: '지하실 모임', paper: '벽보 앞의 사람들', quarrel: '떠나는 자식' };
  return `<section class="card na-map">
    <h2>새 시대의 사람들</h2>
    ${img(art(game, 'newage', v), ALT[v])}
    ${s.opinion ? `<div class="wd-row kn-row"><span>여론</span>${bar(s.opinion.v, 'kin')}<span class="v">${esc(s.opinion.word)}</span></div>` : ''}
    ${s.letters ? `<p class="note">${esc(s.letters.word)}</p>` : ''}
    ${rows.length ? `<ul class="ag-clues">${rows.join('')}</ul>` : ''}
    ${vill.length ? `<p class="note">마을들: ${vill.map((x) => `${esc(x.place)} ${esc(x.word)}${x.hands > 5 ? `, ${esc(x.handsWord)}` : ''}`).join(' · ')}${s.left ? ` · 마을을 떠난 사람 ${s.left}명 남짓` : ''}</p>` : ''}
  </section>`;
}

export function renderLaterBlock(game) {
  const L = safe(() => laterInfo(game)), C = safe(() => cityInfo(game)), N = safe(() => newageInfo(game));
  const chips = [];
  if (C?.struck) chips.push(['파업에 섬', `${C.struck}번`]);
  if (C?.led) chips.push(['파업을 이끎', `${C.led}번`, 'up']);
  if (C?.scab) chips.push(['파업을 깸', `${C.scab}번`, 'down']);
  if (L?.me.flew) chips.push(['비행선', `${L.me.flew}번`]);
  if (L?.me.gunDuel) chips.push(['총포와 맞섬', `${L.me.gunDuel}번`]);
  if (L?.me.hoard) chips.push(['사 둔 마석', `${L.me.hoard}`]);
  if (L?.me.hid) chips.push(['숨겨 준 사람', `${L.me.hid}번`]);
  if (L?.me.reported) chips.push(['고발', `${L.me.reported}번`, 'down']);
  if (N?.column) chips.push(['칼럼', `${N.column.n}편`]);
  const log = [...(C?.log ?? []), ...(L?.log ?? []).slice().reverse(), ...(N?.log ?? [])].filter((x) => x?.text).sort((a, b) => (a.y - b.y) || ((a.m ?? 0) - (b.m ?? 0))).reverse();
  const kids = C?.kidsAtMill ?? [];
  const soc = N?.societies.find((x) => x.mine);
  if (!chips.length && !log.length && !kids.length && !soc) return '';
  const v = N?.column ? 'paper' : soc ? 'meeting' : C?.struck || C?.led ? 'strike' : null;
  const src = v ? (v === 'strike' ? art(game, 'city', 'strike') : art(game, 'newage', v)) : '';
  return `<div class="block la-block">
    <h3>새 시대</h3>
    ${img(src, { paper: '벽보 앞의 사람들', meeting: '지하실 모임', strike: '닫힌 공장 문' }[v] ?? '')}
    ${N?.column ? `<p><strong>${esc(N.column.paper ?? '신문')}</strong> · ${esc(N.column.lean)} 쪽 칼럼을 쓴다</p>` : ''}
    ${soc ? `<p><strong>${esc(soc.name)}</strong> · ${esc(soc.idea)} · ${esc(soc.place)}</p>` : ''}
    ${kids.length ? `<p class="note">공장에 나가는 아이: ${kids.map(esc).join(', ')}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${log.length ? `<details class="pl-more"><summary>새 시대에 겪은 일 ${log.length}가지</summary>${news(log.slice(0, 16))}</details>` : ''}
  </div>`;
}
