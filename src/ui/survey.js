// 41단계 '측량사와 지도' 화면(src/survey). 읽기만 한다.
// renderSurveyNow: 이번 달 접는 카드 (측량사 일, 팔지 못한 지도, 내 지도 공방, 그리는 큰 지도). 그런 것이 있을 때만.
// renderSurveyBlock: '나' 화면 덩이 (솜씨, 한 일, 들고 있는 지도, 공방과 제자, 이름 남긴 지도, 기록)
// renderSurveyMap: 지도 화면 카드 (지도 공방들과 평판, 이름난 지도)
import { surveyInfo } from '../survey/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'survey', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { field: '측량대와 막대', atelier: '지도 공방', stone: '경계석', war: '펼친 지도 앞의 장군' };
const logList = (log, label) => (log.length ? `<details class="pl-more"><summary>${label} ${log.length}가지</summary><ul class="pl-news">${log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : '');
const mapLi = (m) => `<li><b>${esc(m.title)}</b> · ${esc(m.kind)} · ${esc(m.word)}${m.secret ? ' · <b class="warn">남의 눈에 띄면 안 된다</b>' : ''}</li>`;

export function renderSurveyNow(game, ui = {}) {
  const s = safe(() => surveyInfo(game));
  if (!s) return '';
  if (!s.surveyor && !s.atelier && !s.maps.length && !s.master) return '';
  const secret = s.maps.some((m) => m.secret);
  const title = s.master ? '그리는 큰 지도' : s.atelier ? `${s.atelier.place} 지도 공방` : s.maps.length ? `들고 있는 지도 ${s.maps.length}장` : '측량 일';
  const tag = secret ? '군용 지도' : s.master ? `${s.master.prog}/${s.master.of}` : s.maps.length ? `${s.maps.length}장` : s.skillWord;
  return `<details class="card workshop sv-card"${ui.svOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${s.surveyor ? '측량사' : s.atelier ? '내 공방' : '지도'}</span><strong>${esc(title)}</strong></span>
      <span class="ws-demand ${secret ? 'down' : 'up'}">${esc(tag)}</span>
    </summary>
    <div class="ws-body">
      ${s.master ? `<div class="wd-row kn-row"><span>큰 지도 · ${s.master.prog}/${s.master.of}</span>${bar((s.master.prog / s.master.of) * 100, 'kin')}</div>` : ''}
      ${s.maps.length ? `<ul class="ag-clues">${s.maps.slice(0, 6).map(mapLi).join('')}</ul>` : ''}
      ${s.atelier ? `<p class="note">내 지도 공방 · ${esc(s.atelier.place)} · ${s.atelier.years ? `${s.atelier.years}년째` : '연 지 얼마 안 됨'}${s.atelier.apprentices.length ? ` · 제자 ${s.atelier.apprentices.map(esc).join(', ')}` : ''}</p>` : ''}
      ${s.surveyor || s.skill ? `<div class="wd-row kn-row"><span>솜씨 · ${esc(s.skillWord)}</span>${bar(s.skill, 'kin')}</div>` : ''}
    </div>
  </details>`;
}

export function renderSurveyBlock(game) {
  const s = safe(() => surveyInfo(game));
  if (!s) return '';
  const d = s.done;
  const mine = s.masterworks.filter((w) => w.mine);
  if (!s.surveyor && !s.atelier && !s.maps.length && !d.jobs && !d.drawn && !mine.length && !s.log.length && !s.past.length) return '';
  const chips = [];
  if (d.jobs) chips.push(['맡은 측량', `${d.jobs}`]);
  if (d.drawn) chips.push(['그린 지도', `${d.drawn}`]);
  if (d.sold) chips.push(['판 지도', `${d.sold}`]);
  if (d.earned) chips.push(['번 돈', `은화 ${d.earned}닢`, 'up']);
  if (d.lost) chips.push(['잃은 지도', `${d.lost}`, 'down']);
  if (d.witness) chips.push(['경계 증언', `${d.witness}번`]);
  const v = s.maps.some((m) => m.secret) ? 'war' : s.atelier || mine.length ? 'atelier' : d.witness ? 'stone' : 'field';
  const src = art(game, v);
  return `<div class="block sv-block">
    <h3>측량과 지도</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.surveyor || s.skill ? `<div class="wd-row kn-row"><span>${s.surveyor ? '측량사' : '측량 솜씨'} · ${esc(s.skillWord)}</span>${bar(s.skill, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.maps.length ? `<p class="note">들고 있는 지도</p><ul class="ag-clues">${s.maps.map(mapLi).join('')}</ul>` : ''}
    ${s.atelier ? `<p class="note">내 지도 공방: ${esc(s.atelier.place)} · ${s.atelier.years ? `${s.atelier.years}년째` : '연 지 얼마 안 됨'}${s.atelier.apprentices.length ? ` · 제자 ${s.atelier.apprentices.map(esc).join(', ')}` : ''}</p>` : ''}
    ${mine.length ? `<p class="note">이름 남긴 지도: ${mine.map((w) => `<b>${esc(w.name)}</b>(${w.y}년)`).join(', ')}</p>` : ''}
    ${s.past.length ? `<p class="note">윗대의 측량: ${s.past.map((x) => `${x.y}년까지 지도 ${x.drawn}장, 측량 ${x.jobs}번`).join(' · ')}</p>` : ''}
    ${logList(s.log, '측량하며 있었던 일')}
  </div>`;
}

export function renderSurveyMap(game) {
  const s = safe(() => surveyInfo(game));
  if (!s || (!s.shops.length && !s.masterworks.length)) return '';
  const shops = s.shops.slice().sort((a, b) => b.rep - a.rep).slice(0, 8);
  return `<section class="card sv-map">
    <h2>지도 공방 <small>${s.shops.length}곳 · 막대는 평판</small></h2>
    ${shops.map((x) => `<div class="wd-row kn-row"><span>${esc(x.name)} · ${esc(x.place)}</span>${bar(x.rep, x.rep < 30 ? 'low' : 'kin')}</div>`).join('')}
    ${s.masterworks.length ? `<p class="note">이름난 지도: ${s.masterworks.slice(-6).map((w) => `<b>${esc(w.name)}</b>(${esc(w.by)}, ${w.y}년)`).join(', ')}</p>` : ''}
  </section>`;
}
