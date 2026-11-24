// 43단계 '내 검술 수첩' 화면(src/duel). 읽기만 한다.
// renderSwordbook: '나' 화면 덩이 (유파와 등급, 등급 표, 배운 초식과 비전, 검기, 스승, 겨룬 이름난 검객)
// src/duel에 화면용 swordInfo(g)가 있으면 그것을 쓰고, 없으면 swordState·SCHOOLS·RANKS로 기본 틀만 그린다.
import * as D from '../duel/index.js';
import { SCHOOLS, RANKS, RANK_NEED } from '../duel/schools.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

// 기본 틀: 유파·등급·검술 실력만
function basic(g) {
  const s = g.sword ?? { school: null, rank: -1, tests: 0 };
  const sk = Math.floor(g.player.skills?.sword ?? 0);
  if (!s.school && sk < 5) return null;
  const sc = s.school ? SCHOOLS[s.school] : null;
  return {
    school: sc ? { id: s.school, name: sc.name, desc: sc.desc } : null,
    rank: s.rank ?? -1, skill: sk,
    ranks: RANKS.map((name, i) => ({ name, need: RANK_NEED[i] })),
    forms: [], aura: null, master: null, rivals: [], tests: s.tests ?? 0,
  };
}

function rankTable(s) {
  return `<ol class="sw-ranks" aria-label="등급 표">${s.ranks.map((r, i) => {
    const cls = i === s.rank ? ' now' : i < s.rank ? ' on' : '';
    return `<li class="sw-r${cls}"><b>${esc(r.name)}</b><span>${r.need > 100 ? '전설' : `검술 ${r.need}`}</span></li>`;
  }).join('')}</ol>`;
}

export function renderSwordbook(game) {
  const s = safe(() => (typeof D.swordInfo === 'function' ? D.swordInfo(game) : basic(game)));
  if (!s || (!s.school && s.skill < 5 && !s.blade && !s.hall && !s.other?.length)) return '';
  const forms = s.forms ?? [];
  const known = forms.filter((f) => f.learned);
  const rn = s.rankName ?? (s.rank >= 0 ? s.ranks[s.rank]?.name : null);
  const need = (f) => (typeof f.need === 'number' ? `검술 ${f.need}` : f.need ?? '아직');
  const h = s.hall;
  return `<div class="block sw-book">
    <h3>내 검술 수첩 <small>${s.school ? `${esc(s.school.name)}${rn ? ` ${esc(rn)}` : ''}` : '유파 없음'}</small></h3>
    ${s.school?.desc ? `<p class="note">${esc(s.school.desc)}</p>` : '<p class="note">아직 어느 유파에도 들지 않았다. 혼자 휘두르는 검이다.</p>'}
    <div class="wd-row kn-row"><span>검술 · ${s.skill}</span>${bar(s.skill, 'kin')}</div>
    ${s.aura?.v ? `<div class="wd-row kn-row"><span>칼에 싣는 기운 · ${esc(s.aura.word ?? '')}</span>${bar(s.aura.v * 33.4, 'mana')}</div>` : ''}
    ${s.school ? rankTable(s) : ''}
    ${forms.length ? `<p class="note">초식 ${known.length}/${forms.length}</p><ul class="sw-forms">${forms.map((f) => `<li class="sw-f${f.learned ? ' on' : ''}${f.secret ? ' secret' : ''}"><p><strong>${esc(f.name)}</strong>${f.secret ? ' <small>비전</small>' : ''}${f.learned ? '' : ` <em>${esc(need(f))}</em>`}</p>${f.desc ? `<span class="note">${esc(f.desc)}</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${s.other?.length ? `<p class="note">다른 유파에서 익힌 초식: ${s.other.map((f) => `<b>${esc(f.name)}</b>`).join(', ')}</p>` : ''}
    ${s.blade ? `<div class="wd-row kn-row"><span>마검 · ${esc(s.blade.word)}${s.blade.spell ? ` · ${esc(s.blade.spell)}` : ''}</span>${bar((s.blade.v ?? 0) * 33.4, 'mana')}</div>` : ''}
    ${h ? `<p class="note"><b>${h.mine ? '내 유파' : '집안 유파'}</b> ${esc(h.name)} · ${esc(h.place)}${h.closed ? ' · 문을 닫았다' : ` · 문하생 ${h.pupils}명 · 이름값 ${h.fame}`}${h.head ? ` · 지금 맡은 사람 ${esc(h.head)}` : ''}</p>` : ''}
    ${s.master ? `<p class="note">스승 ${esc(s.master.name)}${s.master.alive === false ? ' (세상을 떠났다)' : ''}</p>` : ''}
    ${s.rivals?.length ? `<p class="note">겨뤄 본 상대: ${s.rivals.map((r) => `${esc(r.name)}${r.won == null ? '' : r.won ? '(이겼다)' : '(졌다)'}`).join(', ')}</p>` : ''}
    ${s.famous?.length ? `<p class="note">세상의 이름난 검객: ${s.famous.slice(0, 6).map((f) => `${esc(f.name)}(${esc(f.school)}, ${esc(f.place)}${f.blade ? ', 마검사' : ''})`).join(', ')}</p>` : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>검을 들고 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
