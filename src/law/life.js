// 법 곁에서 사는 삶: 고발하기, 법 배우기, 변론인으로 법정에 서기. 새 왕의 대관 사면, 궐석 판결, 들통나는 거짓 증언, 옅어지는 낙인.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { crimeState, isJailed, reportCrime } from '../crime.js';
import { makeRng } from '../rng.js';
import { byId, living, ageYears } from '../npc.js';
import { deed } from '../repute/index.js';
import { feudState } from '../feud/index.js';
import { realmOf } from '../realms/index.js';
import { LS, CHARGES, NAMES, clamp, mi, llog, openCases, bigTown, townOf, placeName } from './state.js';
import { openCase, askTrial, verdict } from './trial.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.over;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 41) ^ Math.imul(mi(g) * 43 + salt + 13, 2246822519)) | 0 });

// 이 고장의 어른 하나 (나와 식구 말고). 없으면 지어낸 이름.
export function localOther(g, rng, filter = () => true) {
  const fam = new Set(g.player.familyIds ?? []), id = g.player.id;
  const ppl = living(g).filter((p) => !p.isPlayer && !fam.has(p.id) && p.fatherId !== id && p.motherId !== id && (p.place ?? 'ern') === here(g) && ageYears(p) >= 18 && filter(p));
  if (ppl.length) { const p = rng.pick(ppl); return { id: p.id, name: p.name }; }
  return { id: null, name: rng.pick(NAMES) };
}
const grievanceHere = (g) => LS(g).grievances.find((x) => x.place === here(g));
const enemyHere = (g) => {
  const G = feudState(g).grudges;
  const p = living(g).find((x) => G[x.id] && (x.place ?? 'ern') === here(g) && !x.isPlayer);
  return p ? { id: p.id, name: p.name } : null;
};
export function addGrievance(g, charge, other, proof) {
  const S = LS(g);
  S.grievances = S.grievances.filter((x) => !(x.place === here(g) && x.charge === charge));
  S.grievances.push({ id: S.seq++, charge, other, place: here(g), at: mi(g), proof: Math.round(clamp(proof, 5, 95)) });
  if (S.grievances.length > 6) S.grievances.shift();
}

/* ---------- 행동 ---------- */
ACTIONS.push({
  id: 'law_sue', name: '고발하기', icon: 'scroll',
  desc: '당한 일을 재판에 부친다. 증거가 있으면 배상을 받아 낸다. 원수를 억지로 고발할 수도 있지만, 지면 거짓 고발로 몰린다.',
  available: (g) => free(g) && townOf(here(g)) && !openCases(g).some((c) => c.place === here(g)) && !sceneQueued(g, 'law_trial') && (!!grievanceHere(g) || !!enemyHere(g)),
  run(g, rng) {
    const S = LS(g), gr = grievanceHere(g);
    tired(g, 3);
    if (gr) {
      S.grievances = S.grievances.filter((x) => x !== gr);
      const c = openCase(g, { role: 'plaintiff', charge: gr.charge, other: gr.other, guilty: true, evidence: gr.proof + S.skill / 5 });
      askTrial(g, c);
      return `${placeName(here(g))}의 법정에 고발장을 냈다. ${J(gr.other.name, '을/를')} ${J(CHARGES[gr.charge].name, '으로/로')}. 서기가 이름을 적고 날을 잡아 주었다.`;
    }
    const en = enemyHere(g);
    if (!en) return '고발할 일이 없어졌다.';
    const charge = rng.pick(['slander', 'theft', 'fraud', 'assault']);
    const c = openCase(g, { role: 'plaintiff', charge, other: en, guilty: false, evidence: 15 + S.skill / 4 });
    askTrial(g, c);
    return `${J(en.name, '을/를')} ${J(CHARGES[charge].name, '으로/로')} 고발했다. 증거라 할 것은 많지 않다. 서기가 고발장을 읽다가 나를 한 번 올려다보았다.`;
  },
});

ACTIONS.push({
  id: 'law_study', name: '법 배우기', icon: 'book',
  desc: '법전과 판례를 읽고 법정을 구경한다. 법을 알면 내 재판에서 덜 휘둘리고, 남의 변론을 맡을 수도 있다.',
  available: (g) => free(g) && townOf(here(g)) && ((g.player.skills.letters ?? 0) >= 5 || g.player.stats.int >= 30),
  run(g, rng) {
    const S = LS(g);
    const gain = S.skill < 30 ? 3 : S.skill < 60 ? 2 : 1;
    S.skill = clamp(S.skill + gain, 0, 100);
    gainSkill(g, 'letters', 0.6, 'int');
    tired(g, 4);
    const law = { leonia: '영주령마다 다른 관습법', valhart: '두꺼운 제국 법전', holy: '교단의 계율서', serenia: '협회의 집행 규정', free: '의회의 상법 판례집' }[realmOf(here(g))] ?? '그 땅의 오래된 관습';
    return `${law}을 읽었다. ${rng.pick(['법정 뒤편에 앉아 판결 셋을 들었다. 둘은 증거로, 하나는 재판관의 기분으로 갈렸다.', '서기에게 술 한 잔을 사고 옛 판례를 물었다.', '조문 하나를 외우는 데 저녁이 다 갔다.'])} (법 +${gain})`;
  },
});

