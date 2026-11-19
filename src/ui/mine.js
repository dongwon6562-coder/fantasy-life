// 21단계 '광산과 땅 밑 일' 화면(src/mine). 읽기만 한다.
// renderMines: 지도 화면 카드 (광산마다 광석·주인·광맥·안전·광부들의 기색, 파업·붕괴·깨어난 것, 광석 시세, 기록)
// renderMineNow: 이번 달 화면 한 줄 (내 광산이 있거나, 이 고장 광산이 막히거나 파업일 때)
// renderMineBlock: '나' 화면 덩이 (내 광산, 광부로 일한 기록, 갱도 지식, 드워프 길드의 눈)
import { mineInfo, mineLine } from '../mine/index.js';
import { J } from '../narrative/text.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const trouble = (m) => [m.awoke ? `<b class="warn">${esc(J(m.awoke, '이/가'))} 깨어나 막혔다</b>` : '', m.strike ? '<b class="warn">파업 중</b>' : '', m.closed && !m.awoke ? '갱도를 닫았다' : ''].filter(Boolean);

export function renderMineNow(game) {
  const line = safe(() => mineLine(game), null);
  if (!line) return '';
  const text = line.replace(/^광산:\s*/, '');
  const bad = /막혔다|파업/.test(text);
  return `<section class="card mine-now"><p class="note"><b${bad ? ' class="warn"' : ''}>광산</b> ${esc(text)}</p></section>`;
}

export function renderMines(game) {
  const s = safe(() => mineInfo(game));
  if (!s || !s.all.length) return '';
  const hereIds = new Set(s.here.map((m) => m.id));
  const row = (m) => {
    const bits = [`${esc(m.ore)} · ${esc(m.mine ? '내 광산' : m.owner)}${m.ownerName && !m.mine ? ` (${esc(m.ownerName)})` : ''}`, `깊이 ${m.depth}`, esc(m.vein), esc(m.safety)];
    if (m.unrest) bits.push(esc(m.unrest));
    if (m.collapses) bits.push(`무너진 일 ${m.collapses}번${m.dead ? `, 죽은 광부 ${m.dead}명` : ''}`);
    if (!m.legal) bits.push('<b class="warn">광업권 없이 판다</b>');
    const t = trouble(m);
    return `<li class="${m.mine ? 'here' : m.awoke ? 'bad' : ''}"><div class="top"><strong>${esc(m.name)}</strong><span class="note">${esc(m.place)}${hereIds.has(m.id) ? ' · 여기' : ''}</span></div>
      <span class="note">${bits.join(' · ')}</span>${t.length ? `<span class="note">${t.join(' · ')}</span>` : ''}</li>`;
  };
  const sorted = s.all.slice().sort((a, b) => (b.mine - a.mine) || (hereIds.has(b.id) - hereIds.has(a.id)) || (!!b.awoke - !!a.awoke) || (b.strike - a.strike));
  const top = sorted.slice(0, 5), rest = sorted.slice(5);
  return `<section class="card mine-card">
    <h2>광산 <small>${s.all.length}곳${s.dwarf ? ` · 드워프 길드: ${esc(s.dwarf)}` : ''}</small></h2>
    <ul class="ct-houses mn-list">${top.map(row).join('')}</ul>
    ${rest.length ? `<details class="pl-more"><summary>다른 광산 ${rest.length}곳</summary><ul class="ct-houses mn-list">${rest.map(row).join('')}</ul></details>` : ''}
    ${s.prices.length ? `<details class="pl-more"><summary>광석 시세</summary><ul class="pl-news">${s.prices.map((p) => `<li><time>은화 ${p.price}닢</time><span>${esc(p.ore)} 한 짐</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>광산에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderMineBlock(game) {
  const s = safe(() => mineInfo(game));
  const M = s?.me;
  if (!M) return '';
  const chips = [];
  if (M.shifts) chips.push(['갱도에서 일함', `${M.shifts}번`]);
  if (M.finds) chips.push(['찾은 광맥', `${M.finds}곳`]);
  if (M.owned) chips.push(['가져 본 광산', `${M.owned}곳`]);
  if (M.sold) chips.push(['판 광산', `${M.sold}곳`]);
  if (M.income) chips.push(['광산으로 번 돈', `은화 ${M.income}닢`]);
  if (M.strikes) chips.push(['파업 줄에 섬', `${M.strikes}번`]);
  if (M.scabbed) chips.push(['파업을 깸', `${M.scabbed}번`, true]);
  if (M.saved) chips.push(['구해 낸 광부', `${M.saved}명`]);
  if (M.sealed) chips.push(['막은 깊은 것', `${M.sealed}번`]);
  if (!chips.length && !s.mine.length && M.lore < 1) return '';
  const mine = (m) => `<li class="${m.awoke || m.strike ? 'bad' : ''}"><div class="top"><strong>${esc(m.name)}</strong><span class="note">${esc(m.place)} · ${esc(m.ore)}</span></div>
    <span class="note">광부 ${m.miners}명 · 품삯 ${m.wage}닢 · 깊이 ${m.depth} · 한 달에 ${m.output}짐쯤 · ${esc(m.vein)} · ${esc(m.safety)}${m.unrest ? ` · ${esc(m.unrest)}` : ''}</span>
    ${trouble(m).length ? `<span class="note">${trouble(m).join(' · ')}</span>` : ''}</li>`;
  return `<div class="block mine-block">
    <h3>광산과 땅 밑</h3>
    ${s.mine.length ? `<p class="note">지난달 광산 몫: 은화 ${M.lastIncome}닢</p><ul class="ct-houses mn-list">${s.mine.map(mine).join('')}</ul>` : ''}
    ${M.lore >= 1 ? `<div class="wd-row kn-row"><span>갱도 지식</span>${bar(M.lore, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.dwarf ? `<p class="note">드워프 길드가 보는 나: ${esc(s.dwarf)}</p>` : ''}
  </div>`;
}
