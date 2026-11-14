// 한 달에 고르는 행동들. 나이, 집안, 마을 사람(스승)이 살아 있는지에 따라 할 수 있는 게 달라진다.
// 결과는 짧은 장면 글로 돌려주고, 오른 수치는 끝의 괄호에 작게 붙인다.
import {
  playerAge, gainStat, gainSkill, family, me, circleOf,
} from './game.js';
import { living, byId, ageYears, has } from './npc.js';
import { JOBS } from './data.js';
import { pickLine, moodLine, up, gains, join, J } from './narrative/text.js';
import * as T from './narrative/actions-text.js';
import { visitPerson, remember, meetMemory } from './relations.js';

const findJob = (game, job) => living(game).find((p) => p.job === job && !p.isPlayer);
const father = (game) => byId(game, game.player.familyIds[0]);
const tired = (game, n) => { game.player.fatigue = Math.min(100, game.player.fatigue + n); };
const stress = (game, n) => { game.player.stress = Math.max(0, Math.min(100, game.player.stress + n)); };
const pay = (game, n) => {
  const p = game.player;
  if (p.money >= n) { p.money -= n; return true; }
  if (p.familyMoney >= n) { p.familyMoney -= n; return true; }
  return false;
};
const line = (g, rng, pool, extra) => pickLine(g, rng, pool, extra);

function meetSomeone(game, rng, filter) {
  const cands = living(game).filter((p) => !p.isPlayer && !p.known && filter(p));
  if (!cands.length) return null;
  const p = rng.pick(cands);
  p.known = true;
  p.affection = rng.int(5, 20);
  p.history.push({ y: game.date.year, m: game.date.month, text: `${J(game.player.name, '과/와')} 처음 알게 되었다.` });
  return p;
}

