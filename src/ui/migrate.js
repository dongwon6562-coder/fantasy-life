// 40단계 '피난과 이주' 화면(src/migrate). 읽기만 한다.
// renderMigrateNow: 이번 달 카드 (내가 피난 중이면 어디서 어디로·난민촌, 아니면 이 고장 성 밖 난민촌·떠나는 사람들). 일이 있을 때만.
// renderMigrate: 지도 화면 카드 (지금 길 위의 피난 행렬, 난민촌, 이주민 거리와 섞임·다툼, 사람 수가 바뀐 고장, 지나간 큰 이동)
import { migrateInfo } from '../migrate/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'migrate', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { snow: '눈길을 걷는 피난 행렬', camp: '난민촌의 불빛', gate: '닫힌 성문', village: '새로 선 마을' };
const n = (v) => Number(v ?? 0).toLocaleString('ko-KR');
const monthsWord = (m) => (m >= 24 ? `${Math.floor(m / 12)}년째` : m >= 1 ? `${m}달째` : '이번 달');

export function renderMigrateNow(game) {
  const s = safe(() => migrateInfo(game));
  if (!s) return '';
  const r = s.me.refugee;
  const camp = s.camps.find((c) => c.place === s.here.place);
  const leaving = s.flows.find((f) => f.from === s.here.name);
  if (!r && !camp && !leaving) return '';
  if (!r) { // 내 일이 아니면 한 줄 (다른 한 줄 알림들과 한 카드로 묶인다)
    const t = camp ? `성 밖에 ${esc(camp.from)}에서 ${esc(J(camp.why, '을/를'))} 피해 온 사람 ${n(camp.size)}명이 천막을 쳤다 · ${esc(monthsWord(camp.months))}${s.here.gateOpen ? '' : ' · <b class="warn">성문이 닫혔다</b>'}`
      : `${esc(J(leaving.why, '을/를'))} 피해 ${n(leaving.left ?? leaving.size)}명이 ${esc(leaving.to)} 쪽으로 길을 나섰다`;
    return `<section class="card mg-now"><p class="note"><b>피난민</b> ${t}</p></section>`;
  }
  const title = r ? `${r.from}에서 ${J(r.to, '으로/로')}` : camp ? `성 밖 난민촌 ${n(camp.size)}명` : `${J(leaving.why, '을/를')} 피해 떠나는 사람들`;
  return `<section class="card mg-now">
    <h2>${r ? '피난길' : '피난민'} <small>${esc(r ? monthsWord(r.months) : s.here.name)}</small></h2>
    <p><strong>${esc(title)}</strong>${r?.why ? ` · ${esc(r.why)}` : ''}${r?.camp ? ' · 난민촌에 머문다' : ''}</p>
    ${camp && !r ? `<p class="note">${esc(camp.from)}에서 ${esc(J(camp.why, '을/를'))} 피해 온 사람들 · ${esc(monthsWord(camp.months))}${s.here.gateOpen ? '' : ' · <b class="warn">성문이 닫혔다</b>'}</p>` : ''}
    ${leaving && !r ? `<p class="note">${esc(leaving.to)} 쪽으로 ${n(leaving.left ?? leaving.size)}명이 길을 나섰다.</p>` : ''}
  </section>`;
}

export function renderMigrate(game) {
  const s = safe(() => migrateInfo(game));
  if (!s) return '';
  if (!s.flows.length && !s.camps.length && !s.quarters.length && !s.pops.length && !s.past.length && !s.me.refugee) return '';
  const v = s.flows.length ? 'snow' : s.camps.length ? 'camp' : s.quarters.length ? 'village' : !s.here.gateOpen ? 'gate' : 'village';
  const src = art(game, v);
  const me = s.me, chips = [];
  if (me.gave) chips.push(['나눈 것', `${me.gave}번`, 'up']);
  if (me.worked) chips.push(['난민촌 일', `${me.worked}번`]);
  if (me.organized) chips.push(['이끈 일', `${me.organized}번`, 'up']);
  return `<section class="card mg-map">
    <h2>피난과 이주 <small>${s.flows.length ? `길 위의 행렬 ${s.flows.length}` : s.camps.length ? `난민촌 ${s.camps.length}` : '사람이 옮겨 간 자리'}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${me.refugee ? `<p><strong>나도 피난민이다</strong> · ${esc(me.refugee.from)} → ${esc(me.refugee.to)} · ${esc(monthsWord(me.refugee.months))}</p>` : me.settledFrom ? `<p class="note">우리 집안은 ${esc(me.settledFrom)}에서 옮겨 왔다.</p>` : ''}
    ${s.flows.length ? `<h3 class="wsec">길 위의 행렬</h3><ul class="ag-clues">${s.flows.map((f) => `<li><b>${esc(f.from)} → ${esc(f.to)}</b> · ${esc(f.why)} · ${n(f.size)}명</li>`).join('')}</ul>` : ''}
    ${s.camps.length ? `<h3 class="wsec">성 밖 난민촌</h3><ul class="ag-clues">${s.camps.map((c) => `<li><b>${esc(c.name)}</b> · ${n(c.size)}명 · ${esc(c.from)}에서, ${esc(c.why)} · ${esc(monthsWord(c.months))}</li>`).join('')}</ul>` : ''}
    ${s.quarters.length ? `<h3 class="wsec">이주민 거리</h3>${s.quarters.slice(0, 6).map((q) => `<div class="fr-one"><p><strong>${esc(q.name)} ${esc(q.quarter)}</strong> · ${esc(q.from)}에서 온 ${n(q.size)}명 · ${q.years ? `${q.years}년` : '한 해가 안 됐다'}</p>
      <div class="wd-row kn-row"><span>섞임 · ${esc(q.mixWord)}</span>${bar(q.mix, 'kin')}</div>
      ${q.tension >= 10 ? `<div class="wd-row kn-row"><span>토박이와 · ${esc(q.tensionWord)}</span>${bar(q.tension, q.tension >= 50 ? 'low' : 'mana')}</div>` : ''}</div>`).join('')}` : ''}
    ${s.pops.length ? `<h3 class="wsec">사람 수가 바뀐 고장</h3><div class="sm-chips">${s.pops.slice(0, 10).map((p) => chip([p.name, `${p.change > 0 ? '+' : ''}${p.change}%`, p.change > 0 ? 'up' : 'down'])).join('')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지나간 큰 이동 ${s.past.length}가지</summary><ul class="pl-news">${s.past.map((x) => `<li><time>${x.fromY}${x.toY && x.toY !== x.fromY ? `~${x.toY}` : ''}년</time><span>${esc(x.from)} → ${esc(x.place)} ${x.kind === 'camp' ? '난민촌이 걷혔다' : x.end === 'mixed' ? '이주민 거리가 고장에 섞여 사라졌다' : x.end === 'left' ? '이주민 거리 사람들이 떠났다' : '이주민 거리'}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>피난을 두고 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((l) => `<li><time>${l.y}년${l.m ? ` ${l.m}월` : ''}</time><span>${esc(l.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
