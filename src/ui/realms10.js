// 10단계 갈래 화면: 봉인의 흔들림(src/seal)과 새 일 갈래(src/vocation). 읽기만 한다.
import { sealInfo, sealLine, STAGES } from '../seal/index.js';
import { vocationStatus, VOCATIONS } from '../vocation/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

/* ---------- 봉인: 정세 표의 한 줄 ---------- */
export function sealRow(game) {
  const s = safe(() => sealLine(game));
  if (!s) return null;
  const i = s.indexOf(':');
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

/* ---------- 봉인: '지도' 화면 카드 ---------- */
const WEDGE_CLS = { whole: 'ok', stolen: 'warn', broken: 'bad', dark: 'bad' };
export function renderSeal(game) {
  const s = safe(() => sealInfo(game));
  if (!s || (s.known < 1 && !s.ending)) return '';
  const broken = s.ending === 'broken';
  const resealed = s.ending === 'resealed';
  // 단계 줄: 고요에서 마지막 고리까지, 지금 단계에 불
  const track = `<ol class="sl-track" aria-label="봉인의 단계">${STAGES.map((st, i) => `<li class="${i < s.stage ? 'past' : i === s.stage ? 'now' : ''}${i >= 4 ? ' deep' : ''}"><i></i><span>${esc(st.name)}</span></li>`).join('')}</ol>`;
  const wedges = s.wedges.map((w) => `<li class="${WEDGE_CLS[w.state] ?? ''}"><span>${esc(w.name)}</span><b>${esc(w.word)}</b></li>`).join('');
  const stances = s.stances.filter((x) => x.word).map((x) => `<li><span>${esc(x.who)}</span><span class="note">${esc(x.word)}</span></li>`).join('');
  const p = s.path;
  const mine = [];
  if (p.guard >= 1) mine.push(`봉인을 지키는 데 보탠 힘 ${p.guard}`);
  if (p.fragments) mine.push(`봉인석 조각 ${p.fragments}개를 가지고 있다`);
  if (p.exploit) mine.push('봉인의 힘을 제 것으로 쓴 적이 있다');
  if (p.pact) mine.push('<b class="warn">마족과 거래를 맺었다</b>');
  const sub = broken ? '깨졌다' : resealed ? '새로 묶였다' : esc(s.stageName);
  return `<section class="card seal-card${broken ? ' broken' : s.stage >= 4 ? ' deep' : ''}">
    <h2>마신의 봉인 <small>${sub}</small></h2>
    ${broken ? '<p class="sl-desc">봉인이 깨졌다. 북쪽 하늘이 열린 뒤에도 세상은 이어진다.</p>' : `${track}<p class="sl-desc">${esc(s.desc)}</p>`}
    ${s.power != null && !broken ? `<div class="wd-row"><span>봉인의 힘</span>${bar(s.power, s.power < 45 ? 'low' : 'mana')}<span class="v">${s.power}</span></div>` : ''}
    ${s.known < 2 ? '<p class="note">아직 소문으로만 안다. 서고나 마탑에서 봉인을 조사하면 더 알게 된다.</p>' : ''}
    ${wedges ? `<h3 class="sub">봉인을 떠받치는 쐐기</h3><ul class="sl-wedges">${wedges}</ul>` : ''}
    ${stances ? `<h3 class="sub">세력들은</h3><ul class="pl-ties">${stances}</ul>` : ''}
    ${s.spies || s.cult ? `<p class="note">${s.spies ? `숨어든 마족 첩자: ${esc(s.spies)}` : ''}${s.spies && s.cult ? ' · ' : ''}${s.cult ? `마신교: ${esc(s.cult)}` : ''}</p>` : ''}
    ${mine.length ? `<p class="note">나는: ${mine.join(' · ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>봉인에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년 ${n.m}월</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

/* ---------- 새 일 갈래: '나' 화면 한 덩이 ---------- */
export function renderVocBlock(game) {
  const v = safe(() => vocationStatus(game));
  if (!v) return '';
  const fames = Object.entries(v.fames ?? {}).filter(([k, n]) => n >= 1 && k !== v.voc);
  const has = v.voc || v.paths.length || v.works.length || v.school || v.pelts || v.potions || v.traps || v.trophies.length || v.banned.length || fames.length;
  if (!has) return '';
  const head = v.voc ? `<div class="vc-head"><strong>${esc(v.job ?? v.name)}</strong><span class="note">${esc(v.rank ?? '')}${v.grade && v.grade !== v.rank ? ` · 솜씨 ${esc(v.grade)}` : ''}</span></div>
      <div class="wd-row"><span>${esc(v.skillName ?? '솜씨')}</span>${bar(v.skill)}<span class="v">${v.skill}</span></div>
      <div class="wd-row"><span>이름값</span>${bar(v.fame, 'kin')}<span class="v">${v.fame}</span></div>
      ${v.fameWord ? `<span class="note">${esc(v.fameWord)}</span>` : ''}` : '';
  const pj = v.project ? `<div class="vc-proj"><div class="top"><strong>${esc(v.project.name)}</strong><span class="note">${esc(v.project.kind)} · ${v.project.months}달째 · ${esc(v.project.progWord)}</span></div>
      ${bar(v.project.prog * 100)}</div>` : '';
  const chips = [];
  if (v.patients) chips.push(['살린 사람', v.patients]);
  if (v.students) chips.push(['가르친 제자', v.students]);
  if (v.potions) chips.push(['쟁인 물약', v.potions]);
  if (v.traps) chips.push([`덫${v.trapPlace ? ` (${v.trapPlace})` : ''}`, v.traps]);
  if (v.pelts) chips.push(['쟁인 가죽', `${v.pelts} · 장당 ${Math.round(v.peltPrice)}닢`]);
  const chipRow = chips.length ? `<div class="sm-chips">${chips.map(([k, n]) => `<span class="sm-chip"><span>${esc(k)}</span><b>${esc(n)}</b></span>`).join('')}</div>` : '';
  const tags = [];
  for (const p of v.paths) tags.push([`${p.name} (${p.year}년)`, 'heir']);
  for (const t of v.trophies) tags.push([`잡은 것: ${t}`, '']);
  if (v.dark) tags.push(['독을 판 적이 있다', 'dark']);
  const works = v.works.length ? `<h4 class="ct-h">남긴 것</h4><ul class="ct-houses vc-works">${v.works.slice().reverse().map((w) => `<li><div class="top"><strong>${esc(w.name)}</strong><span class="note">${esc(w.kind ?? '')}${w.year ? ` · ${w.year}년` : ''}</span></div></li>`).join('')}</ul>` : '';
  return `<div class="block voc-block">
    <h3>일의 길</h3>
    ${head}${pj}${chipRow}
    ${v.school ? `<p class="note">${esc(v.school.placeName)}에 세운 학당 「${esc(v.school.name ?? '')}」 (${esc(v.school.year ?? '')}년)</p>` : ''}
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${works}
    ${fames.length ? `<p class="note">다른 갈래의 이름값: ${fames.map(([k, n]) => `${esc(VOCATIONS[k]?.name ?? k)} ${n}`).join(' · ')}</p>` : ''}
    ${v.banned.length ? `<p class="note warn">쫓겨난 고장: ${esc(v.banned.join(', '))}</p>` : ''}
  </div>`;
}
