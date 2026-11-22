// 31단계 '고대 유적과 잃어버린 마법' 화면(src/ruins). 읽기만 한다. 지도 고장 칸의 유적 줄은 src/ruins가 MAP_INFO로 붙인다.
// renderRuinsBlock: '나' 화면 덩이 (고대어 실력, 되살린 술식과 쓸 수 있는지, 서클이 모자라 못 쓰는 것, 해독 중인 것, 내 마도서, 마탑·교단의 눈길, 기록)
// renderRuins: 지도 화면 카드 (내가 아는 유적마다 문명·깊이·조각·형편)
import { ruinsInfo } from '../ruins/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const any = (s) => s && (s.tongue > 0 || s.sites.length || s.arts.length || s.work || s.book || s.log.length);
const eye = (v) => (v >= 60 ? '바짝 노린다' : v >= 30 ? '눈여겨본다' : v > 0 ? '들은 적이 있다' : '');

export function renderRuinsBlock(game) {
  const s = safe(() => ruinsInfo(game));
  if (!any(s)) return '';
  const woke = s.sites.some((x) => x.woke === 'awake' || x.woke === 'stir');
  const variant = woke ? 'wake' : s.arts.length || s.tongue >= 20 ? 'glyph' : '';
  const art = variant ? safe(() => vignetteImage({ plate: 'ruins', variant, year: game.date.year, month: game.date.month }), '') : '';
  const foes = [['마탑', eye(s.foe.tower)], ['성광교', eye(s.foe.church)]].filter(([, w]) => w);
  return `<div class="block ru-block">
    <h3>유적과 고대 마법</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${variant === 'wake' ? '유적 깊은 곳에서 깨어나는 것' : '돌에 새긴 고대 문자'}">` : ''}
    <div class="wd-row kn-row"><span>고대어 · ${esc(s.tongueWord)}</span>${bar(s.tongue, 'kin')}</div>
    ${s.read || s.pieces ? `<p class="note">읽어 낸 조각 ${s.read} · 모은 조각 ${s.pieces}</p>` : ''}
    ${s.work ? `<div class="wd-row kn-row"><span>되살리는 중 · ${esc(s.work.name)}</span>${bar(s.work.prog)}</div>` : ''}
    ${s.arts.length ? `<ul class="ag-clues ru-arts">${s.arts.map((a) => `<li><strong>${esc(a.name)}</strong>${a.usable ? '' : ' · <b class="warn">아직 서클이 모자라다</b>'}<br><span class="note">${esc(a.desc)}</span></li>`).join('')}</ul>` : ''}
    ${s.blocked.length ? `<p class="note">읽었지만 쓰지 못하는 술식: ${s.blocked.map((b) => `${esc(b.name)}(${b.circle}서클)`).join(', ')}</p>` : ''}
    ${s.book ? `<p class="note">마도서 <strong>${esc(s.book.title)}</strong>: ${s.book.entries.map((e) => `${esc(e.name)}${e.by ? ` (${esc(e.by)}, ${e.y}년)` : ''}`).join(', ') || '아직 빈 장이 많다'}</p>` : ''}
    ${foes.length ? `<p class="note">${foes.map(([k, w]) => `${J(k, '이/가')} ${w}`).join(' · ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>유적에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

const WOKE_CLS = { awake: 'foe', stir: 'flaw', sealed: '', calmed: 'ally' };
export function renderRuins(game) {
  const s = safe(() => ruinsInfo(game));
  if (!s?.sites?.length) return '';
  const dig = s.sites.some((x) => /도굴/.test(x.state));
  const art = safe(() => vignetteImage({ plate: 'ruins', variant: dig ? 'dig' : 'hall', year: game.date.year, month: game.date.month }), '');
  return `<section class="card ru-card">
    <h2>고대 유적 <small>아는 곳 ${s.sites.length}</small></h2>
    ${art ? `<img class="blk-art" src="${art}" alt="${dig ? '밤에 유적을 파는 도굴꾼들' : '무너진 고대 회랑'}">` : ''}
    <ul class="ag-clues">${s.sites.map((x) => `<li><strong>${esc(x.name)}</strong> · ${esc(x.placeName)} · ${esc(x.civ)}<br><span class="note">${x.depth ? `들어간 깊이 ${x.depth}/3 · ` : ''}${x.pieces ? `조각 ${x.pieces} · ` : ''}</span><span class="ct-tag ${WOKE_CLS[x.woke] ?? ''}">${esc(x.state)}</span></li>`).join('')}</ul>
  </section>`;
}
