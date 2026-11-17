// 16단계 '맹세와 의형제' 화면(src/oath). 읽기만 한다. '사람들' 화면 카드.
// 피로 맺은 사이·주군·가신, 서원, 두 집안의 약속, 낙인과 지킨 이름, 깬 맹세.
import { oathInfo, oathState } from '../oath/index.js';
import { byId } from '../game.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const KIND_ORDER = { liege: 0, blood: 1, man: 2 };
const HOW = { kept: '이룸', broken: '깨짐', freed: '풀려남', released: '풀려남', died: '지키다 감' };
const BROKEN_WORD = { blood: '의형제', liege: '주군', man: '가신', vow: '서원', pact: '집안 약속' };

export function renderOath(game) {
  const s = safe(() => oathInfo(game));
  if (!s) return '';
  if (!s.bonds.length && !s.vow && !s.vows.length && !s.pacts.length && !s.broken.length && !s.log.length && s.brand < 1) return '';
  // 얼굴: oathInfo의 bonds는 상태의 bonds와 같은 차례
  const raw = safe(() => oathState(game).bonds, []);
  const bonds = s.bonds.map((b, i) => ({ ...b, pid: raw[i]?.pid ?? null })).sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9));
  const bondLi = (b) => {
    const p = b.pid ? byId(game, b.pid) : null;
    const face = p ? `<button class="kn-face" data-person="${b.pid}" aria-label="${esc(b.name)}의 기록">${portrait(game, p, { size: 40 })}</button>` : '';
    const bits = [b.years ? `${b.years}년째` : '올해 맺음'];
    if (b.kept) bits.push(`지킨 일 ${b.kept}`);
    if (b.strain) bits.push(`거스른 일 ${b.strain}`);
    if (!b.alive) bits.push('세상을 떠남');
    return `<li class="vl-nb${b.strain >= 2 ? ' oa-strain' : ''}">${face}
      <span class="vl-nb-txt"><strong>${esc(b.name ?? '')}</strong><span class="note">${esc(b.kindWord ?? '')} · ${bits.join(' · ')}</span></span></li>`;
  };
  const tags = [];
  if (s.honor >= 5) tags.push([`맹세를 지킨 이름 ${s.honor}`, 'gift']);
  if (s.brandWord) tags.push([s.brandWord, 'dark']);
  const V = s.vow;
  return `<section class="card oath-card">
    <h2>맹세 <small>${bonds.length ? `묶인 사람 ${bonds.length}` : '말 한마디로 묶이는 삶'}</small></h2>
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${s.brand >= 1 ? `<div class="wd-row kn-row"><span>낙인 ${s.brand}</span>${bar(s.brand, 'low')}</div>
      ${s.brand >= 40 ? '<p class="note warn">맹세를 어긴 일이 널리 알려졌다. 피를 섞거나 무릎을 꿇겠다는 말을 믿어 주는 사람이 줄었다.</p>' : ''}` : ''}
    ${bonds.length ? `<ul class="vl-nbs oa-bonds">${bonds.map(bondLi).join('')}</ul>` : ''}
    ${V ? `<div class="oa-vow"><strong>${esc(V.name)}</strong><span class="note">${V.years ? `${V.years}년째 지키는 중` : '올해 세움'}${V.left != null ? ` · ${V.left ? `${V.left}해 남음` : '곧 끝남'}` : ' · 평생'}</span></div>` : ''}
    ${s.pacts.length ? `<h3 class="sub">두 집안의 약속</h3><ul class="pl-news oa-pacts">${s.pacts.map((x) => `<li><time>${esc(x.house)} 집안</time><span>${esc(x.kindWord)}${x.inherited ? ` · ${esc(x.from ?? '윗대')}에게서 물려받음` : ''}${x.who ? ` · 그 집 사람 ${esc(x.who)}` : ''}</span></li>`).join('')}</ul>` : ''}
    ${s.vows.length ? `<p class="note">지나간 서원: ${s.vows.map((x) => `${esc(x.name)} (${x.y}년${x.how ? `, ${esc(HOW[x.how] ?? x.how)}` : ''})`).join(', ')}</p>` : ''}
    ${s.broken.length ? `<details class="pl-more"><summary>깬 맹세 ${s.broken.length}가지</summary><ul class="pl-news">${s.broken.slice().reverse().map((x) => `<li><time>${x.y}년</time><span>${esc(BROKEN_WORD[x.kind] ?? '맹세')} · ${esc(x.why ?? x.name ?? '')}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>맹세에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
