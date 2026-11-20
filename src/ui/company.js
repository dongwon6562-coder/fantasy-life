// 21단계 '용병단 꾸리기' 화면(src/company). 읽기만 한다.
// renderCompanyNow: 이번 달 화면의 접는 카드 (내 용병단이 있을 때). 계약, 훈련·사기·이름값, 궤와 품삯, 규율, 부관들, 싸운 기록.
// renderCompanyBlock: '나' 화면 덩이 (깃발과 내력, 맞수 용병단, 죽거나 다친 단원의 식구, 평생 기록, 쫓는 나라, 지난 용병단, 기록)
import { companyStatus } from '../company/index.js';
import { J } from '../narrative/text.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const loyalWord = (v) => (v >= 70 ? '목숨을 맡긴다' : v >= 45 ? '믿을 만하다' : v >= 25 ? '두고 본다' : '딴마음을 품었다');

export function renderCompanyNow(game, ui = {}) {
  const s = safe(() => companyStatus(game));
  const c = s?.company;
  if (!c) return '';
  const k = c.contract;
  const sumR = c.regent ? `${J(c.regent, '이/가')} 맡아 지킴` : k ? `${k.kindName} 계약 ${k.left}달 남음` : '계약 없음';
  const contract = k ? `<div class="sc-acad co-contract"><div class="top"><strong>${esc(k.by)}의 ${esc(k.kindName)}</strong><span class="note">${k.started ? `${k.left}/${k.months}달 남음` : '아직 싸움터로 가지 않았다'}</span></div>
      <span class="note">${k.side ? `${esc(k.side)} 편 · ` : ''}${k.foe ? `상대 ${esc(k.foe)} · ` : ''}${esc(k.whereName)}${k.here ? ' · 여기' : ''} · 달마다 은화 ${k.pay}닢${k.bonus ? ` · 이기면 ${k.bonus}닢 더` : ''} · 위험 ${k.danger >= 3 ? '크다' : k.danger >= 2 ? '보통' : '적다'}</span>
      <span class="note">${k.won || k.lost ? `이번 계약에서 이긴 싸움 ${k.won}, 진 싸움 ${k.lost}` : '아직 싸움이 없었다'}${k.unpaid ? ` · <b class="warn">못 받은 돈 ${k.unpaid}닢</b>` : ''}${k.rival ? ` · 맞은편에 <b class="warn">${esc(k.rival)}</b>` : ''}</span></div>` : '';
  const vet = (v) => `<li><div class="wd-row kn-row"><span><strong>${esc(v.name)}</strong> · ${esc(v.role)} · 솜씨 ${v.skill} · ${esc(loyalWord(v.loyal))}</span>${bar(v.loyal, v.loyal < 25 ? 'low' : 'kin')}</div></li>`;
  const short = c.chest < c.wages;
  return `<details class="card workshop co-card"${ui.coOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">내 용병단</span><strong>${esc(c.name)}</strong></span>
      <span class="ws-demand ${c.morale < 35 || short ? 'down' : 'up'}">창병 ${c.men}명 · ${esc(sumR)}</span>
    </summary>
    <div class="ws-body">
      <p class="note">깃발: ${esc(c.sign)} · ${esc(c.placeName)}${c.foughtThisMonth ? ' · 이번 달 싸웠다' : ''}${c.regent ? ` · <b class="warn">${esc(J(c.regent, '이/가'))} 맡아 지키는 중</b>` : ''}</p>
      ${contract}
      <div class="wd-row kn-row"><span>훈련</span>${bar(c.drill, c.drill < 30 ? 'low' : '')}</div>
      <div class="wd-row kn-row"><span>사기</span>${bar(c.morale, c.morale < 35 ? 'low' : 'kin')}</div>
      <div class="wd-row kn-row"><span>이름 · ${esc(c.fameWord)}</span>${bar(c.fame, 'kin')}</div>
      <div class="sm-chips">${[['궤', `은화 ${c.chest}닢`, short ? 'down' : ''], ['달마다 품삯', `은화 ${c.wages}닢`, 'down'], c.owed ? ['밀린 품삯', `${c.owed}닢`, 'down'] : null, ['싸움', `${c.battles}번`], ['이김', `${c.won}번`, 'up'], c.lost ? ['짐', `${c.lost}번`, 'down'] : null, c.dead ? ['잃은 단원', `${c.dead}명`, 'down'] : null].filter(Boolean).map(chip).join('')}</div>
      <p class="note">몫 나누기: <b>${esc(c.split.name)}</b> · 약탈: <b>${esc(c.loot.name)}</b></p>
      ${c.vets.length ? `<h4 class="ct-h">부관과 고참 ${c.vets.length}명</h4><ul class="wl-list co-list">${c.vets.map(vet).join('')}</ul>` : ''}
    </div>
  </details>`;
}

