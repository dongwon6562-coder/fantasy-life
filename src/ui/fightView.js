// 46단계 전투 화면: 결투·교전이 사건 창에 뜨면 같은 틀로 그린다. 읽기만 한다 (규칙은 src/duel·src/adventure).
//  - 위쪽 몸 막대: 나와 상대(또는 적 무리), 가운데 기세 눈금, 몇 번째 합/고비
//  - 낌새 한 칸, 수 고르기 카드(아이콘·이름·짧은 풀이)
//  - 합 결과 창: 막대가 줄어드는 움직임, 맞은 쪽 흔들림, 버튼은 '다음 합'
//  - 결정적 순간: 창 둘레가 어두워지고 금빛 테
//  - 전투 끝: 요약 카드 (결과, 합 수, 남은 몸, 쓴 수)
// 갈래가 duelView/skirmishView를 내주면 그걸 먼저 쓰고, 없으면 g.duel·장면을 직접 읽는다.
import { esc } from './util.js';
import { icon } from '../art/icons.js';
import { describeFoes } from '../adventure/combat.js';
import { companionsFor } from '../adventure/fight.js';
import { duelView } from '../duel/index.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const pct = (v, v0) => Math.max(0, Math.min(100, Math.round((v / (v0 || 1)) * 100)));
const hpWord = (r) => (r > 80 ? '멀쩡하다' : r > 55 ? '숨이 거칠다' : r > 30 ? '비틀거린다' : r > 0 ? '한계에 가깝다' : '쓰러졌다');

export const MOVE_IDS = ['heavy', 'quick', 'guard', 'feint', 'wait', 'magic', 'aura', 'yield'];
// 수마다 아이콘과 한 줄 풀이 (무엇을 이기고 무엇에 지나)
const MOVE_META = {
  heavy: { icon: 'sword', name: '강공', hint: '막기·허초를 부순다. 속공에 끊긴다.' },
  quick: { icon: 'dagger', name: '속공', hint: '강공·허초·주문을 끊는다. 막기에 걸린다.' },
  guard: { icon: 'shield', name: '막기', hint: '속공을 흘리고 받아친다. 강공·허초에 진다.' },
  feint: { icon: 'mask', name: '허초', hint: '막기를 무너뜨린다. 강공·속공에 진다.' },
  wait: { icon: 'eye', name: '간 보기', hint: '덜 다치고, 다음 낌새를 더 잘 읽는다.' },
  magic: { icon: 'magic', name: '주문', hint: '막기·허초·강공을 뚫는다. 속공에 끊긴다.' },
  aura: { icon: 'sun', name: '검기', hint: '속공 말고는 다 누른다. 몹시 지친다.' },
  yield: { icon: 'flag', name: '항복', hint: '여기서 칼을 거둔다.' },
  finish: { icon: 'skull', name: '결정타', hint: '성공하면 끝난다. 빗나가면 기세를 잃는다.' },
  disarm: { icon: 'hammer', name: '칼 떨구기', hint: '칼만 떨군다. 이기면 상대를 살린다.' },
  dodge: { icon: 'boot', name: '몸 던지기', hint: '높이 내려치는 칼이면 산다.' },
  block: { icon: 'shield', name: '받아내기', hint: '낮게 파고드는 칼이면 산다.' },
};
const RESULT_WORD = { win: ['내가 이겼다', 'up'], lose: ['상대가 이겼다', 'down'], trade: ['서로 베었다', 'warn'], even: ['맞부딪쳤다', ''], read: ['간을 봤다', ''] };
const TACTIC_META = [
  [/정면|맞선다|버틴|앞줄/, 'sword', '힘으로 맞붙는다. 세면 빨리 끝나지만 다칠 수 있다.'],
  [/기습|돌아|옆으로|숨어/, 'dagger', '틈을 노린다. 들키면 오히려 몰린다.'],
  [/마법|주문/, 'magic', '먼저 주문으로 친다. 마력이 든다.'],
  [/적장|우두머리|대장/, 'crown', '우두머리를 노린다. 쓰러뜨리면 무리가 흩어진다.'],
  [/감싸|지킨|동료/, 'shield', '곁의 사람을 지킨다.'],
  [/물러|피한|달아|도망|싸우지 않/, 'boot', '싸움을 피한다. 잃는 것도 있다.'],
];
const tacticMeta = (label) => TACTIC_META.find(([re]) => re.test(label)) ?? [null, 'sword', ''];

