// 농가 안팎의 일: 윗마을이 막은 물길, 옮겨진 경계석, 밭에 번진 깜부기, 품삯을 올려 달라는 품꾼들,
// 소작료를 못 내는 소작인, 땅을 통째로 사겠다는 부농, 곳간 도둑, 영주의 곡식 징발.
import { defineScene, chron, stress, tired, check } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { FM, farm, atFarm, barnTotal, myFields, clamp, here, free, stat, farmSkill, placeName, CROPS, CROP_IDS, fieldPrice, neighborName, emptyCheck, logFarm } from './core.js';

const EVS = ['water', 'boundary', 'blight', 'hands', 'tenant', 'buyer', 'thief', 'levy'];
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const growing = (f) => myFields(f).filter((x) => !!x.crop);
const takeBarn = (f, frac) => { let n = 0; for (const id of Object.keys(f.barn)) { const k = Math.round(f.barn[id] * frac); f.barn[id] -= k; n += k; if (f.barn[id] <= 0) delete f.barn[id]; } return n; };
const neighbor = (g, rng) => (FM(g).neighbor ??= { name: neighborName(rng), grudge: 20 });
const nb = (g) => FM(g).neighbor?.name ?? '윗마을 지주';
const grudge = (g, n) => { const x = FM(g).neighbor; if (x) x.grudge = clamp(x.grudge + n, 0, 100); };

