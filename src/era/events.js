// 시대의 사건: 새것이 들어오면 누군가는 일을 잃고, 누군가는 기회를 잡는다. 플레이어는 그 사이에 선다.
import { gainStat, gainSkill } from '../game.js';
import {
  EVENTS, setFlag, father, alive, age, findJob, stress, tire, like, check, byId, here, onRoad,
} from '../events/core.js';
import { remember } from '../relations.js';
import { J } from '../narrative/text.js';
import { E, invented, owns } from './state.js';

const at = (g, ...ps) => ps.includes(here(g)) && !onRoad(g);

EVENTS.push(
  // ---------- 마석 방아와 옛 방앗간 ----------
  {
    id: 'era_mill_anger', once: true,
    cond: (g) => age(g) >= 12 && ((invented(g, 'erngrind') && at(g, 'ern') && !!findJob(g, 'miller')) || (invented(g, 'manamill') && at(g, 'harfen'))),
    chance: () => 0.08, weight: 55,
    prepare: (g) => ({ id: at(g, 'ern') ? findJob(g, 'miller')?.id ?? null : null }),
    title: '멈춘 물레바퀴',
    text: (g, c) => {
      const m = c.id != null ? byId(g, c.id) : null;
      return m
        ? `방앗간 주인 ${J(m.name, '이/가')} 멈춘 물레바퀴 앞에 앉아 있었다. 마을 사람들이 다 마석 방아로 간다. "삼대째 이 바퀴를 돌렸네. 이제 나는 뭘 돌리나." 그날 밤, 젊은 놈들이 마석 방아를 부수자고 모인다는 말이 돌았다.`
        : '하르펜 성문 밖 마석 방아 앞에 방앗간 주인들이 몰려와 있었다. 손에 몽둥이를 든 사람도 있다. "저 돌덩이가 우리 밥줄을 끊었다!" 경비대가 창을 비껴 들었다.';
    },
    choices: [
      { label: '방아 부수기에 끼어든다', run: (g, rng, c) => { const m = c.id != null ? byId(g, c.id) : null; like(m, 10); setFlag(g, 'era_smasher'); stress(g, 6); const caught = rng.chance(0.3); if (caught) { g.player.money = Math.max(0, g.player.money - 10); return '마석 하나를 깨뜨렸을 때 경비대가 들이닥쳤다. 벌금으로 은화 열 닢을 물었다. 방아는 사흘 만에 다시 돌았다.'; } return '어둠 속에서 몽둥이를 휘둘렀다. 마석이 깨지며 푸른 불꽃이 튀었다. 아무도 잡히지 않았다. 방아는 한 달 뒤 다시 돌았고, 새 방아는 쇠창살 안에 있었다.'; } },
      { label: '새 방아에서 일해 보라고 권한다', run: (g, rng, c) => { const m = c.id != null ? byId(g, c.id) : null; if (m) { like(m, rng.chance(0.5) ? 6 : -4); remember(g, m, '마석 방아 일을 권했다', 0, { tag: 'era' }); } gainStat(g, 'cha', 0.5); gainStat(g, 'int', 0.4); return m ? `${J(m.name, '은/는')} 한참 말이 없다가 일어섰다. "...돌덩이 시중이라도 들어야지." 그 뒷모습이 오래 남았다.` : '몇은 고개를 돌렸고 몇은 귀를 기울였다. 마석 방아에도 사람 손은 필요하다. 그 말이 돌덩이보다 무거웠다.'; } },
      { label: '그냥 지켜본다', run: (g) => { gainStat(g, 'sen', 0.4); return '새것이 오면 옛것은 물러난다. 아무도 그걸 막지 못했다. 다만 누가 그 값을 치르는지는 똑똑히 보았다.'; } },
    ],
  },
  // ---------- 등석 가로등과 밤 ----------
  {
    id: 'era_night_market', once: true,
    cond: (g) => age(g) >= 12 && invented(g, 'streetlamp') && at(g, 'harfen', 'leocast'),
    chance: () => 0.08, weight: 50,
    title: '밤 장터',
    text: () => '등석 가로등이 켜진 뒤로 해가 져도 광장이 비지 않는다. 구운 밤, 싸구려 장신구, 점쟁이, 노래꾼. 밤이 하나의 장터가 되었다. 좌판 하나가 사람을 구한다고 써 붙였다.',
    choices: [
      { label: '좌판 일을 거든다', run: (g) => { gainSkill(g, 'trade', 2, 'cha'); g.player.money += 4; tire(g, 8); return '자정이 넘도록 구운 밤을 팔았다. 은화 네 닢을 받았다. 낮에는 볼 수 없던 사람들이 밤에는 웃고 있었다.'; } },
      { label: '불빛 사이를 걷는다', run: (g) => { stress(g, -10); gainStat(g, 'cha', 0.4); return '푸른 불빛 아래서 모두의 얼굴이 조금씩 낯설었다. 어둠이 사라진 밤은 이상하게 들떠 있었다.'; } },
      { label: '빛이 닿지 않는 골목을 본다', run: (g, rng) => { gainStat(g, 'sen', 0.6); if (rng.chance(0.4)) { g.player.money = Math.max(0, g.player.money - 3); return '가로등 바로 뒤 골목은 오히려 더 어두웠다. 정신을 차리니 주머니가 가벼워져 있었다. 빛이 밝을수록 그림자도 짙다.'; } return '가로등 바로 뒤 골목은 오히려 더 어두웠다. 거기서 누군가 거래를 하고 있었다. 눈이 마주치기 전에 돌아섰다.'; } },
    ],
  },
  // ---------- 인쇄된 소책자 ----------
  {
    id: 'era_pamphlet', once: true,
    cond: (g) => age(g) >= 13 && invented(g, 'press') && at(g, 'harfen', 'leocast') && g.player.skills.letters >= 10,
    chance: () => 0.08, weight: 50,
    prepare: (g, rng) => ({ k: rng.int(0, 2) }),
    title: '길에 뿌려진 종이',
    text: (g, c) => `새벽 골목에 찍어 낸 종이 수백 장이 흩어져 있었다. "${['성광교는 마석의 값을 누구에게서 받는가', '귀족의 곳간과 빈민가의 솥', '왕은 누구의 손으로 왕관을 썼는가'][c.k]}" 손으로 베낀 글이었다면 열 장도 못 돌았을 말이다. 경비대가 종이를 줍고 있다.`,
    choices: [
      { label: '한 장 주워 읽는다', run: (g, rng, c) => { gainStat(g, 'int', 0.8); gainSkill(g, 'letters', 1, 'int'); return ['글은 거칠었지만 숫자는 정확했다. 성당이 받는 마석 공물과 구빈원에 내려가는 빵의 수.', '귀족 몇 집의 곳간에 쌓인 밀의 양이 적혀 있었다. 흉년에도 줄지 않은 숫자였다.', '두 왕자의 뒤를 누가 대 주는지, 이름이 하나씩 적혀 있었다. 몇은 아는 이름이었다.'][c.k] + ' 다 읽고 나서 종이를 접어 품에 넣었다.'; } },
      { label: '주워서 경비대에 넘긴다', run: (g) => { if (g.history?.powers) g.history.powers.church = Math.min(100, g.history.powers.church + 1); g.player.money += 2; return '경비대장이 은화 두 닢을 쥐여 주었다. "누가 뿌렸는지 보면 알려 줘." 돌아서는데 등 뒤가 따가웠다.'; } },
      { label: '남은 종이를 모아 몰래 나눠 준다', run: (g, rng) => { setFlag(g, 'era_pamphleteer'); gainStat(g, 'cha', 0.6); stress(g, 8); if (g.history?.powers) g.history.powers.church = Math.max(0, g.history.powers.church - 1); if (rng.chance(0.25)) { g.player.money = Math.max(0, g.player.money - 8); return '세 번째 골목에서 붙잡혔다. 벌금 은화 여덟 닢. 경비대원 하나가 종이를 읽고는 말없이 자기 품에 넣었다.'; } return '빨래터, 대장간, 여관 부엌. 종이는 손에서 손으로 사라졌다. 찍어 낸 글은 불태워도 또 나온다는 것을, 그날 모두가 알았다.'; } },
    ],
  },
  // ---------- 전신탑으로 소식 보내기 ----------
  {
    id: 'era_signal_word', once: true,
    cond: (g) => age(g) >= 15 && invented(g, 'signal') && at(g, 'harfen', 'leocast') && g.people.some((p) => p.alive && p.away && p.known && p.affection >= 15),
    chance: () => 0.1, weight: 48,
    prepare: (g) => { const p = g.people.filter((x) => x.alive && x.away && x.known && x.affection >= 15).sort((a, b) => b.affection - a.affection)[0]; return { id: p.id }; },
    title: '푸른 빛의 편지',
    text: (g, c) => `전신탑 아래 창구에 줄이 늘어서 있다. 은화 두 닢이면 열 마디를 왕도까지 보낼 수 있다. 오래 소식이 끊긴 ${J(byId(g, c.id).name, '이/가')} 떠올랐다.`,
    choices: [
      { label: '열 마디를 보낸다', run: (g, rng, c) => { const p = byId(g, c.id); g.player.money = Math.max(0, g.player.money - 2); like(p, 10); remember(g, p, '전신탑으로 소식을 보내왔다', 1, { tag: 'era' }); const n = g.history?.notables?.find((x) => x.pid === p.id); return `"잘 지내나. 나는 여기 있다." 열 마디는 생각보다 짧았다. 사흘 뒤 답이 왔다.${n ? ` ${J(p.name, '은/는')} 요즘 꽤 이름이 알려졌다고 했다.` : ' 별일 없이 산다고, 가끔 고향 꿈을 꾼다고.'}`; } },
      { label: '그냥 돌아선다', run: (g) => { gainStat(g, 'wil', 0.3); return '열 마디로 할 수 있는 말이 아니었다. 줄에서 빠져나왔다.'; } },
    ],
  },
  // ---------- 쇠수레와 마부 ----------
  {
    id: 'era_ironcart_clash', once: true,
    cond: (g) => age(g) >= 15 && invented(g, 'ironcart') && at(g, 'leocast', 'harfen'),
    chance: () => 0.08, weight: 50,
    title: '마부들의 길',
    text: () => '대로 한복판에서 쇠수레가 멈춰 섰다. 마부 수십 명이 수레를 둘러싸고 길을 막았다. "우리 말은 어쩌란 말이냐!" 쇠수레 몰이꾼이 운전대에서 내려 손을 들었다. 경비대는 아직 오지 않았다.',
    choices: [
      { label: '마부들 편에 선다', run: (g) => { gainStat(g, 'cha', 0.6); stress(g, 6); setFlag(g, 'era_horseman_friend'); return '마부들 사이에 섰다. 해 질 녘까지 아무도 움직이지 않았다. 다음 날 쇠수레는 다른 길로 돌았다. 그다음 해에는 그 길도 쇠수레 차지였다.'; } },
      { label: '몰이꾼을 돕는다', run: (g, rng) => { const ok = check(rng, g.player.stats.str + g.player.stats.cha * 0.5, 40); gainStat(g, 'wil', 0.6); if (!ok) { g.player.injuries.push({ name: '돌에 맞은 어깨', months: 1 }); return '날아온 돌이 어깨를 때렸다. 몰이꾼을 겨우 끌고 골목으로 빠져나왔다. 쇠수레는 그날 밤 불에 탔다.'; } return '몰이꾼을 감싸고 길을 텄다. 고맙다는 말 대신 몰이꾼은 떨리는 손으로 마석로 덮개를 닫았다. "나도 마부였소. 작년까지."'; } },
      { label: '사람들을 진정시킨다', run: (g, rng) => { const ok = check(rng, g.player.stats.cha + g.player.stats.wil * 0.5, 45); gainStat(g, 'cha', ok ? 1.0 : 0.4); return ok ? '"부수면 내일 더 큰 놈이 옵니다. 차라리 저걸 몰 줄 아는 사람이 됩시다." 몇이 웃었고, 몇이 고개를 끄덕였다. 길이 열렸다.' : '목소리는 함성에 묻혔다. 경비대가 와서야 길이 열렸다. 몇이 끌려갔다.'; } },
    ],
  },
  // ---------- 아버지와 마석 쟁기 ----------
  {
    id: 'era_old_hands', once: true, village: true,
    cond: (g) => age(g) >= 13 && g.player.familyId === 'farmer' && invented(g, 'plow') && alive(father(g)) && !owns(g, 'plow'),
    chance: () => 0.1, weight: 50,
    title: '아버지의 쟁기',
    text: (g) => '이웃집들이 하나둘 마석 쟁기를 들였다. 아버지는 낡은 쟁기 날을 숫돌에 갈며 말했다. "흙은 손으로 알아야 한다. 돌덩이가 흙을 알겠냐." 그러면서도 이웃집 밭고랑을 오래 바라보았다.',
    choices: [
      { label: '돈을 모아 사자고 설득한다', run: (g, rng) => { const ok = check(rng, g.player.stats.cha + g.player.skills.farming * 0.5, 35); if (ok) { E(g).goods.plow = 1; g.player.familyMoney = Math.max(0, g.player.familyMoney - 20); like(father(g), 4); gainStat(g, 'cha', 0.6); return '아버지는 사흘을 버티다 장에 다녀왔다. 마석 쟁기를 소에 매던 날, 아버지가 처음으로 웃었다. "흙이 이렇게 가벼웠나."'; } like(father(g), -3); stress(g, 5); return '"내가 죽거든 사라." 그 말로 끝이었다.'; } },
      { label: '아버지 방식을 따른다', run: (g) => { like(father(g), 8); remember(g, father(g), '옛 쟁기질을 함께 지켰다', 2, { tag: 'family' }); gainSkill(g, 'farming', 2, 'str'); gainStat(g, 'wil', 0.5); return '아버지와 나란히 옛 쟁기를 밀었다. 남보다 느렸다. 그래도 아버지가 흙을 한 줌 쥐고 냄새를 맡는 법을 가르쳐 주었다. 마석 쟁기는 그런 걸 가르쳐 주지 않는다.'; } },
    ],
  },
  // ---------- 처음 본 화석 불꽃 (어린아이) ----------
  {
    id: 'era_child_spark', once: true, village: true,
    cond: (g) => age(g) >= 4 && age(g) <= 10 && invented(g, 'firestone'),
    chance: () => 0.1, weight: 45,
    title: '돌에서 나온 불',
    text: () => '행상인이 광장에서 돌 두 개를 맞부딪쳤다. 불꽃이 튀더니 마른 짚에 불이 붙었다. 아이들이 비명을 지르며 뒤로 물러났다. "화석이오! 세레니아에서 왔소! 부싯돌은 이제 버리시오!"',
    choices: [
      { label: '앞으로 나가 만져 본다', run: (g) => { gainStat(g, 'sen', 0.5); gainStat(g, 'int', 0.3); return '돌은 차가웠다. 그런데 손바닥 안에서 무언가 꿈틀거리는 것 같았다. 행상인이 웃으며 돌을 도로 가져갔다.'; } },
      { label: '어른 뒤에 숨는다', run: (g) => { stress(g, 3); return '불은 금방 꺼졌다. 그날 밤 꿈에 돌들이 저 혼자 불을 뿜었다.'; } },
    ],
  },
  // ---------- 마석 값 ----------
  {
    id: 'era_manastone_price', cooldown: 60,
    cond: (g) => age(g) >= 15 && (g.realm?.era ?? 0) >= 1 && (owns(g, 'lantern') || owns(g, 'warmstone')) && (g.realm?.balhart?.war || (g.realm?.monsters ?? 0) > 55),
    chance: () => 0.1, weight: 45,
    title: '마석 값',
    text: (g) => `${g.realm.balhart.war ? '전쟁으로 마석이 전부 군수품으로 빠져나갔다.' : '마물이 길을 막아 미궁 마석이 들어오지 않는다.'} 등석과 온석을 채울 마석 값이 세 배로 뛰었다. 집집마다 등잔이 꺼지고, 사람들이 서랍 속 부싯돌을 다시 꺼낸다.`,
    choices: [
      { label: '비싸도 산다', run: (g) => { g.player.money = Math.max(0, g.player.money - 8); return '은화 여덟 닢이 돌 몇 개로 바뀌었다. 우리 집 창만 푸르게 빛났다. 이웃들의 눈길이 따가웠다.'; } },
      { label: '옛날처럼 지낸다', run: (g) => { stress(g, 5); gainStat(g, 'wil', 0.4); return '촛불을 켰다. 그을음 냄새가 났다. 불과 몇 해 사이에 이 냄새를 잊고 있었다.'; } },
    ],
  },
  // ---------- 구빈원 ----------
  {
    id: 'era_clinic', once: true,
    cond: (g) => age(g) >= 14 && invented(g, 'healstone') && at(g, 'harfen', 'leocast'),
    chance: () => 0.07, weight: 45,
    title: '구빈원의 정화석',
    text: (g) => `구빈원 앞에 줄이 길다. 정화석 붕대를 공짜로 감아 준다는 소문 때문이다. 수녀 하나가 손이 모자라 쩔쩔맨다.${g.world?.plague ? ' 돌림병이 도는 중이라 줄은 끝이 보이지 않는다.' : ''}`,
    choices: [
      { label: '소매를 걷고 거든다', run: (g) => { gainSkill(g, 'herbs', 2, 'wil'); gainStat(g, 'cha', 0.5); tire(g, 10); return '해가 질 때까지 붕대를 감았다. 곪아 가던 다리가 사흘 만에 아무는 걸 보았다. 십 년 전이었다면 잘라야 했을 다리였다.'; } },
      { label: '지나친다', run: () => '줄 끝의 아이와 눈이 마주쳤다. 걸음을 재촉했다.' },
    ],
  },
);

