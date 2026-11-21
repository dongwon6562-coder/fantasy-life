// 25단계 '마나의 흐름' 화면(src/mana). 읽기만 한다.
// renderManaNow: 이번 달 화면 한 줄 (이 고장 마나 폭풍, 깊은 마나 중독, 마나가 아주 짙거나 옅을 때)
// renderMana: 지도 화면 카드 (대륙 마나의 물때와 스무 해 흐름, 마석 값, 일곱 샘: 기운·차지한 이·지킴·폭풍, 기록)
// renderManaBlock: '나' 화면 덩이 (마나 중독, 샘에서 길어 올린 일, 샘지기, 폭풍, 지켜 낸 일, 재능을 알아본 아이)
import { manaInfo, manaLine } from '../mana/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderManaNow(game) {
  const line = safe(() => manaLine(game), null);
  if (!line) return '';
  const bad = /폭풍|중독/.test(line);
  const m = line.match(/^(마나 폭풍|마나 중독):\s*(.*)$/);
  return `<section class="card mana-now"><p class="note"><b${bad ? ' class="warn"' : ''}>${esc(m ? m[1] : '마나')}</b> ${esc(m ? m[2] : line)}</p></section>`;
}

// 스무 해 물때: 가운데 줄 위는 짙은 해, 아래는 옅은 해
const tideStrip = (years) => `<div class="mn-tide" role="img" aria-label="지난 ${years.length}해 마나의 물때">${years.map((t) => `<i class="${t.tide >= 0 ? 'up' : 'dn'}" style="height:${Math.max(2, Math.round(Math.min(100, Math.abs(t.tide)) * 0.24))}px" title="${t.y}년"></i>`).join('')}</div>`;

export function renderMana(game) {
  const s = safe(() => manaInfo(game));
  if (!s || !s.wells.length) return '';
  const row = (w) => {
    const bits = [esc(w.flowWord), `${esc(w.holder)}의 샘`, esc(w.guard)];
    if (w.storms) bits.push(`폭풍 ${w.storms}번`);
    if (w.seized) bits.push(`주인이 바뀐 일 ${w.seized}번`);
    return `<li class="${w.warden ? 'here' : w.dry ? 'gone' : ''}"><div class="top"><strong>${esc(w.name)}</strong><span class="note">${esc(w.placeName)}${w.here ? ' · 여기' : ''}${w.warden ? ' · 내가 샘지기' : ''}</span></div>
      ${w.dry ? '' : `<div class="wd-row kn-row"><span>샘의 기운</span>${bar(w.flow, 'kin')}</div>`}
      <span class="note">${bits.filter(Boolean).join(' · ')}</span></li>`;
  };
  const sorted = s.wells.slice().sort((a, b) => (b.warden - a.warden) || (b.here - a.here) || (a.dry - b.dry) || (b.flow - a.flow));
  const top = sorted.slice(0, 4), rest = sorted.slice(4);
  return `<section class="card mana-card">
    <h2>마나의 흐름 <small>${esc(s.word)}</small></h2>
    ${s.years.length > 2 ? tideStrip(s.years) : ''}
    <p class="note">${esc(s.price)}${s.storm ? ` · <b class="warn">마나 폭풍: ${esc(s.storm.placeName)}</b>` : ''}</p>
    <ul class="ct-houses mw-list">${top.map(row).join('')}</ul>
    ${rest.length ? `<details class="pl-more"><summary>다른 샘 ${rest.length}곳</summary><ul class="ct-houses mw-list">${rest.map(row).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>마나에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderManaBlock(game) {
  const s = safe(() => manaInfo(game));
  const M = s?.me;
  if (!M) return '';
  const chips = [];
  if (M.draws) chips.push(['샘에서 길어 올림', `${M.draws}번`]);
  if (M.defended) chips.push(['샘을 지켜 냄', `${M.defended}번`, 'up']);
  if (M.storms) chips.push(['겪은 마나 폭풍', `${M.storms}번`]);
  if (M.kids) chips.push(['재능을 알아본 아이', `${M.kids}명`, 'up']);
  if (!chips.length && !M.warden && M.poison < 5) return '';
  return `<div class="block mana-block">
    <h3>마나의 흐름</h3>
    ${M.warden ? `<p class="note"><b>${esc(M.warden)}</b>의 샘지기</p>` : ''}
    ${M.poison >= 5 ? `<div class="wd-row kn-row"><span>마나 중독 · ${esc(M.poisonWord)}</span>${bar(M.poison, M.poison >= 40 ? 'low' : '')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
  </div>`;
}
