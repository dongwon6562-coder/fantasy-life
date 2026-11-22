// 31단계 '형제자매' 화면(src/siblings). 읽기만 한다.
// renderSiblings: '사람들' 화면 카드 (형제마다 나이·일·사는 곳·짝·자식·사이, 대를 이은 뒤의 삼촌·고모, 맡아 기르는 조카, 최근 일)
import { siblingsInfo } from '../siblings/index.js';
import { byId } from '../game.js';
import { portrait } from '../art/portrait.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const BOND_CLS = { '원수가 된 사이': 'foe', '등 돌린 사이': 'foe', '늘 겨루는 사이': 'flaw', '아끼면서도 겨루는 사이': 'flaw', '목숨도 내줄 사이': 'ally', '살가운 사이': 'ally' };

export function renderSiblings(game) {
  const s = safe(() => siblingsInfo(game));
  if (!s || (!s.siblings.length && !s.uncles.length && !s.wards.length)) return '';
  const alive = s.siblings.filter((x) => x.alive), dead = s.siblings.filter((x) => !x.alive);
  const row = (x) => {
    const p = byId(game, x.id);
    const line2 = [x.job, x.here ? '이 고장에 산다' : x.place, x.spouse ? `짝 ${x.spouse}` : '', x.kids.length ? `자식 ${x.kids.join(', ')}` : ''].filter(Boolean).join(' · ');
    return `<li class="kn-kid sb-sib">
      ${p ? `<button class="kn-face" data-person="${x.id}" aria-label="${esc(x.name)}의 기록">${portrait(game, p, { size: 52 })}</button>` : ''}
      <div class="kn-txt">
        <div class="top"><strong>${esc(x.name)}</strong><span class="note">${esc(x.word)} · ${x.age}살</span></div>
        <span class="note">${esc(line2)}</span>
        <div class="ct-tags"><span class="ct-tag ${BOND_CLS[x.bond] ?? ''}">${esc(x.bond)}</span>${x.trouble ? '<span class="ct-tag foe">어려운 처지</span>' : ''}</div>
      </div></li>`;
  };
  // 사이가 틀어졌으면 갈라선 상속 자리, 멀리 떠난 형제가 있으면 떠나는 길, 아니면 함께 자란 집
  const variant = alive.some((x) => BOND_CLS[x.bond] === 'foe') ? 'split' : alive.some((x) => x.place === '먼 곳') ? 'leave' : 'home';
  const art = alive.length >= 2 || variant !== 'home' ? safe(() => vignetteImage({ plate: 'siblings', variant, year: game.date.year, month: game.date.month }), '') : '';
  return `<section class="card sib-card">
    <h2>형제자매 <small>${alive.length}명${dead.length ? ` · 먼저 간 형제 ${dead.length}` : ''}</small></h2>
    ${art ? `<img class="blk-art" src="${art}" alt="${variant === 'split' ? '갈라선 상속 자리' : variant === 'leave' ? '먼 길을 떠나는 형제' : '형제들이 함께 자란 집'}">` : ''}
    ${alive.length ? `<ul class="kn-list">${alive.map(row).join('')}</ul>` : ''}
    ${dead.length ? `<p class="note kn-dead">먼저 간 형제: ${dead.map((x) => esc(`${x.name}(${x.word})`)).join(', ')}</p>` : ''}
    ${s.uncles.length ? `<h3 class="sub">집안 어른이 된 형제</h3><ul class="ag-clues">${s.uncles.map((u) => `<li>${esc(u.word)} ${esc(u.name)} · ${esc(u.stance)}</li>`).join('')}</ul>` : ''}
    ${s.wards.length ? `<p class="note">맡아 기르는 조카: ${s.wards.map(esc).join(', ')}</p>` : ''}
    ${s.recent.length ? `<details class="pl-more"><summary>형제 사이의 일 ${s.recent.length}가지</summary><ul class="pl-news">${s.recent.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
