// 15단계 '내기와 겨루기' 화면(src/contest). 읽기만 한다. '나' 화면 덩이.
import { contestStatus } from '../contest/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const WHAT = { gamble: '노름판', fair: '고장 대회', arena: '투기장' };
const signed = (n) => `${n > 0 ? '+' : ''}${n}`;

export function renderContestBlock(game) {
  const s = safe(() => contestStatus(game));
  if (!s) return '';
  const G = s.gamble, A = s.arena;
  const fought = (A.wins ?? 0) + (A.losses ?? 0);
  const any = G.games || fought || s.titles.length || s.past.length || s.fixed || s.banned.length || s.log.length || G.itch >= 15;
  if (!any && !s.fair) return '';
  const tags = [];
  for (const t of s.titles) tags.push([`${t.text} (${t.year}년)`, 'gift']);
  for (const t of s.past.slice(-3)) tags.push([`선대: ${t.text}${t.year ? ` (${t.year}년)` : ''}`, 'heir']);
  if (s.exposed) tags.push([`승부 조작이 드러남 ${s.exposed}번`, 'dark']);
  else if (s.fixed) tags.push([`몰래 짠 승부 ${s.fixed}번`, 'dark']);
  const chips = [];
  if (G.games) chips.push(['노름', `${G.games}판 · ${signed(G.net)}닢`, G.net < 0]);
  if (G.best) chips.push(['가장 크게 딴 판', `${G.best}닢`, false]);
  if (G.worst) chips.push(['가장 크게 잃은 판', `${G.worst}닢`, true]);
  if (fought) chips.push(['투기장', `${A.wins}승 ${A.losses}패${A.beastWins ? ` · 마수 ${A.beastWins}` : ''}`, false]);
  const cal = s.calendar.length ? `<details class="pl-more"><summary>고장 대회 달력 ${s.calendar.length}가지</summary><ul class="pl-news">${s.calendar.map((f) => `<li><time>${f.months.map((m) => `${m}월`).join('·')}</time><span><b>${esc(f.name)}</b> · ${esc(f.places.map((p) => p.name).join(', '))}</span></li>`).join('')}</ul></details>` : '';
  if (!any) {
    // 아직 아무 판에도 끼지 않았지만 이번 달 이 고장에 대회가 있을 때: 짧게만
    return `<div class="block contest-block"><h3>내기와 겨루기</h3><p class="note">이번 달 이 고장에서 ${esc(s.fair.name)}가 열린다${s.fair.fee ? ` (참가비 은화 ${s.fair.fee}닢)` : ''}.</p>${cal}</div>`;
  }
  return `<div class="block contest-block">
    <h3>내기와 겨루기</h3>
    ${s.fair ? `<p class="note ok">이번 달 이 고장에서 ${esc(s.fair.name)}가 열린다${s.fair.fee ? ` (참가비 은화 ${s.fair.fee}닢)` : ''}${s.fair.bannedHere ? ' · 하지만 나는 나갈 수 없다' : ''}.</p>` : ''}
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${fought ? `<div class="wd-row kn-row"><span>투기장 이름 ${Math.round(A.fame ?? 0)} · ${esc(A.tierName)}</span>${bar(A.fame ?? 0, 'fame')}</div>` : ''}
    ${G.itch >= 15 ? `<div class="wd-row kn-row"><span>노름 버릇 · ${esc(G.itchWord)}</span>${bar(G.itch, 'low')}</div>` : ''}
    ${s.banned.length ? `<p class="note warn">${s.banned.map((b) => `${esc(b.placeName)} ${esc(WHAT[b.what] ?? b.what)}에서 쫓겨남 (${b.months}달 남음)`).join(' · ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>내기와 겨루기에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
    ${cal}
  </div>`;
}
