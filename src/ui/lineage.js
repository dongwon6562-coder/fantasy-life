// 22단계 '가문의 내력과 가풍' 화면(src/lineage). 읽기만 한다.
// renderLineageNow: 이번 달 화면 한 줄 (제사를 세 해 넘게 걸렀을 때만)
// renderLineageBlock: '나' 화면 덩이 (집안 이름과 대, 가훈, 문장, 가업, 버릇, 자랑과 수치, 족보, 분가, 제사, 기록)
import { lineageInfo } from '../lineage/index.js';
import { J } from '../narrative/text.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const yrs = (list) => `<ul class="pl-news">${list.slice().reverse().map((x) => `<li><time>${x.y}년</time><span>${esc(x.text)}${x.by ? ` · ${esc(x.by)}` : ''}</span></li>`).join('')}</ul>`;

export function renderLineageNow(game) {
  const s = safe(() => lineageInfo(game));
  if (!s || !s.ancestors || s.rites.missed < 3) return '';
  return `<section class="card lineage-now"><p class="note"><b class="warn">제사</b> 조상 상을 ${s.rites.missed}해째 차리지 않았다</p></section>`;
}

export function renderLineageBlock(game) {
  const s = safe(() => lineageInfo(game));
  if (!s) return '';
  const any = s.motto || s.crest || s.craft || s.habits.length || s.pride.length || s.shame.length || s.fake || s.branches.length || s.rites.count || s.log.length;
  if (!any) return '';
  const lines = [];
  if (s.motto) lines.push(`가훈 <b>"${esc(s.motto.text)}"</b> · ${esc(s.motto.by)}, ${s.motto.y}년${s.motto.kept || s.motto.broken ? ` · 지킨 일 ${s.motto.kept}, 어긴 일 ${s.motto.broken}` : ''}`);
  if (s.crest) lines.push(`문장 ${esc(s.crest.text)} · ${esc(J(s.crest.by, '이/가'))} 걸었다`);
  if (s.craft) lines.push(`가업 ${esc(s.craft.skillName)}${s.craft.gens > 1 ? ` · ${s.craft.gens}대째` : ''}`);
  if (s.fake) lines.push(s.fake.exposed ? `<b class="warn">꾸민 족보가 들통났다</b> (${esc(s.fake.who)}의 후손이라 했다)` : `족보에 ${esc(s.fake.who)}의 후손이라 적었다 · <b class="warn">꾸민 것</b>`);
  const R = s.rites;
  if (s.ancestors) lines.push(`제사 ${R.count}번 지냄${R.missed >= 3 ? ` · <b class="warn">${R.missed}해째 거름</b>` : R.last != null ? ` · 마지막 ${R.last}년` : ''}`);
  const chips = [];
  if (s.ancestors) chips.push(['모신 조상', `${s.ancestors}분`]);
  if (s.pride.length) chips.push(['자랑', `${s.pride.length}가지`, 'up']);
  if (s.shame.length) chips.push(['수치', `${s.shame.length}가지`, 'down']);
  if (s.blackSheep) chips.push(['집안 길을 거스른 자식', `${s.blackSheep}번`, 'down']);
  const br = (b) => `<li><div class="wd-row kn-row"><span><strong>${esc(b.name)}</strong> · ${esc(b.placeName)} · ${b.head === '빈자리' ? '<b class="warn">가장 자리가 비었다</b>' : `가장 ${esc(b.head)}`} · ${esc(b.word)}${b.ties < 25 ? ' · <b class="warn">발길이 끊겼다</b>' : ''}</span>${bar(b.standing, b.standing < 20 ? 'low' : 'kin')}</div></li>`;
  return `<div class="block lineage-block">
    <h3>가문의 내력</h3>
    <p class="note"><b>${esc(s.name)}</b></p>
    ${lines.length ? `<ul class="am-rows ln-rows">${lines.map((l) => `<li><span class="note">${l}</span></li>`).join('')}</ul>` : ''}
    ${s.habits.length ? `<div class="ct-tags">${s.habits.map((h) => `<span class="ct-tag ${h.good ? 'gift' : 'flaw'}">${esc(h.name)}${h.gens > 1 ? ` ${h.gens}대` : ''}</span>`).join('')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.branches.length ? `<h4 class="ct-h">갈라져 나간 집 ${s.branches.length}곳</h4><ul class="wl-list ln-branch">${s.branches.map(br).join('')}</ul>` : ''}
    ${s.pride.length ? `<details class="pl-more"><summary>집안의 자랑 ${s.pride.length}가지</summary>${yrs(s.pride)}</details>` : ''}
    ${s.shame.length ? `<details class="pl-more"><summary>집안의 수치 ${s.shame.length}가지</summary>${yrs(s.shame)}</details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>집안에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
