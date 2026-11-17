// 재앙이 내가 사는 고장에 닿았을 때: 우물 다툼, 터지는 둑, 얼어 가는 이웃, 무너진 집, 메뚜기 떼, 항구의 폭풍,
// 그리고 흉년의 곳간. 재앙 하나에 사건은 한 번.
import { EVENTS, check, stress, tire, age } from '../events/core.js';
import { gainSkill, gainStat } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { isJailed, addNotoriety } from '../crime.js';
import { NS, REGIONS, KINDS, activeAt, nlog } from './state.js';

const here = (g) => L(g).place;
const free = (g) => !L(g).travel && !isJailed(g) && !g.over && age(g) >= 10;
const fame = (g, n) => { L(g).renown = Math.max(0, (L(g).renown ?? 0) + n); };
// 지금 이 고장에 벌어진 그 재앙 가운데 아직 내가 겪지 않은 것
const fresh = (g, kind) => activeAt(g, here(g)).find((d) => d.kind === kind && !(NS(g).seen ?? []).includes(d.id));
const mark = (g, d) => { const N = NS(g); (N.seen ??= []).push(d.id); if (N.seen.length > 40) N.seen.splice(0, N.seen.length - 40); };
const regionName = (g, c) => REGIONS[c.region]?.name ?? '이 고장';

function disasterEvent(kind, def) {
  EVENTS.push({
    id: `nature_${kind}`, cooldown: 0, weight: def.weight ?? 70,
    cond: (g) => free(g) && (def.adult ? isAdult(g) : true) && !!fresh(g, kind),
    prepare: (g) => { const d = fresh(g, kind); return { id: d.id, sev: d.sev, region: d.region }; },
    title: def.title,
    text: def.text,
    choices: def.choices.map((ch) => ({
      label: ch.label,
      show: ch.show,
      run: (g, rng, c) => { mark(g, { id: c.id }); return ch.run(g, rng, c); },
    })),
  });
}

disasterEvent('drought', {
  title: '마른 우물',
  text: (g, c) => `${regionName(g, c)}에 석 달째 비가 없다. 마을 우물에 두레박을 내리면 진흙만 올라온다. 오늘 아침 우물가에서 윗마을 사람들과 아랫마을 사람들이 멱살을 잡았다. ${c.sev >= 0.7 ? '누군가 낫을 들고 나왔다.' : '아직은 고함뿐이다.'}`,
  choices: [
    { label: '물을 나누는 순서를 정하자고 나선다', run: (g, rng, c) => { if (check(rng, g.player.stats.cha * 0.6 + g.player.stats.wil * 0.3 + (L(g).renown ?? 0) / 4, 40 + c.sev * 15)) { fame(g, 2); stress(g, -3); return '집마다 하루 두 동이씩, 아이 있는 집은 세 동이. 내가 정한 순서를 사람들이 따랐다. 불만은 많았지만 낫은 내려갔다.'; } stress(g, 8); return '말을 꺼내자 양쪽에서 나를 밀쳐 냈다. "남의 동네 일에 끼지 마." 해 질 녘에야 늙은 이장이 와서 겨우 말렸다.'; } },
    { label: '산기슭에 새 우물을 판다', show: (g) => isAdult(g), run: (g, rng, c) => { tire(g, 25); const s = gainStat(g, 'str', 0.6); if (check(rng, g.player.stats.str * 0.5 + g.player.stats.sen * 0.4, 45 + c.sev * 10)) { fame(g, 3); nlog(g, '가뭄에 새 우물을 팠다.'); return `사흘을 팠다. 열두 자 아래에서 젖은 흙이 나왔고, 그다음 날 물이 고였다. 마을 사람들이 그 우물에 내 이름을 붙이자고 했다.${s > 0.04 ? ` (힘 +${s.toFixed(1)})` : ''}`; } return `사흘을 팠지만 돌뿐이었다. 손바닥이 다 터졌다. 그래도 이웃 둘이 와서 같이 팠다.${s > 0.04 ? ` (힘 +${s.toFixed(1)})` : ''}`; } },
    { label: '우리 집 물항아리를 지킨다', run: (g) => { stress(g, 4); return '문을 걸고 물항아리 뚜껑을 돌로 눌러 두었다. 밤에 누가 문을 두드렸다. 열지 않았다.'; } },
  ],
});

