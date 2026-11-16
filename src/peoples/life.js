// 그 땅에서 살기: 풍습 익히기, 철마다 치르는 의식, 그 땅이 나를 받아들이는 정도(standing), 그 땅이 주는 이름.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill, gainStat } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, up, gains, check } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { realmOf, meetLocal, setRaceRule } from '../realms/index.js';
import { treatment, playerRace, raceOf, RACES } from '../races/index.js';
import { EVENTS } from '../events/core.js';
import { PS, mi, clamp, LANDS, LAND_IDS, RITES, landAt, startStanding, plog } from './state.js';

const here = (g) => L(g).place;
const free = (g) => !L(g).travel && !isJailed(g) && !g.over;
export const landHere = (g) => landAt(here(g));

// 그 종족이 나를 보는 눈: 처음 물을 때 정한다
export function standingOf(g, k) {
  if (!LANDS[k]) return 0; // 그 사이 다른 고장으로 옮겨 땅이 없을 수 있다
  const P = PS(g);
  if (P.standing[k] == null) {
    const mine = playerRace(g);
    P.standing[k] = mine === LANDS[k].race ? 70 : startStanding(treatment(g, k, mine));
  }
  return P.standing[k];
}
export function shiftStanding(g, k, n) {
  if (!LANDS[k]) return 0;
  const P = PS(g);
  P.standing[k] = clamp(standingOf(g, k) + n, 0, 100);
  return P.standing[k];
}

// 그 땅이 나를 믿으면, 나라의 대우가 한 단계 너그러워진다 (멸시는 꺼림으로, 꺼림은 보통으로)
const STEP_UP = { scorn: 'wary', wary: 'normal', normal: 'normal', welcome: 'welcome', banned: 'banned' };
setRaceRule((g, realm) => {
  let t = treatment(g, realm);
  if (LANDS[realm] && g.peoples?.standing?.[realm] >= 60) t = STEP_UP[t] ?? t;
  if (LANDS[realm] && g.peoples?.standing?.[realm] != null && g.peoples.standing[realm] < 10 && t === 'normal') t = 'wary';
  return t;
});

/* ---------- 풍습 익히기 ---------- */
ACTIONS.push({
  id: 'peoples_custom', name: '풍습 익히기', icon: 'talk',
  desc: '그 땅의 말과 예법과 의식을 배운다. 익힐수록 그 종족이 나를 다르게 본다. 의식을 제대로 치르려면 먼저 익혀야 한다.',
  available: (g) => playerAge(g) >= 8 && free(g) && !!landHere(g) && PS(g).custom[landHere(g)] < 3,
  run(g, rng) {
    const k = landHere(g), P = PS(g), land = LANDS[k];
    if (!k || L(g).travel) return '그 땅을 떠나 있어 배운 것을 되새기기만 했다.';
    tired(g, 8);
    // 한 달에 한 걸음: 남은 칸은 사람들 틈에서 어울린다
    if (P.customAt === mi(g)) {
      const p = meetLocal(g, land.place, 'neighbor');
      if (p) p.affection = Math.min(100, p.affection + 2);
      shiftStanding(g, k, 0.5);
      return `${land.people} 이웃들 틈에서 하루를 보냈다.${p ? ` ${J(p.name, '이/가')} 내 서툰 ${J(land.custom[Math.min(P.custom[k], 2)], '을/를')} 바로잡아 주었다.` : ''}`;
    }
    P.customAt = mi(g);
    const lv = P.custom[k];
    const own = playerRace(g) === land.race;
    const v = g.player.stats.int * 0.4 + g.player.stats.cha * 0.3 + g.player.stats.sen * 0.3 + (own ? 20 : 0) + P.lived[k] / 3;
    P.prog ??= {};
    P.prog[k] = (P.prog[k] ?? 0) + (check(rng, v, 35 + lv * 10) ? 1 : 0.4);
    gainStat(g, 'cha', 0.2);
    if (P.prog[k] < 2) return rng.pick([
      `${J(land.custom[lv], '을/를')} 배우려 애썼다. 오늘은 반쯤 알아들었다.`,
      `${land.people} 노인 하나가 같은 것을 다섯 번 되풀이해 주었다. 여섯 번째에 겨우 따라 했다.`,
      `${J(land.custom[lv], '은/는')} 머리보다 몸이 먼저 배워야 하는 것이었다.`,
    ]);
    P.prog[k] = 0;
    P.custom[k] = lv + 1;
    shiftStanding(g, k, 6 + lv * 2);
    if (k === 'elf') gainSkill(g, 'herbs', 0.8, 'sen');
    if (k === 'dwarf') gainSkill(g, 'smithing', 0.8, 'str');
    if (k === 'beast') gainStat(g, 'agi', 0.4);
    plog(g, `${J(land.custom[lv], '을/를')} 익혔다.`);
    note(g, `${land.name}의 ${J(land.custom[lv], '을/를')} 익혔다.`);
    return land.customText[lv];
  },
});

