// 11단계 갈래 화면: 마탑(src/tower), 군대(src/army), 사랑과 혼인(src/love). 읽기만 한다.
import { towerInfo, towerLine } from '../tower/index.js';
import { armyStatus } from '../army/index.js';
import { loveInfo } from '../love/index.js';
import { byId } from '../game.js';
import { JOBS } from '../data.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const tagRow = (tags) => (tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : '');
const logList = (log, max = 8) => (log.length ? `<ul class="pl-news">${log.slice(0, max).map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul>` : '');

/* ---------- 마탑: '나' 화면 한 덩이 ---------- */
export function renderTowerBlock(game) {
  const t = safe(() => towerInfo(game));
  if (!t) return '';
  const any = t.member || t.expelled || t.items.length || t.made || t.craft || t.forbidden.length || t.hunted || t.black || t.circleCert;
  if (!any) return '';
  const line = safe(() => towerLine(game), '');
  const M = t.member;
  const mem = M ? `<div class="tw-mem">
      <div class="top"><strong>${esc(M.towerName)}</strong><span class="note">${esc(M.rankName)}</span></div>
      <span class="note">${esc(M.towerDesc)}</span>
      ${M.next ? `<div class="wd-row"><span>공</span>${bar((M.merit / M.next.merit) * 100, 'mana')}<span class="v">${M.merit}/${M.next.merit}</span></div>
        <span class="note">${esc(M.next.rankName)}이 되려면 공 ${M.next.merit}과 ${M.next.cert}서클 공인이 있어야 한다.</span>` : `<span class="note">탑의 맨 윗자리에 올랐다.</span>`}
      ${M.master ? `<span class="note">스승: ${esc(M.master.name)} (${M.master.circle}서클)${M.master.alive ? ` · 정 ${M.master.bond}` : ' · 세상을 떠났다'}</span>` : ''}
    </div>` : t.expelled ? '<p class="note warn">마탑에서 쫓겨났다.</p>' : '';
  const items = t.items.length ? `<h4 class="ct-h">가진 마도구</h4><ul class="ct-houses">${t.items.map((x) => `<li><div class="top"><strong>${esc(x.name)}</strong></div>${x.keep ? `<span class="note">${esc(x.keep)}</span>` : ''}</li>`).join('')}</ul>` : '';
  const craft = t.craft ? `<div class="wd-row"><span>${esc(t.craft.name)}</span>${bar(t.craft.prog, 'mana')}<span class="v">${t.craft.prog}%</span></div>` : '';
  const forb = t.forbidden.length ? `<div class="tw-forb"><h4 class="ct-h">금지 마법</h4><ul class="ct-houses">${t.forbidden.map((f) => `<li><div class="top"><strong>${esc(f.name)}</strong><span class="note">${f.lv}단계</span></div><span class="note">${esc(f.lvName)}</span></li>`).join('')}</ul>
      ${t.taint ? `<div class="wd-row"><span>물든 정도</span>${bar(t.taint, 'low')}<span class="v">${t.taint}</span></div>${t.taintWord ? `<span class="note">${esc(t.taintWord)}</span>` : ''}` : ''}</div>` : '';
  const tags = [];
  if (t.circleCert) tags.push([`${t.circleCert}서클 공인`, 'gift']);
  if (t.made) tags.push([`마도구 ${t.made}개를 만들었다`, '']);
  if (t.hunted) tags.push([`협회 집행관에게 쫓긴다 (${t.hunted}달)`, 'dark']);
  if (t.blackWord) tags.push([t.blackWord, t.black > 0 ? 'dark' : '']);
  return `<div class="block tower-block">
    <h3>마탑${line && !M ? ` <small>${esc(line)}</small>` : ''}</h3>
    ${mem}${craft}${tagRow(tags)}${items}${forb}
    ${t.frictionWord && (M || t.forbidden.length) ? `<p class="note">마탑과 교단 사이: ${esc(t.frictionWord)}</p>` : ''}
    ${t.log.length ? `<details class="pl-more"><summary>탑에서 있었던 일 ${t.log.length}가지</summary>${logList(t.log, 10)}</details>` : ''}
  </div>`;
}