disasterEvent('flood', {
  title: '둑이 운다',
  text: (g, c) => `${regionName(g, c)}에 장마가 그치지 않는다. 한밤중에 종이 울렸다. 강둑 한쪽에서 물이 새기 시작했다. ${NS(g).dike[here(g)] === g.date.year ? '여름 초입에 쌓은 흙 자루가 아직 버티고 있다.' : '올해는 아무도 둑을 손보지 않았다.'} 아랫마을 쪽에서 아이 우는 소리가 들린다.`,
  choices: [
    { label: '흙 자루를 메고 둑으로 달려간다', show: (g) => isAdult(g), run: (g, rng, c) => { tire(g, 30); const ok = check(rng, g.player.stats.str * 0.6 + g.player.stats.wil * 0.4 + (NS(g).dike[here(g)] === g.date.year ? 15 : 0), 45 + c.sev * 15); if (ok) { fame(g, 3); return '빗속에서 밤새 흙 자루를 쌓았다. 새벽에 물이 둑 턱밑에서 멈췄다. 진흙투성이 사람들이 둑 위에 주저앉아 웃었다.'; } g.player.injuries.push({ name: '급류에 쓸려 다친 다리', months: 2 }); return '둑이 터지는 순간 흙 자루와 함께 물에 쓸려 갔다. 버드나무 가지를 붙잡고 겨우 살아났다. 아랫마을 들판이 물에 잠겼다.'; } },
    { label: '아이 우는 쪽으로 간다', run: (g, rng, c) => { if (check(rng, g.player.stats.agi * 0.5 + g.player.stats.str * 0.4, 40 + c.sev * 10)) { fame(g, 4); chron(g, `${J(g.player.name, '이/가')} 홍수에 갇힌 아이를 구하다.`, 60); return '허리까지 차는 물을 헤치고 지붕 위의 아이를 업어 왔다. 아이의 어머니가 내 발밑에 엎드렸다. 그 얼굴을 오래 잊지 못할 것이다.'; } stress(g, 14); return '물살이 너무 셌다. 세 번을 들어갔다가 세 번을 밀려 나왔다. 날이 밝아서야 배를 가진 어부가 아이를 건져 냈다. 살았다. 내가 구한 게 아니었다.'; } },
    { label: '집 안의 것들을 높은 곳으로 옮긴다', run: (g) => { stress(g, 5); return '밤새 곡식 자루와 옷궤를 다락으로 옮겼다. 아침에 물이 문턱까지 찼다가 빠졌다. 우리 집은 무사했다. 창밖으로 떠내려가는 남의 지붕을 보았다.'; } },
  ],
});

disasterEvent('winter', {
  title: '얼어 가는 집',
  adult: true,
  text: (g, c) => `${regionName(g, c)}에 혹한이 들었다. 침을 뱉으면 땅에 닿기 전에 언다. 옆집 굴뚝에 사흘째 연기가 오르지 않는다. 그 집에는 홀로 사는 노파가 있다. ${NS(g).ready === (g.date.month >= 10 ? g.date.year : g.date.year - 1) ? '우리 집 장작더미는 아직 넉넉하다.' : '우리 집 장작도 넉넉하지 않다.'}`,
  choices: [
    { label: '장작을 한 짐 지고 옆집 문을 두드린다', run: (g) => { stress(g, -4); fame(g, 1); const N = NS(g); if (N.ready !== (g.date.month >= 10 ? g.date.year : g.date.year - 1)) g.player.fatigue = Math.min(100, g.player.fatigue + 10); return '노파는 이불을 세 겹 덮고 떨고 있었다. 불을 지피고 죽을 데웠다. 노파가 내 손을 잡고 오래 놓지 않았다. 그 겨울 그 집 굴뚝에서는 연기가 끊이지 않았다.'; } },
    { label: '이장에게 알리고 돌아온다', run: () => '이장에게 알렸다. 이장은 고개를 끄덕였다. 이틀 뒤에야 사람들이 그 집 문을 열었다. 늦지 않았기를 바란다.' },
    { label: '우리 집 불만 지킨다', run: (g) => { stress(g, 6); return '창에 덧문을 대고 불가에 붙어 앉았다. 이 추위에 남 걱정을 할 여유는 없다. 그렇게 생각하기로 했다.'; } },
  ],
});

