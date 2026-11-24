// 42단계 '내 주문서' 화면(src/magic magicInfo). 읽기만 한다.
// renderSpellbook: '나' 화면 덩이 (서클과 이명, 계열, 영창·무리, 서클 표, 계열별 주문 카드, 지은 주문)
import { magicInfo } from '../magic/index.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const TOP = 6; // 7서클은 노아 몫이라 표는 6까지

function circleTable(s, all) {
  const cells = [];
  for (let c = 1; c <= TOP; c++) {
    const here = all.filter((x) => x.circle === c);
    const k = here.filter((x) => x.known).length;
    const cls = c === s.circle ? ' now' : c < s.circle ? ' on' : c <= s.peak ? ' once' : '';
    cells.push(`<li class="sp-c${cls}"><b>${c}</b><span>${here.length ? `${k}/${here.length}` : '–'}</span></li>`);
  }
  return `<ol class="sp-circles" aria-label="서클 표">${cells.join('')}</ol>`;
}

function spellCard(x, circle) {
  const cls = x.known ? ' on' : x.learnable ? ' can' : x.circle > circle ? ' far' : '';
  const tag = x.known ? '익힘' : x.learnable ? '익힐 수 있다' : x.circle > circle ? `${x.circle}서클부터` : '';
  return `<li class="sp-spell${cls}"><p><strong>${esc(x.name)}</strong> <small>${x.circle}서클 · ${esc(x.useName)}</small>${tag ? ` <em>${esc(tag)}</em>` : ''}</p><span class="note">${esc(x.desc)}</span></li>`;
}

export function renderSpellbook(game, ui = {}) {
  const s = safe(() => magicInfo(game));
  if (!s || (!s.circle && !s.knownCount && !s.made.length && !s.school)) return '';
  const all = s.schools.flatMap((k) => k.spells);
  const strained = s.strain.v >= 60;
  const head = [];
  if (s.titled) head.push(`<b>${esc(s.titled)}</b>`);
  head.push(s.school ? `계열 <b>${esc(s.school.name)}</b>${s.school.fit ? ' · 타고난 결에 맞는다' : ''}` : '아직 계열을 정하지 않았다');
  if (s.certified) head.push(`${s.certified}서클 공인`);
  const open = ui.spOpen ?? (s.school?.id ?? 'common');
  return `<div class="block sp-book">
    <h3>내 주문서 <small>${s.circle ? `${s.circle}서클` : '서클 전'} · 주문 ${s.knownCount}</small></h3>
    <p class="note">${head.join(' · ')}</p>
    ${!s.school && s.affinity.length ? `<p class="note">잘 맞을 계열: ${s.affinity.map((a) => `<b>${esc(a.name)}</b>${a.why ? `(${esc(a.why)})` : ''}`).join(', ')}</p>` : ''}
    <div class="wd-row kn-row"><span>영창 · ${esc(s.chant.word)}</span>${bar(s.chant.v, 'mana')}</div>
    ${s.strain.v || s.scars || s.overloads ? `<div class="wd-row kn-row"><span>무리 · ${esc(s.strain.word)}</span>${bar(s.strain.v, strained ? 'low' : 'kin')}</div>` : ''}
    ${s.scars || s.overloads ? `<p class="note">${s.overloads ? `마력 폭주 ${s.overloads}번` : ''}${s.scars && s.overloads ? ' · ' : ''}${s.scars ? `<b class="warn">마력에 덴 흉터 ${s.scars}</b>` : ''}</p>` : ''}
    ${circleTable(s, all)}
    ${s.schools.map((k) => {
      const kn = k.spells.filter((x) => x.known).length;
      return `<details class="sp-school${k.mine ? ' mine' : ''}" data-sp="${esc(k.id)}"${k.id === open ? ' open' : ''}>
        <summary><span>${esc(k.name)}${k.mine ? ' <i>내 계열</i>' : ''}</span><b>${kn}/${k.spells.length}</b></summary>
        <ul class="sp-list">${k.spells.slice().sort((a, b) => a.circle - b.circle).map((x) => spellCard(x, s.circle)).join('')}</ul>
      </details>`;
    }).join('')}
    ${s.making ? `<div class="wd-row kn-row"><span>짓고 있는 주문 · ${s.making.circle}서클 ${esc(s.making.useName)}</span>${bar(s.making.pct, 'mana')}</div>` : ''}
    ${s.made.length ? `<p class="note">지은 주문</p><ul class="sp-list made">${s.made.map((x) => `<li class="sp-spell${x.learned ? ' on' : ''}"><p><strong>「${esc(x.name)}」</strong> <small>${esc(x.school || '기초술')} · ${x.circle}서클 · ${esc(x.useName)}</small></p><span class="note">${x.mine ? '내가 지었다' : `${esc(J(x.by ?? '누군가', '이/가'))} 지었다`}${x.year ? ` · ${x.year}년` : ''}${x.taught ? ` · ${x.taught}명에게 가르쳤다` : ''}${!x.learned ? ' · 아직 익히지 못했다' : ''}</span></li>`).join('')}</ul>` : ''}
  </div>`;
}