/* ---------- 군대: '나' 화면 한 덩이와 이번 달 카드 ---------- */
export function renderArmyBlock(game) {
  const a = safe(() => armyStatus(game));
  if (!a) return '';
  const any = a.enlisted || a.captive || a.deserter || a.veteran || a.medals.length || a.scars.length || a.battles;
  if (!any) return '';
  const s = a.service;
  const svc = s ? `<div class="tw-mem">
      <div class="top"><strong>${esc(s.unit ?? '왕국군')}</strong><span class="note">${esc(s.rankName)} · ${esc(s.kind)}</span></div>
      ${s.nextMerit ? `<div class="wd-row"><span>공</span>${bar((s.merit / s.nextMerit) * 100, 'kin')}<span class="v">${s.merit}/${s.nextMerit}</span></div>` : ''}
      <span class="note">복무 ${s.months}달째${s.termLeft ? ` · 남은 복무 ${s.termLeft}달` : ' · 복무 기한을 채웠다'}${s.placeName ? ` · ${esc(s.placeName)}에 주둔` : ''}</span>
      ${s.awol ? '<span class="note warn">자리를 비웠다. 들키면 탈영으로 친다.</span>' : ''}
    </div>` : '';
  const v = a.veteran;
  const vet = v && !s ? `<p class="note">${esc(v.rankName)}로 ${v.years}년 복무하고 물러났다 (${v.year}년)${v.pension ? ` · 달마다 연금 은화 ${v.pension}닢` : ''}.</p>` : '';
  const chips = [];
  if (a.battles) chips.push(['싸운 판', `${a.battles} (이김 ${a.won})`]);
  if (a.campaigns) chips.push(['원정', a.campaigns]);
  if (a.enlisted || a.veteran) chips.push(['통솔', a.leadership]);
  const tags = [];
  for (const m of a.medals) tags.push([`${m.name} (${m.year}년)`, 'heir']);
  for (const x of a.scars) tags.push([`${x.name}`, x.mind ? 'dark' : '']);
  if (a.deserter) tags.push([`탈영병${a.desertedYear ? ` (${a.desertedYear}년)` : ''}`, 'dark']);
  const comrades = a.comrades.length ? `<p class="note">함께 싸운 이들: ${a.comrades.slice(-6).map((c) => `${esc(c.name)}${c.alive ? '' : '†'}`).join(', ')}</p>` : '';
  return `<div class="block army-block">
    <h3>군대</h3>
    ${svc}${vet}
    ${a.campaign ? `<p class="note"><b>${a.campaign.peace ? '토벌' : '원정'} 중:</b> ${esc(a.campaign.name)} (${a.campaign.month}/${a.campaign.months}달)</p>` : ''}
    ${a.captive ? `<p class="note warn">${esc(a.captive.by)}에 포로로 잡혀 있다. ${a.captive.months}달째 · 몸값 은화 ${a.captive.ransom}닢</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, n]) => `<span class="sm-chip"><span>${esc(k)}</span><b>${esc(n)}</b></span>`).join('')}</div>` : ''}
    ${tagRow(tags)}${comrades}
    ${a.wars.length && a.enlisted ? `<p class="note">왕국군이 맞선 전쟁: ${esc(a.wars.join(', '))}</p>` : ''}
    ${a.log.length ? `<details class="pl-more"><summary>군대에서 있었던 일 ${a.log.length}가지</summary>${logList(a.log.slice().reverse(), 12)}</details>` : ''}
  </div>`;
}

export function renderArmyNow(game) {
  const a = safe(() => armyStatus(game));
  if (!a || (!a.campaign && !a.captive)) return '';
  if (a.captive) {
    return `<section class="card army-now captive"><h2>포로 막사 <small>${a.captive.months}달째</small></h2>
      <p class="note">${esc(a.captive.by)}에 잡혀 있다. 몸값은 은화 ${a.captive.ransom}닢${a.captive.officer ? '. 장교라서 몸값이 비싸다' : ''}. 누가 몸값을 내 주거나, 탈출을 노리거나, 견뎌야 한다.</p></section>`;
  }
  const c = a.campaign;
  return `<section class="card army-now"><h2>${c.peace ? '토벌' : '원정'} 중 <small>${esc(c.name)}</small></h2>
    <div class="wd-row"><span>행군</span>${bar((c.month / Math.max(1, c.months)) * 100, 'kin')}<span class="v">${c.month}/${c.months}달</span></div>
    <div class="wd-row"><span>사기</span>${bar(c.morale, c.morale < 35 ? 'low' : '')}<span class="v">${c.morale}</span></div>
    <p class="note">원정 동안은 부대와 함께 움직인다. 고장에서 하는 일은 돌아와서 할 수 있다.</p></section>`;
}