disasterEvent('quake', {
  title: '땅이 운 날',
  weight: 85,
  text: (g, c) => `발밑에서 큰 짐승이 울부짖는 소리가 났다. 그릇이 선반에서 쏟아지고 벽에 금이 갔다. ${regionName(g, c)} 곳곳에서 지붕이 내려앉았다. 골목 끝 무너진 집 아래에서 누군가 벽을 두드린다.`,
  choices: [
    { label: '맨손으로 돌을 들어낸다', run: (g, rng, c) => { tire(g, 25); if (check(rng, g.player.stats.str * 0.6 + g.player.stats.wil * 0.3, 40 + c.sev * 15)) { fame(g, 4); gainStat(g, 'str', 0.4); return '해가 질 때까지 돌을 들어냈다. 들보 아래에서 대장장이와 그 아들이 기어 나왔다. 대장장이는 말없이 내 손을 쥐었다. 손톱이 다 빠져 있었다.'; } g.player.injuries.push({ name: '무너진 돌에 찧인 손', months: 2 }); return '두 번째 흔들림에 남은 벽마저 내려앉았다. 손을 찧었다. 두드리는 소리는 저녁 무렵 멎었다.'; } },
    { label: '사람들을 빈터로 모은다', run: (g, rng) => { if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.sen * 0.4, 40)) { fame(g, 2); return '"집 안에 들어가지 마시오! 또 흔들립니다!" 사람들을 장터 빈터로 모았다. 그날 밤 두 번째 흔들림에 집 셋이 더 무너졌다. 아무도 그 안에 없었다.'; } stress(g, 6); return '소리를 질렀지만 사람들은 짐을 챙기러 집으로 뛰어 들어갔다. 두 번째 흔들림이 왔다.'; } },
    { label: '내 집부터 살핀다', run: (g) => { stress(g, 4); const h = g.estate?.homes?.[here(g)]; return h ? `기둥 하나가 갈라졌다. 고칠 수 있다. 골목 끝에서 들리던 소리는 어느새 멎어 있었다.` : '세 든 방의 벽이 갈라져 있었다. 짐을 챙겨 나왔다. 골목 끝에서 들리던 소리는 어느새 멎어 있었다.'; } },
  ],
});

disasterEvent('locust', {
  title: '검은 구름',
  text: (g, c) => `${regionName(g, c)}의 남쪽 하늘에서 검은 구름이 내려왔다. 구름이 우는 소리를 냈다. 메뚜기 떼다. 농부들이 솥과 냄비를 두드리며 들판으로 달려간다. ${c.sev >= 0.7 ? '이만한 떼는 노인들도 처음 본다고 한다.' : ''}`,
  choices: [
    { label: '들판 가장자리에 불을 놓는다', run: (g, rng, c) => { const N = NS(g); if (check(rng, g.player.stats.sen * 0.5 + (g.player.skills.farming ?? 0) * 0.4, 40 + c.sev * 10)) { N.crop[c.region] = Math.min(1.4, N.crop[c.region] + 0.05); fame(g, 2); return '바람을 읽고 들판 가장자리에 짚불을 놓았다. 연기가 메뚜기 떼의 길을 틀었다. 마을 들판 셋이 살았다. 이웃 마을은 그러지 못했다.'; } stress(g, 6); return '불을 놓자마자 바람이 바뀌었다. 연기가 우리 쪽으로 왔다. 메뚜기는 연기 속을 뚫고 지나갔다.'; } },
    { label: '메뚜기를 잡아 볶는다', run: (g, rng) => { const k = gainSkill(g, 'cooking', 1.2, 'sen'); const n = rng.int(2, 6); g.player.money += n; return `자루를 들고 나가 메뚜기를 쓸어 담았다. 소금에 볶아 장터에 내놓으니 굶주린 사람들이 줄을 섰다. 은화 ${n}닢. 들판은 못 지켰지만 몇 집 저녁은 지켰다.${k > 0.04 ? ` (요리 +${k.toFixed(1)})` : ''}`; } },
    { label: '사당에 가서 빈다', run: (g) => { stress(g, -2); if (g.faith) g.faith.devotion = Math.min(100, (g.faith.devotion ?? 0) + 2); return '대지의 어머니 사당에 사람들이 가득했다. 같이 엎드렸다. 일어났을 때 들판에는 줄기만 남아 있었다. 그래도 엎드려 있는 동안은 덜 무서웠다.'; } },
  ],
});