/* ---------- 철마다 치르는 의식 ---------- */
export const riteNow = (g) => {
  const k = landHere(g);
  if (!k) return null;
  return Object.entries(RITES).find(([id, r]) => r.land === k && r.month === g.date.month && PS(g).rites[id] !== g.date.year)?.[0] ?? null;
};
ACTIONS.push({
  id: 'peoples_rite', name: '그 땅의 의식', icon: 'star',
  desc: '그 땅에서 철마다 치르는 의식에 낀다. 풍습을 익히지 않은 외지인은 구경만 하거나, 끼었다가 실수할 수 있다.',
  available: (g) => playerAge(g) >= 6 && free(g) && !!riteNow(g),
  run(g) {
    const id = riteNow(g);
    if (!id) return '의식은 이미 끝났다. 꺼진 횃불과 밟힌 풀만 남아 있었다.';
    if (sceneQueued(g, 'peoples_rite')) return '의식 날을 기다렸다.';
    PS(g).rites[id] = g.date.year;
    queueScene(g, 'peoples_rite', { id });
    return `${RITES[id].name} 날이 다가왔다. ${RITES[id].desc}`;
  },
});
const RITE_TEXT = {
  elf_dew: { ok: '세계수 아래에서 이슬 한 방울을 받아 갓난 엘프의 이마에 발랐다. 아이의 어머니가 내게 고개를 숙였다. 그 아이는 내가 죽은 뒤로도 구백 년을 살 것이다.', watch: '나무 아래 둘러선 엘프들을 멀리서 보았다. 아무도 소리 내지 않았다. 이슬이 떨어지는 소리만 들렸다.', blunder: '이슬 그릇을 받아 들다 발을 헛디뎠다. 그릇은 깨지지 않았지만, 엘프들은 그날 나와 눈을 맞추지 않았다.' },
  elf_fall: { ok: '낙엽이 지는 밤, 그해 떠난 이들의 이름을 노래로 불렀다. 마지막 이름은 인간이었다. 엘프들이 그 이름도 똑같이 길게 불러 주었다.', watch: '노래는 밤새 이어졌다. 알아들을 수 있는 낱말은 이름뿐이었다.', blunder: '노래 한가운데에서 이름 하나를 틀리게 불렀다. 노래가 멈췄다. 처음부터 다시 불렀다. 내 탓이었다.' },
  dwarf_fire: { ok: '가장 긴 밤, 남의 집 화로 앞에 앉아 그 집 조상의 이름을 불렀다. 새벽에 집주인이 내 몫의 맥주를 따랐다. 산에서 그것은 식구라는 뜻이다.', watch: '골짜기 전체가 밤새 붉었다. 드워프들은 노래하지 않고 이름만 불렀다.', blunder: '새벽녘에 깜빡 졸았다. 화로의 불이 잦아들었다. 집주인이 아무 말 없이 장작을 넣었다. 그 침묵이 꾸지람보다 무거웠다.' },
  dwarf_hammer: { ok: '젊은 드워프들 틈에서 망치를 들었다. 길드장이 내 칼날을 불빛에 비추어 보고 한 번 두드렸다. 소리가 맑았다. 그것으로 충분했다.', watch: '젊은 드워프들이 차례로 망치를 들었다. 한 아이의 칼날이 부러졌다. 아무도 웃지 않았다. 내년에 다시 하면 된다.', blunder: '망치를 내리친 순간 칼날에 금이 갔다. 길드장이 그 조각을 집어 화로에 던졌다. "내년."' },
  beast_hunt: { ok: '초원을 사흘 달려 큰 뿔 들소를 몰았다. 마지막 창은 내 것이었다. 늑대 부족 노인이 내 얼굴에 그 피로 줄을 그었다.', watch: '사냥꾼들이 초원 끝으로 달려 나가는 것을 언덕에서 보았다. 해 질 녘 돌아온 그들의 얼굴에 피가 줄지어 그어져 있었다.', blunder: '바람을 거슬러 서는 바람에 들소 떼가 먼저 냄새를 맡았다. 사냥이 하루 늦어졌다. 사냥꾼들이 내 뒤에서 으르렁거렸다.' },
  beast_totem: { ok: '토템 기둥 아래에서 그해 죽은 전사들의 이야기를 들었다. 내 차례가 오자 내가 아는 죽은 이의 이야기를 했다. 무녀가 그 이름도 기둥 아래쪽에 새겨 주었다.', watch: '무녀가 칼끝으로 이름을 새길 때마다 부족들이 한 번씩 발을 굴렀다. 땅이 울렸다.', blunder: '이야기 중에 죽은 전사를 겁쟁이라고 부른 꼴이 되었다. 낱말 하나를 잘못 썼다. 그 전사의 형제가 원 안으로 걸어 나왔다.' },
};
defineScene('peoples_rite', {
  title: (g, s) => RITES[s.id]?.name ?? '의식',
  text: (g, s) => `${RITES[s.id].desc} ${PS(g).custom[RITES[s.id].land] >= RITES[s.id].need ? '익힌 것을 떠올리며 사람들 틈에 섰다.' : '아직 이 의식의 법을 다 알지 못한다.'}`,
  choices: () => [
    { label: '의식에 낀다', key: 'join' },
    { label: '한 걸음 물러나 지켜본다', key: 'watch' },
  ],
  resolve(g, rng, s, key) {
    const r = RITES[s.id], k = r.land, P = PS(g), T = RITE_TEXT[s.id];
    if (!r || !T) return '의식은 조용히 끝났다.';
    if (key === 'watch') { stress(g, -4); shiftStanding(g, k, 1); return T.watch; }
    const ready = P.custom[k] >= r.need || playerRace(g) === LANDS[k].race;
    if (ready || check(rng, g.player.stats.sen * 0.5 + g.player.stats.cha * 0.5, 55)) {
      shiftStanding(g, k, 5 + r.need * 2); stress(g, -8);
      const w = gainStat(g, 'wil', 0.4);
      if (s.id === 'dwarf_hammer') gainSkill(g, 'smithing', 1.5, 'str');
      if (s.id === 'beast_hunt') { gainStat(g, 'agi', 0.5); g.player.money += rng.int(3, 8); }
      if (s.id === 'elf_dew' && g.player.manaAwakened) g.player.mana += g.player.manaPotential * 0.8;
      plog(g, `${r.name}에 끼었다.`);
      return `${T.ok}${gains([up('의지', w)])}`;
    }
    shiftStanding(g, k, -4); stress(g, 8);
    if (s.id === 'beast_totem') g.player.injuries.push({ name: '원 안에서 맞은 턱', months: 1 });
    return T.blunder;
  },
});

