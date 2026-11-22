// 34단계 뒤 시대의 살림과 일: 열두 가지 뒤에 오는 발명(신문·공장·증기선·통신 수정구·마도 의술·수도·비행선·총포)마다
// 살 물건과 새 일. 발명 id는 history/powers.js INVENTIONS 뒤쪽(도우미3)을 따른다. 아직 없는 id면 그냥 안 보인다.
import { HOOKS } from '../hooks.js';
import { registerJob, doWork, WORK } from '../jobs.js';
import { GOODS } from './goods.js';
import { invented } from './state.js';
import * as T from '../narrative/actions-text.js';
import { owns } from './state.js';

// 뒤 시대 발명 id (도우미3의 INVENTIONS와 맞춘다)
export const LATE = { newspaper: 'newspaper', factory: 'factory', steamship: 'steamship', crystal: 'crystal', medicine: 'medicine', waterworks: 'waterworks', airship: 'airship', gun: 'gun', stonebank: 'stonebank', refinery: 'refinery', manacell: 'manacell', northrail: 'northrail', skyline: 'skyline', deepmine: 'deepmine' };

// 기술 나무의 작은 기술 (도우미3 src/techtree/): 큰 발명 사이사이에 오는 작은 살림 변화
export const SMALL = { collar: 'collar', brick: 'brick', paper: 'paper', windmill: 'windmill', glass: 'glass', lens: 'lens', clock: 'clock', compass: 'compass', betterplow: 'betterplow', rotation: 'rotation', spyglass: 'spyglass', paving: 'paving', crane: 'crane', survey: 'survey', seed: 'seed', greenhouse: 'greenhouse', quarantine: 'quarantine', rail: 'rail', pump: 'pump' };

/* ---------- 작은 기술의 물건 ---------- */
Object.assign(GOODS, {
  notebook: { name: '값싼 종이 공책', need: SMALL.paper, price: 2, max: 2, desc: '양피지 대신 종이. 셈을 적고, 배운 것을 적고, 편지 초안을 쓴다.', say: '종이 공책을 샀다. 양피지처럼 긁어 지울 수 없어서 첫 장에 무엇을 쓸지 한참 망설였다.' },
  window: { name: '맑은 유리창', need: SMALL.glass, price: 14, max: 1, desc: '기름 먹인 천 대신 유리를 끼운 창. 겨울에도 방 안이 밝다.', say: '목수가 창틀에 유리를 끼웠다. 아침 햇빛이 처음으로 방바닥까지 곧게 들어왔다. 어머니가 창을 몇 번이고 닦았다.' },
  spectacles: { name: '안경', need: SMALL.lens, price: 10, max: 1, where: ['leocast', 'harfen', 'verden', 'serenia', 'solaris', 'eisen'], desc: '눈이 침침한 사람에게. 늙어서도 글을 읽고 바늘에 실을 꿴다.', say: '안경을 걸치자 흐릿하던 글자가 또렷해졌다. 안경장이가 웃으며 "이제 십 년은 더 읽으시겠소" 했다.' },
  timepiece: { name: '탁상시계', need: SMALL.clock, price: 30, max: 1, where: ['leocast', 'harfen', 'eisen', 'serenia', 'barka'], desc: '해가 아니라 바늘로 하루를 잰다. 째깍거리는 소리가 집 안에 생긴다.', say: '시계를 선반에 올려놓았다. 밤에 째깍거리는 소리가 낯설어 잠을 설쳤다. 사흘 뒤엔 그 소리가 없으면 잠이 안 왔다.' },
  compass: { name: '마석 나침반', need: SMALL.compass, price: 8, max: 1, desc: '안개 속에서도 북쪽을 가리키는 작은 마석 바늘. 길 잃을 걱정이 준다.', say: '나침반 바늘이 떨다가 한쪽을 가리키고 멈췄다. 몸을 돌려도 바늘은 그쪽을 고집했다.' },
  spyglass: { name: '망원경', need: SMALL.spyglass, price: 22, max: 1, where: ['leocast', 'portel', 'klein', 'harfen', 'graubel'], desc: '먼 곳을 가까이 당겨 보는 놋쇠 통. 뱃사람과 사냥꾼, 엿보는 사람이 산다.', say: '망원경을 눈에 대자 먼 언덕 위 양치기의 얼굴이 보였다. 양치기도 이쪽을 보고 있었다.' },
});