disasterEvent('storm', {
  title: '부두의 밤',
  adult: true,
  text: () => '바다에서 큰 바람이 올라왔다. 부두의 배들이 서로 부딪혀 비명을 지른다. 묶어 둔 밧줄 하나가 끊어졌다. 고깃배 한 척이 사람을 태운 채 바다 쪽으로 밀려 나간다.',
  choices: [
    { label: '밧줄을 들고 부두 끝으로 달린다', run: (g, rng, c) => { if (check(rng, g.player.stats.str * 0.5 + g.player.stats.agi * 0.4 + (g.player.skills.sailing ?? 0) * 0.3, 45 + c.sev * 10)) { fame(g, 3); return '세 번째 던진 밧줄이 뱃전에 걸렸다. 부두 사람들이 다 같이 당겼다. 배가 부두에 처박혔지만 사람은 살았다. 그날 밤 선술집에서 내 술값은 아무도 받지 않았다.'; } g.player.injuries.push({ name: '부두 기둥에 부딪힌 어깨', months: 1 }); return '파도가 부두를 덮쳤다. 기둥에 어깨를 부딪히고 나뒹굴었다. 배는 어둠 속으로 사라졌다.'; } },
    { label: '창고의 짐을 지킨다', run: (g, rng) => { const n = rng.int(3, 8); g.player.money += n; return `상인의 창고 문을 밤새 몸으로 막았다. 아침에 상인이 은화 ${n}닢을 쥐여 주었다. 바다 쪽은 보지 않았다.`; } },
  ],
});

/* ---------- 흉년의 곳간 ---------- */
EVENTS.push({
  id: 'nature_granary', cooldown: 30, weight: 6,
  chance: () => 0.45,
  cond: (g) => free(g) && isAdult(g) && !!g.world?.famine && ['ern', 'harfen', 'verden', 'leocast', 'gruental', 'klein'].includes(here(g)),
  title: '잠긴 곳간',
  text: () => '흉년의 늦겨울. 곡물상의 곳간 앞에 사람들이 몰렸다. 곳간 안에 밀이 천장까지 쌓여 있다는 것을 다들 안다. 곡물상은 봄에 값이 더 오를 때까지 열지 않겠다고 한다. 누군가 횃불을 들었다.',
  choices: [
    {
      label: '사람들 앞에 서서 문을 부순다',
      run: (g, rng) => {
        addNotoriety(g, 6); fame(g, 3);
        if (g.realm) g.realm.bread = Math.max(0.6, g.realm.bread - 0.05);
        chron(g, `흉년에 곡물상의 곳간이 털리다. 맨 앞에 선 사람은 ${g.player.name}.`, 70);
        if (rng.chance(0.4)) { g.player.injuries.push({ name: '경비대 창대에 맞은 등', months: 1 }); return '문이 부서지고 사람들이 밀 자루를 메고 흩어졌다. 경비대가 왔을 때 나는 맨 앞에 있었다. 창대에 등을 맞고 골목으로 달아났다. 그날 밤 마을 집집마다 빵 굽는 냄새가 났다.'; }
        return '문이 부서지고 사람들이 밀 자루를 메고 흩어졌다. 곡물상은 2층 창문에서 내 얼굴을 똑똑히 보았다. 그날 밤 마을 집집마다 빵 굽는 냄새가 났다.';
      },
    },
    { label: '곡물상과 값을 흥정한다', run: (g, rng) => { const t = gainSkill(g, 'trade', 1.2, 'cha'); if (check(rng, g.player.stats.cha * 0.5 + (g.player.skills.trade ?? 0) * 0.5, 50)) { fame(g, 2); return `"지금 반값에 풀면, 이 사람들이 봄에 당신 곳간에 불을 지르지 않을 거요." 곡물상은 한참 이를 갈다가 곳간의 반을 열었다.${t > 0.04 ? ` (장사 +${t.toFixed(1)})` : ''}`; } return `곡물상은 내 말을 끝까지 듣지도 않았다. 문이 닫혔다. 등 뒤에서 횃불이 하나 더 켜졌다.${t > 0.04 ? ` (장사 +${t.toFixed(1)})` : ''}`; } },
    { label: '곡물상에게 밀을 사 둔다', show: (g) => g.player.money >= 30, run: (g) => { if (g.player.money < 30) return '주머니를 뒤져 보니 은화가 모자랐다. 곡물상은 뒷문을 닫았다.'; g.player.money -= 30; NS(g).ready = g.date.month >= 10 ? g.date.year : g.date.year - 1; stress(g, 3); note(g, '흉년에 비싼 밀을 사 들였다.'); return '뒷문으로 들어가 은화 서른 닢에 밀 두 자루를 샀다. 평년 값의 세 배다. 이 겨울은 굶지 않는다. 앞문에서는 아직 고함 소리가 들렸다.'; } },
    { label: '자리를 뜬다', run: () => '골목을 돌아 나왔다. 그날 밤 곡물상의 곳간에 불이 났다는 소식을 들었다. 밀은 다 타 버렸다고 한다. 아무도 먹지 못했다.' },
  ],
});

void KINDS;
