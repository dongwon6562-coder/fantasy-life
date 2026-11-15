// 8단계 갈래 화면: 연구와 발명(src/research), 큰 미궁 깊은 구렁(src/deep). 읽기만 한다.
import { researchState, madeThings, INV_NAME, inventable, designable, labHere, DESIGNS } from '../research/index.js';
import { canResearch, labOpen, nameOf } from '../research/state.js';
import { deepStatus } from '../deep/index.js';
import { FOES } from '../adventure/combat.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const HAND = { smith: '손재주(공방)', letters: '글(학자의 방)', magic: '마력(마탑)' };
const invName = (id) => INV_NAME[id] ?? id;

/* ---------- 연구: '나' 화면 한 덩이 ---------- */
export function renderResearchBlock(game) {
  const r = safe(() => researchState(game));
  if (!r) return '';
  const lab = safe(() => labHere(game));
  const able = safe(() => canResearch(game), false);
  const made = safe(() => madeThings(game), []);
  const any = r.project || made.length || r.invented.length || r.sold.length || r.stolen.length || r.royalty;
  if (!any && !(lab && able)) return '';
  const p = r.project;
  const parts = [];
  if (p) {
    const pct = Math.round((p.prog ?? 0) * 100);
    parts.push(`<div class="rs-now"><span class="lbl">${p.kind === 'design' ? '새 물건 만드는 중' : '발명 연구 중'}</span><strong>${esc(nameOf(p))}</strong>
      <div class="wd-row"><span>진척</span>${bar(pct, 'rs')}<span class="v">${pct}%</span></div>
      <span class="note">${p.months ?? 0}달째${p.fails ? ` · 실패 ${p.fails}번` : ''}${p.kind === 'design' && DESIGNS[p.id] ? ` · ${esc(DESIGNS[p.id].desc)}` : ''}</span></div>`);
  }
  if (lab) {
    const open = safe(() => labOpen(game), false);
    parts.push(`<p class="note">여기: ${esc(lab.name)}${open ? '' : ' (마탑은 서클 인증이나 마법 솜씨 30이 있어야 들인다)'}${able ? '' : ' · 연구하려면 지능 25, 아니면 글·대장일·마법 가운데 하나가 15는 되어야 한다'}</p>`);
    if (open && able && !p) {
      const ideas = [...safe(() => inventable(game), []).map(invName), ...safe(() => designable(game), []).map((id) => DESIGNS[id]?.name ?? id)];
      if (ideas.length) parts.push(`<p class="note">해 볼 만한 연구: ${esc(ideas.join(', '))}. 할 일의 '연구하기'로 시작한다.</p>`);
    }
  }
  const rows = [];
  if (r.invented.length) rows.push(['내 이름의 발명', r.invented.map(invName).join(', ')]);
  if (r.sold.length) rows.push(['상단에 판 발명', r.sold.map(invName).join(', ')]);
  if (r.royalty) rows.push(['사용료', `달마다 은화 ${r.royalty}닢`]);
  if (r.stolen.length) rows.push(['도둑맞은 연구', r.stolen.map(invName).join(', ')]);
  return `<div class="block research-block">
    <h3>연구와 발명${r.fame ? ` <small>학자들 사이 이름 ${Math.round(r.fame)}</small>` : ''}</h3>
    ${parts.join('')}
    ${rows.length ? `<dl class="yt-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${made.length ? `<h4 class="ct-h">내가 만든 물건</h4><ul class="rs-made">${made.map((m) => `<li><strong>${esc(m.name)}</strong><span class="note">${esc(m.effect)}</span></li>`).join('')}</ul>` : ''}
  </div>`;
}

/* ---------- 큰 미궁: 지도 아래 카드 ---------- */
const LORD = {
  alive: '구렁 바닥의 깊은 왕은 아직 잠들어 있다.',
  slain: '깊은 왕은 쓰러졌다.',
  sealed: '깊은 왕은 다시 봉인되었다.',
  pact: '깊은 왕과 맺은 약속이 아직 살아 있다.',
  taken: '깊은 왕은 다른 탐사대의 손에 쓰러졌다.',
};
const KIND = { gear: '장비', stat: '몸에 쓰는 것', charm: '지니는 것', sell: '팔 것', key: '봉인 열쇠' };

export function renderDeep(game) {
  const s = safe(() => deepStatus(game));
  if (!s) return '';
  if (!s.here && !s.runs && !s.relics.length && s.lord === 'alive') return '';
  const strata = s.strata.map((st, i) => {
    const guardFloor = st.to;
    const cleared = s.gate >= guardFloor || (i === s.strata.length - 1 && s.lord !== 'alive');
    const now = !cleared && s.deepest >= st.from;
    const guard = FOES[st.guard]?.name ?? '';
    return `<li class="${cleared ? 'past' : now ? 'now' : ''}"><span class="fl">${st.from}~${st.to}층</span><span class="nm">${esc(st.name)}</span><span class="note">${cleared ? '지나왔다' : now ? `지키는 것: ${esc(guard || '알 수 없음')}` : '아직 아무도 모른다'}</span></li>`;
  }).join('');
  const depthPct = Math.round((s.deepest / s.floors) * 100);
  const facts = [];
  if (s.runs) facts.push(`내려간 횟수 ${s.runs}`);
  if (s.ore) facts.push(`판 마석 은화 ${s.ore}닢`);
  if (s.guide) facts.push('길잡이가 있다');
  if (s.ally) facts.push(`함께 가는 탐사대: ${s.ally}`);
  const relic = (r) => `<li class="${r.cursed ? 'cursed' : ''}"><strong>${esc(r.name)}</strong><span class="note">${r.known ? `${esc(KIND[r.kind] ?? '')}${r.cursed ? ' · 저주가 걸렸다' : ''}${r.value ? ` · 팔면 은화 ${r.value}닢` : ''}` : '감정소에 가져가면 무엇인지 알 수 있다'}</span></li>`;
  const rivals = s.rivals.map((r) => `<li class="${r.alive ? '' : 'dead'}"><strong>${esc(r.name)}</strong><span class="note">${esc(r.leader)} · ${esc(r.race)} · ${r.alive ? `가장 깊이 ${r.best}층` : '구렁에서 돌아오지 못했다'}</span></li>`).join('');
  return `<section class="card deep-card">
    <h2>깊은 구렁 <small>${s.here ? '구렁목에 있다' : '천룡 산맥 구렁목'}</small></h2>
    <div class="wd-row dp-depth"><span>가장 깊이</span>${bar(depthPct, 'deep')}<span class="v">${s.deepest}/${s.floors}층</span></div>
    ${facts.length ? `<p class="note">${esc(facts.join(' · '))}</p>` : ''}
    <ol class="dp-strata">${strata}</ol>
    ${s.here && s.gates.length ? `<p class="note">내려갈 수 있는 돌문: ${s.gates.map((g) => `${g.floor + 1}층 (보급 은화 ${g.cost}닢)`).join(', ')}. 할 일의 '깊은 구렁에 내려간다'로 간다.</p>` : ''}
    <p class="dp-lord">${esc(LORD[s.lord] ?? '')}${s.lordBy && s.lord === 'taken' ? ` (${esc(s.lordBy)})` : ''}</p>
    ${s.relics.length || s.charms.length ? `<h3 class="sub">유물</h3><ul class="dp-list">${s.relics.map(relic).join('')}</ul>${s.charms.length ? `<p class="note">지니고 다니는 것: ${esc(s.charms.map((c) => c.name).join(', '))}${s.hazardBonus ? ` (미궁의 위험을 ${s.hazardBonus}만큼 덜어 준다)` : ''}</p>` : ''}` : ''}
    <details class="dp-rivals"><summary>다른 탐사대 ${s.rivals.length}곳${s.record.depth ? ` · 구렁목 기록: ${esc(s.record.who)}의 ${s.record.depth}층` : ''}</summary><ul class="dp-list">${rivals}</ul></details>
  </section>`;
}