export const ACTIONS = [
  {
    id: 'play',
    name: '뛰어놀기',
    desc: '마을 아이들과 들판과 골목을 뛰어다닌다. 몸이 자라고 친구가 생긴다.',
    available: (g) => playerAge(g) >= 3 && playerAge(g) < 13,
    run(g, rng) {
      tired(g, 8); stress(g, -12);
      const a = gainStat(g, 'agi', 0.9), s = gainStat(g, 'str', 0.5), c = gainStat(g, 'cha', 0.3);
      const age = playerAge(g);
      const scene = line(g, rng, T.PLAY);
      let extra = '';
      const friend = rng.chance(0.45) && meetSomeone(g, rng, (p) => Math.abs(ageYears(p) - age) <= 3);
      if (friend) {
        extra = `그날 처음 어울린 ${J(`${friend.name}(${ageYears(friend)}살)`, '과/와')} 해 질 녘까지 붙어 다녔다.`;
        meetMemory(g, friend, '아이들 틈에서 처음 어울려 놀았다');
      } else {
        // 아는 또래와 놀면 정이 들거나, 경쟁심이 생긴다
        const peers = living(g).filter((p) => p.known && !p.isPlayer && Math.abs(ageYears(p) - age) <= 2 && !g.player.familyIds.includes(p.id));
        const peer = peers.length && rng.chance(0.5) ? rng.pick(peers) : null;
        if (peer) extra = playWithPeer(g, rng, peer);
      }
      return join(scene, extra, moodLine(g, rng), gains(up('민첩', a), up('힘', s), up('매력', c)));
    },
  },
  {
    id: 'help_home',
    name: '집안일 돕기',
    desc: '집안의 일을 거든다. 집안마다 하는 일이 다르다.',
    available: (g) => playerAge(g) >= 5,
    run(g, rng) {
      tired(g, 12); stress(g, 4);
      const fam = family(g).id;
      const scene = line(g, rng, T.HELP_HOME);
      if (fam === 'farmer') {
        const k = gainSkill(g, 'farming', 1.6, 'str'), s = gainStat(g, 'str', 0.6), w = gainStat(g, 'wil', 0.4);
        g.player.familyMoney += 1;
        return join(scene, moodLine(g, rng), gains(up('농사', k), up('힘', s), up('의지', w)));
      }
      if (fam === 'merchant') {
        const k = gainSkill(g, 'trade', 1.6, 'cha'), i = gainStat(g, 'int', 0.5), c = gainStat(g, 'cha', 0.4);
        g.player.familyMoney += 2;
        return join(scene, moodLine(g, rng), gains(up('장사', k), up('지능', i), up('매력', c)));
      }
      const w = gainStat(g, 'wil', 0.7), c = gainStat(g, 'cha', 0.3);
      g.player.familyMoney += 1;
      return join(scene, moodLine(g, rng), gains(up('의지', w), up('매력', c)));
    },
  },
  {
    id: 'study',
    name: '예배당에서 글 배우기',
    desc: '성광교 사제에게 글과 셈, 역사를 배운다. 한 달에 은화 1닢.',
    available: (g) => playerAge(g) >= 6 && !!findJob(g, 'priest'),
    run(g, rng) {
      if (!pay(g, 1)) { stress(g, 4); return '수업료가 없어 예배당 문 앞에서 발길을 돌렸다. 안에서 아이들이 기도문 외는 소리가 들렸다.'; }
      tired(g, 8); stress(g, 5);
      const k = gainSkill(g, 'letters', 2.0, 'int'), i = gainStat(g, 'int', 0.8), w = gainStat(g, 'wil', 0.3);
      const priest = findJob(g, 'priest');
      if (!priest) return '예배당은 비어 있었다. 가르칠 사람이 없다.';
      priest.known = true; priest.affection += 1;
      remember(g, priest, '예배당에서 글을 배웠다', 1, { tag: 'pupil' });
      const t = priest.traits.find((x) => T.STUDY_PRIEST[x]);
      const flavor = t && rng.chance(0.3) ? T.STUDY_PRIEST[t] : '';
      return join(line(g, rng, T.STUDY), flavor, moodLine(g, rng), gains(up('글과 학문', k), up('지능', i), up('의지', w)));
    },
  },
  {
    id: 'train_body',
    name: '몸 단련',
    desc: '달리고, 나무를 패고, 돌을 든다. 힘들지만 몸이 단단해진다.',
    available: (g) => playerAge(g) >= 7,
    run(g, rng) {
      tired(g, 18); stress(g, 3);
      const s = gainStat(g, 'str', 1.2), a = gainStat(g, 'agi', 0.4), w = gainStat(g, 'wil', 0.6);
      return join(line(g, rng, T.TRAIN_BODY), moodLine(g, rng), gains(up('힘', s), up('민첩', a), up('의지', w)));
    },
  },
  {
    id: 'sword_father',
    name: '아버지에게 검 배우기',
    desc: '퇴역 기사인 아버지가 가문의 검술을 가르친다. 강검류의 기본.',
    available: (g) => playerAge(g) >= 6 && father(g)?.alive && father(g)?.job === 'old_knight',
    run(g, rng) {
      tired(g, 16); stress(g, 6);
      const k = gainSkill(g, 'sword', 2.2, 'str'), s = gainStat(g, 'str', 0.5), a = gainStat(g, 'agi', 0.4), w = gainStat(g, 'wil', 0.4);
      const f = father(g); f.affection += 1;
      remember(g, f, '마당에서 검을 가르쳤다', 1, { tag: 'sword' });
      g._father = f;
      const scene = line(g, rng, T.SWORD_FATHER);
      delete g._father;
      return join(scene, moodLine(g, rng), gains(up('검술', k), up('힘', s), up('민첩', a), up('의지', w)));
    },
  },
  {
    id: 'sword_guard',
    name: '경비대에게 검 배우기',
    desc: '마을 경비대원에게 실전 검술을 배운다. 한 달에 은화 2닢.',
    available: (g) => playerAge(g) >= 9 && !!findJob(g, 'guard'),
    run(g, rng) {
      if (!pay(g, 2)) { stress(g, 4); return '돈이 모자랐다. 경비대원은 빈손을 보더니 말없이 고개를 저었다.'; }
      tired(g, 16); stress(g, 5);
      const k = gainSkill(g, 'sword', 1.7, 'agi'), a = gainStat(g, 'agi', 0.5), s = gainStat(g, 'str', 0.4);
      const gd = findJob(g, 'guard'); if (!gd) return '초소는 비어 있었다.'; gd.known = true; gd.affection += 1;
      remember(g, gd, '초소에서 검을 가르쳤다', 1, { tag: 'pupil' });
      let extra = '';
      if (has(gd, 'drunkard') && rng.chance(0.25)) extra = `${J(gd.name, '은/는')} 오늘도 술이 덜 깬 얼굴이었다. 그래도 목검만 쥐면 눈빛이 달라졌다.`;
      return join(line(g, rng, T.SWORD_GUARD, gd), extra, moodLine(g, rng), gains(up('검술', k), up('민첩', a), up('힘', s)));
    },
  },
  {
    id: 'meditate',
    name: '마력 명상',
    desc: '조용히 앉아 몸속의 마력을 느끼고 돌린다. 마력이 조금 더 자란다.',
    available: (g) => g.player.manaAwakened,
    run(g, rng) {
      tired(g, 6); stress(g, -6);
      const p = g.player;
      const before = p.mana;
      p.mana += p.manaPotential * (playerAge(g) < 15 ? 1.6 : 0.3) + 0.2;
      const w = gainStat(g, 'wil', 0.4), sn = gainStat(g, 'sen', 0.3);
      return join(line(g, rng, T.MEDITATE), gains(up('마력', p.mana - before), up('의지', w), up('감각', sn)));
    },
  },
  {
    id: 'magic_lesson',
    name: '마법사에게 배우기',
    desc: '마을 변두리의 떠돌이 마법사에게 마법의 기초를 배운다. 한 달에 은화 3닢.',
    available: (g) => playerAge(g) >= 8 && g.player.manaAwakened && !!findJob(g, 'hedge_mage'),
    run(g, rng) {
      if (!pay(g, 3)) { stress(g, 4); return '수업료가 모자랐다. 오두막 문은 끝내 열리지 않았다.'; }
      tired(g, 12); stress(g, 6);
      const before = circleOf(g);
      const k = gainSkill(g, 'magic', 2.0, 'int'), i = gainStat(g, 'int', 0.6), sn = gainStat(g, 'sen', 0.3);
      const m = findJob(g, 'hedge_mage'); if (!m) return '오두막에는 아무도 없었다.'; m.known = true; m.affection += 1;
      remember(g, m, '오두막에서 마법을 가르쳤다', 1, { tag: 'pupil' });
      const after = circleOf(g);
      let scene;
      if (after > before) {
        scene = `마력이 몸속에서 한 바퀴 원을 그리더니, 그 자리에 단단히 굳었다. ${after}서클. ${J(m.name, '은/는')} 한참 말이 없다가 "생각보다 빠르군." 하고만 말했다.`;
        remember(g, m, `${after}서클에 오르는 것을 지켜보았다`, 1);
      } else {
        g._mage = m;
        scene = line(g, rng, T.MAGIC_LESSON);
        delete g._mage;
      }
      return join(scene, moodLine(g, rng), gains(up('마법', k), up('지능', i), up('감각', sn)));
    },
  },
  {
    id: 'herbs',
    name: '숲에서 약초 캐기',
    desc: '마을 뒤 숲에서 약초를 캐 판다. 숲 깊은 곳은 위험하다.',
    available: (g) => playerAge(g) >= 8,
    run(g, rng) {
      tired(g, 12);
      const k = gainSkill(g, 'herbs', 1.5, 'sen'), sn = gainStat(g, 'sen', 0.6);
      const earn = Math.round(1 + g.player.skills.herbs / 20 + rng.int(0, 2));
      g.player.money += earn;
      let extra = '';
      if (rng.chance(0.06)) {
        g.player.injuries.push({ name: '다리 긁힘', months: 2 });
        extra = '돌아오는 길에 가시덤불에 다리를 깊게 긁혔다. 피가 장화 속까지 흘러내렸다.';
      }
      return join(line(g, rng, T.HERBS), `캔 것을 팔아 은화 ${earn}닢을 손에 쥐었다.`, extra, gains(up('약초', k), up('감각', sn)));
    },
  },
  {
    id: 'inn_kitchen',
    name: '여관 부엌 일',
    desc: '여관 부엌에서 감자를 깎고 냄비를 젓는다. 요리를 배우고 품삯을 받는다.',
    available: (g) => playerAge(g) >= 10 && !!findJob(g, 'innkeeper'),
    run(g, rng) {
      tired(g, 14); stress(g, 4);
      const k = gainSkill(g, 'cooking', 1.8, 'sen'), sn = gainStat(g, 'sen', 0.3);
      const earn = 2 + Math.floor(g.player.skills.cooking / 25);
      g.player.money += earn;
      const inn = findJob(g, 'innkeeper'); if (!inn) return '여관 문이 닫혀 있었다. 주인이 없는 여관은 하루아침에 조용해졌다.'; inn.known = true; inn.affection += 1;
      remember(g, inn, '부엌에서 일했다', 1, { tag: 'worker' });
      const heard = rng.chance(0.4) ? rng.pick(T.INN_HEARD) : '';
      return join(line(g, rng, T.INN, inn), heard, `품삯으로 은화 ${earn}닢을 받았다.`, moodLine(g, rng), gains(up('요리', k), up('감각', sn)));
    },
  },
  {
    id: 'day_labor',
    name: '남의 밭 품팔이',
    desc: '바쁜 집 밭일을 거들고 품삯을 받는다.',
    available: (g) => playerAge(g) >= 10,
    run(g, rng) {
      tired(g, 18); stress(g, 5);
      const k = gainSkill(g, 'farming', 1.0, 'str'), s = gainStat(g, 'str', 0.6);
      const earn = g.world.famine ? 1 : 2;
      g.player.money += earn;
      return join(line(g, rng, T.DAY_LABOR), `품삯은 은화 ${earn}닢이었다.`, moodLine(g, rng), gains(up('농사', k), up('힘', s)));
    },
  },
  {
    id: 'wander',
    name: '마을 돌아다니기',
    desc: '광장, 대장간, 방앗간을 기웃거리며 사람들을 만난다.',
    available: (g) => playerAge(g) >= 4,
    run(g, rng) {
      tired(g, 5); stress(g, -4);
      const c = gainStat(g, 'cha', 0.5), sn = gainStat(g, 'sen', 0.3);
      const p = meetSomeone(g, rng, () => true);
      let scene;
      if (p) {
        const place = T.WANDER_PLACE[p.job] ?? '광장에서';
        const who = `${p.job === 'child' ? '' : `${p.lastName}네 `}${p.name}(${ageYears(p)}살, ${jobName(p)})`;
        const t = p.traits.find((x) => T.WANDER_TRAIT[x]);
        scene = join(`${place} ${J(who, '과/와')} 처음 말을 섞었다.`, t ? T.WANDER_TRAIT[t] : '');
        meetMemory(g, p, '마을을 돌아다니다 처음 말을 섞었다');
      } else {
        scene = line(g, rng, T.WANDER_NOBODY);
      }
      return join(scene, gains(up('매력', c), up('감각', sn)));
    },
  },
  {
    id: 'visit',
    name: '아는 사람 찾아가기',
    desc: '아는 사람을 골라 시간을 함께 보낸다. 사이가 가까워지고, 이야기가 이어진다.',
    needsTarget: true,
    available: (g) => playerAge(g) >= 4 && g.people.some((p) => p.known && !p.isPlayer && p.alive && !p.away),
    run(g, rng, choice) {
      const p = byId(g, choice.target);
      if (!p || !p.alive || p.away) return '찾아갔지만 만나지 못했다. 집은 비어 있었다.';
      tired(g, 4); stress(g, -8);
      return visitPerson(g, rng, p);
    },
  },
  {
    id: 'rest',
    name: '쉬기',
    desc: '아무것도 하지 않고 쉰다. 피로와 스트레스가 풀린다.',
    available: () => true,
    run(g, rng) {
      g.player.fatigue = Math.max(0, g.player.fatigue - 25);
      stress(g, -15);
      return line(g, rng, T.REST);
    },
  },
];

