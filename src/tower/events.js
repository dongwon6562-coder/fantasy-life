// 탑과 금지 마법의 사건: 검은 탑의 초대, 들켰을 때, 스승(가르침·심부름·죽음), 탑끼리의 표 대결,
// 교단과의 갈등(심문관, 화형, 시약소). 그리고 마탑과 교단 사이의 날(friction)이 세상에서 오르내린다.
import { EVENTS, flag, setFlag, check, stress, tire, age } from '../events/core.js';
import { gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { WORLD_TICKS } from '../world.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { isJailed, jail, addNotoriety } from '../crime.js';
import { leaveJob } from '../places.js';
import { realmOf } from '../realms/index.js';
import { magicState } from '../magic/spells.js';
import { TS, mi, clamp, TOWERS, RANKS, ITEMS, forbiddenLv, tlog } from './state.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const M = (g) => TS(g).member;
const fame = (g, n) => { L(g).renown = Math.max(0, (L(g).renown ?? 0) + n); };
const BLACK_CITIES = ['serenia', 'leocast', 'harfen', 'eisen', 'barka'];

// ---------- 검은 탑의 초대 ----------
EVENTS.push({
  id: 'tower_black_invite', cooldown: 60, weight: 5,
  chance: () => 0.3,
  cond: (g) => free(g) && TS(g).black === 0 && g.player.manaAwakened && (g.player.skills.magic ?? 0) >= 30 && BLACK_CITIES.includes(here(g))
    && (!!M(g) || g.player.stress >= 50 || !!g.seal?.me?.pact || !!g.faith?.dawn),
  title: '검은 봉투',
  text: (g) => `방문 틈으로 검은 봉투가 밀려 들어왔다. 봉랍에는 아무 문장도 없었다. 안에는 쪽지 한 장. "협회가 태워 없앤 책들이 다 타지는 않았다. 네 마력은 그 책들을 읽을 만하다. 그믐밤, ${here(g) === 'serenia' ? '회색 탑 뒤편 수로' : '옛 성벽 아래 지하 저장고'}." ${M(g) ? '탑 안에도 이 봉투를 받은 사람이 있을 것이다.' : ''}`,
  choices: [
    {
      label: '그믐밤에 간다',
      run: (g) => {
        const T = TS(g);
        T.black = 2;
        note(g, '검은 탑의 모임에 나갔다.');
        tlog(g, '검은 탑의 모임에 들었다.');
        return '지하 저장고에는 가면을 쓴 마법사 일곱이 둘러앉아 있었다. 그 가운데 하나는 목소리만으로도 알 것 같았다. 그들은 내게 사본 세 권을 내밀었다. 죽은 자, 피, 정신. "고르는 것은 너다. 대가를 치르는 것도 너다."';
      },
    },
    { label: '봉투를 태운다', run: (g) => { TS(g).black = -1; return '봉투를 촛불에 대었다. 검은 종이는 이상하게도 아주 천천히 탔다. 재가 다 식을 때까지 지켜보았다.'; } },
    {
      label: '협회 집행관에게 가져간다',
      run: (g) => {
        const T = TS(g);
        T.black = -1; fame(g, 3);
        if (M(g)) M(g).merit += 15;
        T.friction = clamp(T.friction - 3, 0, 100);
        return '집행관은 봉투를 받아 들고 오래 냄새를 맡았다. 그믐밤, 지하 저장고는 텅 비어 있었다. 누군가 미리 알려 준 것이다. 집행관이 나를 보는 눈이 조금 달라졌다. 고마움인지 의심인지는 모르겠다.';
      },
    },
  ],
});

// ---------- 들켰다 ----------
EVENTS.push({
  id: 'tower_exposed', cooldown: 0, weight: 89,
  cond: (g) => !!TS(g).pendingExpose && !isJailed(g) && age(g) >= 15,
  prepare: (g) => { TS(g).pendingExpose = false; return { holy: realmOf(here(g)) === 'holy' }; },
  title: '흰 망토와 회색 망토',
  text: (g, c) => `새벽에 문이 부서졌다. ${c.holy ? '흰 망토의 이단심문관들' : '마도사 협회의 회색 망토 집행관'}${c.holy ? '이' : '과 성광교의 심문관이'} 문간을 막아섰다. 바닥에 지우다 만 분필 원이 남아 있었다. "금지된 술을 쓴 자. 이름을 대라."`,
  choices: [
    {
      label: '창문으로 달아난다',
      run: (g, rng) => {
        const T = TS(g);
        T.hunted = mi(g) + 36; T.exposed += 1; addNotoriety(g, 10); stress(g, 15);
        if (T.member) { T.member = null; T.expelled = true; tlog(g, '탑에서 쫓겨났다.'); }
        const life = L(g);
        const to = here(g) === 'barka' ? 'portel' : 'barka';
        leaveJob(g, '쫓기는 몸이 되어 일을 잃었다.');
        life.travel = { to, left: 2, from: here(g), forced: true };
        if (life.home !== 'street') life.home = 'inn';
        chron(g, `${g.player.name}, 금지 마법을 쓰다 들켜 쫓기는 몸이 되다.`, 90);
        return `지붕을 타고 달렸다. 등 뒤에서 결계가 터지는 소리가 났다. 날이 밝을 무렵 나는 남쪽으로 가는 짐마차 밑에 숨어 있었다. 이제 세 해 동안은 그들이 나를 찾을 것이다.`;
      },
    },
    {
      label: '맞서 싸운다',
      run: (g, rng) => {
        const T = TS(g);
        T.exposed += 1;
        if (check(rng, playerPower(g) + T.forbidden.necro * 6 + T.forbidden.blood * 6, 75)) {
          T.hunted = mi(g) + 60; T.taint = clamp(T.taint + 8, 0, 100); addNotoriety(g, 25);
          if (T.member) { T.member = null; T.expelled = true; }
          chron(g, `${g.player.name}, 자신을 잡으러 온 집행관을 죽이다.`, 100);
          return '방 안이 불과 비명으로 찼다. 정신을 차렸을 때 문간에는 아무도 서 있지 않았다. 바닥의 분필 원이 피로 다시 그려져 있었다. 이제 돌아갈 곳은 없다.';
        }
        T.forbidden = { necro: 0, blood: 0, mind: 0 }; T.black = -1;
        if (T.member) { T.member = null; T.expelled = true; }
        jail(g, 30);
        return '술식을 반도 긋기 전에 봉마 쇠사슬이 손목을 감았다. 마력이 빠져나가는 느낌은 피가 빠져나가는 것보다 끔찍했다.';
      },
    },
    {
      label: '모든 것을 털어놓는다',
      run: (g) => {
        const T = TS(g);
        T.exposed += 1; T.forbidden = { necro: 0, blood: 0, mind: 0 }; T.black = -1; T.taint = Math.floor(T.taint / 2);
        if (T.member) { T.member.rank = 0; T.member.merit = 0; }
        if (g.faith) g.faith.suspicion = Math.min(100, (g.faith.suspicion ?? 0) + 10);
        jail(g, 8);
        return '검은 탑의 모임 장소와 가면들의 목소리를 모두 댔다. 사본은 광장에서 불태워졌다. 나는 여덟 달 동안 봉마 쇠사슬을 차고 참회록을 썼다. 검은 탑의 남은 사람들이 내 이름을 알 것이다.';
      },
    },
    {
      label: '은화 백 닢을 내민다',
      show: (g) => g.player.money >= 100,
      run: (g, rng) => {
        const T = TS(g);
        g.player.money -= 100;
        if (rng.chance(0.5)) { T.taint = clamp(T.taint + 2, 0, 100); return '집행관 하나가 주머니를 받아 넣고 동료에게 눈짓했다. "분필 원? 아이들 장난이군." 그들이 돌아간 뒤에도 한참 손이 떨렸다.'; }
        T.exposed += 1; T.hunted = mi(g) + 24; addNotoriety(g, 8);
        if (T.member) { T.member = null; T.expelled = true; }
        jail(g, 12);
        return '집행관이 주머니를 받아 들고 웃었다. "뇌물죄도 덧붙이지." 돈도 잃고 손목에는 쇠사슬이 채워졌다.';
      },
    },
  ],
});

// ---------- 스승 ----------
EVENTS.push({
  id: 'tower_master_lesson', cooldown: 18, weight: 6,
  cond: (g) => free(g) && here(g) === 'serenia' && !!M(g)?.master?.alive && M(g).master.bond >= 25,
  title: '스승의 방',
  text: (g) => `${J(M(g).master.name, '이/가')} 밤늦게 나를 방으로 불렀다. 책상 위에 아무 표시도 없는 사본 한 권이 놓여 있었다. "탑에서 가르치지 않는 것이다. 금지된 것은 아니지만, 아무에게나 보여 줄 것도 아니지."`,
  choices: [
    { label: '밤새 배운다', run: (g) => { const m = M(g).master; gainSkill(g, 'magic', 2.5, 'int'); m.bond = clamp(m.bond + 5, -100, 100); tire(g, 15); return `${J(m.name, '은/는')} 술식 하나를 세 가지 방법으로 그어 보였다. 동이 틀 무렵 나는 그 가운데 하나를 겨우 따라 했다. 스승은 처음으로 웃었다.`; } },
    { label: '정중히 사양한다', run: (g) => { M(g).master.bond -= 3; return '"아직 제 그릇이 아닌 것 같습니다." 스승은 사본을 서랍에 넣었다. 서운한 기색은 없었다. 적어도 겉으로는.'; } },
  ],
});
EVENTS.push({
  id: 'tower_master_errand', cooldown: 36, weight: 5,
  chance: () => 0.4,
  cond: (g) => free(g) && here(g) === 'serenia' && !!M(g)?.master?.alive,
  prepare: (g, rng) => ({ rival: rng.pick(Object.keys(TOWERS).filter((t) => t !== M(g).tower)) }),
  title: '스승의 심부름',
  text: (g, c) => `${J(M(g).master.name, '이/가')} 봉인된 상자 하나를 내밀었다. "${TOWERS[c.rival].name}의 연구 기록이다. 정확히는, 그쪽이 잃어버린 기록이지. 오늘 밤 자유도시에서 온 사람에게 넘겨라. 묻지 말고." 상자가 생각보다 무거웠다.`,
  choices: [
    { label: '묻지 않고 심부름한다', run: (g, rng, c) => { const m = M(g).master; m.bond = clamp(m.bond + 10, -100, 100); M(g).merit += 8; const n = rng.int(15, 30); g.player.money += n; return `부두의 창고에서 두건 쓴 사내에게 상자를 넘겼다. 사내는 은화 ${n}닢을 내 몫이라며 건넸다. 며칠 뒤 ${TOWERS[c.rival].name}에서 누군가 쫓겨났다는 소문이 돌았다.`; } },
    { label: '못 하겠다고 한다', run: (g) => { M(g).master.bond -= 12; return '"그러냐." 스승은 상자를 도로 가져갔다. 그 뒤로 한동안 내게 아무것도 가르치지 않았다.'; } },
    {
      label: '원로들에게 알린다',
      run: (g, rng, c) => {
        const T = TS(g), mem = M(g);
        const old = mem.master;
        mem.merit += 20; fame(g, 2);
        old.alive = false;
        mem.master = null;
        tlog(g, `스승 ${J(old.name, '을/를')} 고발했다.`);
        return `원로들은 그날 밤 스승의 방을 뒤졌다. ${J(old.name, '은/는')} 탑에서 쫓겨났다. 떠나는 날 나를 한 번도 돌아보지 않았다. 탑 사람들은 나를 정직하다고 했고, 그만큼 나와 말을 섞지 않았다.`;
      },
    },
  ],
});
EVENTS.push({
  id: 'tower_master_death', cooldown: 0, weight: 84,
  cond: (g) => !!M(g)?.master?.alive && g.date.year - (M(g).master.born ?? g.date.year - 50) >= 62 && !flag(g, `tower_md_${M(g).joined}`) && (g.date.month === 2 || g.date.month === 9),
  chance: (g) => Math.min(0.5, (g.date.year - (M(g).master.born ?? 0) - 60) * 0.03),
  title: '스승의 마지막 술식',
  text: (g) => `${J(M(g).master.name, '이/가')} 쓰러졌다는 전갈이 왔다. 방에 들어서자 스승은 침상에 누워 천장에 아주 작은 술식을 긋고 있었다. "이건 아직 아무에게도 안 보여 줬다." 손가락이 멈췄다.`,
  choices: [
    { label: '마지막 술식을 받아 적는다', run: (g, rng) => { const mem = M(g); const m = mem.master; setFlag(g, `tower_md_${mem.joined}`); m.alive = false; gainSkill(g, 'magic', 3, 'int'); mem.merit += 10; chron(g, `${m.circle}서클 마도사 ${m.name}, 세레니아에서 숨을 거두다.`, 70); mem.master = null; return `스승의 손가락이 그리던 선을 이어 그렸다. 술식은 끝내 완성되지 않았다. 그래도 그 반쪽짜리 술식이 내 마력의 흐름을 바꾸었다. 장례 날 탑의 종이 ${m.circle}번 울렸다.`; } },
  ],
});

// ---------- 탑끼리 ----------
EVENTS.push({
  id: 'tower_vote', cooldown: 48, weight: 5,
  chance: () => 0.35,
  cond: (g) => free(g) && here(g) === 'serenia' && (M(g)?.rank ?? 0) >= 1,
  prepare: (g, rng) => ({ rival: rng.pick(Object.keys(TOWERS).filter((t) => t !== M(g).tower)) }),
  title: '원로회의 표',
  text: (g, c) => `협회 원로회가 올해의 마석 배분을 정한다. ${J(TOWERS[c.rival].name, '이/가')} 우리 탑 몫을 깎자는 안을 냈다. 표가 갈린다. 우리 탑 원로가 내게 귓속말을 했다. "${TOWERS[c.rival].name}의 젊은 연구원 하나가 빚이 많다더군."`,
  choices: [
    { label: '빚진 연구원을 찾아가 표를 산다', run: (g, rng, c) => { g.player.money = Math.max(0, g.player.money - 20); M(g).merit += 12; stress(g, 4); return `연구원의 빚 문서 일부를 대신 갚아 주었다. 그는 표결 날 기침을 핑계로 자리를 비웠다. 우리 탑의 몫은 지켜졌다.`; } },
    { label: '원로회에서 정면으로 맞선다', run: (g, rng, c) => { if (check(rng, g.player.stats.cha * 0.6 + g.player.stats.int * 0.4 + (L(g).renown ?? 0) / 5, 55)) { M(g).merit += 15; fame(g, 2); return '마석 배분표의 숫자 셋이 틀렸다는 것을 짚었다. 회의장이 조용해졌다. 안은 부결되었다.'; } M(g).merit = Math.max(0, M(g).merit - 5); return '말을 꺼냈다가 원로 하나에게 "견습 시절이 그리운가"라는 말을 들었다. 웃음이 터졌다. 안은 통과되었다.'; } },
    { label: '끼어들지 않는다', run: () => '표결이 끝나고 우리 탑의 몫이 줄었다는 소식을 들었다. 원로가 복도에서 나를 못 본 척 지나갔다.' },
  ],
});

// ---------- 교단과의 갈등 ----------
EVENTS.push({
  id: 'tower_inquisitor', cooldown: 36, weight: 6,
  chance: (g) => TS(g).friction / 150,
  cond: (g) => free(g) && !!M(g) && TS(g).friction >= 45 && ['serenia', 'harfen', 'leocast'].includes(here(g)),
  title: '심문관이 찾는 사람',
  text: () => '흰 망토의 심문관이 탑 앞에 서서 이름 하나를 불렀다. 나와 같은 해에 들어온 견습 마도사였다. 마음 가라앉히기 술식을 시장에서 썼다는 것이다. 그 친구가 지금 내 방 옷장 안에 숨어 있다.',
  choices: [
    { label: '친구를 내어 준다', run: (g) => { M(g).merit += 5; stress(g, 18); TS(g).friction = clamp(TS(g).friction - 4, 0, 100); if (g.faith) g.faith.suspicion = Math.max(0, (g.faith.suspicion ?? 0) - 5); return '옷장 문을 열었다. 친구는 나를 쳐다보지 않았다. 심문관이 그를 데려갔다. 탑 사람들은 그 일을 다시 입에 올리지 않았다. 나도 그랬다.'; } },
    {
      label: '숨겨 준다',
      run: (g, rng) => {
        TS(g).friction = clamp(TS(g).friction + 5, 0, 100);
        if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.sen * 0.5, 45)) return '"그 사람은 지난달 고향으로 갔소." 심문관은 오래 나를 보다가 돌아섰다. 그날 밤 친구를 짐수레에 실어 자유도시로 보냈다.';
        if (g.faith) g.faith.suspicion = Math.min(100, (g.faith.suspicion ?? 0) + 15);
        addNotoriety(g, 5);
        return '심문관은 내 방을 뒤졌다. 옷장 문이 열렸다. 친구와 나란히 끌려 나왔다. 나는 협회 원로의 보증으로 풀려났지만, 친구는 돌아오지 않았다. 내 이름이 심문소 장부에 올랐다.';
      },
    },
    { label: '협회의 이름으로 맞선다', show: (g) => (M(g)?.rank ?? 0) >= 2, run: (g) => { TS(g).friction = clamp(TS(g).friction + 8, 0, 100); fame(g, 3); M(g).merit += 8; return `"마법사의 죄는 협회가 묻소." ${RANKS[M(g).rank]}의 띠를 본 심문관이 이를 갈며 물러났다. 친구는 살았다. 교단과 탑 사이의 골은 그만큼 깊어졌다.`; } },
  ],
});
EVENTS.push({
  id: 'tower_burning', cooldown: 60, weight: 5,
  chance: () => 0.4,
  cond: (g) => free(g) && TS(g).friction >= 60 && (realmOf(here(g)) === 'holy' || here(g) === 'leocast' || here(g) === 'harfen'),
  title: '광장의 장작더미',
  text: () => '광장에 장작더미가 쌓였다. 떠돌이 마법사 하나가 기둥에 묶여 있다. 마을 우물을 정화했을 뿐이라고 외치지만 아무도 듣지 않는다. 심문관이 횃불을 들었다.',
  choices: [
    {
      label: '뛰어들어 줄을 끊는다',
      run: (g, rng) => {
        if (check(rng, playerPower(g), 50)) { addNotoriety(g, 12); fame(g, 4); TS(g).friction = clamp(TS(g).friction + 4, 0, 100); if (g.faith) g.faith.suspicion = Math.min(100, (g.faith.suspicion ?? 0) + 20); chron(g, `${g.player.name}, 화형대에서 마법사 하나를 구해 달아나다.`, 90); return '줄을 끊고 마법사를 끌어냈다. 등 뒤로 고함과 돌멩이가 날아왔다. 골목 셋을 지나서야 숨을 돌렸다. 마법사는 내 손을 잡고 울었다.'; }
        g.player.injuries.push({ name: '경비대 곤봉에 맞은 머리', months: 2 }); jail(g, 6);
        return '줄에 손이 닿기도 전에 경비대가 덮쳤다. 장작더미의 불길을 감옥 창살 사이로 보았다.';
      },
    },
    { label: '기도한다', run: (g) => { stress(g, 10); if (g.faith) g.faith.devotion = Math.min(100, (g.faith.devotion ?? 0) + 2); return '눈을 감고 빌었다. 누구를 위해 비는지 나도 몰랐다. 냄새는 오래 옷에 배어 있었다.'; } },
    { label: '고개를 돌린다', run: (g) => { stress(g, 6); return '골목으로 돌아 나왔다. 등 뒤에서 군중의 환호가 들렸다.'; } },
  ],
});
EVENTS.push({
  id: 'tower_clinic', cooldown: 24, weight: 5,
  cond: (g) => free(g) && M(g)?.tower === 'blue' && ['serenia', 'harfen', 'leocast', 'verden'].includes(here(g)) && TS(g).friction >= 25,
  title: '성당 시약소',
  text: () => '성당 시약소에 돌림병 환자가 넘친다. 사제들은 기도로, 우리는 술식으로 같은 사람을 돌본다. 한 늙은 사제가 내 로브를 보고 얼굴을 찌푸렸다가, 이내 환자 쪽으로 고개를 돌렸다.',
  choices: [
    { label: '사제들과 나란히 일한다', run: (g) => { TS(g).friction = clamp(TS(g).friction - 3, 0, 100); M(g).merit += 6; gainSkill(g, 'magic', 0.6, 'wil'); tire(g, 20); return '사흘 밤을 새웠다. 마지막 날 그 늙은 사제가 물 한 잔을 건넸다. 아무 말도 하지 않았다. 그걸로 충분했다.'; } },
    { label: '탑의 일만 하고 돌아온다', run: () => '술식만 걸고 시약소를 나왔다. 사제들은 따라 나와 고맙다고 하지 않았다.' },
  ],
});