ACTIONS.push({
  id: 'law_advocate', name: '변론 맡기', icon: 'coin',
  desc: '남의 재판에 변론인으로 선다. 큰 고장에서만 일감이 있다. 이기면 이름이 나고, 지면 의뢰인이 운다.',
  available: (g) => free(g) && bigTown(here(g)) && LS(g).skill >= 30,
  run(g, rng) {
    const S = LS(g);
    tired(g, 6);
    S.rec.pleas += 1;
    const won = rng.chance(clamp(0.3 + S.skill / 150 + g.player.stats.cha / 300, 0.3, 0.88));
    const fee = Math.round((6 + S.skill / 6) * (won ? 1.5 : 0.7));
    g.player.money += fee;
    if (won) { L(g).renown = (L(g).renown ?? 0) + 1; S.skill = clamp(S.skill + 1, 0, 100); }
    const client = rng.pick(['빚에 몰린 방앗간 주인', '도둑으로 몰린 하녀', '땅을 빼앗긴 과부', '계약을 어겼다는 상인', '술김에 주먹을 휘두른 대장장이']);
    return won
      ? `${J(client, '을/를')} 변론했다. 상대편 증인의 말이 앞뒤가 안 맞는 곳을 짚었다. 이겼다. 의뢰인이 은화 ${fee}닢을 쥐여 주고 손을 놓지 않았다.`
      : `${J(client, '을/를')} 변론했다. 재판관은 내 말을 반쯤 듣다 말았다. 졌다. 수고비로 은화 ${fee}닢을 받았다. 받기가 민망했다.`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.law) return;
  const S = LS(g), now = mi(g), rng = ownRng(g, 3);

  // 새 왕의 대관 사면: 레오니아의 감옥 문이 열린다
  const ruler = g.realm?.ruler ?? null;
  if (ruler !== S.ruler) {
    const was = S.ruler;
    S.ruler = ruler;
    const jailed = crimeState(g).jailed;
    if (was && ruler && ruler !== 'regency' && g.realm?.succession === 'settled' && jailed && realmOf(jailed.place) === 'leonia') {
      crimeState(g).jailed = null;
      S.rec.pardons += 1;
      S.stain = clamp(S.stain - 10, 0, 100);
      note(g, '새 왕의 대관식 날, 사면령이 내려 감옥에서 풀려났다.');
      chron(g, `${g.player.name}, 대관 사면으로 감옥에서 풀려나다.`, 50);
      g.news.unshift({ text: '대관식 사면령이 내렸다. 감옥 문이 열리고, 수염이 자란 사람들이 햇빛에 눈을 찡그리며 걸어 나왔다. 나도 그 가운데 하나였다.', rel: 100, big: true });
    }
  }

  // 오래 열어 둔 재판: 내가 나타나지 않으면 궐석으로 끝난다
  for (const c of openCases(g)) {
    if (now - c.at < 6 || sceneQueued(g, 'law_trial')) continue;
    if (c.role === 'accused' && !c.crime) {
      const text = verdict(g, rng, c, false, 'absent');
      c.verdict = `궐석 판결: ${c.verdict}`;
      g.news.unshift({ text: `${placeName(c.place)}의 법정이 내가 없는 자리에서 판결을 내렸다. ${text}`, rel: 90 });
    } else { c.state = 'dropped'; c.verdict = '흐지부지되었다'; }
  }

  // 거짓 증언과 거짓 고발은 언젠가 드러날 수 있다
  for (const pj of [...S.perjury]) {
    if (now - pj.at < 3 || !rng.chance(0.012)) continue;
    S.perjury = S.perjury.filter((x) => x !== pj);
    reportCrime(g, 'fraud', pj.place);
    deed(g, 'honest', -6, `${J(g.player.name, '이/가')} 법정에서 거짓을 말했다는 것이 드러났다.`, pj.place);
    llog(g, `${placeName(pj.place)}: ${pj.name}의 재판에서 한 거짓이 드러났다.`);
    g.news.unshift({ text: `${placeName(pj.place)}에서 옛 재판이 다시 열린다는 소문이다. ${pj.name}의 일로 누군가 거짓 증언을 했다고 한다. 그 누군가는 나다.`, rel: 90 });
  }

  // 낙인은 해마다 조금씩 옅어진다
  if (g.date.month === 1 && S.stain > 0) S.stain = clamp(S.stain - 2, 0, 100);
});
