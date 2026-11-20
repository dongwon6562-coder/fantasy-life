// 떼와 무리 안팎의 일: 가축 병, 늑대, 소도둑, 이웃 목장과의 물·풀밭 다툼, 떼를 통째로 사려는 가축상,
// 무리를 노린 습격, 철 축제의 말 달리기, 하얀 죽음(혹한).
import { L, defineScene, chron, stress, tired, check } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { HD, flock, withFlock, head, flockValue, herdSkill, hasDog, logHerd, emptyCheck, clamp, here, free, stat, STOCK_IDS, SICK, BANDS, placeName } from './core.js';

const EVS = ['sick', 'wolves', 'rustlers', 'neighbor', 'dealer', 'raid', 'race', 'dzud'];
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const inBand = (g) => !!HD(g).band && HD(g).band.camp === here(g) && !L(g).travel;
const loseSome = (g, ids, frac, min = 1) => {
  const f = flock(g); if (!f) return 0;
  let n = 0;
  for (const id of ids) { const k = Math.min(f[id], Math.max(f[id] ? min : 0, Math.round(f[id] * frac))); f[id] -= k; n += k; }
  HD(g).lost += n; emptyCheck(g);
  return n;
};
const fastest = (g) => HD(g).steeds.filter((h) => h.trained >= 100).sort((a, b) => b.q - a.q)[0] ?? null;