// ---------- 세상의 흐름: 마탑과 교단 사이의 날 ----------
WORLD_TICKS.push((g, rng, say, record) => {
  const T = g.tower;
  if (!T) return;
  const seal = g.seal;
  let target = 30;
  if (seal?.council === 'church') target += 20;
  if (seal?.council === 'unite') target -= 20;
  if (seal?.stance?.church === 'purge') target += 15;
  const rel = g.politics?.rel?.['holy|serenia'];
  if (rel != null && rel < -30) target += 10;
  if ((g.realm?.heroRite ?? 0) >= 80) target += 5;
  const before = T.friction;
  T.friction = clamp(T.friction + (target - T.friction) * 0.02 + rng.normal(0, 0.6), 0, 100);
  if (before < 70 && T.friction >= 70) { say('성광교가 세레니아 마탑 하나를 이단의 소굴로 선포했다. 성광국 땅의 마법사들이 짐을 싸고 있다.', true); record('성광교, 마탑을 이단으로 선포'); tlog(g, '교단이 마탑 하나를 이단으로 선포했다.'); }
  if (before >= 40 && T.friction < 40 && rng.chance(0.5)) { say('교황청과 마도사 협회가 오랜만에 사절을 주고받았다. 성당 시약소에 다시 마법사의 로브가 보인다.'); }
  if (T.friction >= 60 && rng.chance(0.01)) { T.burned += 1; say(rng.pick(['성광국 국경 마을에서 떠돌이 마법사 둘이 화형당했다.', '왕도 광장에서 금지 마법을 썼다는 노파가 불태워졌다. 노파는 약초꾼이었다는 말이 돈다.'])); }
  // 정세 모듈: 날이 서면 성광국과 세레니아 사이도 틀어진다
  if (g.politics?.rel && rel != null) g.politics.rel['holy|serenia'] = clamp(rel + (35 - T.friction) * 0.003, -100, 100);
});

void ITEMS; void forbiddenLv; void magicState;