/* ---------- 그 땅에서 산다는 것 ---------- */
HOOKS.afterMonth.push((g) => {
  if (!g.peoples || g.over) return;
  const P = g.peoples;
  const k = landAt(L(g).place);
  if (k && !L(g).travel) {
    P.lived[k] += 1;
    // 오래 살면 조금씩 낯이 익는다 (풍습을 익히면 더 빨리)
    if (P.lived[k] % 3 === 0) shiftStanding(g, k, 0.4 + P.custom[k] * 0.3);
  }
  // 떠나 있으면 아주 천천히 잊힌다 (한 식구가 된 땅은 잊지 않는다)
  for (const x of LAND_IDS) if (x !== k && P.standing[x] != null && P.standing[x] > 45 && P.standing[x] < 80 && g.date.month === 1) P.standing[x] -= 1;
});

/* ---------- 그 땅이 주는 이름 ---------- */
const NAMES = {
  elf: ['늦게 핀 잎', '발소리가 큰 벗', '짧은 계절의 노래', '이슬을 받은 손'],
  dwarf: ['불을 지킨 손', '맑은 쇳소리', '침을 뱉은 벗', '돌을 아는 자'],
  beast: ['맨발의 사냥꾼', '고개 숙이지 않는 자', '원 밖에서 온 형제', '두 번 일어선 자'],
};
EVENTS.push({
  id: 'peoples_name', cooldown: 0, weight: 82,
  cond: (g) => isAdult(g) && free(g) && LAND_IDS.some((k) => !PS(g).named[k] && (PS(g).standing[k] ?? 0) >= 80 && PS(g).lived[k] >= 24 && landAt(here(g)) === k),
  prepare: (g, rng) => { const k = landAt(here(g)); return { k, name: rng.pick(NAMES[k]) }; },
  title: '그 땅의 이름',
  text: (g, c) => {
    const land = LANDS[c.k];
    const how = { elf: '은잎 나무 아래로 장로들이 모였다. 가장 늙은 엘프가 내 이마에 이슬을 찍었다.', dwarf: '길드장이 골짜기의 화로들 앞으로 나를 데려갔다. 망치 소리가 일제히 멎었다.', beast: '토템 기둥 아래에서 무녀가 칼을 꺼냈다. 부족들이 둘러서서 발을 굴렀다.' }[c.k];
    return `${how} "${J(land.people, '은/는')} 남에게 이름을 주지 않는다. 오늘은 준다." 그들이 부른 이름: '${c.name}'.`;
  },
  choices: [
    {
      label: '그 이름을 받는다',
      run: (g, rng, c) => {
        const P = PS(g), land = LANDS[c.k];
        P.named[c.k] = c.name;
        shiftStanding(g, c.k, 5);
        L(g).renown = (L(g).renown ?? 0) + 4;
        chron(g, `${g.player.name}, ${land.name}에서 새 이름을 받다: '${c.name}'.` + (playerRace(g) === land.race ? '' : ` ${J(RACES[land.race].name, '이/가')} 아닌 이에게는 드문 일이다.`), playerRace(g) === land.race ? 60 : 100);
        plog(g, `${land.name}에서 새 이름을 받았다: '${c.name}'.`);
        note(g, `${land.name}에서 새 이름을 받았다: '${c.name}'.`);
        return `${c.k === 'beast' ? '무녀가 토템 기둥 맨 아래에, 산 사람의 자리에 그 이름을 새겼다.' : c.k === 'dwarf' ? '길드장이 내 이름을 골짜기 명부에 적었다. 드워프 이름들 사이에 낀 낯선 글자였다.' : '그날 밤 은잎 마을의 아이들이 그 이름으로 나를 불렀다. 길게 끌어서.'} 이제 이 땅에서 나는 손님이 아니다.`;
      },
    },
  ],
});

void me; void raceOf; void realmOf;
