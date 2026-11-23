// 39단계 '입양과 거둔 아이' 화면(src/adopt). 읽기만 한다.
// renderAdopt: 사람들 화면 카드 (거둔 아이들: 어떻게 왔는지·출생을 아는지·정, 나를 거둔 집, 이 고장에서 아이를 거둔 사람들)
// renderAdoptBlock: '나' 화면 덩이 (나를 거둔 집과 정, 내가 거둔 아이 수, 기록)
import { adoptInfo } from '../adopt/index.js';
import { byId } from '../npc.js';
import { portrait } from '../art/portrait.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'adopt', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { basket: '새벽 문간의 바구니', hall: '예배당 고아원의 긴 방', rite: '양자로 맞는 의식', kin: '친척 집 문 앞' };
const VAR = { '문간의 바구니에서': 'basket', '예배당 고아원에서': 'hall', '양자로': 'rite' };

export function renderAdopt(game) {
  const s = safe(() => adoptInfo(game));
  if (!s || (!s.kids.length && !s.guardian && !s.npc.length)) return '';
  const v = s.guardian ? 'kin' : VAR[s.kids[0]?.how] ?? 'hall';
  const src = art(game, v);
  const face = (id) => { const p = safe(() => byId(game, id)); return p ? safe(() => portrait(game, p, { size: 52 }), '') : ''; };
  return `<section class="card ad-card">
    <h2>거둔 아이 <small>${s.kids.length ? `${s.kids.length}명` : s.guardian ? '나를 거둔 집' : '이 고장 소식'}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.guardian ? `<div class="fr-one"><p><strong>나를 거둔 곳</strong> · ${esc(s.guardian.kind)} · ${s.guardian.years}년${s.guardian.grown ? ' · 이제 다 컸다' : ''}</p>
      <div class="wd-row kn-row"><span>${esc(s.guardian.name)}</span>${bar(s.guardian.warm, s.guardian.warm < 30 ? 'low' : 'kin')}<span class="v">${esc(s.guardian.word)}</span></div></div>` : ''}
    ${s.kids.map((k) => `<div class="fr-one ad-kid${k.gone ? ' gone' : ''}">
      <div class="ad-head">${face(k.id)}<div><p><strong>${esc(k.name)}</strong> · ${k.age}살 · ${esc(k.how)} 거둔 지 ${k.years ? `${k.years}년` : '한 해가 안 됐다'}${k.gone ? ' · 집을 떠났다' : ''}</p>
      <p class="note">${esc(k.told)}${k.token ? ` · 함께 온 것: ${esc(k.token)}` : ''}</p></div></div>
      <div class="wd-row kn-row"><span>정</span>${bar(k.bond, k.bond < 30 ? 'low' : 'kin')}<span class="v">${esc(k.word)}</span></div>
    </div>`).join('')}
    ${s.npc.length ? `<p class="note">이 고장에서 아이를 거둔 집: ${s.npc.map((x) => `${esc(J(x.by, '이/가'))} ${esc(x.kind)} ${esc(x.kid)}(${x.y}년)`).join(', ')}</p>` : ''}
  </section>`;
}

export function renderAdoptBlock(game) {
  const s = safe(() => adoptInfo(game));
  if (!s || (!s.any && !s.log.length)) return '';
  const v = s.guardian ? 'kin' : VAR[s.kids[0]?.how] ?? 'hall';
  const src = art(game, v);
  return `<div class="block ad-block">
    <h3>거둔 아이와 거둔 집</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.guardian ? `<div class="wd-row kn-row"><span>나를 거둔 ${esc(s.guardian.kind)}</span>${bar(s.guardian.warm, s.guardian.warm < 30 ? 'low' : 'kin')}<span class="v">${esc(s.guardian.word)}</span></div>` : ''}
    ${s.kids.length ? `<p class="note">내가 거둔 아이 ${s.kids.length}명: ${s.kids.map((k) => `${esc(k.name)}(${esc(k.word)})`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>거두고 거두어진 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