/* ---------- 새 물건 ---------- */
// say: 산 날의 글. era_shop이 GOODS[id].say를 쓴다.
Object.assign(GOODS, {
  gazette: { name: '마도 신문 한 달 치', need: LATE.newspaper, price: 2, max: 1, where: ['leocast', 'harfen', 'verden', 'portel', 'eisen', 'solaris', 'serenia', 'barka'], desc: '아침마다 문 밑으로 들어오는 신문. 왕도 소식, 물가, 부고, 누군가의 험담.', say: '아침에 문 밑으로 신문이 들어왔다. 첫 장에 실린 것은 모르는 귀족의 혼사와, 아는 고장의 화재였다.' },
  millcloth: { name: '공장에서 짠 옷', need: LATE.factory, price: 6, max: 1, desc: '공장 베틀에서 찍어 낸 옷. 싸고 고르지만, 동네 사람 절반이 같은 옷을 입는다.', say: '공장 옷을 샀다. 바느질 땀이 자로 잰 듯 고르다. 장터에 나가 보니 나와 같은 옷을 입은 사람이 셋이었다.' },
  steamticket: { name: '증기선 표', need: LATE.steamship, price: 5, max: 3, where: ['portel', 'klein', 'saltmare'], desc: '바람을 기다리지 않는 마석 증기선. 포구 사이 뱃길이 한 달 준다. 한 장에 한 번.', say: '증기선 표를 품에 넣었다. 부두에서 굴뚝 달린 배가 검은 연기를 뿜고 있었다. 늙은 뱃사람들은 그 배를 쳐다보지도 않았다.' },
  orb: { name: '통신 수정구', need: LATE.crystal, price: 70, max: 1, where: ['leocast', 'harfen', 'serenia', 'eisen'], desc: '전신국과 이어진 작은 수정구. 먼 곳 소식과 시세가 그날 닿는다. 장사하는 집이면 값을 한다.', say: '수정구를 탁자에 올려놓았다. 밤이 되자 안에서 희미한 빛이 깜빡이며 왕도 시세를 띄웠다. 식구들이 둘러앉아 한참을 들여다보았다.' },
  tonic: { name: '마도 의원의 약', need: LATE.medicine, price: 9, max: 3, desc: '열병과 기침에 듣는 정화 약. 병이 들었을 때 하나씩 쓴다.', say: '작은 유리병에 담긴 약을 받았다. 의원은 열이 오르면 반 병, 사흘이 지나도 안 내리면 나머지 반 병이라고 했다.' },
  tap: { name: '집 안 수도', need: LATE.waterworks, price: 40, max: 1, where: ['leocast', 'harfen', 'eisen', 'serenia'], desc: '마당 우물 대신 부엌에서 물이 나온다. 물 긷는 시간과 물로 도는 병이 준다.', say: '인부들이 부엌 벽을 뚫고 관을 넣었다. 꼭지를 틀자 물이 쏟아졌다. 아이들이 몇 번이고 틀었다 잠갔다.' },
  skyride: { name: '비행선 구경 표', need: LATE.airship, price: 25, max: 1, where: ['leocast', 'serenia'], desc: '시험 비행하는 마도 비행선에 한 번 타 본다. 평생 두고 할 얘깃거리.', say: '비행선이 땅에서 떨어질 때 배 속이 붕 떴다. 왕도가 손바닥만 해졌다. 내려와서도 한참을 땅이 흔들리는 것 같았다.' },
  bankbook: { name: '마석 은행 통장', need: LATE.stonebank, price: 10, max: 1, where: ['harfen', 'leocast', 'eisen', 'barka'], desc: '돈을 맡기면 해마다 조금씩 불려 준다. 도둑맞을 걱정도 준다. 은행이 망하지만 않는다면.', say: '은행 창구 너머 서기가 내 이름을 두꺼운 장부에 적고 도장을 찍어 주었다. 돈을 맡기고 종이 한 장을 받아 오는 길이 이상하게 불안했다.' },
  skyticket: { name: '정기 비행선 표', need: LATE.skyline, price: 12, max: 2, where: ['harfen', 'leocast', 'serenia'], desc: '하르펜·왕도·세레니아 사이를 날아간다. 땅길이 한 달 준다. 한 장에 한 번.', say: '비행선 표를 받았다. 표 뒷면에 "바람이 사나우면 뜨지 않음"이라고 작게 적혀 있었다.' },
  pistol: { name: '마도 권총', need: LATE.gun, price: 160, max: 1, where: ['eisen', 'leocast'], desc: '마석 화약으로 쏘는 짧은 총. 비싸고 탄알도 비싸다. 검술을 대신하지는 못하지만, 처음 한 방은 무섭다.', say: '권총은 생각보다 무거웠다. 총포상이 탄알 열 발을 따로 셈해 주며 말했다. "검사들은 이걸 겁쟁이 칼이라고 부르지요."' },
});

