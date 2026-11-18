// 18단계 '편지와 먼 인연' 화면(src/letters). 읽기만 한다. '사람들' 화면 카드.
// 편지를 주고받는 사람(정·통 수·마지막 편지·답 못 한 편지), 길 위의 편지, 간직한 편지, 위조·몰래 뜯어본 편지, 기록.
import { lettersInfo } from '../letters/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderLetters(game) {
  const s = safe(() => lettersInfo(game));
  if (!s) return '';
  if (!s.corr.length && !s.incoming && !s.outgoing && !s.keptCount && !s.forged && !s.opened && !s.log.length) return '';
  const waiting = s.corr.reduce((a, c) => a + (c.waiting || 0), 0);
  const li = (c) => {
    const bits = [c.kindWord, c.alive ? c.placeName : '세상을 떠남'];
    if (c.count) bits.push(`${c.count}통`);
    if (c.lastYears != null) bits.push(c.lastYears ? `마지막 편지 ${c.lastYears}년 전` : '올해 편지를 나눔');
    if (c.inherited) bits.push('선대에게서 이어받은 사이');
    if (c.stopped) bits.push('편지가 끊겼다');
    return `<li class="${c.alive && !c.stopped ? '' : 'gone'}"><div class="wd-row kn-row"><span><strong>${esc(c.name)}</strong> · ${esc(c.warmthWord)}</span>${bar(c.warmth, c.warmth < 25 ? 'low' : 'kin')}</div>
      <span class="note">${bits.map(esc).join(' · ')}${c.waiting ? ` · <b class="warn">답장 못 한 편지 ${c.waiting}통</b>` : ''}</span></li>`;
  };
  const road = [];
  if (s.incoming) road.push(`오고 있는 편지 ${s.incoming}통`);
  if (s.outgoing) road.push(`보낸 편지 ${s.outgoing}통이 길 위에 있다`);
  const chips = [];
  if (s.forged) chips.push(['꾸민 문서', `${s.forged}번`, true]);
  if (s.opened) chips.push(['몰래 뜯어본 편지', `${s.opened}통`, true]);
  return `<section class="card letters-card">
    <h2>편지 <small>${s.corr.length ? `주고받는 사람 ${s.corr.length}명` : '먼 인연'}${waiting ? ` · 답장 기다리는 편지 ${waiting}통` : ''}</small></h2>
    ${road.length ? `<p class="note ok">${road.join(' · ')}</p>` : ''}
    ${s.corr.length ? `<ul class="ct-houses lt-corr">${s.corr.map(li).join('')}</ul>` : ''}
    ${!s.literate ? '<p class="note">글을 몰라 편지는 대서방에 맡겨 쓴다. 값이 조금 더 든다.</p>' : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.kept.length ? `<details class="pl-more"><summary>간직한 편지 ${s.kept.length}통${s.keptCount > s.kept.length ? ` (모두 ${s.keptCount}통)` : ''}</summary><ul class="pl-news lt-kept">${s.kept.slice().reverse().map((k) => `<li><time>${k.y}년</time><span><b>${esc(k.from ?? '')}</b>${k.love ? ' ♡' : ''} · "${esc(k.line ?? '')}"</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>편지에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
