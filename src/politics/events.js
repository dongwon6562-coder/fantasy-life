// 대륙의 일에 끼어드는 사건: 사절, 첩자, 전쟁 물자 나르기, 왕실 혼례, 새 통치자.
import { EVENTS, flag, setFlag, check, stress, tire } from '../events/core.js';
import { gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { isJailed, jail, addNotoriety, craftOf } from '../crime.js';
import { courtAccess } from '../court/index.js';
import { REALMS } from '../realms/data.js';
import { realmOf } from '../realms/index.js';
import { PS, mi, short, full, relOf, shiftRel, addPact, pactOf, ownWars, warOf, foeIn, rulerLine, nations, pnews } from './state.js';
import { peace } from './world.js';

const here = (g) => L(g).place;
const capitalOf = (g) => nations().find((id) => REALMS[id].capital === here(g)) ?? null;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.explore?.exp; // 원정 중엔 고장 일에 끼지 않는다 (31단계 헤드3: 원정 중 첩자 일로 옥에 가던 것)
const renown = (g) => L(g).renown ?? 0;
const say = (g) => (text, big = false) => { (g.worldNews ??= []).push(text); pnews(g, text); if (big) g.realm?.log?.push({ y: g.date.year, m: g.date.month, text: text.split('.')[0] }); };
const record = (g) => (text) => g.realm?.log?.push({ y: g.date.year, m: g.date.month, text });
const ruler = (g, id) => (id === 'leonia' ? '국왕' : rulerLine(g, id));
// 이 나라와 사이가 나쁜 나라 (전쟁 중이면 먼저)
function rivalOf(g, id) {
  const w = ownWars(g).find((x) => x.a === id || x.b === id);
  if (w) return foeIn(w, id);
  const c = nations().filter((x) => x !== id && relOf(g, id, x) < -20).sort((a, b) => relOf(g, id, a) - relOf(g, id, b));
  return c[0] ?? null;
}
const canEnvoy = (g) => courtAccess(g) == null || renown(g) >= 25 || (g.player.stats.cha >= 45 && (g.player.skills.letters ?? 0) >= 35);

// ---------- 사절 ----------
EVENTS.push({
  id: 'pol_envoy', cooldown: 36, weight: 6,
  chance: () => 0.5,
  cond: (g) => free(g) && !!capitalOf(g) && canEnvoy(g) && !!rivalOf(g, capitalOf(g)) && !(capitalOf(g) === 'leonia' && rivalOf(g, 'leonia') === 'valhart' && g.realm?.balhart?.war),
  prepare: (g) => { const a = capitalOf(g); return { a, b: rivalOf(g, a) }; },
  title: '사절을 찾는 궁정',
  text: (g, c) => {
    const w = warOf(g, c.a, c.b);
    return `${full(c.a)} 궁정의 시종장이 나를 따로 불렀다. ${w ? `${J(short(c.b), '과/와')}의 전쟁이 ${Math.max(1, Math.round((mi(g) - w.since) / 12))}년째다. 강화를 떠볼 사람이 필요하다.` : `${J(short(c.b), '과/와')}의 사이가 ${relOf(g, c.a, c.b) < -50 ? '칼끝에 서 있다' : '틀어지고 있다'}. 궁정 사람이 아닌 얼굴이 가야 말이 통할 때가 있다.`} "${ruler(g, c.a)}의 친서를 들고 ${full(c.b)}에 다녀오겠소?"`;
  },
  choices: [
    {
      label: '친서를 들고 간다',
      run: (g, rng, c) => {
        tire(g, 15);
        const P = PS(g);
        const v = g.player.stats.cha * 0.6 + (g.player.skills.letters ?? 0) * 0.4 + Math.min(25, renown(g) / 4);
        gainSkill(g, 'letters', 0.5, 'cha');
        if (!check(rng, v, 55)) {
          shiftRel(g, c.a, c.b, -8); stress(g, 10);
          return `${full(c.b)}의 궁정은 나를 사흘 동안 대기실에 세워 두었다. 겨우 만난 대신은 친서를 읽지도 않고 돌려주었다. 돌아오는 길 내내 등 뒤가 서늘했다.`;
        }
        P.me.envoy += 1;
        L(g).renown = renown(g) + 5;
        g.player.money += 20;
        const w = warOf(g, c.a, c.b);
        if (w && !w.world && w.weary >= 6) {
          const lead = w.score >= 0 ? w.a : w.b;
          peace(g, rng, say(g), record(g), w, lead, foeIn(w, lead), `${J(g.player.name, '이/가')} 오간 끝에`);
          chron(g, `${g.player.name}, ${J(short(c.a), '과/와')} ${short(c.b)} 사이의 강화를 이끌어 내다.`);
          return `밤마다 두 궁정의 문서를 고쳐 쓰고, 낮에는 장군들의 고함을 들었다. 마침내 양쪽이 같은 종이에 인장을 찍었다. 은화 20닢과, 두 나라의 기억이 남았다.`;
        }
        shiftRel(g, c.a, c.b, 18);
        if (relOf(g, c.a, c.b) > 10 && !pactOf(g, c.a, c.b, 'trade')) { addPact(g, c.a, c.b, 'trade'); say(g)(`${J(short(c.a), '과/와')} ${J(short(c.b), '이/가')} 교역 조약을 맺었다. 사절로 오간 ${g.player.name}의 이름이 조약문 끝에 적혔다.`); }
        note(g, `${full(c.a)}의 사절로 ${full(c.b)}에 다녀왔다.`);
        return `${full(c.b)}의 대신과 마주 앉아 이틀을 이야기했다. 서로의 원한을 다 풀 수는 없었다. 그래도 돌아올 때는 답장이 품에 있었다. 은화 20닢.`;
      },
    },
    {
      label: '상대편의 뒷돈을 받고 일을 그르친다',
      run: (g, rng, c) => {
        g.player.money += 45;
        shiftRel(g, c.a, c.b, -15);
        if (rng.chance(0.3)) {
          addNotoriety(g, 12); L(g).renown = Math.max(0, renown(g) - 6);
          setFlag(g, 'pol_envoy_traitor', true);
          return `일부러 말을 비틀고, 친서의 한 줄을 빼먹었다. 은화 45닢이 생겼다. 그런데 돌아오고 보름 뒤, 내 이름이 궁정에서 수군거려졌다. ${short(c.b)} 쪽 서기가 입을 연 모양이다.`;
        }
        return `일부러 말을 비틀고, 친서의 한 줄을 빼먹었다. ${short(c.b)}의 대신이 탁자 아래로 주머니를 건넸다. 은화 45닢. 두 나라 사이는 더 나빠졌다. 아무도 내 탓인 줄 모른다. 아직은.`;
      },
    },
    { label: '정중히 사양한다', run: (g, rng, c) => `"그런 일은 궁정 사람이 할 일이지요." 시종장은 아쉬운 얼굴로 물러났다. ${J(short(c.a), '과/와')} ${short(c.b)}의 일은 나 없이 흘러갈 것이다.` },
  ],
});

// ---------- 첩자 ----------
EVENTS.push({
  id: 'pol_spy_offer', cooldown: 48, weight: 5,
  chance: () => 0.35,
  cond: (g) => free(g) && !PS(g).me.spyFor && !!capitalOf(g) && !!rivalOf(g, capitalOf(g)) && capitalOf(g) !== PS(g).me.mercFor,
  prepare: (g) => { const a = capitalOf(g); return { a, b: rivalOf(g, a) }; },
  title: '술집 구석의 낯선 말씨',
  text: (g, c) => `술집 구석에서 ${short(c.b)} 말씨를 쓰는 사내가 내 잔을 채웠다. "${full(c.a)} 궁정에 드나드는 서기가 있소. 그 사람 책상의 편지를 베껴 줄 손이 필요하오. 값은 넉넉히 치르지." 사내의 손가락에 ${short(c.b)} 상단의 인장 반지가 끼워져 있었다.`,
  choices: [
    { label: '일을 맡는다', run: (g, rng, c) => { const P = PS(g); P.me.spyFor = c.b; P.me.spyOn = c.a; g.player.money += 15; note(g, `${short(c.b)}의 첩자 노릇을 시작했다.`); return `선금으로 은화 15닢을 받았다. 사내는 다음에 만날 곳을 종이에 적어 주고, 그 종이를 내 앞에서 태웠다. 이제 나는 ${short(c.b)}의 눈이다.`; } },
    { label: '경비대에 알린다', run: (g, rng, c) => { L(g).renown = renown(g) + 3; g.player.money += 8; shiftRel(g, c.a, c.b, -4); return `경비대가 그날 밤 술집을 덮쳤다. 사내는 창문으로 뛰어내리다 다리가 부러졌다. 포상금으로 은화 8닢. 사내의 동료들이 내 얼굴을 기억할지도 모른다.`; } },
    { label: '못 들은 척한다', run: () => '잔을 비우고 일어섰다. 남의 나라 싸움에 목을 걸 이유는 없다.' },
  ],
});
EVENTS.push({
  id: 'pol_spy_job', cooldown: 6, weight: 7,
  chance: () => 0.5,
  cond: (g) => free(g) && !!PS(g).me.spyFor && capitalOf(g) === PS(g).me.spyOn,
  prepare: (g) => ({ b: PS(g).me.spyFor, a: PS(g).me.spyOn }),
  title: '서기의 책상',
  text: (g, c) => `${short(c.b)}의 연락책이 쪽지를 남겼다. 오늘 밤 ${full(c.a)} 궁정 서기가 자리를 비운다. 책상 서랍에 ${warOf(g, c.a, c.b) ? '전선의 보급 장부가' : '외교 문서가'} 있다.`,
  choices: [
    {
      label: '서랍을 연다',
      run: (g, rng, c) => {
        const P = PS(g);
        const v = craftOf(g) * 0.5 + g.player.stats.agi * 0.3 + g.player.stats.sen * 0.3;
        if (!check(rng, v, 45)) {
          addNotoriety(g, 15); P.me.spyFor = null;
          jail(g, rng.int(8, 20));
          return `서랍이 삐걱거렸다. 복도 끝에서 등불이 다가왔다. 도망칠 틈도 없이 붙잡혔다. ${short(c.b)}의 연락책은 나를 모른다고 할 것이다.`;
        }
        const pay = rng.int(25, 45);
        g.player.money += pay; P.me.spied += 1;
        const w = warOf(g, c.a, c.b);
        if (w && !w.world) w.push = (w.push ?? 0) + (c.b === w.a ? 3 : -3);
        else shiftRel(g, c.a, c.b, -5);
        return `등잔 하나로 장부를 베꼈다. 손이 떨려 두 번 다시 썼다. 새벽에 연락책이 은화 ${pay}닢을 건넸다. 며칠 뒤 ${short(c.a)} 쪽에 무슨 일이 생겼다는 소문이 돌았다.`;
      },
    },
    { label: '손을 뗀다', run: (g, rng, c) => { PS(g).me.spyFor = null; stress(g, -3); return `쪽지를 태우고 연락책이 올 길로 가지 않았다. ${J(short(c.b), '은/는')} 다른 손을 찾을 것이다. 그들이 나를 그냥 놔둔다면.`; } },
  ],
});

// ---------- 전쟁 물자 ----------
EVENTS.push({
  id: 'pol_war_trade', cooldown: 24, weight: 6,
  chance: () => 0.4,
  cond: (g) => free(g) && ownWars(g).length > 0 && ((g.player.skills.trade ?? 0) >= 15 || L(g).job?.id === 'trader') && (ownWars(g).some((w) => [w.a, w.b].includes(realmOf(here(g)))) || ['barka', 'portel', 'saltmare'].includes(here(g))),
  prepare: (g, rng) => { const w = ownWars(g).find((x) => [x.a, x.b].includes(realmOf(here(g)))) ?? rng.pick(ownWars(g)); const side = w.score > 0 ? w.b : w.a; return { side, foe: foeIn(w, side) }; },
  title: '전쟁 특수',
  text: (g, c) => `${short(c.side)} 쪽 성채들이 굶고 있다는 말이 돈다. 밀 한 자루 값이 평소의 세 배다. 짐마차를 꾸려 ${short(c.foe)}의 순찰을 피해 가면 한몫 단단히 잡는다. 붙잡히면 짐도 목도 남지 않는다.`,
  choices: [
    {
      label: '밀을 싣고 간다 (은화 20닢)',
      show: (g) => g.player.money >= 20,
      run: (g, rng, c) => {
        g.player.money -= 20; tire(g, 15);
        gainSkill(g, 'trade', 0.6, 'cha');
        if (!check(rng, (g.player.skills.trade ?? 0) * 0.6 + g.player.stats.sen * 0.4, 40)) { stress(g, 8); return `${short(c.foe)}의 순찰대가 길목을 막고 있었다. 짐을 다 빼앗기고 맨몸으로 돌아왔다.`; }
        const gain = rng.int(45, 70);
        g.player.money += gain; PS(g).me.smuggled += 1;
        return `산길을 사흘 돌아 성채에 닿았다. 굶은 병사들이 밀자루를 보고 울었다. 은화 ${gain}닢이 손에 들어왔다.`;
      },
    },
    {
      label: '무기를 싣고 간다 (은화 30닢)',
      show: (g) => g.player.money >= 30,
      run: (g, rng, c) => {
        g.player.money -= 30; tire(g, 15);
        if (!check(rng, (g.player.skills.trade ?? 0) * 0.5 + g.player.stats.agi * 0.3 + g.player.stats.sen * 0.3, 50)) {
          addNotoriety(g, 8); stress(g, 12);
          return `창 다발 밑에 숨긴 쇠뇌가 들켰다. ${short(c.foe)} 병사들이 마차를 불태웠다. 목숨만 건져 도망쳤다.`;
        }
        const gain = rng.int(70, 110);
        g.player.money += gain; PS(g).me.smuggled += 1;
        const w = warOf(g, c.side, c.foe);
        if (w && !w.world) w.push = (w.push ?? 0) + (c.side === w.a ? 2 : -2);
        return `쇠뇌 마흔 자루를 넘겼다. 은화 ${gain}닢. 그 쇠뇌가 누구의 가슴에 박힐지는 생각하지 않기로 했다.`;
      },
    },
    { label: '남의 전쟁으로 돈 벌 생각은 없다', run: () => '장터의 소문을 흘려들었다. 밀값은 계속 올랐다.' },
  ],
});

// ---------- 왕실 혼례 ----------
EVENTS.push({
  id: 'pol_wedding', cooldown: 12, weight: 8,
  cond: (g) => { const w = PS(g).wedding; return free(g) && !!w && mi(g) - w.at <= 4 && !flag(g, `pol_wed_${w.at}`) && [w.a, w.b].some((id) => REALMS[id]?.capital === here(g)); },
  prepare: (g) => ({ ...PS(g).wedding }),
  title: '왕실의 혼례',
  text: (g, c) => `${J(short(c.a), '과/와')} ${short(c.b)}의 혼례 행렬이 성문으로 들어왔다. 거리마다 꽃잎이 뿌려지고, 광장에는 공짜 포도주 통이 놓였다. 신부의 마차 창 너머로 굳은 얼굴이 언뜻 보였다.`,
  choices: [
    { label: '구경하며 하루를 즐긴다', run: (g, rng, c) => { setFlag(g, `pol_wed_${c.at}`); stress(g, -10); return '광장에서 모르는 사람들과 잔을 부딪쳤다. 오늘만은 누구도 전쟁 이야기를 하지 않았다.'; } },
    { label: '몰려든 사람들에게 물건을 판다', run: (g, rng, c) => { setFlag(g, `pol_wed_${c.at}`); const n = rng.int(8, 18); g.player.money += n; tire(g, 8); return `꽃과 리본, 싸구려 축하 술을 팔았다. 해가 질 무렵 주머니에 은화 ${n}닢이 들어 있었다.`; } },
  ],
});

// ---------- 새 통치자 ----------
EVENTS.push({
  id: 'pol_new_ruler', cooldown: 12, weight: 9,
  cond: (g) => { const c = PS(g).changed; return free(g) && !!c && mi(g) - c.at <= 3 && !flag(g, `pol_rul_${c.at}`) && realmOf(here(g)) === c.realm; },
  prepare: (g) => ({ ...PS(g).changed }),
  title: '새 통치자',
  text: (g, c) => `${full(c.realm)}의 거리마다 새 깃발이 걸렸다. 포고관이 광장에서 ${ruler(g, c.realm)}의 이름을 외쳤다. 옛 통치자의 초상화를 떼어 내는 사람들 사이로, 그 초상화를 품에 안고 우는 노인도 보였다.`,
  choices: [
    { label: '군중과 함께 새 통치자를 외친다', run: (g, rng, c) => { setFlag(g, `pol_rul_${c.at}`); return `"${ruler(g, c.realm)} 만세!" 목이 쉬도록 외쳤다. 무엇이 바뀔지는 아무도 모른다.`; } },
    { label: '고개를 숙이고 지나간다', run: (g, rng, c) => { setFlag(g, `pol_rul_${c.at}`); stress(g, 3); return '통치자가 바뀐 해에는 목소리를 낮추는 것이 오래 사는 법이다.'; } },
  ],
});