/* ---------- 새 일 ---------- */
const LATE_JOBS = {
  windmiller: { need: SMALL.windmill, at: ['ern', 'harfen', 'gruental', 'verden'], def: { name: '풍차 방앗간지기', skill: null, stat: 'str', stat2: 'sen', wage: [2, 3, 4, 5], npcJob: 'miller',
    lines: ['바람이 바뀔 때마다 풍차 지붕을 돌렸다. 날개가 삐걱거리며 다시 돌기 시작했다.', '바람 없는 날은 방아도 쉰다. 물레방아 쪽 사람들이 웃었다.', '밀가루를 뒤집어쓰고 하루를 보냈다. 저녁에 거울을 보니 노인이 서 있었다.', '돌풍에 날개 하나가 부러졌다. 지붕 위에서 밤새 묶었다.'] } },
  lensgrinder: { need: SMALL.lens, at: ['leocast', 'serenia', 'verden'], def: { name: '안경장이', skill: null, stat: 'sen', stat2: 'agi', wage: [3, 4, 6, 9],
    lines: ['유리알을 모래와 기름으로 하루 종일 갈았다. 눈을 대 보면 아직도 세상이 휘어 보인다.', '늙은 필경사가 안경을 써 보고는 울었다. 삼 년 만에 제 글씨를 본다고 했다.', '렌즈 하나에 금이 갔다. 사흘 일이 날아갔다.', '마탑에서 별 보는 큰 렌즈를 주문했다. 공방 주인이 손을 떨었다.'] } },
  clockmaker: { need: SMALL.clock, at: ['leocast', 'harfen', 'eisen'], def: { name: '시계공', skill: 'smithing', stat: 'int', stat2: 'agi', wage: [3, 5, 8, 12], req: (g) => (g.player.skills.smithing >= 10 ? null : '대장일 10'),
    lines: ['돋보기를 끼고 톱니 서른 개를 맞물렸다. 하나가 어긋나 처음부터 다시 했다.', '광장 시계탑에 올라가 기름을 쳤다. 종이 울릴 때 귀를 막는 걸 깜빡했다.', '귀족 댁 시계가 하루에 반 시진씩 늦는다고 했다. 고양이 털이 끼어 있었다.', '내가 맞춘 시계가 처음으로 하루 종일 맞았다. 아무한테도 말하지 않고 혼자 웃었다.'] } },
  craneman: { need: SMALL.crane, at: ['portel', 'klein', 'leocast'], def: { name: '부두 기중기꾼', skill: null, stat: 'str', stat2: 'sen', wage: [3, 4, 5, 6], npcJob: 'laborer', risk: 0.02,
    lines: ['기중기 바퀴 속을 걸어 짐을 들어 올렸다. 하루에 몇 리를 걸었는지 모른다.', '줄이 끊어져 포도주 통이 부두에 떨어졌다. 다들 통보다 나를 먼저 보았다.', '열 사람이 하던 짐을 셋이 올린다. 나머지 일곱은 오늘 부두에 나오지 않았다.', '배가 들어오면 밤에도 기중기는 쉬지 않는다.'] } },
  surveyor: { need: SMALL.survey, at: ['leocast', 'harfen', 'verden', 'graubel'], def: { name: '측량 기사', skill: 'letters', stat: 'int', stat2: 'sen', wage: [3, 5, 8, 11], req: (g) => (g.player.skills.letters >= 20 ? null : '글과 학문 20'),
    lines: ['줄과 막대를 들고 하루 종일 들판을 쟀다. 땅 주인 둘이 서로 자기 땅이라며 따라다녔다.', '영주의 새 지도를 그렸다. 지도 위 경계 한 줄에 마을 하나의 세금이 달렸다.', '산등성이에서 나침반 바늘을 읽고 삼각을 셈했다. 별이 뜰 때까지.', '옛 지도와 새로 잰 길이 반 리나 달랐다. 옛 지도를 믿고 죽은 사람도 있었을 것이다.'] } },
  gardener2: { need: SMALL.greenhouse, at: ['leocast', 'serenia', 'solaris'], def: { name: '온실지기', skill: 'herbs', stat: 'sen', stat2: 'wil', wage: [2, 4, 6, 8],
    lines: ['한겨울에 온실 안에서 남쪽 과일 나무에 물을 주었다. 유리 밖엔 눈이 쌓여 있었다.', '온석 화로 하나가 꺼져 밤새 모종 절반이 얼었다.', '귀족 부인들이 겨울 딸기를 사러 왔다. 딸기 한 알 값이 내 하루 품삯이었다.', '유리에 낀 김을 닦으며 하루를 보냈다.'] } },
  railman: { need: SMALL.rail, at: ['harfen', 'leocast', 'verden'], def: { name: '레일 놓는 인부', skill: null, stat: 'str', stat2: 'wil', wage: [3, 4, 4, 5], npcJob: 'laborer', risk: 0.03,
    lines: ['침목을 깔고 쇠 레일을 망치로 박았다. 하루에 반 리도 못 나갔다.', '언덕을 깎다가 옛 무덤이 나왔다. 감독은 그냥 덮으라고 했다.', '쇠 레일이 뜨겁게 달아 손바닥이 데었다.', '레일 끝에 서서 저 멀리 왕도 쪽을 보았다. 언젠가 이 위로 쇠수레가 달린다고 한다.'] } },
  factory_hand: { need: LATE.factory, at: ['harfen', 'leocast', 'eisen'], def: { name: '공장 직공', skill: null, stat: 'str', stat2: 'wil', wage: [2, 3, 3, 4], npcJob: 'laborer', risk: 0.02,
    lines: ['호루라기가 울리기 전에 공장 문 앞에 줄을 섰다. 늦은 사람은 그날 품삯이 없다.', '열네 시진 동안 마력 베틀의 북을 갈아 끼웠다. 귀에서 웅웅거림이 떠나지 않는다.', '옆 자리 사람이 졸다가 손가락을 잃었다. 감독은 피를 닦고 다음 사람을 불렀다.', '점심은 선 채로 빵 한 쪽. 굴뚝 연기가 해를 가렸다.'] } },
  reporter: { need: LATE.newspaper, at: ['leocast', 'harfen'], def: { name: '신문 기자', skill: 'letters', stat: 'int', stat2: 'cha', wage: [3, 5, 8, 12], req: (g) => (g.player.skills.letters >= 30 ? null : '글과 학문 30'),
    lines: ['부두 화재 현장에서 불탄 창고 주인의 말을 받아 적었다. 편집장은 절반을 잘랐다.', '귀족 댁 하인에게 술을 사며 혼사 얘기를 캤다.', '밤새 쓴 기사가 아침에 찍혀 나왔다. 내 이름은 없었다.', '어느 상단이 기사를 빼 달라며 은화를 놓고 갔다. 편집장은 받았다.'] } },
  stoker: { need: LATE.steamship, at: ['portel', 'klein', 'saltmare'], def: { name: '증기선 화부', skill: null, stat: 'str', stat2: 'wil', wage: [3, 4, 5, 7], npcJob: 'sailor', risk: 0.03,
    lines: ['배 밑바닥 마석로 앞에서 삽질을 했다. 갑판 위 바다는 한 번도 보지 못했다.', '마석로 압력이 올라가 다들 숨을 죽였다. 기관장이 밸브를 풀자 하얀 김이 쏟아졌다.', '돛배 뱃사람들이 우리 배를 "굴뚝 관"이라고 불렀다. 우리는 그 배들을 앞질렀다.', '얼굴에 묻은 검댕이 사흘을 씻어도 빠지지 않는다.'] } },
  wireman: { need: LATE.crystal, at: ['leocast', 'harfen', 'serenia'], def: { name: '수정구 전신수', skill: 'letters', stat: 'int', stat2: 'sen', wage: [4, 6, 9, 12], req: (g) => (g.player.skills.letters >= 25 || g.player.skills.magic >= 12 ? null : '글과 학문 25 또는 마법 12'),
    lines: ['수정구 속 빛의 깜빡임을 글자로 옮겼다. 하루에 부고만 열한 통이었다.', '상인이 시세 전문을 남보다 반 시진 먼저 받으려고 웃돈을 내밀었다.', '밤 근무. 먼 고장에서 온 연서를 받아 적으며 얼굴이 달아올랐다.', '마나가 흔들리는 날은 수정구가 엉뚱한 글자를 띄운다. 두 번씩 되묻는다.'] } },
  airwright: { need: LATE.airship, at: ['leocast', 'serenia'], def: { name: '비행선 정비공', skill: 'smithing', stat: 'int', stat2: 'agi', wage: [5, 7, 10, 15], risk: 0.02, req: (g) => (g.player.skills.smithing >= 25 || g.player.skills.magic >= 25 ? null : '대장일 25 또는 마법 25'),
    lines: ['비행선 배 밑에 매달려 부양석 틀의 금 간 데를 찾았다. 아래를 내려다보지 않으려 애썼다.', '시험 비행에서 돌아온 비행선 가죽 주머니를 꿰맸다.', '설계한 마법사가 내 손을 보며 술식이 틀렸다고 했다. 다시 보니 그가 틀렸다. 말하지 않았다.', '구경꾼들이 울타리 밖에 매일 모인다. 아이들이 비행선을 그려 간다.'] } },
  sewerman: { need: LATE.waterworks, at: ['leocast', 'harfen'], def: { name: '수도·하수 인부', skill: null, stat: 'str', stat2: 'wil', wage: [3, 4, 5, 6], npcJob: 'laborer', risk: 0.025,
    lines: ['왕도 땅 밑 하수관에 들어가 막힌 데를 뚫었다. 쥐 떼가 발등을 넘어갔다.', '새 수도관을 묻을 고랑을 팠다. 옛 성벽 돌이 나와 공사가 멈췄다.', '횃불 하나에 의지해 땅 밑 물길을 걸었다. 위에서 마차 소리가 울렸다.', '수도가 들어간 뒤로 거리에서 이질로 죽는 아이가 줄었다고 한다. 냄새 맡는 값으로 치면 싸다.'] } },
  medic: { need: LATE.medicine, at: ['leocast', 'serenia', 'harfen'], def: { name: '마도 의원 조수', skill: 'herbs', stat: 'int', stat2: 'wil', wage: [3, 5, 8, 12], req: (g) => (g.player.skills.herbs >= 25 ? null : '약초 25'),
    lines: ['정화 술식을 새긴 칼로 고름 주머니를 짰다. 환자는 비명을 지르고, 사흘 뒤 걸어 나갔다.', '의원이 약초사들을 미신쟁이라고 불렀다. 나는 약초사 밑에서 배웠다. 아무 말도 하지 않았다.', '역병 거리에 들어가 집집마다 약을 돌렸다.', '돈 없는 환자를 돌려보내는 날은 밥이 넘어가지 않는다.'] } },
  gunsmith: { need: LATE.gun, at: ['eisen', 'leocast'], def: { name: '총포 공방 일꾼', skill: 'smithing', stat: 'agi', stat2: 'int', wage: [4, 6, 9, 14], risk: 0.02, req: (g) => (g.player.skills.smithing >= 20 ? null : '대장일 20'),
    lines: ['총열을 깎고 또 깎았다. 머리카락 굵기만 틀려도 터진다.', '마석 화약을 저울에 달았다. 공방에선 아무도 웃지 않는다.', '검술 도장 사범이 와서 총을 들어 보더니 내려놓고 갔다. 아무 말도 없었다.', '군대 주문이 들어왔다. 공방장이 셈을 하며 웃었다. 나는 웃지 않았다.'] } },
  refiner: { need: LATE.refinery, at: ['serenia'], def: { name: '마석 정련소 일꾼', skill: 'magic', stat: 'wil', stat2: 'int', wage: [4, 5, 7, 10], risk: 0.02,
    lines: ['탁한 마석을 정련로에 넣고 불순물이 끓어 나오는 걸 걷어 냈다. 손끝이 하루 종일 저렸다.', '정련된 마석은 물처럼 맑다. 그걸 만드는 사람들의 눈은 늘 충혈되어 있다.', '마나가 새어 나와 정련소 안의 등석이 한꺼번에 깜빡였다. 다들 바닥에 엎드렸다.', '마탑 사람들이 와서 정련 기록을 베껴 갔다. 아무도 묻지 못했다.'] } },
  cellfiller: { need: LATE.manacell, at: ['serenia', 'harfen', 'leocast'], def: { name: '마석 충전공', skill: 'magic', stat: 'wil', wage: [3, 5, 7, 9], req: (g) => (g.player.skills.magic >= 10 ? null : '마법 10'),
    lines: ['빈 마석 백 개에 마력을 조금씩 부었다. 저녁이면 머리가 텅 빈 것 같다.', '등석 가게에서 다 닳은 돌을 수레로 실어 왔다. 버리던 것이 다시 돈이 된다.', '마력이 약한 날은 돌 하나 채우는 데 반 시진이 걸렸다.', '꽉 채운 마석이 손바닥 위에서 따뜻했다.'] } },
  skycrew: { need: LATE.skyline, at: ['harfen', 'leocast'], def: { name: '정기 비행선 승무원', skill: null, stat: 'agi', stat2: 'cha', wage: [4, 6, 8, 11], risk: 0.015,
    lines: ['승객들 멀미 주머니를 거두고 창밖의 구름을 보았다.', '바람이 바뀌어 비행선이 한 시진을 제자리에서 떨었다. 승객들 앞에서 웃는 얼굴을 지켰다.', '귀족 아이가 창에 매달려 땅을 내려다보며 소리쳤다. 나도 처음엔 그랬다.', '착륙 줄을 던지고 받는 일은 아직도 손에 땀이 난다.'] } },
};
for (const [id, j] of Object.entries(LATE_JOBS)) registerJob(id, { ...j.def, places: [] });
export function syncLateJobs(g) {
  for (const [id, j] of Object.entries(LATE_JOBS)) {
    const w = WORK[id];
    if (!w) continue;
    w.places.length = 0;
    if (invented(g, j.need)) w.places.push(...j.at);
  }
}
export const lateJobIds = Object.keys(LATE_JOBS);
export const LATE_JOB_NEED = Object.fromEntries(Object.entries(LATE_JOBS).map(([id, j]) => [id, j.need]));

