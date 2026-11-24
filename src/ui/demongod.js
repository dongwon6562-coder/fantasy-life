// 43단계 '마신의 조각' 화면(src/demongod demongodInfo). 읽기만 한다. 내가 알아낸 것만 보인다.
// renderDemongodBlock: '나' 화면 덩이 (꿈의 목소리, 어느 쪽에 섰나, 알아낸 옛이야기 조각, 옛 사도, 파편과 유물, 기록)
import { demongodInfo } from '../demongod/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'demongod', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { dream: '얼음 들판의 꿈', shard: '손바닥 위의 검은 파편', apostle: '옛 사도의 무덤', cult: '재로 그린 원', war: '봉인 전쟁의 옛 그림', choice: '봉인석 앞에 선 사람' };

export function renderDemongodBlock(game) {
  const s = safe(() => demongodInfo(game));
  if (!s) return '';
  const mine = s.relics.filter((r) => r.mine);
  if (!s.loreCount && !s.relics.length && !s.apostles.length && s.voice.v <= 3 && !s.order && !s.watch && !s.side) return '';
  const v = mine.length ? 'shard' : s.order ? 'cult' : s.side ? 'choice' : s.voice.v >= 40 ? 'dream' : s.apostles.length ? 'apostle' : 'war';
  const src = art(game, v);
  return `<div class="block dg-block">
    <h3>마신의 조각 <small>알아낸 조각 ${s.loreCount}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.voice.v > 3 ? `<div class="wd-row kn-row"><span>꿈의 목소리 · ${esc(s.voice.word)}</span>${bar(s.voice.v, s.voice.v >= 60 ? 'low' : 'mana')}</div>` : ''}
    ${s.side || s.order || s.watch ? `<p class="note">${[s.sideWord ? `<b>${esc(s.sideWord)}</b>` : '', s.order ? `마신교 ${esc(s.order.rank)}` : '', s.watch ? `봉인 지기 ${esc(s.watch.rank)}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
    ${s.lore.map((t) => `<details class="dg-topic">
      <summary><span>${esc(t.topic)}</span><b>${t.pieces.length}</b></summary>
      <ul class="dg-lore">${t.pieces.map((p) => `<li><p>${esc(p.text)}</p>${p.voice ? `<span class="note">${esc(p.voice)}</span>` : ''}</li>`).join('')}</ul>
    </details>`).join('')}
    ${s.apostles.length ? `<p class="note">옛 사도</p><ul class="ag-clues">${s.apostles.map((a) => `<li><b>${esc(a.name)}</b>${a.stirring ? ' · <b class="warn">요즘 움직인다는 말이 있다</b>' : ''}<br><span class="note">${esc(a.did)}${a.rest ? ` ${esc(a.rest)}` : ''}</span></li>`).join('')}</ul>` : ''}
    ${s.relics.length ? `<p class="note">파편과 유물</p><ul class="ag-clues">${s.relics.map((r) => `<li><b>${esc(r.name)}</b> · ${r.mine ? '<b class="warn">내가 지니고 있다</b>' : esc(r.where || '어딘가에')}<br><span class="note">${esc(r.power)}</span>${r.cost ? `<br><span class="note"><b class="warn">대가</b> ${esc(r.cost)}</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${s.destroyed || s.gave ? `<p class="note">${s.destroyed ? `부순 파편 ${s.destroyed}` : ''}${s.destroyed && s.gave ? ' · ' : ''}${s.gave ? `넘겨준 파편 ${s.gave}` : ''}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>마신을 두고 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
