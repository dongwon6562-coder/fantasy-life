// 42단계 시작 화면 '종족' 고르기: 종족 카드(반신 초상·수명·레오니아의 대우), 고른 종족은 자세히(고향·나라마다 대우·설명).
// data-race 이름은 그대로 (index.js가 묶는다).
import { RACES, TREATMENT, TREAT_WORD } from '../races/index.js';
import { REALMS } from '../realms/data.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
// 초상 견본: 종족마다 같은 얼굴이 나오게 고정한 사람 (스물 몇 살 몸)
const SAMPLE = {
  human: { name: '레온', sex: 'm' }, elf: { name: '실레아', sex: 'f' }, dwarf: { name: '브롬', sex: 'm' },
  beast: { name: '카르', sex: 'm', beast: 'wolf' }, half_elf: { name: '리엔', sex: 'f' }, half_demon: { name: '세라', sex: 'f' }, demon: { name: '아즈', sex: 'm' },
};
const lifeWord = (n) => (n >= 500 ? '천 년 가까이' : n >= 150 ? `${Math.round(n / 50) * 50}년쯤` : `${n}년쯤`);
const EXTRA_REALM = { demon: '마대륙의 마왕령' };
const TONE = { welcome: 'up', normal: '', wary: 'warn', scorn: 'down', banned: 'down' };

function face(id, i, size) {
  const s = SAMPLE[id] ?? { name: '이름 없는', sex: i % 2 ? 'f' : 'm' };
  const p = { id: 990000 + i, name: s.name, lastName: '', sex: s.sex, race: id, beast: s.beast ?? null, ageMonths: 24 * 12, alive: true, isPlayer: false };
  return safe(() => portrait(null, p, { size, bust: true, plain: true, mood: 'calm' }), '');
}

function treatOf(id) {
  const here = TREATMENT.leonia?.[id] ?? 'normal';
  const welcome = [], cold = [];
  for (const [k, row] of Object.entries(TREATMENT)) {
    const t = row[id]; const name = REALMS[k]?.name ?? EXTRA_REALM[k] ?? k;
    if (t === 'welcome') welcome.push(name);
    else if (t === 'scorn' || t === 'banned') cold.push(name);
  }
  return { here, welcome, cold };
}

export function renderRacePick(races, race) {
  if (!races.length) return '';
  const now = races.find((r) => r.id === race) ?? races[0];
  const nowT = treatOf(now.id);
  const card = (r, i) => {
    const t = treatOf(r.id);
    return `<button class="rc-card${r.id === race ? ' on' : ''}" data-race="${r.id}" aria-pressed="${r.id === race}">
      <span class="rc-pic">${face(r.id, i, 64)}</span>
      <strong>${esc(r.name)}</strong>
      <span class="rc-life">수명 ${esc(lifeWord(r.life))}</span>
      <span class="rc-treat ${TONE[t.here] ?? ''}">레오니아: ${esc(r.id === 'human' ? '제 나라' : TREAT_WORD[t.here] ?? '')}</span>
    </button>`;
  };
  return `<div class="rc-grid" role="group" aria-label="종족">${races.map(card).join('')}</div>
    <div class="rc-detail">
      <p><b>${esc(now.name)}</b> · 고향 ${esc(RACES[now.id]?.home ?? '')}</p>
      <p class="note">${esc(now.desc)}</p>
      ${nowT.welcome.length ? `<p class="note"><b class="up">반기는 곳</b> ${nowT.welcome.map(esc).join(', ')}</p>` : ''}
      ${nowT.cold.length ? `<p class="note"><b class="down">꺼리거나 들이지 않는 곳</b> ${nowT.cold.map(esc).join(', ')}</p>` : ''}
    </div>`;
}