/* ---------- 사라지는 옛 일: 마부·필경 서기·돛배 선원 ---------- */
registerJob('coachman', {
  name: '마부', places: ['leocast', 'harfen', 'verden'], skill: null, stat: 'agi', stat2: 'str', wage: [2, 3, 4, 5], npcJob: 'laborer',
  lines: ['새벽 성문이 열리자마자 손님을 태우고 하르펜 길을 달렸다.', '말발굽 편자가 빠져 길가 대장간에서 반나절을 기다렸다.', '귀족 댁 마차를 몰았다. 안에서 들리는 말은 못 들은 척하는 것이 마부의 셈법이다.', '비 오는 날 진창에 바퀴가 빠졌다. 손님과 둘이 밀었다.'],
});
// 일: 어떤 발명이 나오면 일감이 줄어드나
export const FADING = { coachman: [LATE.factory, 'ironcart', 'railroad'], clerk: ['press', LATE.newspaper, LATE.crystal], sailor: [LATE.steamship] };
export const fadeOf = (g, job) => (FADING[job] ?? []).filter((id) => invented(g, id)).length;
export const fadeCut = (g, job) => Math.min(0.6, fadeOf(g, job) * 0.2);
for (const id of Object.keys(FADING)) {
  const def = WORK[id];
  if (!def) continue;
  const orig = def.work;
  def.work = function fadingWork(g, rng) {
    const before = g.player.money;
    const text = orig ? orig.call(this, g, rng) : doWork(g, rng, this);
    const cut = fadeCut(g, id);
    const got = g.player.money - before;
    if (cut > 0 && got > 1) {
      const back = Math.min(got - 1, Math.round(got * cut));
      if (back > 0) { g.player.money -= back; return `${text} 일감이 줄어 그중 ${back}닢은 다음 달로 미뤄졌다. 미뤄진 돈이 돌아온 적은 없다.`; }
    }
    return text;
  };
}