// 아는 또래와 놀기: 성격이 맞으면 친구, 승부욕이 붙으면 라이벌
function playWithPeer(g, rng, peer) {
  const competitive = has(peer, 'ambitious') || has(peer, 'brave') || has(peer, 'cruel');
  if (competitive && rng.chance(0.5)) {
    peer.rivalry = Math.min(100, (peer.rivalry ?? 0) + rng.int(5, 10));
    const won = g.player.stats.agi + rng.int(-10, 10) > 12 + ageYears(peer) * 1.5;
    remember(g, peer, won ? '달리기 시합에서 졌다' : '달리기 시합에서 이겼다', won ? -1 : 0, { tag: 'race' });
    return won
      ? `${J(peer.name, '과/와')} 개울 끝까지 달리기 시합을 했다. 반 걸음 차이로 이겼다. ${J(peer.name, '은/는')} 다시 하자며 이를 갈았다.`
      : `${J(peer.name, '과/와')} 개울 끝까지 달리기 시합을 했다. 졌다. ${J(peer.name, '이/가')} 돌아보며 웃는 얼굴이 오래 잊히지 않았다.`;
  }
  peer.affection = Math.min(100, peer.affection + rng.int(2, 5));
  remember(g, peer, '골목과 들판을 함께 뛰어다녔다', 1, { tag: 'play' });
  return `${J(peer.name, '이/가')} 끝까지 옆에 있었다. 헤어질 때 내일도 나오라고 했다.`;
}

export function jobName(p) {
  return JOBS[p.job]?.name ?? p.job;
}
export { me };
