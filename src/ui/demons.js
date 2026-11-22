// 33단계 '마족' 화면(src/demons). 읽기만 한다.
// renderDemons: 지도 화면 카드 (해협의 기세·휴전·세 마왕). 북부에 있거나 마족과 닿은 적이 있을 때만.
// renderDemonsBlock: '나' 화면 덩이 (마족 연락책, 몸에 드러난 핏줄, 건너간 곳, 한 일, 기록)
import { demonsInfo, NORTH } from '../demons/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const north = (g) => NORTH.includes(g.life?.place);
const touched = (s) => !!(s.contact || s.blood || s.away || s.log.length || Object.values(s.me ?? {}).some((v) => v > 0));

export function renderDemons(game) {
  const s = safe(() => demonsInfo(game));
  if (!s || (!north(game) && !touched(s))) return '';
  return `<section class="card dm-map">
    <h2>얼음 해협 너머 <small>마족의 땅</small></h2>
    <div class="wd-row kn-row"><span>습격의 기세</span>${bar(s.raid, s.raid >= 60 ? 'low' : 'kin')}<span class="v">${s.raid}</span></div>
    <p class="note">${esc(s.raidWord)}${s.raids ? ` · 지금까지 넘어온 습격 ${s.raids}번` : ''}${s.truce ? ` · 휴전 ${s.truce.left}달 남음` : ''}</p>
    <ul class="ag-clues">${s.lords.map((l) => `<li><b>${esc(l.title)} ${esc(l.name)}</b> · ${esc(l.land)} · ${esc(l.rank)}${l.hunger != null ? ` · 남쪽을 노리는 눈 ${l.hunger}` : ''}<br><span class="note">${esc(l.stance)}</span></li>`).join('')}</ul>
  </section>`;
}

export function renderDemonsBlock(game) {
  const s = safe(() => demonsInfo(game));
  if (!s || !touched(s)) return '';
  const m = s.me ?? {};
  const chips = [];
  if (m.trades) chips.push(['마족과 거래', `${m.trades}번`]);
  if (m.trips) chips.push(['해협 건넘', `${m.trips}번`]);
  if (m.raids) chips.push(['습격 막음', `${m.raids}번`, 'up']);
  if (m.freed) chips.push(['풀어 준 포로', `${m.freed}명`, 'up']);
  if (m.truces) chips.push(['휴전 주선', `${m.truces}번`, 'up']);
  if (m.sheltered) chips.push(['숨겨 준 마족', `${m.sheltered}번`]);
  if (m.reported) chips.push(['고발', `${m.reported}번`]);
  if (m.extorted) chips.push(['뜯긴 돈', `${m.extorted}번`, 'down']);
  if (m.betrayed) chips.push(['배신', `${m.betrayed}번`, 'down']);
  if (m.coffin) chips.push(['마신의 관을 봄', `${m.coffin}번`]);
  const variant = s.away ? 'land' : s.contact && !s.contact.gone ? 'envoy' : 'fort';
  const art = safe(() => vignetteImage({ plate: 'demon', variant, year: game.date.year, month: game.date.month }), '');
  const ALT = { land: '해협 너머 마족의 땅', envoy: '회색 망토의 마족 사절', fort: '얼음 해협을 지키는 요새' };
  const tags = [];
  if (s.blood) tags.push(`<span class="ct-tag dark">마족의 핏줄</span>`);
  if (s.blood?.hunted) tags.push(`<span class="ct-tag foe">쫓기는 몸</span>`);
  return `<div class="block dm-block">
    <h3>마족</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[variant]}">` : ''}
    ${tags.length ? `<p>${tags.join(' ')}</p>` : ''}
    ${s.away ? `<p class="note">지금 해협 너머 <b>${esc(s.away)}</b>에 있다.</p>` : ''}
    ${s.contact ? `<p><strong>${esc(s.contact.name)}</strong> · 마족 연락책${s.contact.gone ? ' · 이제 오지 않는다' : ''}${s.contact.deals ? ` · 거래 ${s.contact.deals}번` : ''}</p>
      ${s.contact.gone ? '' : `<div class="wd-row kn-row"><span>믿음</span>${bar(s.contact.trust, s.contact.trust < 30 ? 'low' : 'kin')}<span class="v">${s.contact.trust}</span></div>`}` : ''}
    ${s.blood ? `<p class="note">이마에 마족의 자국이 드러났다.${s.blood.known ? ` 아는 사람이 ${s.blood.known >= 2 ? '고장에 퍼졌다' : '몇 있다'}.` : ' 아직 아무도 모른다.'}${s.blood.hunted ? ` 쫓긴 적 ${s.blood.hunted}번.` : ''}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>해협 너머와 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