HOOKS.newGame.push((g) => syncLateJobs(g));
HOOKS.migrate.push((g) => syncLateJobs(g));
HOOKS.endOfMonth.push((g) => syncLateJobs(g));

/* ---------- 산 물건이 삶을 바꾼다 ---------- */
HOOKS.afterMonth.push((g) => {
  const goods = g.era?.goods;
  if (!goods || g.over) return;
  const p = g.player;
  if (goods.gazette) { p.stress = Math.max(0, p.stress - 0.5); if (g.date.month % 3 === 0) p.skills.letters = Math.min(100, (p.skills.letters ?? 0) + 0.15); }
  if (goods.orb && (p.familyId === 'merchant' || g.life?.job?.id === 'shop' || g.trade?.house)) p.familyMoney += 2;
  if (goods.tap) p.fatigue = Math.max(0, p.fatigue - 1.5);
  if (goods.tonic > 0 && p.injuries?.length) {
    const sick = p.injuries.find((x) => /열|기침|역병|병/.test(String(x.name)) && x.months > 1);
    if (sick) { sick.months = Math.max(1, sick.months - 2); goods.tonic -= 1; }
  }
  const age = Math.floor((g.people?.find((x) => x.id === p.id)?.ageMonths ?? 0) / 12);
  if (goods.notebook && g.date.month % 4 === 0) p.skills.letters = Math.min(100, (p.skills.letters ?? 0) + 0.2);
  if (goods.window && (g.date.month >= 11 || g.date.month <= 2)) p.stress = Math.max(0, p.stress - 0.5);
  if (goods.spectacles && age >= 40) p.stress = Math.max(0, p.stress - 1);
  if (goods.timepiece) p.fatigue = Math.max(0, p.fatigue - 0.5);
  if (goods.bankbook && g.date.month === 12 && p.money >= 20) p.money += Math.min(8, Math.floor(p.money * 0.03));
  if (goods.pistol) { const gear = g.life?.gear; if (gear && (gear.weapon ?? 0) < 11) { gear.weapon = 11; gear.weaponName = '마도 권총'; } }
});
// 개량 쟁기·돌려짓기·씨앗 고르기: 농사짓는 집 살림이 조금씩 낫다 (가을걷이 때)
HOOKS.afterMonth.push((g) => {
  if (g.over || g.date.month !== 10) return;
  const p = g.player;
  if (!(p.familyId === 'farmer' || g.life?.job?.id === 'farmer' || g.farm?.land)) return;
  const n = [SMALL.betterplow, SMALL.rotation, SMALL.seed].filter((id) => invented(g, id)).length;
  if (n) p.familyMoney += n * 2;
});
// 증기선 표·정기 비행선 표: 그 길을 한 달 줄인다. 북쪽 쇠수레 길이 놓이면 쇠수레 표로 그라우벨까지 간다.
const STEAM_PORTS = new Set(['portel', 'klein', 'saltmare', 'saltrock']);
const SKY_PORTS = new Set(['harfen', 'leocast', 'serenia']);
HOOKS.afterActions.push((g) => {
  const t = g.life?.travel, goods = g.era?.goods;
  if (!t || t.late != null || !goods) return;
  t.late = false;
  if (t.left < 1) return;
  const use = (k) => { goods[k] -= 1; t.late = k; t.left = Math.max(0, t.left - 1); };
  if (STEAM_PORTS.has(t.from) && STEAM_PORTS.has(t.to) && (goods.steamticket ?? 0) > 0) use('steamticket');
  else if (SKY_PORTS.has(t.from) && SKY_PORTS.has(t.to) && (goods.skyticket ?? 0) > 0) use('skyticket');
  else if (invented(g, LATE.northrail) && [t.from, t.to].includes('graubel') && ['harfen', 'leocast'].some((x) => [t.from, t.to].includes(x)) && (goods.cart ?? 0) > 0 && !t.cart) use('cart');
});