/* ---------- 지금 뜬 사건이 전투인가 ---------- */
function duelState(g) {
  const e = g?.pendingEvent;
  if (!e || e.id !== 'duel_round' || !g.duel) return null;
  const v = safe(() => duelView(g));
  if (!v) return null;
  return {
    kind: 'duel', round: v.round, maxRound: v.maxRound, crux: !!v.crux, cruxSide: v.cruxSide, place: v.place, crowd: v.crowd,
    me: { ...v.me }, foe: { ...v.foe }, mom: v.mom ?? 0,
    intro: (() => {
      // 부른 쪽이 붙인 들머리(첫 합의 첫 문단)와 갈래의 장면 글(beat)을 함께. 몸 형편 줄·낌새·앞 합·응원·대사는 따로 그린다
      const d = g.duel, scene = [d.cheer, d.say, d.beat].filter(Boolean).join(' ').trim();
      const drop = new Set([String(d.tell ?? '').trim(), String(d.log?.at?.(-1) ?? '').trim(), scene].filter(Boolean));
      const head = String(e.text ?? '').split('\n\n').map((x) => x.trim()).filter((x) => x && !drop.has(x) && !/^나는 [^.]*\./.test(x));
      const beat = v.intro ?? v.beat;
      return [...head, ...(beat && !head.includes(beat) ? [beat] : [])].join('\n\n') || null;
    })(), cheer: v.cheer ?? null,
    tell: v.tell ?? '', mana: g.duel.mana ?? 0, magic: !!v.magic,
    moves: (v.moves ?? []).map((m) => ({ ...m })),
  };
}
function fightState(g) {
  const e = g?.pendingEvent, s = g?.life?.scene;
  if (!e || e.id !== 'life_scene' || s?.kind !== 'fight' || !s.enc) return null;
  const text = String(e.text ?? '');
  const threat = /가늠해 보니,?\s*([^\n]+)$/.exec(text)?.[1] ?? '';
  const intro = text.replace(/\s*적:[^.]*\.(\s*[^.]*곁에 있다\.)?\s*가늠해 보니[^\n]*$/, '').trim();
  const comps = safe(() => companionsFor(g).map((c) => c.name), []);
  return {
    kind: 'fight', title: e.title, intro, threat,
    us: { name: g.player?.name ?? '나', with: comps },
    them: { name: safe(() => describeFoes(s.enc), '적') },
    moves: e.choices.map((label, i) => ({ id: i, label })),
  };
}
export function battleState(g) { return duelState(g) ?? fightState(g); }

/* ---------- 고르기 전에 적어 두기 (결과 창에서 막대가 줄어드는 움직임에 쓴다) ---------- */
export function battleSnap(g, choice) {
  const st = safe(() => battleState(g));
  if (!st) return null;
  if (st.kind === 'duel') {
    const d = g.duel;
    return { kind: 'duel', title: d.title, round: st.round, me: { ...st.me }, foe: { ...st.foe }, mom: st.mom, move: st.moves[choice]?.id, history: [...(d.history ?? []), st.moves[choice]?.id].filter(Boolean), lethal: !!d.lethal, place: st.place };
  }
  return { kind: 'fight', title: st.title, them: st.them, label: st.moves[choice]?.label };
}