/* ---------- 사랑과 혼인: '사람들' 화면 맨 위 카드 ---------- */
const face = (game, id, name, size = 48) => { const p = byId(game, id); return p ? `<button class="kn-face" data-person="${id}" aria-label="${esc(name)}의 기록">${portrait(game, p, { size })}</button>` : ''; };
export function renderLove(game) {
  const v = safe(() => loveInfo(game));
  if (!v) return '';
  const any = v.spouse || v.engaged || v.lover || v.affair || v.admirers.length || v.widowed || v.exes.length;
  if (!any) return '';
  const rows = [];
  const S = v.spouse;
  if (S) {
    rows.push(`<li class="kn-kid lv-sp">${face(game, S.id, S.name, 52)}<div class="kn-txt">
      <div class="top"><strong>${esc(S.name)}</strong><span class="note">배우자 · ${S.age}살${S.job ? ` · ${esc(JOBS[S.job]?.name ?? S.job)}` : ''}</span></div>
      <span class="note">함께한 지 ${S.years}년${S.arranged ? ' · 정략혼' : ''}</span>
      <div class="wd-row kn-row"><span>마음</span>${bar(S.mood, S.mood < 30 ? 'low' : 'kin')}<span class="v">${esc(S.moodWord)}</span></div>
      <div class="wd-row kn-row"><span>연정</span>${bar(S.romance, 'love')}<span class="v">${S.romance}</span></div>
      ${S.wishText ? `<span class="note">바라는 것: ${esc(S.wishText)}</span>` : ''}
      ${S.cheated ? '<span class="note warn">한 번 마음이 어긋난 적이 있다</span>' : ''}
    </div></li>`);
  }
  if (v.engaged) {
    const e = v.engaged;
    rows.push(`<li class="kn-kid">${face(game, e.id, e.name)}<div class="kn-txt">
      <div class="top"><strong>${esc(e.name)}</strong><span class="note">약혼자 · ${e.age}살</span></div>
      <span class="note">${e.wedIn ? `${e.wedIn}달 뒤 혼례` : '곧 혼례'}${e.arranged ? ' · 집안끼리 정한 혼사' : ''}</span></div></li>`);
  }
  if (v.lover) {
    const l = v.lover;
    rows.push(`<li class="kn-kid">${face(game, l.id, l.name)}<div class="kn-txt">
      <div class="top"><strong>${esc(l.name)}</strong><span class="note">연인 · ${l.age}살</span></div>
      <div class="wd-row kn-row"><span>연정</span>${bar(l.romance, 'love')}<span class="v">${l.romance}</span></div></div></li>`);
  }
  if (v.affair) {
    const f = v.affair;
    rows.push(`<li class="kn-kid lv-aff">${face(game, f.id, f.name)}<div class="kn-txt">
      <div class="top"><strong>${esc(f.name)}</strong><span class="note">몰래 만나는 사람</span></div>
      <div class="wd-row kn-row"><span>들킬 위험</span>${bar(f.risk, 'low')}<span class="v">${f.risk}</span></div></div></li>`);
  }
  const adm = v.admirers.length ? `<p class="note">나를 마음에 둔 듯한 사람: ${v.admirers.map((p) => `${esc(p.name)} (${p.age}살)`).join(', ')}</p>` : '';
  const wid = v.widowed ? `<p class="note">먼저 간 ${esc(v.widowed.name)}${v.widowed.years ? `, ${v.widowed.years}년 전` : ''}${v.widowed.vow ? ' · 다시 혼인하지 않기로 했다' : ''}</p>` : '';
  const exes = v.exes.length ? `<p class="note">지난 인연: ${v.exes.map((x) => `${esc(x.name)} (${esc(x.howName)})`).join(', ')}</p>` : '';
  const title = S ? '혼인' : v.engaged ? '약혼' : v.lover ? '연인' : '사랑';
  return `<section class="card love-card">
    <h2>${title} <small>${v.marriages ? `혼인 ${v.marriages}번` : '아직 혼인하지 않았다'}</small></h2>
    ${rows.length ? `<ul class="kn-list">${rows.join('')}</ul>` : ''}
    ${adm}${wid}${exes}
  </section>`;
}