/* ---------- 바뀐 생활이 행동 글에 묻어난다 ---------- */
const inv = (id) => (c, g) => invented(g, id);
const has = (id) => (c, g) => owns(g, id);
T.REST.push(
  { when: inv(SMALL.clock), bands: ['young', 'adult', 'old'], t: '광장 시계탑 종이 시각을 쳤다. 해를 보지 않고도 저녁이 된 걸 알았다.' },
  { when: has('window'), t: '유리창 너머로 눈 내리는 걸 보며 쉬었다. 바람은 들어오지 않았다.' },
  { when: has('spectacles'), bands: ['adult', 'old'], t: '안경을 코끝에 걸고 오래된 편지를 다시 읽었다.' },
  { when: has('gazette'), t: '신문을 접었다 폈다 하며 졸았다. 부고란에서 아는 이름을 찾는 것이 버릇이 되었다.' },
  { when: inv(LATE.factory), bands: ['young', 'adult', 'old'], t: '멀리서 공장 호루라기가 울렸다. 쉬는 날인데도 몸이 먼저 깼다.' },
  { when: has('orb'), t: '탁자 위 수정구가 밤새 희미하게 깜빡였다. 어딘가에서 누군가 소식을 보내고 있다.' },
);
T.WANDER_NOBODY.push(
  { when: inv(SMALL.windmill), t: '언덕 위 풍차 날개가 느릿느릿 돌았다. 아이들이 날개 그림자를 밟으며 뛰어다녔다.' },
  { when: inv(SMALL.paving), t: '진창이던 길에 돌이 깔렸다. 비 온 다음 날에도 신발이 젖지 않는다.' },
  { when: inv(SMALL.brick), t: '초가 사이로 붉은 벽돌집이 하나둘 섰다. 불이 나도 번지지 않는다고 했다.' },
  { when: inv(SMALL.quarantine), t: '성문 앞에 노란 깃발이 걸린 천막이 있었다. 먼 곳에서 온 사람들은 거기서 며칠을 묵어야 들어온다.' },
  { when: inv(SMALL.crane), t: '부두의 커다란 나무 바퀴 기중기가 배에서 짐을 들어 올렸다. 짐꾼들이 팔짱을 끼고 그걸 보았다.' },
  { when: inv(LATE.newspaper), t: '모퉁이마다 신문팔이 아이들이 소리를 질렀다. 오늘은 어느 백작의 빚 얘기였다.' },
  { when: inv(LATE.factory), t: '성 밖 공장 거리에서 굴뚝 연기가 낮게 깔렸다. 빨래를 널던 아낙이 하늘을 보며 혀를 찼다.' },
  { when: inv(LATE.steamship), t: '부두에 굴뚝 달린 배가 들어왔다. 돛배 선원들이 팔짱을 끼고 그 배를 노려보았다.' },
  { when: inv(LATE.airship), t: '사람들이 모두 하늘을 보고 있었다. 길쭉한 가죽 주머니 같은 것이 구름 아래를 천천히 지나갔다.' },
  { when: inv(LATE.waterworks), t: '광장 우물에 뚜껑이 덮였다. 물동이를 이고 다니던 아이들이 이제 골목에서 공을 찬다.' },
);
T.HELP_HOME.push(
  { fam: 'farmer', when: inv(SMALL.collar), t: '새 목사리를 채우자 말이 쟁기를 소처럼 끌었다. 아버지가 말 등을 두드렸다.' },
  { fam: 'farmer', when: inv(SMALL.rotation), t: '올해는 콩을 심을 밭이다. 돌려짓기를 하고부터 땅이 덜 지친다고 아버지가 말했다.' },
  { fam: 'farmer', when: inv(SMALL.seed), t: '작년 가장 실한 이삭에서 받은 씨앗을 골라 뿌렸다. 아버지는 이게 다 책에서 배운 거라며 으쓱했다.' },
  { when: has('tap'), t: '부엌 꼭지를 틀어 물을 받았다. 우물까지 오가던 길이 통째로 남았다.' },
  { fam: 'merchant', when: has('orb'), t: '수정구로 온 시세를 아버지가 받아 적었다. 아침에 들어온 값으로 점심에 물건을 판다.' },
);