/* ---------- 조각 ---------- */
function bar(side, cls, from) {
  const to = pct(side.hp, side.hp0), fr = from == null ? to : pct(from.hp, from.hp0);
  const hit = fr - to > 0;
  return `<div class="bt-side ${cls}${hit ? ' hit' : ''}">
    <div class="bt-name"><b>${esc(side.name)}</b><em>${esc(side.word ?? hpWord(to))}${side.wounds?.length ? ` · <span class="bt-wd">${side.wounds.map(esc).join('·')} 다침</span>` : ''}</em></div>
    <span class="bt-hp${to < 30 ? ' low' : ''}" role="img" aria-label="${esc(side.name)} 몸 ${to}%"><i style="--to:${to}%;--from:${fr}%"></i>${hit ? `<s style="--to:${to}%;--from:${fr}%"></s>` : ''}</span>
    ${hit ? `<span class="bt-dmg" aria-hidden="true">−${fr - to}</span>` : ''}
  </div>`;
}
function momPips(m) {
  const cells = [-3, -2, -1, 0, 1, 2, 3].map((k) => `<i class="${k === 0 ? 'mid' : (m > 0 && k > 0 && k <= m) ? 'me' : (m < 0 && k < 0 && k >= m) ? 'foe' : ''}"></i>`).join('');
  const word = m >= 2 ? '기세가 내 쪽이다' : m <= -2 ? '기세가 상대에게 넘어갔다' : m > 0 ? '조금 앞선다' : m < 0 ? '조금 밀린다' : '팽팽하다';
  return `<div class="bt-mom" role="img" aria-label="기세: ${word}"><span class="bt-pips">${cells}</span><small>${word}</small></div>`;
}
function hud(st, pre) {
  if (st.kind === 'duel') {
    const tags = [st.foe.school, st.foe.style, st.foe.trait, st.foe.habit ? `버릇: ${st.foe.habit}` : null].filter(Boolean);
    const top = [st.place, st.crowd ? (st.crowd >= 40 ? '구경꾼이 빽빽하다' : '구경꾼이 있다') : null, st.maxRound && st.round ? `${st.round}/${st.maxRound}합` : null].filter(Boolean);
    return `<div class="bt-hud">
      ${st.crux || top.length ? `<div class="bt-round"><span>${top.map(esc).join(' · ')}</span>${st.crux ? `<b>${st.cruxSide === 'foe' ? '위기의 순간' : '결정적 순간'}</b>` : ''}</div>` : ''}
      <div class="bt-vs">${bar(st.me, 'me', pre?.me)}<span class="bt-x" aria-hidden="true">${icon('sword', 18)}</span>${bar(st.foe, 'foe', pre?.foe)}</div>
      ${momPips(st.mom)}
      ${tags.length && !pre ? `<div class="bt-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${st.last ? st.last : ''}
    </div>`;
  }
  return `<div class="bt-hud fight">
    <div class="bt-vs"><div class="bt-side me"><div class="bt-name"><b>${esc(st.us.name)}</b><em>${st.us.with.length ? `${esc(st.us.with.join(', '))} 곁에` : '혼자'}</em></div></div><span class="bt-x" aria-hidden="true">${icon('sword', 18)}</span><div class="bt-side foe"><div class="bt-name"><b>${esc(st.them.name)}</b></div></div></div>
    ${st.threat ? `<p class="bt-threat">${esc(st.threat)}</p>` : ''}
  </div>`;
}

/** 사건 창 위쪽에 얹을 전투 머리 (전투가 아니면 '') */
export function battleHead(g) {
  const st = safe(() => battleState(g));
  if (!st) return '';
  return hud(st, null);
}
/** 본문: 첫 합의 들머리, 상대 대사, 낌새 (전투가 아니면 null → 원래 글을 쓴다) */
export function battleBody(g) {
  const st = safe(() => battleState(g));
  if (!st) return null;
  if (st.kind === 'fight') return st.intro ? `<p class="ev-text bt-intro">${esc(st.intro)}</p>` : '';
  return `${st.intro ? st.intro.split('\n\n').map((x) => `<p class="ev-text bt-intro">${esc(x)}</p>`).join('') : ''}
    ${st.cheer ? `<p class="bt-cheer">${esc(st.cheer)}</p>` : ''}
    ${st.foe.line ? `<p class="bt-line">${esc(st.foe.line)}</p>` : ''}
    ${st.tell ? `<p class="bt-tell">${icon('eye', 18)}<span>${esc(st.tell)}</span></p>` : ''}`;
}
/** 수 고르기 카드 (전투가 아니면 null → 원래 버튼) */
export function battleOpts(g) {
  const st = safe(() => battleState(g));
  if (!st) return null;
  if (st.kind === 'duel') {
    return `<div class="opts bt-opts${st.moves.length <= 2 ? ' two' : ''}">${st.moves.map((m, i) => {
      const meta = MOVE_META[m.id] ?? MOVE_META.heavy;
      const label = String(m.label).replace(/\s*\([^)]*\)\s*$/, '');
      const extra = m.id === 'magic' && st.mana ? ` 남은 마력 ${st.mana}.` : '';
      return `<button class="opt bt-card mv-${m.id}" data-choice="${i}" style="--i:${i}">${icon(meta.icon, 26)}<span class="bt-cn"><b>${esc(label)}</b><small>${esc(meta.name)}</small></span><span class="bt-hint">${esc(m.hint ?? meta.hint)}${extra}</span></button>`;
    }).join('')}</div>`;
  }
  return `<div class="opts bt-opts">${st.moves.map((m, i) => {
    const [, ic, hint] = tacticMeta(m.label);
    return `<button class="opt bt-card" data-choice="${i}" style="--i:${i}">${icon(m.icon ?? ic, 26)}<span class="bt-cn"><b>${esc(m.label)}</b></span>${hint || m.hint ? `<span class="bt-hint">${esc(m.hint ?? hint)}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

/* ---------- 결과 창 ---------- */
const END_WORD = { win: ['이겼다', 'up'], lose: ['졌다', 'down'], yield: ['칼을 거뒀다', 'warn'], draw: ['비겼다', 'warn'], flee: ['물러났다', 'warn'] };
const END_KIND = { kneel: ['무릎 꿇렸다', 'up'], disarm: ['칼을 떨궜다', 'up'], retreat: ['물러서게 했다', 'up'], fall: ['쓰러뜨렸다', 'up'], judged: ['판정으로 이겼다', 'up'], yield: ['칼을 거뒀다', 'warn'], lose: ['졌다', 'down'], lose_fall: ['쓰러졌다', 'down'], lose_disarm: ['칼을 놓쳤다', 'down'], lose_judged: ['판정으로 졌다', 'down'] };
function endOf(text, pre, g) {
  const L = g?.lastDuel;
  if (L?.won != null && L.end !== 'yield') return L.won ? 'win' : 'lose';
  if (L?.end && END_WORD[L.end]) return L.end;
  if (pre?.move === 'yield' || /항복|검을 내렸/.test(text)) return 'yield';
  const fn = String(pre?.foe?.name ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (fn && new RegExp(`${fn}.{0,6}(무릎을 꿇|쓰러|검을 떨|칼을 떨|물러|항복|손을 들)`).test(text)) return 'win';
  if (/(내가|나는).{0,8}(무릎을 꿇|쓰러|졌다)|패했|정신을 잃|눈앞이 캄캄/.test(text)) return 'lose';
  return pre?.foe && pre.foe.hp / (pre.foe.hp0 || 1) < pre.me.hp / (pre.me.hp0 || 1) ? 'win' : 'lose';
}
/** 합 결과 창의 머리. 결투가 이어지면 막대 움직임, 끝났으면 요약 카드. 결투가 아니면 '' */
export function battleAfter(g, pre, text) {
  if (!pre) return '';
  if (pre.kind === 'duel') {
    const d = g.duel;
    if (d && g.pendingEvent?.id === 'duel_round') {
      const v = safe(() => duelView(g)) ?? {};
      const st = { kind: 'duel', round: pre.round, crux: false, place: pre.place, me: { ...pre.me, ...(v.me ?? {}) }, foe: { ...pre.foe, ...(v.foe ?? {}) }, mom: v.mom ?? 0 };
      const lm = v.lastMoves;
      if (lm?.mine) {
        const [rw, rt] = RESULT_WORD[lm.result] ?? ['', ''];
        const mv = (id) => `${icon(MOVE_META[id]?.icon ?? 'sword', 16)}${esc(MOVE_META[id]?.name ?? id)}`;
        st.last = `<div class="bt-clash"><span class="me">${mv(lm.mine)}</span><b class="${rt}">${esc(rw)}</b><span class="foe">${lm.theirs ? mv(lm.theirs) : ''}</span></div>${lm.part ? `<p class="bt-part">${esc(lm.partWho === 'foe' ? `${pre.foe.name}의 ${lm.part}` : `내 ${lm.part}`)}에 상처</p>` : ''}`;
      }
      return hud(st, pre);
    }
    // 끝: 요약 카드
    const L = g.lastDuel ?? {};
    const end = endOf(String(text ?? ''), pre, g);
    const [w, tone] = (L.endKind && END_KIND[L.endKind]) ?? END_WORD[end];
    const meHp = L.hp != null ? pct(L.hp, L.hp0) : null;
    const used = {};
    for (const m of L.history ?? pre.history ?? []) used[m] = (used[m] ?? 0) + 1;
    return `<div class="bt-sum ${tone}">
      <div class="bt-sum-top"><b class="${tone}">${w}</b><span>${esc(pre.title ?? '결투')} · ${L.rounds ?? pre.round}합</span></div>
      <p class="note">상대 ${esc(pre.foe.name)}${L.venue ? ` · ${esc(L.venue)}` : ''}${meHp != null ? ` · 내 몸 ${meHp}% 남음` : ''}</p>
      ${Object.keys(used).length ? `<div class="bt-used">${Object.entries(used).map(([m, n]) => `<span>${icon(MOVE_META[m]?.icon ?? 'sword', 16)}${esc(MOVE_META[m]?.name ?? m)}${n > 1 ? ` ×${n}` : ''}</span>`).join('')}</div>` : ''}
      ${L.wounds?.length ? `<p class="note">내 상처: ${L.wounds.map(esc).join(', ')}</p>` : ''}
      ${L.foeWounds?.length ? `<p class="note">상대 상처: ${L.foeWounds.map(esc).join(', ')}</p>` : ''}
      ${L.habit || L.trait ? `<p class="note">알아낸 것: ${[L.trait, L.habit ? `버릇 ${L.habit}` : null].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    </div>`;
  }
  if (pre.kind === 'fight') {
    const t = String(text ?? '');
    const end = /달아났|물러났|물러섰|몸을 빼|도망/.test(t) && !/(적|놈들|무리).{0,12}(달아났|흩어졌|도망)/.test(t) ? 'flee' : /쓰러뜨렸|이겼|무찔렀|흩어졌|해치웠|베어 넘겼|끝장냈|물리쳤|목을 갈랐|무릎을 꿇었/.test(t) ? 'win' : /쓰러졌|졌다|패했|정신을 잃|끌려갔|빼앗겼/.test(t) ? 'lose' : null;
    if (!end) return '';
    const [w, tone] = END_WORD[end];
    return `<div class="bt-sum ${tone}"><div class="bt-sum-top"><b class="${tone}">${w}</b><span>${esc(pre.them?.name ?? '')}</span></div>${pre.label ? `<p class="note">고른 길: ${esc(pre.label)}</p>` : ''}</div>`;
  }
  return '';
}
/** 결과 창의 버튼 글 */
export const afterLabel = (g, pre) => (pre?.kind === 'duel' && g.duel && g.pendingEvent?.id === 'duel_round' ? '다음 합' : '계속');
