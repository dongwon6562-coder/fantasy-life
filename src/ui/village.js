// 14단계 '이웃과 마을 살이' 화면(src/village). 읽기만 한다. '사람들' 화면 카드.
import { villageInfo } from '../village/index.js';
import { byId } from '../game.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderVillage(game) {
  const s = safe(() => villageInfo(game));
  if (!s) return '';
  if (!s.settled && !s.office && !s.other.length && !s.log.length && !s.landmarks.length) return '';
  const tags = [];
  if (s.born) tags.push(['토박이', 'heir']);
  if (s.office) tags.push([`${s.office.placeName} ${s.office.title}${s.office.years ? ` ${s.office.years}년째` : ''}`, 'gift']);
  const favors = [];
  if (s.favors) favors.push(`이웃에게 해 준 품 ${s.favors}`);
  if (s.owed) favors.push(`갚을 품 ${s.owed}`);
  const neighbor = (n) => {
    const p = byId(game, n.id);
    return `<li class="vl-nb">${p ? `<button class="kn-face" data-person="${n.id}" aria-label="${esc(n.name)}의 기록">${portrait(game, p, { size: 40 })}</button>` : ''}
      <span class="vl-nb-txt"><strong>${esc(n.name)}</strong><span class="note">${n.age}살 · ${esc(n.word)}</span></span></li>`;
  };
  const NB = 4;
  return `<section class="card village-card">
    <h2>이웃과 마을 <small>${esc(s.placeName)}${s.years ? ` · ${s.years}년째` : ''}</small></h2>
    ${s.settled ? `<div class="wd-row kn-row"><span>우리 사람 ${s.belong} · ${esc(s.belongWord)}</span>${bar(s.belong, s.belong < 20 ? 'low' : 'kin')}</div>` : '<p class="note">여기서는 머물 뿐이다. 부모 집·셋방·내 집에 살아야 이웃이 된다.</p>'}
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${favors.length ? `<p class="note">${favors.join(' · ')}${s.owed ? ' · 추수나 재앙 든 해에 이웃들이 돕는다' : ''}</p>` : ''}
    ${s.head ? `<p class="note">${esc(s.head.title ?? '촌장')}: ${s.head.me ? '나' : esc(s.head.name)}</p>` : ''}
    ${s.neighbors.length ? `<h3 class="sub">가까운 이웃</h3><ul class="vl-nbs">${s.neighbors.slice(0, NB).map(neighbor).join('')}</ul>
      ${s.neighbors.length > NB ? `<details class="pl-more"><summary>그 밖의 이웃 ${s.neighbors.length - NB}명</summary><ul class="vl-nbs">${s.neighbors.slice(NB).map(neighbor).join('')}</ul></details>` : ''}` : ''}
    ${s.projects.length ? `<h3 class="sub">마을 일</h3><ul class="nt-regions">${s.projects.map((x) => `<li><div class="wd-row kn-row"><span>${esc(x.name)} · ${esc(x.placeName)} ${Math.round(x.progress)}%</span>${bar(x.progress, 'kin')}</div></li>`).join('')}</ul>` : ''}
    ${s.landmarks.length ? `<p class="note">고장의 자랑거리: ${s.landmarks.map((x) => `${esc(x.name)} (${esc(x.placeName)}, ${x.y}년${x.by ? ` · ${esc(x.by)}` : ''})`).join(', ')}</p>` : ''}
    ${s.strangers.length ? `<details class="pl-more"><summary>받아들인 떠돌이 ${s.strangers.length}명</summary><ul class="pl-news">${s.strangers.map((x) => `<li><time>${esc(x.placeName)}</time><span>${esc(x.name)}${x.fate ? ` · ${esc(x.fate)}` : ''}</span></li>`).join('')}</ul></details>` : ''}
    ${s.other.length ? `<p class="note">전에 살던 고장: ${s.other.map((o) => `${esc(o.placeName)} (${esc(o.word)})`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>마을에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