export function renderCompanyBlock(game) {
  const s = safe(() => companyStatus(game));
  if (!s) return '';
  const B = s.banner;
  // 내 용병단이 없었으면 맞수도 없다
  const mine = !!(B || s.contracts || s.past.length || s.company);
  const any = B || (mine && s.rivals.length) || s.families.length || s.contracts || s.past.length || s.log.length || s.hunted.length;
  if (!any) return '';
  const chips = [];
  if (s.contracts) chips.push(['맺은 계약', `${s.contracts}번`]);
  if (s.battles) chips.push(['싸움', `${s.battles}번`]);
  if (s.won) chips.push(['이긴 싸움', `${s.won}번`, 'up']);
  if (s.dead) chips.push(['잃은 단원', `${s.dead}명`, 'down']);
  if (s.turned) chips.push(['편을 바꿈', `${s.turned}번`, 'down']);
  if (s.sacks) chips.push(['약탈', `${s.sacks}번`, 'down']);
  const fam = (f) => `<li><strong>${esc(f.dead)}</strong> <span class="note">${f.maimed ? '다쳐 돌아옴' : '전사'} · ${esc(f.kin)} · ${esc(f.placeName)}${f.helped == null ? ' · <b class="warn">도움을 기다린다</b>' : f.pension ? ' · 다달이 돕는다' : f.helped ? ' · 도왔다' : ' · 외면했다'}</span></li>`;
  return `<div class="block company-block">
    <h3>용병단과 깃발</h3>
    ${B ? `<div class="sc-acad"><div class="top"><strong>${esc(B.name)}</strong><span class="note">${B.gens > 1 ? `${B.gens}대째` : `${B.founded}년에 올림`}</span></div>
      <span class="note">${esc(B.sign)} · "${esc(B.motto)}" · ${esc(J(B.founder, '이/가'))} 처음 올림${B.holder ? ` · 지금 ${esc(B.holder)}` : ''}${B.stains ? ` · <b class="warn">깃발의 얼룩 ${B.stains}</b>` : ''}</span>
      ${B.honors.length ? `<span class="note">영예: ${B.honors.slice(0, 3).map((h) => `${h.y}년 ${esc(h.text)}`).join(' · ')}</span>` : ''}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${mine && s.rivals.length ? `<h4 class="ct-h">맞수 용병단</h4><ul class="wl-list co-list">${s.rivals.map((r) => `<li><div class="wd-row kn-row"><span><strong>${esc(r.name)}</strong> · 단장 ${esc(r.captain)} · ${esc(r.fameWord)}${r.grudge >= 40 ? ' · <b class="warn">원한이 깊다</b>' : ''}</span>${bar(r.fame, 'low')}</div></li>`).join('')}</ul>` : ''}
    ${s.families.length ? `<h4 class="ct-h">단원의 식구 ${s.families.length}집${s.waiting ? ` · 도움을 기다리는 집 ${s.waiting}` : ''}</h4><ul class="am-rows">${s.families.map(fam).join('')}</ul>` : ''}
    ${s.hunted.length ? `<p class="note warn">나를 쫓는 나라: ${s.hunted.map((h) => `${esc(h.realm)} (${h.monthsLeft}달)`).join(', ')}</p>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 용병단 ${s.past.length}곳</summary><ul class="pl-news">${s.past.map((x) => `<li><time>${x.year}년</time><span>${esc(x.name)} · ${esc(x.how)} · 싸움 ${x.battles}번, 이김 ${x.won}번${x.dead ? `, 잃은 단원 ${x.dead}명` : ''}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>용병단에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
