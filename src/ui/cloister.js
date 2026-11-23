// 39단계 '수도원과 은둔' 화면(src/cloister). 읽기만 한다.
// renderCloisterBlock: '나' 화면 덩이 (서원한 수도원과 단계·맡은 일, 은둔처, 한 일, 떠난 일, 기록)
// renderCloisters: 지도 카드 (네 수도원: 원장·식구·땅·평판·땅 다툼). 수도원과 인연이 있거나 어른일 때.
import { cloisterInfo } from '../cloister/index.js';
import { playerAge } from '../game.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'cloister', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { script: '필사실 창가의 양피지', walk: '수도원 회랑', hermit: '안개 낀 산속 움막', leave: '수도원 문을 나서는 길' };

export function renderCloisterBlock(game) {
  const s = safe(() => cloisterInfo(game));
  if (!s) return '';
  const d = s.done ?? {};
  const any = s.vow || s.hermit || s.left.length || s.past.length || s.log.length;
  if (!any) return '';
  const chips = [];
  if (d.copied) chips.push(['베낀 책', `${d.copied}권`]);
  if (d.herbs) chips.push(['약초 단', `${d.herbs}`]);
  if (d.brewed) chips.push(['빚은 통', `${d.brewed}`]);
  if (d.rung) chips.push(['친 종', `${d.rung}번`]);
  const v = s.hermit ? 'hermit' : s.vow ? (s.vow.role === '필사실' ? 'script' : 'walk') : s.left.length ? 'leave' : 'walk';
  const src = art(game, v);
  return `<div class="block clo-block">
    <h3>수도원과 은둔</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.vow ? `<p><strong>${esc(s.vow.house)}</strong> · ${esc(s.vow.stage)}${s.vow.role ? ` · ${esc(s.vow.role)}` : ''} · ${s.vow.years ? `${s.vow.years}년째` : '올해 들어왔다'}${s.vow.away ? ` · <b class="warn">밖에 나가 있다</b>` : ''}</p>
    <div class="wd-row kn-row"><span>쌓은 공덕</span>${bar(s.vow.merit, 'kin')}<span class="v">${s.vow.merit}</span></div>` : ''}
    ${s.hermit ? `<p><strong>은둔</strong> · ${esc(s.hermit.place)} · ${Math.floor(s.hermit.months / 12) ? `${Math.floor(s.hermit.months / 12)}년` : `${s.hermit.months}달`}째${s.hermit.visits ? ` · 찾아온 사람 ${s.hermit.visits}명` : ''}</p>
    <div class="wd-row kn-row"><span>은자의 이름</span>${bar(s.hermit.fame, 'kin')}<span class="v">${s.hermit.fame}</span></div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.left.length ? `<p class="note">떠난 수도원: ${s.left.map((x) => `${esc(x.house)}(${x.y}년${x.how ? `, ${esc(x.how)}` : ''})`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>회랑과 움막에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

export function renderCloisters(game) {
  const s = safe(() => cloisterInfo(game));
  if (!s || !s.houses.length) return '';
  if (!s.vow && !s.hermit && !s.left.length && safe(() => playerAge(game), 0) < 14) return '';
  const src = art(game, 'walk');
  return `<section class="card clo-map">
    <h2>수도원 <small>${s.houses.length}곳</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT.walk}">` : ''}
    ${s.houses.map((h) => `<div class="oc-one">
      <p><strong>${esc(h.name)}</strong> · ${esc(h.place)} · ${h.abbot ? `원장 ${esc(h.abbot)} · ` : ''}식구 ${h.monks}${h.dispute ? ` · <b class="warn">${esc(J(h.dispute, '과/와'))} 땅 다툼</b>` : ''}</p>
      <div class="wd-row kn-row"><span>평판</span>${bar(h.rep, 'kin')}<span class="v">${h.rep}</span></div>
    </div>`).join('')}
  </section>`;
}
