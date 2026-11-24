// 41단계 '별과 점성술사' 화면(src/stars). 읽기만 한다.
// renderStarsMap: 지도 화면 카드 (지금 하늘에 뜬 것, 예고된 일식, 천문대 넷과 명성·찾아낸 것, 달력 다툼)
// renderStarsChron: 연대기 '레오니아' 탭의 하늘 사건 (지난 꼬리별·일식·별똥비, 누가 미리 말했나, 달력 고침)
// renderStarsBlock: '나' 화면 덩이 (별 공부, 아는 별자리, 맡은 자리, 별점·별 지도·뱃길, 맞힌 예언)
import { starsInfo } from '../stars/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'stars', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { roof: '천문대 지붕', comet: '꼬리별 아래 모인 사람들', eclipse: '해가 가려진 낮', stall: '별점 노점' };
const skyVariant = (k) => (k === 'comet' ? 'comet' : k === 'eclipse' ? 'eclipse' : 'roof');

export function renderStarsMap(game) {
  const s = safe(() => starsInfo(game));
  if (!s) return '';
  const now = s.sky[0];
  const v = now ? skyVariant(now.kind) : s.eclipseTold ? 'eclipse' : 'roof';
  const src = art(game, v);
  const obs = s.observatories.slice().sort((a, b) => b.fame - a.fame);
  const d = s.calendar.dispute;
  return `<section class="card st-map">
    <h2>하늘과 천문대 <small>${now ? `지금 ${esc(now.name)}` : `천문대 ${obs.length}곳`}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.sky.length ? `<ul class="ag-clues">${s.sky.map((x) => `<li><b>${esc(x.name)}</b> · ${x.months > 1 ? `${x.months}달 더 보인다` : '이번 달까지'}${x.told ? ` · ${esc(J(x.told, '이/가'))} 미리 말했다` : ''}</li>`).join('')}</ul>` : ''}
    ${s.eclipseTold ? `<p class="note"><b>일식 예고</b> · ${esc(J(s.eclipseTold.by, '이/가'))} ${s.eclipseTold.months}달 뒤 낮에 해가 가려진다고 했다.</p>` : ''}
    ${obs.map((o) => `<div class="fr-one"><p><strong>${esc(o.name)}</strong> · ${esc(o.place)} · ${esc(o.head)}${o.glass ? ' · 망원경' : ''}</p>
      <div class="wd-row kn-row"><span>명성</span>${bar(o.fame, 'mana')}</div>
      ${o.found.length ? `<p class="note">찾아낸 것: ${o.found.map(esc).join(', ')}</p>` : ''}</div>`).join('')}
    ${s.tools.glass || s.tools.lens ? `<p class="note">${s.tools.glass ? '세상에 망원경이 나왔다. 하늘이 전보다 가까워졌다.' : '렌즈 가는 법이 퍼졌다. 망원경은 아직이다.'}</p>` : ''}
    ${d ? `<div class="wd-row kn-row"><span>달력 고치자는 쪽</span>${bar(d.reform, 'kin')}</div><div class="wd-row kn-row"><span>교단 쪽</span>${bar(d.church, 'low')}</div>` : s.calendar.drift ? `<p class="note">달력이 하늘과 ${s.calendar.drift}일 어긋나 있다.</p>` : ''}
  </section>`;
}

export function renderStarsChron(game) {
  const s = safe(() => starsInfo(game));
  if (!s || (!s.past.length && !s.calendar.reforms)) return '';
  return `<section class="card st-chron">
    <h2>하늘에 있었던 일 <small>${s.past.length}가지</small></h2>
    <ul class="pl-news">${s.past.map((x) => `<li><time>${x.year}년</time><span>${esc(x.name)}${x.told ? ` · ${esc(J(x.told, '이/가'))} 미리 말했다` : ''}</span></li>`).join('')}</ul>
    ${s.calendar.reforms ? `<p class="note">달력을 고친 일 ${s.calendar.reforms}번${s.calendar.last ? ` · 마지막 ${s.calendar.last}년` : ''}</p>` : ''}
  </section>`;
}

export function renderStarsBlock(game) {
  const s = safe(() => starsInfo(game));
  if (!s) return '';
  const m = s.me;
  if (!m.lore && m.role === 'none' && !m.charts && !m.reads && !m.navs) return '';
  const chips = [];
  if (m.reads) chips.push(['본 별점', `${m.reads}`]);
  if (m.charts) chips.push(['그린 별 지도', `${m.charts}`]);
  if (m.navs) chips.push(['별 보고 잡은 뱃길', `${m.navs}`]);
  if (m.right) chips.push(['맞힌 예언', `${m.right}`, 'up']);
  if (m.wrong) chips.push(['빗나간 예언', `${m.wrong}`, 'down']);
  if (m.cheats) chips.push(['꾸며 낸 별점', `${m.cheats}`, 'down']);
  const v = m.reads > m.charts ? 'stall' : 'roof';
  const src = art(game, v);
  return `<div class="block st-block">
    <h3>별 공부</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    <div class="wd-row kn-row"><span>${esc(m.roleName || '별 보는 눈')} · ${esc(m.loreWord)}</span>${bar(m.lore, 'mana')}</div>
    ${m.obs ? `<p class="note">${esc(m.obs)}에 몸담았다.</p>` : ''}
    ${m.known ? `<p class="note">아는 별자리 ${m.known}개: ${m.constellations.map(esc).join(', ')}</p>` : ''}
    ${m.predicted ? `<p class="note"><b>내가 한 예언</b> · ${m.predicted.months > 0 ? `${m.predicted.months}달 뒤에 맞는지 드러난다` : '곧 드러난다'}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
  </div>`;
}