defineScene('farm_event', {
  need: (g, s) => free(g) && EVS.includes(s.ev) && atFarm(g)
    && (s.ev !== 'blight' || growing(farm(g)).length > 0)
    && (s.ev !== 'hands' || farm(g).hands >= 2)
    && (s.ev !== 'tenant' || farm(g).fields.some((x) => x.tenant))
    && (s.ev !== 'buyer' || farm(g).fields.length >= 3)
    && (!['thief', 'levy'].includes(s.ev) || barnTotal(farm(g)) >= 10),
  title: (g, s) => ({ water: '막힌 물길', boundary: '옮겨진 경계석', blight: '깜부기', hands: '품꾼들', tenant: '소작인', buyer: '땅을 사겠다는 사람', thief: '곳간 도둑', levy: '영주의 징발' }[s.ev]),
  text: (g, s) => {
    const f = farm(g), r = ownRng0(g);
    switch (s.ev) {
      case 'water': { neighbor(g, r); return `아침에 보니 도랑이 말라 있다. 위쪽에서 ${J(nb(g), '이/가')} 개울에 둑을 쌓아 물을 자기 밭으로 돌렸다. 이대로면 내 밭은 한 달 안에 갈라진다.`; }
      case 'boundary': { neighbor(g, r); return `밭 귀퉁이 경계석이 세 걸음쯤 내 쪽으로 들어와 있다. 밤사이 누가 옮긴 것이다. 그쪽 밭 주인 ${J(nb(g), '은/는')} 할아버지 때부터 그 자리였다고 우길 것이다.`; }
      case 'blight': return `${CROPS[growing(f)[0].crop].name} 이삭에 검은 가루가 피었다. 깜부기다. 아직 한쪽 귀퉁이뿐이지만, 바람이 불면 번진다.`;
      case 'hands': return `품꾼 ${f.hands}명이 밭머리에 모여 섰다. 맏이가 모자를 벗고 말했다. "읍내 방앗간은 하루에 동전 둘을 더 줍니다. 저희도 먹고살아야지요." 거둘 철이 코앞이다.`;
      case 'tenant': { const t = f.fields.find((x) => x.tenant).tenant; return `${J(t, '이/가')} 문 앞에 와서 땅바닥만 본다. "올해 몫을 다 못 바치겠습니다. 아이가 아파서 약값으로…" 그의 밭은 잘 갈려 있다. 게으른 사람은 아니다.`; }
      case 'buyer': return `읍내 부농의 마름이 찾아왔다. "${J(f.name, '을/를')} 통째로 넘기시오. 밭 한 뙈기에 은화 ${Math.round(fieldPrice(f.place) * 1.3)}닢 쳐 드리겠소." 그는 내 땅을 둘러보며 벌써 어디에 창고를 지을지 재고 있다.`;
      case 'thief': return `곳간 문 빗장이 부러져 있다. 자루 몇이 비었고, 흘린 낟알이 숲 쪽으로 이어진다. 발자국이 작다. 아이 아니면 굶주린 사람이다.`;
      case 'levy': return `영주의 집사가 병사 넷을 데리고 왔다. "전쟁 준비요. 곳간의 삼분의 일을 성으로 보내시오. 값은 나중에 치른다 하셨소." 나중이 언제인지 아무도 모른다.`;
      default: return '';
    }
  },
  choices: (g, s) => {
    switch (s.ev) {
      case 'water': return [{ label: '찾아가 물을 나눠 쓰자고 한다', key: 'share' }, { label: '밤에 가서 둑을 허문다', key: 'break' }, { label: '읍장에게 물길 송사를 건다', key: 'law' }, { label: '내 밭에 우물을 판다 (은화 30닢)', key: 'well' }];
      case 'boundary': return [{ label: '돌을 제자리에 도로 박는다', key: 'back' }, { label: '마을 노인들을 불러 경계를 세운다', key: 'elders' }, { label: '세 걸음쯤은 내준다', key: 'give' }];
      case 'blight': return [{ label: '병든 이삭을 다 베어 태운다', key: 'burn' }, { label: '재와 석회를 뿌려 본다', key: 'ash' }, { label: '하늘에 맡긴다', key: 'wait' }];
      case 'hands': return [{ label: '품삯을 올려 준다', key: 'raise' }, { label: '거두고 나면 잔치를 약속한다', key: 'feast' }, { label: '싫으면 나가라고 한다', key: 'refuse' }];
      case 'tenant': return [{ label: '올해 몫은 받지 않는다', key: 'forgive' }, { label: '내년에 두 배로 받기로 한다', key: 'later' }, { label: '밭을 거둬들인다', key: 'evict' }];
      case 'buyer': return [{ label: '판다', key: 'sell' }, { label: '대대로 이어 온 땅이라고 거절한다', key: 'refuse' }, { label: '값을 더 부른다', key: 'haggle' }];
      case 'thief': return [{ label: '발자국을 따라간다', key: 'track' }, { label: '빗장을 고치고 개를 들인다', key: 'lock' }, { label: '곳간 문 앞에 보리 한 자루를 놓아 둔다', key: 'leave' }];
      case 'levy': return [{ label: '바친다', key: 'give' }, { label: '흉년이라 못 바친다고 버틴다', key: 'plead' }, { label: '곡식을 숲에 숨겨 두었다고 하고 반만 내놓는다', key: 'hide' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const st = FM(g), f = farm(g);
    switch (s.ev) {
      case 'water': {
        if (key === 'share') { if (check(rng, stat(g, 'cha'), 40 + (st.neighbor?.grudge ?? 20) / 3)) { grudge(g, -15); return `${J(nb(g), '은/는')} 한참 투덜대다가 둑 한쪽을 터 주었다. 사흘은 그쪽, 나흘은 이쪽. 물은 다시 흘렀다.`; } f.water = clamp(f.water - 15, 0, 100); grudge(g, 5); return '문전박대를 당했다. 물은 여전히 저쪽으로 간다.'; }
        if (key === 'break') { tired(g, 8); reportCrime(g, 'burglary', here(g), { mult: 0.3 }); grudge(g, 25); f.water = clamp(f.water + 5, 0, 100); deed(g, 'brave', 1, '물길을 막은 둑을 허물었다'); return `달 없는 밤에 삽 한 자루로 둑을 허물었다. 아침에 물이 내 도랑으로 돌아왔다. ${J(nb(g), '은/는')} 누가 그랬는지 안다. 이 일은 끝나지 않을 것이다.`; }
        if (key === 'law') { const p = pay(g, 8); if (check(rng, stat(g, 'int') + farmSkill(g) * 0.2, 45)) { grudge(g, 10); f.water = clamp(f.water + 10, 0, 100); return `송사 비용 은화 ${p}닢. 읍장이 옛 물길 장부를 꺼내 보더니 둑을 허물라고 했다. ${J(nb(g), '은/는')} 나를 오래 노려보았다.`; } f.water = clamp(f.water - 10, 0, 100); return `송사 비용 은화 ${p}닢. 읍장은 ${J(nb(g), '과/와')} 술친구였다. 판결은 듣지 않아도 알 수 있었다.`; }
        if (pay(g, 30) < 30) { f.water = clamp(f.water - 15, 0, 100); return '우물 팔 돈이 모자랐다. 물 없는 한 달을 버텼다.'; }
        f.water = clamp(f.water + 15, 0, 100); tired(g, 10); return '품꾼들과 열흘을 팠다. 일곱 길 아래에서 물이 비쳤다. 이제 개울이 어디로 흐르든 상관없다.';
      }
      case 'boundary': {
        if (key === 'back') { grudge(g, 15); tired(g, 4); return `돌을 뽑아 원래 자리에 도로 박았다. 다음 날 아침 ${J(nb(g), '이/가')} 밭머리에 와서 오래 서 있다 갔다.`; }
        if (key === 'elders') { if (check(rng, stat(g, 'cha') + (g.player.skills?.letters ?? 0) * 0.2, 40)) { grudge(g, -5); deed(g, 'honest', 1, '경계 다툼을 마을 어른들에게 맡겼다'); return '노인 셋이 지팡이로 땅을 재더니 옛 돌자리를 찾아냈다. 내 말이 맞았다. 마을 앞에서 정해진 일이라 아무도 다시 꺼내지 못한다.'; } return '노인들은 서로 말이 달랐다. 결국 반씩 나눴다. 그래도 싸움은 피했다.'; }
        grudge(g, -10); deed(g, 'kind', 1, '경계 다툼에서 한발 물러섰다'); return '세 걸음쯤은 내주었다. 땅은 줄었지만 밤에 경계석을 지킬 일은 없어졌다.';
      }
      case 'blight': {
        const gr = growing(f);
        if (key === 'burn') { const x = gr[0]; x.care = Math.max(0, x.care - 2); tired(g, 8); return `병든 이삭을 낫으로 베어 밭머리에서 태웠다. 연기가 검었다. 그 밭 소출은 줄겠지만 다른 밭은 지켰다.`; }
        if (key === 'ash') { if (check(rng, farmSkill(g), 45)) return `재와 석회를 뿌렸다. 늙은 농부들이 하던 대로. 번지던 것이 멈췄다.`; for (const x of gr) x.care = Math.max(0, x.care - 1); return '재를 뿌렸지만 검은 가루는 바람을 타고 옆 밭으로 넘어갔다.'; }
        for (const x of gr) { x.care = Math.max(0, x.care - 2); x.soil = clamp(x.soil - 5, 5, 100); } stress(g, 6); return `비가 씻어 주기를 바랐다. 비는 오지 않았다. 깜부기가 밭 ${gr.length}뙈기에 번졌다.`;
      }
      case 'hands': {
        if (key === 'raise') { const p = pay(g, f.hands * 2); deed(g, 'generous', 1, '품꾼들 품삯을 올려 주었다'); return `품꾼마다 동전 둘씩을 더 쥐여 주었다(은화 ${p}닢). 그해 가을 그들은 해가 진 뒤에도 낫을 놓지 않았다.`; }
        if (key === 'feast') { if (check(rng, stat(g, 'cha'), 40)) return '거두고 나면 돼지 한 마리를 잡겠다고 했다. 맏이가 웃으며 모자를 다시 썼다.'; f.hands = Math.max(0, f.hands - 1); return '잔치로는 배가 부르지 않는다며 하나가 떠났다.'; }
        const n = Math.ceil(f.hands / 2); f.hands -= n; deed(g, 'kind', -1, '품꾼들을 내쳤다'); return `품꾼 ${n}명이 그 자리에서 낫을 내려놓고 떠났다. 거둘 철에 손이 모자라게 생겼다.`;
      }
      case 'tenant': {
        const x = f.fields.find((y) => y.tenant); if (!x) return '소작인은 이미 떠났다.';
        if (key === 'forgive') { deed(g, 'kind', 2, '소작인의 몫을 덜어 주었다'); return `${J(x.tenant, '은/는')} 말없이 몇 번이고 고개를 숙였다. 다음 해 봄, 그가 제일 먼저 내 밭 둑을 고치러 왔다.`; }
        if (key === 'later') return `${J(x.tenant, '이/가')} 고개를 끄덕였다. 두 배를 바칠 수 있을지는 그도 나도 모른다.`;
        const t = x.tenant; x.tenant = null; deed(g, 'kind', -2, '앓는 아이가 있는 소작인을 내쫓았다');
        return `${t}의 식구들이 수레에 짐을 싣고 떠났다. 마을 사람들이 문틈으로 보았다. 그 밭은 이제 내 손으로 지어야 한다.`;
      }
      case 'buyer': {
        const per = Math.round(fieldPrice(f.place) * (key === 'haggle' ? 1.5 : 1.3));
        if (key === 'refuse') { deed(g, 'loyal', 1, '대대로 이어 온 땅을 팔지 않았다'); return `"이 땅에서 ${f.gens > 1 ? `${f.gens}대째` : '내가 처음'} 밭을 갑니다. 팔 물건이 아니오." 마름은 어깨를 으쓱하고 돌아갔다.`; }
        if (key === 'haggle' && !check(rng, stat(g, 'cha') + (g.player.skills?.trade ?? 0) * 0.3, 50)) return '값을 더 부르자 마름은 웃으며 모자를 썼다. "그럼 없던 일로 하지요."';
        const owned = f.fields.filter((x) => !x.leased && !x.crop);
        if (!owned.length) return '지금은 밭마다 곡식이 서 있어 넘길 수가 없었다. 마름은 가을에 다시 오겠다고 했다.';
        const m = owned.length * per; g.player.money += m;
        f.fields = f.fields.filter((x) => !owned.includes(x));
        logFarm(g, `밭 ${owned.length}뙈기를 은화 ${m}닢에 팔았다.`);
        const gone = emptyCheck(g, '부농에게 땅을 팔았다');
        if (gone) chron(g, `${placeName(here(g))}의 ${J(f.name, '이/가')} 읍내 부농의 손에 넘어갔다.`, 15);
        return `빈 밭 ${owned.length}뙈기를 넘기고 은화 ${m}닢을 받았다.${gone ? ' 땅 문서를 건네는 손이 생각보다 무거웠다.' : ''}`;
      }
      case 'thief': {
        if (key === 'track') { tired(g, 6); if (check(rng, stat(g, 'sen') + playerPower(g) * 0.2, 40)) return '숲가 움막에서 아이 둘과 앓는 어미를 찾았다. 자루는 반쯤 비어 있었다. 남은 것을 들고 돌아오다가, 한 자루는 두고 왔다.'; takeBarn(f, 0.1); return '발자국은 개울에서 끊겼다. 곡식은 돌아오지 않았다.'; }
        if (key === 'lock') { pay(g, 5); return '빗장을 쇠로 바꾸고 이웃집 강아지 한 마리를 얻어 왔다. 그 뒤로 밤마다 곳간 앞에서 짖는다.'; }
        takeBarn(f, 0.04); deed(g, 'generous', 2, '곳간 문 앞에 곡식을 놓아 두었다'); return '곳간 문 앞에 보리 한 자루를 놓아 두었다. 다음 날 아침 자루는 없어졌고, 빗장은 멀쩡했다.';
      }
      case 'levy': {
        if (key === 'give') { const n = takeBarn(f, 1 / 3); deed(g, 'loyal', 1, '영주의 징발에 곡식을 바쳤다'); return `곡식 ${n}자루를 수레에 실어 보냈다. 집사가 장부에 무언가를 적었다. 값을 치른다는 말은 다시 하지 않았다.`; }
        if (key === 'plead') { if (check(rng, stat(g, 'cha'), 50)) return '흉년 이야기를 늘어놓자 집사는 귀찮다는 듯 손을 저었다. 다음 집으로 갔다.'; const n = takeBarn(f, 0.45); return `집사는 듣지 않았다. 병사들이 곳간 문을 열고 ${n}자루를 끌어냈다. 버틴 값이었다.`; }
        const n = takeBarn(f, 1 / 6);
        if (check(rng, stat(g, 'cha') + stat(g, 'sen') * 0.3, 45)) return `${n}자루만 내놓았다. 숲에 숨긴 척한 자루들은 사실 곳간 마루 밑에 있었다. 집사는 눈치채지 못했다.`;
        takeBarn(f, 0.3); reportCrime(g, 'fraud', here(g), { mult: 0.5 }); return '병사 하나가 마루를 발로 굴렀다. 속이 빈 소리가 났다. 숨긴 것까지 다 실려 갔고, 이름이 장부에 적혔다.';
      }
      default: return '지나갔다.';
    }
  },
});
// 장면 글에서만 쓰는 고정 난수 (이웃 이름을 처음 정할 때)
const ownRng0 = (g) => ({ pick: (arr) => arr[(g.date.year * 7 + g.date.month) % arr.length] });
