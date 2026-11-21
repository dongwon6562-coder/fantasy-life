// 27단계 '타고남과 핏줄' 화면(src/heredity). 읽기만 한다.
// renderHeredityBlock: '나' 화면 덩이 (타고난 재능, 내가 누구를 닮았나, 자식마다 누구를 닮았나, 배우자·혼처 집안에 도는 말)
// 사람 수첩에서 한 사람을 열면 닮음·핏줄 줄이 붙는다(people.js heredityNote).
import { heredityInfo } from '../heredity/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };

export function renderHeredityBlock(game) {
  const s = safe(() => heredityInfo(game));
  if (!s) return '';
  const nameOf = (id) => game.people?.find((p) => p.id === id)?.name ?? '';
  if (!s.giftName && !s.resemble && !s.kids.length && !s.spouse && !s.suitors.length) return '';
  return `<div class="block hd-block">
    <h3>타고남과 핏줄</h3>
    ${s.giftName ? `<p><strong>타고난 ${esc(s.giftName)}</strong></p><p class="note">${esc(s.giftLine ?? '')}</p>` : ''}
    ${s.resemble ? `<p class="note">나는 ${esc(s.resemble)}</p>` : ''}
    ${s.kids.length ? `<ul class="pl-news hd-kids">${s.kids.map((k) => `<li><time>${k.age}살</time><span><button class="linkish" data-ws-person="${k.id}">${esc(k.name)}</button> · ${esc(k.resemble ?? '아직 누구를 닮았는지 모르겠다')}</span></li>`).join('')}</ul>` : ''}
    ${s.spouse?.hint ? `<p class="note">배우자 ${esc(nameOf(s.spouse.id))}의 핏줄: ${esc(s.spouse.hint)}</p>` : ''}
    ${s.suitors.length ? `<details class="pl-more"><summary>혼처 집안에 도는 말 ${s.suitors.length}</summary><ul class="pl-news">${s.suitors.map((x) => `<li><span><button class="linkish" data-ws-person="${x.id}">${esc(x.name)}</button> · ${esc(x.hint ?? '')}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
