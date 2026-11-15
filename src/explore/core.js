// 지도에 없는 땅: 원정대를 꾸려 아무도 지도에 그리지 않은 곳으로 간다.
// - 다섯 땅: 서리 너머, 뿌리 아래 골짜기, 구름 위 고원, 안개 군도, 재의 사막. 땅마다 떠나는 고장이 정해져 있다.
// - 땅마다 작은 유적 둘과 '심장'(가장 깊은 곳의 큰 유적) 하나. 사라진 문명 넷의 흔적이 흩어져 있다.
// - 처음 찾은 사람의 이름이 남는다(firsts). 다른 탐사대도 달마다 나아가니, 먼저 닿은 쪽이 이름을 가져간다.
// - 찾은 것은 짐(pack)에 담아 돌아온다. 팔거나(장터), 학계에 바치거나(서고·마탑), 숨긴다(cache, 대를 이어 남는다).
// 상태는 game.explore 하나.
import { HOOKS } from '../hooks.js';
import { FOES } from '../adventure/combat.js';
import { L, note, chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';

/* ---------- 사라진 문명 ---------- */
export const CIVS = {
  arcana: { name: '고대 아르카나', desc: '별을 읽고 마력을 돌에 새기던 마법 왕국. 용사력 이전에 스스로 무너졌다. 무엇이 그들을 무너뜨렸는지는 아무도 모른다.' },
  stone: { name: '돌의 사람들', desc: '엘프가 숲에 들어오기 전, 숲에 돌로 도시를 세운 사람들. 글자는 남았지만 아무도 읽지 못한다.' },
  tide: { name: '물결 왕국', desc: '서쪽 바다 너머에 있었다는 섬나라. 하룻밤 사이에 바다에 잠겼다고 어부들의 노래에만 남았다.' },
  first: { name: '첫 왕들', desc: '마신이 오기 전, 대륙 북쪽과 동쪽을 다스리던 왕조. 마신 전쟁의 불에 무덤까지 타 버렸다고 여겨졌다.' },
};

/* ---------- 땅 ---------- */
// legs: 가는 데 걸리는 달 수(돌아오는 길은 그 절반). lost: 길을 잃을 기본 확률.
export const REGIONS = {
  frost: {
    name: '서리 너머', from: ['estella'], legs: 5, lost: 0.2, civ: 'first',
    desc: '잊힌 땅 북쪽 끝, 얼음 해협이 얼어붙는 겨울에만 건널 수 있는 흰 벌판. 지도는 에스텔라의 성벽에서 끝난다.',
    sights: ['하늘과 땅의 경계가 사라졌다. 사방이 희다.', '얼음 밑으로 무언가 거대한 그림자가 지나갔다.', '밤하늘에 초록 빛의 띠가 걸렸다. 짐꾼들이 무릎을 꿇고 기도했다.', '바람이 멎자 세상에서 소리가 사라졌다. 내 숨소리만 들린다.'],
    foes: [['frost_wolf', 3, 6], ['ice_wight', 2, 4]],
    hazard: { name: '눈보라', stat: 'wil', dc: 40, text: '사흘 밤낮 눈보라가 불었다.', ok: '천막을 서로 묶고 눈 속에 굴을 파 버텼다. 모두 살아남았다.', bad: '천막 하나가 날아갔다. 발가락 끝이 검게 변했다.' },
    guard: { unit: 'ice_wight', count: 2, leader: 'frost_king' },
    sites: ['frozen_fleet', 'singing_glacier'], heart: 'giant_tomb',
  },
  deepwood: {
    name: '뿌리 아래 골짜기', from: ['silverleaf', 'fur'], legs: 4, lost: 0.28, civ: 'stone',
    desc: '대삼림 한가운데, 엘프도 수인도 들어가지 않는 골짜기. 나무가 너무 높아 한낮에도 해가 들지 않는다.',
    sights: ['나무 밑동 하나를 도는 데 반나절이 걸렸다.', '이끼 밑에서 반듯하게 깎은 돌이 나왔다. 누군가 여기에 길을 냈다.', '사흘째 새소리를 듣지 못했다.', '나뭇가지에 오래된 해골들이 매달려 있다. 엘프의 것도 사람의 것도 아니다.'],
    foes: [['thorn_stalker', 2, 4], ['moss_golem', 1, 3]],
    hazard: { name: '숨 막히는 포자 안개', stat: 'sen', dc: 38, text: '땅에서 노란 안개가 피어올랐다.', ok: '먼저 냄새를 맡고 젖은 천으로 입을 막았다. 안개가 걷힐 때까지 바위 위에서 기다렸다.', bad: '안개를 들이마셨다. 사흘 동안 열에 들떠 헛것을 보았다.' },
    guard: { unit: 'moss_golem', count: 2, leader: 'root_warden' },
    sites: ['moss_city', 'beast_graves'], heart: 'old_root',
  },
  cloud: {
    name: '구름 위 고원', from: ['hammer', 'gorge'], legs: 4, lost: 0.18, civ: 'arcana',
    desc: '천룡 산맥 너머, 구름보다 높은 곳에 펼쳐진 고원. 드워프의 옛 노래에만 나오고, 용족은 그쪽 하늘로 날지 않는다.',
    sights: ['구름이 발밑에 깔렸다. 바다 위를 걷는 것 같다.', '숨이 차서 열 걸음마다 쉬어야 했다.', '바위에 거대한 발톱 자국이 있다. 오래된 것이다. 아마도.', '밤하늘의 별이 손에 닿을 것처럼 가깝다. 별자리 몇 개가 내가 아는 것과 다르다.'],
    foes: [['cloud_harpy', 3, 5], ['young_wyvern', 1, 3]],
    hazard: { name: '산의 병', stat: 'str', dc: 40, text: '머리가 깨질 듯 아프고 숨이 가빠졌다.', ok: '하루를 쉬며 몸을 높이에 길들였다. 다음 날은 걸을 만했다.', bad: '피를 토했다. 짐꾼들이 나를 썰매에 싣고 끌었다.' },
    guard: { unit: 'young_wyvern', count: 2, leader: 'storm_drake' },
    sites: ['dragon_nest', 'frozen_shrine'], heart: 'sky_stair',
  },
  mist: {
    name: '안개 군도', from: ['saltrock', 'klein'], legs: 4, lost: 0.3, civ: 'tide', sea: true,
    desc: '서쪽 바다 너머 늘 안개에 싸인 섬들. 소금바위섬 어부들은 그 안개를 "물에 빠진 자들의 숨"이라 부른다.',
    sights: ['안개 속에서 종소리가 났다. 근처에 섬도 배도 없다.', '물이 이상하게 맑다. 바닥에 돌로 된 길이 보인다.', '갈매기가 한 마리도 없다.', '나침반 바늘이 천천히 돌기 시작했다.'],
    foes: [['reef_crab', 3, 5], ['drowned', 3, 5]],
    hazard: { name: '돌풍', stat: 'agi', dc: 38, text: '맑던 바다에 돌풍이 몰아쳤다.', ok: '돛을 재빨리 내리고 배를 바람에 맡겼다. 하룻밤 떠밀린 끝에 바다가 잠잠해졌다.', bad: '돛대가 부러졌다. 짐의 절반이 바다로 쓸려 갔다.' },
    guard: { unit: 'drowned', count: 3, leader: 'tide_wraith' },
    sites: ['sunken_port', 'turtle_isle'], heart: 'drowned_palace',
  },
  ash: {
    name: '재의 사막', from: ['estella'], legs: 5, lost: 0.22, civ: 'first',
    desc: '잊힌 땅 동쪽 끝, 마신 전쟁의 불에 녹아 버린 땅. 모래 대신 검은 재와 유리 조각이 깔려 있다.',
    sights: ['발밑에서 유리가 바스러졌다. 한때 모래였던 것이다.', '녹아내린 성벽이 촛농처럼 굳어 있다.', '한낮에 하늘이 붉다. 재가 해를 가린다.', '재 속에서 쇠 투구 하나가 나왔다. 안에 아직 머리뼈가 있다.'],
    foes: [['ash_ghoul', 3, 5], ['glass_golem', 1, 3]],
    hazard: { name: '재 폭풍', stat: 'wil', dc: 42, text: '지평선에서 검은 벽이 다가왔다.', ok: '물에 적신 천으로 얼굴을 감싸고 바위 그늘에 엎드렸다. 폭풍이 지나가자 모두 일어났다.', bad: '재가 폐에 들어갔다. 기침이 멈추지 않는다.' },
    guard: { unit: 'ash_ghoul', count: 3, leader: 'cinder_king' },
    sites: ['glass_city', 'iron_river'], heart: 'first_tombs',
  },
};
export const REGION_IDS = Object.keys(REGIONS);
export const regionsFrom = (place) => REGION_IDS.filter((id) => REGIONS[id].from.includes(place));
export const LAUNCH_PLACES = [...new Set(REGION_IDS.flatMap((id) => REGIONS[id].from))];

/* ---------- 유적 ---------- */
// heart: 땅의 가장 깊은 곳. finds: 거기서 나올 수 있는 것들.
export const SITES = {
  frozen_fleet: { name: '얼음에 갇힌 함대', region: 'frost', civ: 'first', finds: ['fleet_banner', 'frost_log'], text: '얼음 벌판 한가운데 돛대 수십 개가 솟아 있다. 바다가 얼 때 함께 얼어 버린 함대다. 갑판 위의 선원들은 노를 쥔 채 그대로 서 있다.' },
  singing_glacier: { name: '노래하는 빙하', region: 'frost', civ: 'arcana', finds: ['star_lens', 'frost_log'], text: '바람이 불 때마다 빙하가 운다. 얼음 속에 구멍 뚫린 돌기둥이 줄지어 박혀 있다. 누군가 바람으로 노래하는 악기를 산만 하게 만들었다.' },
  giant_tomb: { name: '첫 왕의 얼음 무덤', region: 'frost', civ: 'first', heart: true, finds: ['first_crown', 'king_annals', 'fleet_banner'], text: '빙벽을 파고 들어간 무덤. 문에 새긴 글은 북부 왕국들의 것보다 오래되었다. 안쪽 왕좌에 얼음에 싸인 왕이 앉아 있고, 그 발치에 왕을 지키던 자들이 아직 서 있다.' },
  moss_city: { name: '이끼에 묻힌 돌 도시', region: 'deepwood', civ: 'stone', finds: ['stone_tablet', 'stone_idol'], text: '나무뿌리가 휘감은 돌 기둥들. 이끼를 걷어 내자 계단과 광장과 우물이 나왔다. 집집마다 문 위에 같은 눈 모양이 새겨져 있다.' },
  beast_graves: { name: '짐승들의 묘지', region: 'deepwood', civ: 'stone', finds: ['great_bones', 'stone_idol'], text: '집채만 한 뼈들이 골짜기를 메웠다. 짐승들이 죽으러 오는 곳이다. 뼈마다 돌의 사람들이 새긴 표식이 있다. 그들은 이 짐승들을 섬겼다.' },
  old_root: { name: '세계수의 옛 뿌리', region: 'deepwood', civ: 'stone', heart: true, finds: ['root_heart', 'stone_tablet', 'stone_codex'], text: '골짜기 바닥에 세계수보다 굵은 뿌리가 땅 위로 드러나 있다. 뿌리는 오래전에 죽었다. 그 속을 파고 들어간 돌의 사람들의 마지막 사원이 있다.' },
  dragon_nest: { name: '용의 옛 둥지', region: 'cloud', civ: 'arcana', finds: ['dragon_scale', 'star_lens'], text: '봉우리 하나를 통째로 깎아 만든 둥지. 알껍데기 조각이 방패만 하다. 둥지 벽에 아르카나의 글자로 무언가 새겨져 있다. 사람이 용을 길렀다는 뜻일까.' },
  frozen_shrine: { name: '얼어붙은 사원', region: 'cloud', civ: 'arcana', finds: ['arcana_tablet', 'mana_core'], text: '눈 속에 반쯤 묻힌 사원. 문이 안에서 잠겨 있다. 안에서 수도자들이 둥글게 앉은 채 얼어 있다. 그들은 무언가를 기다리다 죽었다.' },
  sky_stair: { name: '하늘 계단', region: 'cloud', civ: 'arcana', heart: true, finds: ['star_chart', 'mana_core', 'arcana_tablet'], text: '고원 끝, 구름 위로 계단이 끝없이 올라간다. 꼭대기에는 지붕 없는 둥근 방이 있고, 바닥에 별자리가 새겨져 있다. 아르카나가 하늘을 읽던 곳이다. 그리고 그들이 마지막으로 본 것이 여기 새겨져 있다.' },
  sunken_port: { name: '가라앉은 항구', region: 'mist', civ: 'tide', finds: ['tide_coin', 'sea_chart'], text: '썰물 때만 드러나는 항구. 돌 부두에 따개비가 두껍게 붙었다. 바닥에 배를 맨 고리가 수백 개 남아 있다. 이 나라에는 배가 많았다.' },
  turtle_isle: { name: '거북 등 섬', region: 'mist', civ: 'tide', finds: ['great_bones', 'tide_coin'], text: '섬인 줄 알고 내렸다. 땅이 숨을 쉬었다. 거대한 거북의 등딱지 위에 물결 왕국 사람들이 세운 사당이 있다. 거북은 아직 살아 있다.' },
  drowned_palace: { name: '잠긴 왕궁', region: 'mist', civ: 'tide', heart: true, finds: ['tide_crown', 'sea_chart', 'tide_coin'], text: '안개가 걷히자 물 위로 탑 꼭대기들이 솟아 있었다. 물결 왕국의 왕궁이다. 썰물이 가장 낮은 밤, 꼭대기 창으로 들어가 잠긴 방들로 내려갈 수 있다.' },
  glass_city: { name: '유리가 된 도시', region: 'ash', civ: 'first', finds: ['glass_rose', 'king_annals'], text: '도시 하나가 통째로 녹아 유리가 되었다. 거리에 사람들의 그림자가 유리 속에 새겨져 있다. 달아나던 모습 그대로다.' },
  iron_river: { name: '쇳물 강', region: 'ash', civ: 'first', finds: ['war_relic', 'glass_rose'], text: '마신 전쟁 때 녹아 흐른 쇠가 강처럼 굳었다. 강바닥에 칼과 창과 갑옷이 수만 개 박혀 있다. 용사 일행이 지나간 길이라는 말이 있다.' },
  first_tombs: { name: '첫 왕들의 무덤 골짜기', region: 'ash', civ: 'first', heart: true, finds: ['first_crown', 'king_annals', 'war_relic'], text: '재가 덮지 못한 골짜기. 바위를 깎아 만든 무덤 문이 일곱 개. 마신의 불도 이 문은 녹이지 못했다. 다만 문 하나가 안에서 열려 있다.' },
};
export const SITE_IDS = Object.keys(SITES);

/* ---------- 찾은 것 ---------- */
// kind: relic(유물) | tablet(글이 새겨진 것: 학계가 탐낸다) | map(지도) | bones(뼈와 표본) | treasure(값나가는 것)
// keep: 숨겨 두면(cache) 집안에 남아 쓸모가 있다. curse: 숨겨 둔 집안에 달마다 마음고생.
export const FINDS = {
  fleet_banner: { name: '얼어붙은 함대의 깃발', kind: 'relic', value: 40, civ: 'first', desc: '첫 왕들의 함대 깃발. 바닷새와 왕관이 수놓아져 있다.' },
  frost_log: { name: '얼음 속의 항해 일지', kind: 'tablet', value: 35, civ: 'first', desc: '얼어붙은 배의 일지. 마지막 장에 "북쪽에 땅이 있다"고 쓰여 있다.' },
  star_lens: { name: '아르카나의 별 렌즈', kind: 'relic', value: 70, civ: 'arcana', desc: '수정을 갈아 만든 렌즈. 들여다보면 별이 가깝다.', keep: { lost: 0.06, text: '별을 읽는 데 도움이 된다 (길을 덜 잃는다)' } },
  first_crown: { name: '첫 왕의 관', kind: 'treasure', value: 220, civ: 'first', desc: '검은 쇠에 붉은 돌을 박은 관. 어느 나라의 왕도 이 관을 쓴 적이 없다.', curse: { stress: 2, text: '밤마다 관이 무겁다는 꿈을 꾼다.' } },
  king_annals: { name: '첫 왕들의 연대기 석판', kind: 'tablet', value: 90, civ: 'first', desc: '마신이 오기 전의 역사가 새겨진 석판. 학자들이 평생을 바칠 것이다.' },
  stone_tablet: { name: '돌의 사람들의 글판', kind: 'tablet', value: 45, civ: 'stone', desc: '아무도 읽지 못하는 글자. 같은 눈 모양이 줄마다 나온다.' },
  stone_idol: { name: '눈이 셋인 돌 우상', kind: 'relic', value: 50, civ: 'stone', desc: '손바닥만 한 우상. 쥐고 있으면 누가 나를 보는 것 같다.', curse: { stress: 1, text: '우상이 밤에 자리를 옮긴다는 말이 하인들 사이에 돈다.' } },
  great_bones: { name: '큰 짐승의 뼈', kind: 'bones', value: 30, civ: null, desc: '어떤 짐승의 것인지 아무도 모르는 뼈. 학자들이 이름을 붙이고 싶어 한다.' },
  root_heart: { name: '죽은 뿌리의 심재', kind: 'relic', value: 160, civ: 'stone', desc: '돌처럼 굳은 세계수의 옛 심재. 엘프들이 알면 피를 흘려서라도 되찾으려 할 것이다.', keep: { heal: true, text: '집안 사람들의 상처가 빨리 아문다' } },
  stone_codex: { name: '돌의 사람들의 사전', kind: 'tablet', value: 140, civ: 'stone', desc: '두 글자로 나란히 새긴 판. 한쪽은 돌의 사람들의 글, 다른 쪽은 아르카나의 글. 마침내 읽을 수 있다.' },
  dragon_scale: { name: '용의 옛 비늘', kind: 'treasure', value: 80, civ: null, desc: '방패만 한 비늘. 대장장이들이 무엇이든 내줄 것이다.' },
  arcana_tablet: { name: '아르카나의 주문판', kind: 'tablet', value: 85, civ: 'arcana', desc: '서클 마법보다 오래된 술식. 반은 지워졌다.' },
  mana_core: { name: '아직 빛나는 마력핵', kind: 'relic', value: 120, civ: 'arcana', desc: '천 년이 지났는데 아직 마력이 돈다. 손이 저릿하다.', keep: { mana: true, text: '마력을 쌓는 데 도움이 된다' } },
  star_chart: { name: '아르카나 최후의 별자리판', kind: 'tablet', value: 200, civ: 'arcana', desc: '아르카나가 마지막으로 본 하늘. 그 하늘에는 지금 없는 별 하나가 그려져 있다.' },
  tide_coin: { name: '물결 왕국의 은화', kind: 'treasure', value: 25, civ: 'tide', desc: '파도 무늬가 찍힌 은화. 수집가들이 좋아한다.' },
  sea_chart: { name: '물결 왕국의 해도', kind: 'map', value: 110, civ: 'tide', desc: '서쪽 바다의 물길과 암초가 그려진 해도. 지금의 어떤 해도보다 정확하다.', keep: { sail: true, text: '뱃길을 덜 잃는다' } },
  tide_crown: { name: '잠긴 왕의 진주관', kind: 'treasure', value: 240, civ: 'tide', desc: '흑진주를 엮은 관. 물에서 꺼내자 물이 계속 흘러내린다.', curse: { stress: 2, text: '집 어딘가에서 늘 물 떨어지는 소리가 난다.' } },
  glass_rose: { name: '유리 장미', kind: 'treasure', value: 60, civ: 'first', desc: '불에 녹아 굳은 꽃밭의 꽃 한 송이. 귀족 부인들이 탐낸다.' },
  war_relic: { name: '마신 전쟁의 부러진 성검 조각', kind: 'relic', value: 130, civ: 'first', desc: '용사 일행이 쓰던 칼의 조각이라는 말이 있다. 성광교가 알면 가만있지 않을 것이다.' },
  region_map: { name: '지도', kind: 'map', value: 60, civ: null, desc: '내 손으로 그린, 지도에 없던 땅의 지도.' },
};
export const findName = (f) => (f.id === 'region_map' ? `${REGIONS[f.region]?.name ?? '미지의 땅'} 지도` : FINDS[f.id]?.name ?? '이름 모를 것');
export const findValue = (f) => Math.round((FINDS[f.id]?.value ?? 20) * (f.second ? 0.7 : 1));

/* ---------- 마물 ---------- */
Object.assign(FOES, {
  frost_wolf: { name: '서리 늑대', pow: 20, bite: true },
  ice_wight: { name: '얼음 망령', pow: 32, undead: true, weapon: '얼어붙은 창' },
  frost_king: { name: '얼음 왕좌의 파수꾼', pow: 70, undead: true, leader: true, weapon: '서리 도끼' },
  thorn_stalker: { name: '가시 사냥꾼', pow: 26, bite: true },
  moss_golem: { name: '이끼 석상', pow: 38, weapon: '돌 주먹' },
  root_warden: { name: '뿌리의 수호자', pow: 66, leader: true, weapon: '휘감는 뿌리' },
  cloud_harpy: { name: '구름 하피', pow: 22, bite: true },
  young_wyvern: { name: '어린 와이번', pow: 40, bite: true },
  storm_drake: { name: '폭풍 드레이크', pow: 80, bite: true, leader: true },
  reef_crab: { name: '암초 게', pow: 24, bite: true },
  tide_wraith: { name: '잠긴 왕의 그림자', pow: 70, undead: true, leader: true, weapon: '산호 홀' },
  ash_ghoul: { name: '재 구울', pow: 30, undead: true, bite: true },
  glass_golem: { name: '유리 거인', pow: 44, weapon: '유리 주먹' },
  cinder_king: { name: '불탄 왕', pow: 85, undead: true, leader: true, weapon: '녹아내린 홀' },
  rival_raider: { name: '다른 탐사대의 칼잡이', pow: 22, human: true, weapon: '짧은 칼과 석궁' },
});
FOES.drowned ??= { name: '익사자', pow: 18, undead: true, weapon: '녹슨 갈고리' };

/* ---------- 다른 탐사대 ---------- */
const RIVALS0 = [
  { id: 'r_crown', name: '왕립 서고 탐사대', leader: '마르틴 펠스', region: 'frost', pow: 60 },
  { id: 'r_tower', name: '세레니아 마탑 원정대', leader: '이졸데 반', region: 'cloud', pow: 68 },
  { id: 'r_coin', name: '포르텔 상인 의회 원정대', leader: '루카 도르세', region: 'mist', pow: 58 },
];
const NEW_RIVALS = [
  { name: '아이젠베르크 제국 측량대', leader: '오스카 브란트' },
  { name: '솔라리스 성유물 탐사대', leader: '세바스티안 수사' },
  { name: '구렁목 드워프 원정대', leader: '토린 잿수염' },
  { name: '털가죽 시장 길잡이단', leader: '카르가' },
];

/* ---------- 상태 ---------- */
export function defaultExplore() {
  return {
    exp: null,        // 지금 나가 있는 원정 (expedition.js)
    regions: {},      // { [region]: { mapped(0~1), trips, heart } } 내가 아는 만큼
    firsts: {},       // { [site]: { who, me, name, year } } 세상이 아는 첫 발견자
    pack: [],         // 들고 돌아온 것 [{ id, region, site, year, second }]
    cache: [],        // 숨겨 둔 것 (대를 이어 남는다)
    given: [],        // 학계에 바친 것 [{ id, to, year }]
    sold: 0,          // 판 값의 합
    trips: 0, lostMonths: 0, fame: 0,
    fallen: [],       // 원정에서 잃은 사람 { name, year, how }
    rivals: RIVALS0.map((r) => ({ ...r, alive: true, prog: 0 })),
    log: [],          // 굵직한 일 { y, text }
    seekCool: 0,
  };
}
export function E(g) {
  if (!g.explore) g.explore = defaultExplore();
  return g.explore;
}
HOOKS.newGame.push((g) => { g.explore = defaultExplore(); });
HOOKS.migrate.push((g) => {
  const e = Object.assign(defaultExplore(), g.explore ?? {});
  for (const k of ['pack', 'cache', 'given', 'fallen', 'rivals', 'log']) if (!Array.isArray(e[k])) e[k] = defaultExplore()[k];
  for (const k of ['regions', 'firsts']) if (!e[k] || typeof e[k] !== 'object') e[k] = {};
  e.pack = e.pack.filter((f) => f && FINDS[f.id]);
  e.cache = e.cache.filter((f) => f && FINDS[f.id]);
  if (e.exp && !REGIONS[e.exp.region]) e.exp = null;
  g.explore = e;
});
// 대 잇기: 원정은 그 사람의 것. 지도와 짐과 숨겨 둔 것은 집안에 남는다. 이름값은 3할.
HOOKS.heir.push((g) => {
  const e = E(g);
  if (e.exp) { e.log.push({ y: g.date.year, text: `선대가 ${REGIONS[e.exp.region].name}에서 돌아오지 못했다.` }); e.exp = null; }
  const mine = Object.values(e.firsts).filter((f) => f.me).length;
  if (mine) e.log.push({ y: g.date.year, text: `선대가 지도에 없던 곳 ${mine}곳에 처음 발을 디뎠다.` });
  for (const f of Object.values(e.firsts)) if (f.me) { f.me = false; f.family = true; }
  e.fame = Math.round(e.fame * 0.3);
  e.trips = 0; e.lostMonths = 0; e.fallen = [];
  if (e.cache.length) note(g, `선대가 숨겨 둔 것이 ${e.cache.length}가지 있다. 집안 사람 몇만 그 자리를 안다.`);
});

export const mi = (g) => g.date.year * 12 + g.date.month;
export const onExpedition = (g) => !!E(g).exp;
export const regionOf = (g, id) => (E(g).regions[id] ??= { mapped: 0, trips: 0, heart: false });
export const keepBonus = (g, key) => E(g).cache.some((f) => FINDS[f.id]?.keep?.[key]);
export const keepVal = (g, key) => E(g).cache.reduce((a, f) => a + (Number(FINDS[f.id]?.keep?.[key]) || 0), 0);
export const discovered = (g, site) => !!E(g).firsts[site];
export const firstIsMine = (g, site) => !!E(g).firsts[site]?.me;
export const FAME_WORD = (v) => (v >= 120 ? '살아 있는 전설' : v >= 70 ? '대륙이 아는 탐험가' : v >= 35 ? '이름난 탐험가' : v >= 12 ? '탐험가' : v > 0 ? '돌아온 사람' : '');
export function addFame(g, n) {
  const e = E(g);
  e.fame = Math.max(0, e.fame + n);
  L(g).renown += Math.round(n / 2);
}
export function logExplore(g, text, chronRel = 0) {
  E(g).log.push({ y: g.date.year, text });
  note(g, text);
  if (chronRel) chron(g, `${g.player.name}, ${text.replace(/\.$/, '')}.`, chronRel);
}

// 첫 발견을 적는다. 이미 누가 찾았으면 false.
export function claimFirst(g, site, who = null, name = null) {
  const e = E(g);
  if (e.firsts[site]) return false;
  e.firsts[site] = who ? { who, me: false, name: name ?? SITES[site].name, year: g.date.year } : { who: g.player.name, me: true, name: name ?? SITES[site].name, year: g.date.year };
  return true;
}

// 다른 탐사대: 달마다 조금씩 나아간다. 유적을 먼저 찾기도 하고, 돌아오지 못하기도 한다.
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const e = E(g);
  for (const r of e.rivals) {
    if (!r.alive) continue;
    if (!rng.chance(0.022)) continue;
    const R = REGIONS[r.region];
    if (!R) { r.alive = false; continue; }
    if (rng.chance(0.1 * (70 / r.pow))) {
      r.alive = false;
      note(g, `${J(r.name, '이/가')} ${R.name}에서 돌아오지 못했다는 소식이 들렸다.`);
      if (r.prog >= 2) chron(g, `${r.name}, ${R.name}에서 소식이 끊기다.`, 25);
      continue;
    }
    r.prog += 1;
    r.pow += 0.5;
    const order = [...R.sites, R.heart];
    const target = order.find((s) => !e.firsts[s]);
    if (!target) { r.region = rng.pick(REGION_IDS); r.prog = 0; continue; }
    const heart = target === R.heart;
    if (r.prog >= (heart ? 5 : 3) && rng.chance(heart ? 0.3 : 0.45)) {
      claimFirst(g, target, r.name);
      chron(g, `${r.name}의 ${r.leader}, ${R.name}에서 ${J(SITES[target].name, '을/를')} 처음 찾아내다.`, heart ? 55 : 30);
      g.news?.unshift({ text: `${J(r.name, '이/가')} ${R.name}의 ${J(SITES[target].name, '을/를')} 찾았다는 소식이 장터마다 돌았다.`, rel: 60 });
    }
  }
  const dead = e.rivals.findIndex((r) => !r.alive);
  if (dead >= 0 && rng.chance(0.05)) {
    const used = new Set(e.rivals.map((r) => r.name));
    const n = NEW_RIVALS.find((x) => !used.has(x.name));
    if (n) e.rivals[dead] = { id: `r${mi(g)}`, ...n, region: rng.pick(REGION_IDS), pow: rng.int(55, 70), alive: true, prog: 0 };
  }
});

// 이름을 붙일 때 쓰는 짧은 말 ("○○의 빙하")
export const SITE_SHORT = {
  frozen_fleet: '함대', singing_glacier: '빙하', giant_tomb: '무덤', moss_city: '돌 도시', beast_graves: '뼈 골짜기', old_root: '뿌리',
  dragon_nest: '둥지', frozen_shrine: '사원', sky_stair: '계단', sunken_port: '항구', turtle_isle: '섬', drowned_palace: '왕궁',
  glass_city: '유리 도시', iron_river: '쇳물 강', first_tombs: '무덤 골짜기',
};
