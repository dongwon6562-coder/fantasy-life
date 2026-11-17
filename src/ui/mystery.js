// 16단계 '풀리지 않은 일' 화면(src/mystery). 읽기만 한다.
// renderMysteryNow: 이번 달 화면 카드 (지금 이 고장에 캐는 사건이 있을 때)
// renderMysteryBlock: '나' 화면 덩이 (성적, 다른 고장 사건, 식은 사건·옛 미제, 기록)
import { mysteryStatus } from '../mystery/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const STATE = { open: '캐는 중', solved: '풀어 냄', wrong: '엉뚱한 사람을 몰았다', framed: '돈을 받고 엉뚱한 사람을 몰았다', dropped: '덮었다', cold: '식었다', cleared: '뒤늦게 풀림' };
const heatWord = (h) => (h >= 70 ? '진범이 나를 노린다' : h >= 40 ? '진범이 눈치챘다' : h >= 15 ? '누군가 지켜본다' : '아직 아무도 모른다');

function suspectLi(s) {
  const cls = s.pointed ? 'pointed' : s.cleared ? 'cleared' : '';
  const word = s.pointed ? '단서가 가리킨다' : s.cleared ? '혐의를 벗었다' : '아직 모른다';
  return `<li class="${cls}"><div class="top"><strong>${esc(s.name)}</strong><span class="note">${esc(word)}</span></div><span class="note">${esc(s.motive)}</span></li>`;
}

/** 이번 달 화면 카드 */
export function renderMysteryNow(game) {
  const s = safe(() => mysteryStatus(game));
  const c = s?.here;
  if (!c) return '';
  const heat = Math.round(c.heat ?? 0);
  return `<section class="card mystery-now">
    <h2>풀리지 않은 일 <small>${esc(c.placeName)} · ${esc(c.kindName)}</small></h2>
    <p class="my-title"><strong>${esc(c.title)}</strong> <span class="note">${c.year}년부터</span></p>
    <ul class="ct-houses my-suspects">${c.suspects.map(suspectLi).join('')}</ul>
    ${c.clues.length ? `<details class="pl-more"><summary>모은 단서 ${c.clues.length}가지</summary><ul class="my-clues">${c.clues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : '<p class="note">아직 단서가 없다.</p>'}
    <div class="wd-row kn-row"><span>${esc(heatWord(heat))}</span>${bar(heat, 'low')}</div>
    <p class="note">할 일의 '풀리지 않은 일을 캔다'로 현장을 살피고 사람들을 캐묻는다.</p>
  </section>`;
}

/** '나' 화면 덩이 */
export function renderMysteryBlock(game) {
  const s = safe(() => mysteryStatus(game));
  if (!s) return '';
  const away = s.open.filter((c) => c.state === 'open' && c.id !== s.here?.id);
  const any = s.solved || s.wrong || s.framed || s.dropped || s.oldSolved || away.length || s.cold.length || s.log.length;
  if (!any) return '';
  const chips = [];
  if (s.solved) chips.push(['풀어 낸 일', `${s.solved}`, false]);
  if (s.oldSolved) chips.push(['옛 미제를 풂', `${s.oldSolved}`, false]);
  if (s.wrong) chips.push(['엉뚱한 사람을 몰았다', `${s.wrong}`, true]);
  if (s.framed) chips.push(['돈 받고 몰았다', `${s.framed}`, true]);
  if (s.dropped) chips.push(['덮은 일', `${s.dropped}`, true]);
  const coldLi = (c) => `<li class="${c.exposed ? 'bad' : ''}"><div class="top"><strong>${esc(c.title)}</strong><span class="note">${esc(c.placeName)} · ${c.year}년</span></div>
      <span class="note">${esc(STATE[c.state] ?? c.state)}${c.accused ? ` · 범인으로 몰린 사람: ${esc(c.accused)}` : ''}${c.culprit ? ` · 진범: ${esc(c.culprit)}` : ''}${c.exposed ? ' · 잘못 몬 것이 드러났다' : ''}${c.ancestor ? ' · 윗대의 일' : ''}${c.by && c.ancestor ? ` (${esc(c.by)})` : ''}</span></li>`;
  return `<div class="block mystery-block">
    <h3>풀리지 않은 일</h3>
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${away.length ? `<p class="note">다른 고장에 두고 온 일: ${away.map((c) => `${esc(c.title)} (${esc(c.kindName)})`).join(', ')}</p>` : ''}
    ${s.cold.length ? `<details class="pl-more"><summary>식은 사건과 잘못 끝난 사건 ${s.cold.length}가지</summary><ul class="ct-houses my-cold">${s.cold.slice().reverse().map(coldLi).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>캐면서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