defineScene('herd_event', {
  need: (g, s) => free(g) && EVS.includes(s.ev)
    && (!['sick', 'wolves', 'rustlers', 'neighbor', 'dealer'].includes(s.ev) || withFlock(g))
    && (s.ev !== 'sick' || !!flock(g).sick)
    && (s.ev !== 'wolves' || flock(g).sheep >= 1)
    && (s.ev !== 'rustlers' || flock(g).cattle + flock(g).horses >= 1)
    && (s.ev !== 'neighbor' || !!HD(g).neighbor)
    && (s.ev !== 'dealer' || head(flock(g)) >= 5)
    && (!['raid', 'race', 'dzud'].includes(s.ev) || inBand(g)),
  title: (g, s) => ({ sick: '병든 떼', wolves: '늑대', rustlers: '소도둑', neighbor: '이웃 목장', dealer: '가축상', raid: '말발굽 소리', race: '철 축제', dzud: '하얀 죽음' }[s.ev]),
  text: (g, s) => {
    const f = flock(g), st = HD(g), b = st.band ? BANDS[st.band.id] : null;
    switch (s.ev) {
      case 'sick': return `${SICK[f.sick.kind].text} ${J(SICK[f.sick.kind].name, '이/가')} 떼에 돌기 시작했다.`;
      case 'wolves': return `새벽에 울타리 한쪽이 무너져 있다. 양 몇 마리가 목이 뜯긴 채 쓰러져 있다. 발자국을 보니 늑대 여럿이다. 오늘 밤 다시 올 것이다.${hasDog(g) ? ' 개가 밤새 짖다 목이 쉬었다.' : ''}`;
      case 'rustlers': return `낯선 말 탄 사내 넷이 사흘째 언덕 위에서 내 떼를 내려다본다. 장터에서 들은 말로는 요즘 ${placeName(here(g))} 둘레에서 소가 자꾸 없어진다고 한다.`;
      case 'neighbor': { const n = st.neighbor; return `${J(n.name, '이/가')} 일꾼들을 데리고 왔다. "그 개울은 우리 할아버지 때부터 우리 소가 마시던 물이오. 당신 양들이 다 흐려 놓았소."${n.grudge >= 40 ? ' 일꾼들 손에 몽둥이가 들려 있다.' : ''}`; }
      case 'dealer': return `왕도에서 온 가축상이 울타리에 팔을 걸쳤다. "떼를 통째로 넘기시오. 은화 ${Math.round(flockValue(g) * 1.05)}닢. 장터 값보다 낫소." 그의 눈이 말 쪽을 오래 본다.`;
      case 'raid': return `한밤중에 땅이 울렸다. 이웃 무리의 젊은이들이 ${b.name}의 말 떼를 노리고 들이닥쳤다. 천막마다 사람들이 칼과 올가미를 들고 뛰어나온다.`;
      case 'race': return `철이 바뀌는 축제다. ${b.name}과 이웃 무리들이 모여 들판 끝 깃대까지 말을 달린다. 이긴 사람은 한 해 동안 이름이 노래로 불린다.`;
      case 'dzud': return '사흘째 눈보라가 그치지 않는다. 눈 밑의 풀이 얼어붙어 짐승들이 뜯지 못한다. 늙은이들이 "하얀 죽음"이라고 수군거린다.';
      default: return '';
    }
  },
  choices: (g, s) => {
    const m = g.player.money, f = flock(g);
    switch (s.ev) {
      case 'sick': return [{ label: '병든 놈을 따로 떼어 돌본다', key: 'isolate' }, ...(m >= 15 ? [{ label: '짐승 의원을 부른다 (은화 15닢)', key: 'doctor' }] : []), { label: '병든 놈을 잡아 태운다', key: 'cull' }, { label: '저절로 낫기를 기다린다', key: 'wait' }];
      case 'wolves': return [{ label: '밤새 횃불을 들고 지킨다', key: 'watch' }, { label: '덫을 놓는다', key: 'trap' }, ...(m >= 10 ? [{ label: '사냥꾼을 산다 (은화 10닢)', key: 'hunter' }] : []), { label: '양을 우리에 가두고 문을 잠근다', key: 'pen' }];
      case 'rustlers': return [{ label: '고장 경비대에 알린다', key: 'watch' }, { label: '이웃들과 밤을 지킨다', key: 'guard' }, { label: '언덕으로 올라가 따진다', key: 'face' }, { label: '낙인을 새로 지지고 지켜본다', key: 'brand' }];
      case 'neighbor': return [{ label: '물길을 나눠 쓰자고 한다', key: 'share' }, ...(m >= 20 ? [{ label: '은화 20닢을 주고 물을 산다', key: 'buy' }] : []), { label: '물러서지 않는다', key: 'stand' }, { label: '양을 다른 풀밭으로 옮긴다', key: 'move' }];
      case 'dealer': return [{ label: '떼를 통째로 넘긴다', key: 'sell' }, ...(f.horses >= 1 ? [{ label: '말만 따로 흥정한다', key: 'horses' }] : []), { label: '돌려보낸다', key: 'no' }];
      case 'raid': return [{ label: '칼을 들고 맞선다', key: 'fight' }, { label: '말을 타고 쫓아가 되찾는다', key: 'chase' }, { label: '내 천막과 짐승만 지킨다', key: 'mine' }];
      case 'race': { const h = fastest(g); return [...(h ? [{ label: `${J(h.name, '을/를')} 타고 나간다`, key: 'steed' }] : []), { label: '무리의 말을 빌려 타고 나간다', key: 'ride' }, { label: '구경하며 마유주를 마신다', key: 'watch' }]; }
      case 'dzud': return [{ label: '쌓아 둔 꼴을 무리와 나눈다', key: 'share' }, { label: '내 짐승부터 살린다', key: 'mine' }, { label: '남쪽 골짜기로 떼를 몰고 간다', key: 'south' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const st = HD(g), f = st.flock, b = st.band ? BANDS[st.band.id] : null;
    switch (s.ev) {
      case 'sick': {
        if (!f?.sick) return '병은 이미 지나갔다.';
        const k = SICK[f.sick.kind];
        if (key === 'doctor') { pay(g, 15); if (rng.chance(0.75)) { f.sick = null; return '짐승 의원이 쓴 약물을 짐승마다 코에 부었다. 이레 만에 기침이 멎었다.'; } return '짐승 의원은 고개를 젓고 돈만 받아 갔다. "이건 바람이 가져가야 끝나오."'; }
        if (key === 'isolate') { tired(g, 10); if (check(rng, herdSkill(g) + stat(g, 'sen') * 0.3, 40)) { f.sick.left = 1; return '병든 놈들을 골라 따로 우리를 쳤다. 성한 놈들까지 번지지는 않았다.'; } return '골라낸다고 골라냈지만 이미 번져 있었다.'; }
        if (key === 'cull') { const n = loseSome(g, k.hits, 0.12); if (st.flock) st.flock.sick = null; deed(g, 'honest', 1, null); return `병든 짐승 ${n}마리를 잡아 구덩이에 넣고 태웠다. 연기가 사흘 갔다. 대신 병은 거기서 끝났다.`; }
        return `기다렸다. ${J(k.name, '이/가')} 제 갈 길을 갈 때까지 아침마다 쓰러진 짐승을 셌다.`;
      }
      case 'wolves': {
        if (!f) return '떼는 이미 없다.';
        if (key === 'watch') { tired(g, 16); if (check(rng, playerPower(g) * 0.4 + stat(g, 'wil') * 0.3 + (hasDog(g) ? 15 : 0), 35)) { deed(g, 'brave', 1, null); return '밤새 횃불을 들고 울타리를 돌았다. 새벽녘 늑대 한 마리가 다가왔다가 불빛에 꼬리를 말고 달아났다.'; } const n = loseSome(g, ['sheep'], 0.1); return `졸음을 이기지 못한 사이 늑대가 다녀갔다. 양 ${n}마리.`; }
        if (key === 'trap') { if (check(rng, herdSkill(g) + stat(g, 'sen') * 0.3, 40)) return '사흘째 아침 덫에 큰 놈 하나가 걸려 있었다. 그 뒤로 무리는 오지 않았다.'; const n = loseSome(g, ['sheep'], 0.08); return `덫은 비어 있고 양 ${n}마리가 또 없어졌다. 늑대들이 덫 냄새를 아는 것 같다.`; }
        if (key === 'hunter') { pay(g, 10); return '늙은 사냥꾼이 석궁을 메고 왔다. 이틀 뒤 늑대 가죽 셋을 울타리에 걸어 놓고 갔다.'; }
        const n = loseSome(g, ['sheep'], 0.04, 0); f.health = clamp(f.health - 5, 0, 100); return `양들을 우리에 가두고 문을 잠갔다. 풀을 못 뜯어 살이 빠졌다.${n ? ` 그래도 ${n}마리는 지키지 못했다.` : ''}`;
      }
      case 'rustlers': {
        if (!f) return '떼는 이미 없다.';
        if (key === 'watch') { if (rng.chance(0.5)) return '경비대가 언덕 위 사내들을 데려갔다. 나흘 뒤 풀려났다는 말이 들렸지만 다시 오지는 않았다.'; const n = loseSome(g, ['cattle', 'horses'], 0.2); return `경비대는 "증거가 없다"며 돌아갔다. 사흘 뒤 밤, 소와 말 ${n}마리가 사라졌다.`; }
        if (key === 'guard') { tired(g, 14); if (check(rng, playerPower(g) * 0.4 + stat(g, 'cha') * 0.2, 40)) { deed(g, 'brave', 2, '이웃들과 소도둑을 막아냈다더라.'); return '이웃 목장 사내들과 돌아가며 밤을 지켰다. 사흘째 밤 횃불 아래서 도둑 둘을 붙잡아 경비대에 넘겼다.'; } const n = loseSome(g, ['cattle', 'horses'], 0.15); return `밤을 지켰지만 도둑들은 한 수 위였다. 소와 말 ${n}마리.`; }
        if (key === 'face') { if (check(rng, playerPower(g) * 0.5, 45)) return '언덕에 올라가 칼자루에 손을 얹고 물었다. "내 떼에 볼일 있소?" 그들은 한참 웃더니 말머리를 돌렸다.'; g.player.injuries.push({ name: '소도둑 곤봉에 맞은 갈비뼈', months: 2 }); const n = loseSome(g, ['cattle', 'horses'], 0.25); return `넷을 상대로 따지는 건 어리석었다. 갈비뼈가 나가고, 그날 밤 소와 말 ${n}마리가 사라졌다.`; }
        if (rng.chance(0.6)) return '엉덩이마다 낙인을 새로 깊게 지졌다. 장터에서 내 낙인을 아는 사람이 늘었다. 훔쳐 가도 팔 데가 없다.';
        const n = loseSome(g, ['cattle', 'horses'], 0.1); return `낙인을 새로 지졌지만 도둑들은 낙인째 가져갔다. ${n}마리.`;
      }
      case 'neighbor': {
        const n = st.neighbor;
        if (!n || !f) return '이웃은 이미 돌아갔다.';
        if (key === 'share') { if (check(rng, stat(g, 'cha') + (st.neighbor.grudge < 30 ? 15 : 0), 45)) { n.grudge = clamp(n.grudge - 20, 0, 100); return `아침엔 우리 양, 저녁엔 그쪽 소가 마시기로 했다. ${J(n.name, '이/가')} 마지못해 손을 내밀었다.`; } n.grudge = clamp(n.grudge + 10, 0, 100); return `${J(n.name, '은/는')} 들은 척도 안 했다. "할아버지 때부터라니까."`; }
        if (key === 'buy') { pay(g, 20); n.grudge = clamp(n.grudge - 30, 0, 100); return '은화 20닢을 건넸다. 개울 위쪽 반은 이제 내 양들이 마신다.'; }
        if (key === 'move') { f.health = clamp(f.health - 6, 0, 100); n.grudge = clamp(n.grudge - 10, 0, 100); return '양 떼를 먼 풀밭으로 옮겼다. 물을 길어 나르느라 일이 곱이 되었다.'; }
        n.grudge = clamp(n.grudge + 20, 0, 100);
        if (n.grudge >= 50 && check(rng, playerPower(g) * 0.5, 45)) { deed(g, 'brave', 2, null); return `몽둥이가 오가고, ${J(n.name, '이/가')} 일꾼들과 물러났다. 개울은 지켰지만 이웃 하나를 원수로 얻었다.`; }
        if (n.grudge >= 50) { reportCrime(g, 'assault'); g.player.injuries.push({ name: '이웃 일꾼의 몽둥이에 맞은 머리', months: 1 }); return '주먹이 오가다 피를 봤다. 경비대가 와서 둘 다 장부에 적었다. 개울은 아직 누구의 것도 아니다.'; }
        return `개울가에 버티고 섰다. ${J(n.name, '이/가')} 침을 뱉고 돌아갔다. 끝난 일이 아니다.`;
      }
      case 'dealer': {
        if (!f) return '팔 떼가 없다.';
        if (key === 'sell') { const got = Math.round(flockValue(g) * 1.05); g.player.money += got; st.sold += head(f); st.past.unshift({ year: g.date.year, how: `떼를 가축상에게 은화 ${got}닢에 넘겼다` }); if (st.past.length > 6) st.past.length = 6; st.flock = null; logHerd(g, `떼를 가축상에게 은화 ${got}닢에 넘겼다.`); return `가축상이 은화 자루를 셋 내려놓았다. 은화 ${got}닢. 그의 몰이꾼들이 떼를 몰고 언덕을 넘어갔다.`; }
        if (key === 'horses') { const got = Math.round(f.horses * 45 * (st.prices.horses ?? 1) * 1.15); st.sold += f.horses; f.horses = 0; g.player.money += got; emptyCheck(g); return `말만 따로 흥정했다. 은화 ${got}닢. 가축상이 혀를 찼다. "말 볼 줄 아는 사람이로군."`; }
        return '가축상은 어깨를 으쓱하고 다음 목장으로 갔다.';
      }
      case 'raid': {
        if (!b) return '무리는 이미 떠났다.';
        if (key === 'fight') { tired(g, 14); if (check(rng, playerPower(g) * 0.6, 40)) { st.band.standing = clamp(st.band.standing + 10, 0, 100); deed(g, 'brave', 3, `${b.name}의 말 떼를 지켜냈다더라.`); return '어둠 속에서 칼을 휘둘렀다. 습격꾼 하나를 말에서 끌어내리자 나머지가 흩어졌다. 족장이 아침에 내 천막을 찾아왔다.'; } g.player.injuries.push({ name: '습격꾼 올가미에 쓸린 목', months: 1 }); st.band.standing = clamp(st.band.standing + 3, 0, 100); return '맞서다 올가미에 걸려 끌려갔다. 무리 사람들이 쫓아와 풀어 주었다. 말 몇 필을 잃었다.'; }
        if (key === 'chase') { tired(g, 18); if (check(rng, herdSkill(g) * 0.5 + stat(g, 'agi') * 0.4 + (fastest(g) ? 15 : 0), 45)) { st.band.standing = clamp(st.band.standing + 14, 0, 100); return '새벽까지 쫓아가 골짜기 어귀에서 말 떼를 되찾았다. 돌아오는 길에 무리 젊은이들이 나를 둘러싸고 노래를 불렀다.'; } return '밤새 쫓았지만 발자국은 강가에서 끊겼다. 빈손으로 돌아오자 늙은이들이 고개를 저었다.'; }
        st.band.standing = clamp(st.band.standing - 8, 0, 100);
        return '내 천막 앞에서 내 짐승만 지켰다. 무사했다. 다음 날 아무도 내게 말을 걸지 않았다.';
      }
      case 'race': {
        if (!b) return '축제는 끝났다.';
        if (key === 'watch') { stress(g, -6); return '언덕에 앉아 마유주를 마시며 구경했다. 흙먼지 속에서 말들이 깃대를 돌아올 때 모두 함께 소리를 질렀다.'; }
        const h = key === 'steed' ? fastest(g) : null;
        const ok = check(rng, (h ? h.q : 35) + herdSkill(g) * 0.3 + stat(g, 'agi') * 0.3, 65);
        tired(g, 10);
        if (ok) { st.band.standing = clamp(st.band.standing + 12, 0, 100); if (h) h.fame += 1; g.player.money += 15; L(g).renown = (L(g).renown ?? 0) + 1; chron(g, `${g.player.name}, ${b.name}의 철 축제 말 달리기에서 이기다.`, 30); return `깃대를 돌아 들판을 가로질렀다. 뒤에서 말발굽 소리가 멀어졌다. 결승 돌무덤에 닿자 ${b.name} 사람들이 모자를 하늘로 던졌다.${h ? ` ${J(h.name, '이/가')} 노래에 들어갔다.` : ''}`; }
        st.band.standing = clamp(st.band.standing + 3, 0, 100);
        return '중간까지는 앞섰다. 깃대를 돌다 말이 미끄러졌다. 넷째로 들어왔지만 넘어지지 않은 것만으로 박수를 받았다.';
      }
      case 'dzud': {
        if (!b) return '무리는 이미 떠났다.';
        if (key === 'share') { if (f) f.fodder = 0; st.band.standing = clamp(st.band.standing + 15, 0, 100); deed(g, 'generous', 4, `하얀 죽음 때 ${b.name}에 꼴을 나눴다더라.`); if (f) loseSome(g, STOCK_IDS, 0.08, 0); return '내 볏가리를 헐어 천막마다 나눴다. 내 짐승도 몇 마리 잃었지만, 봄에 무리 사람들이 새끼 양을 하나씩 들고 내 천막을 찾아왔다.'; }
        if (key === 'south') { tired(g, 16); if (check(rng, herdSkill(g) + stat(g, 'wil') * 0.3, 50)) { st.band.standing = clamp(st.band.standing + 8, 0, 100); return '눈보라를 뚫고 남쪽 골짜기까지 떼를 몰았다. 바위 그늘 밑에 마른 풀이 남아 있었다. 무리의 절반이 내 뒤를 따라왔다.'; } if (f) loseSome(g, STOCK_IDS, 0.2); g.player.injuries.push({ name: '눈보라에 언 발가락', months: 2 }); return '골짜기에 닿기 전에 눈이 길을 지웠다. 짐승 여럿이 눈 속에 쓰러졌고, 내 발가락도 감각이 없다.'; }
        st.band.standing = clamp(st.band.standing - 10, 0, 100);
        if (f) loseSome(g, STOCK_IDS, 0.05, 0);
        return '내 볏가리 둘레에 줄을 쳤다. 내 짐승은 거의 살았다. 이웃 천막에서 짐승 우는 소리가 사흘 밤 이어졌다.';
      }
      default: return '지나갔다.';
    }
  },
});
