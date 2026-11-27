// 몸으로 느끼는 삶: 글 묶음.
// 행동마다 '어떤 결의 일인가(kind)'를 정하고, 그 위에 지금 형편(날씨·때·다친 곳·배고픔·돈·식구·고장·나이)에 맞는 한 줄을 얹는다.
// 줄 하나: { k: [kind…] 또는 '*', w: 조건 함수(f), t: 문자열 또는 (f) => 문자열, s: 얼마나 두드러지는가(고를 때 무게) }
import { J } from '../narrative/text.js';

// ---------- 행동 → 결 ----------
// field 들일·몸 쓰는 바깥일 | out 바깥 일(경비·순찰 같은 것) | train 몸·칼 단련 | hunt 사냥·싸움 | trade 장사 | kitchen 부엌·화덕 앞 | forge 대장간·공방
// site 공사장·돌·짐 나르는 바깥일(밭이 아님) | wild 들·숲에서 약초 캐기, 짐승 돌보기
// still 약탕관·술 솥 앞(부엌이지만 손님 받는 곳이 아님)
// depths 미궁·땅 밑 싸움(날씨가 닿지 않는 곳)
// study 글·책 | magic 마력·명상 | pray 기도 | rest 쉬기 | family 식구와 보내는 때 | play 아이 놀이 | poor 길바닥 살이 | road 길 위 | sea 바다 | mine 땅 밑 | home 집 안 일
export const ACT_KIND = {
  play: 'play', mud_play: 'play', tag_along: 'play', beg_story: 'play', wander: 'play',
  study: 'study', harfen_library: 'study', leocast_library: 'study', school_study: 'study', law_study: 'study', arts_read: 'study',
  spell_study: 'study', research: 'study', magic_selfstudy: 'study', leocast_tower: 'study', serenia_lecture: 'study', eisen_academy: 'study',
  seal_study: 'study', envoy_tongue: 'study', dragonname_study: 'study', noah_archive: 'study', letters_write: 'study', elder_memoir: 'study', arts_work: 'study',
  train_body: 'train', sword_father: 'train', sword_guard: 'train', harfen_dojo: 'train', leocast_dojo: 'train', sword_school_train: 'train',
  sword_spar: 'train', verden_yard: 'train', fur_trial: 'train', spy_train: 'train',
  meditate: 'magic', magic_lesson: 'magic', silverleaf_tree: 'magic', spell_work: 'magic', mana_well: 'magic',
  herbs: 'wild', day_labor: 'field', nature_sow: 'field', nature_dike: 'field', nature_harvest: 'field', nature_winterprep: 'field',
  farm_sow: 'field', farm_work: 'field', herd_work: 'wild', herd_tend: 'wild', herd_band_life: 'wild', frontier_work: 'field',
  works_labor: 'site', poor_labor: 'site', aftermath_rebuild: 'site', village_help: 'field', apo_gather: 'wild', voc_traps: 'hunt',
  beast_care: 'wild', exile_settle: 'field', jail_labor: 'site', bondage_serve: 'site', poor_bond_work: 'site', house_build: 'site',
  inn_kitchen: 'kitchen', cuisine_cook: 'kitchen', cuisine_create: 'kitchen', cuisine_serve: 'kitchen', inn_work: 'kitchen', brew_make: 'still', apo_brew: 'still',
  graubel_forge: 'forge', tower_craft: 'forge',
  harfen_market: 'trade', trade_market: 'trade', shop_manage: 'trade', cargo: 'trade', voc_potions: 'trade', voc_pelts: 'trade', herd_market: 'trade',
  farm_market: 'trade', wilds_sell: 'trade', explore_sell: 'trade', apo_shop: 'trade', barka_exchange: 'trade', beast_sell: 'trade', silverleaf_trade: 'trade',
  wilds_hunt: 'hunt', wilds_nest: 'hunt', quest: 'hunt', delve: 'depths', beast_hawking: 'hunt', pol_merc: 'hunt', company_lead: 'hunt', party_quest: 'hunt',
  graubel_watch: 'out', solaris_pilgrims: 'out', beast_ride: 'out', village_duty: 'out', works_oversee: 'out',
  sea_deck: 'sea', at_sea: 'sea', sail: 'sea', shipyard: 'sea',
  pray: 'pray', worship: 'pray', keep_feast: 'pray', solaris_mass: 'pray', holy_heal: 'pray', elder_tomb: 'pray', love_grave: 'pray',
  rest: 'rest', health_rest: 'rest', elder_care: 'rest',
  kin_time: 'family', love_spouse: 'family',
  poor_beg: 'poor', poor_soup: 'poor',
  on_road: 'road', travel: 'road', pilgrimage: 'road', elder_journey: 'road',
  mine_deep: 'mine', mine_dwarf: 'mine', mine_prospect: 'mine',
  estate_manage: 'home', household_manage: 'home', farm_manage: 'home', house_room: 'home',
};
// 일자리(일하러 가기)는 하는 일에 따라
export const JOB_KIND = { farmer: 'field', laborer: 'site', hunter: 'hunt', herbalist: 'wild', cook: 'kitchen', shop: 'trade', clerk: 'study', guard: 'out' };
export const SKILL_KIND = { farming: 'field', cooking: 'kitchen', trade: 'trade', letters: 'study', sword: 'out', herbs: 'wild', smithing: 'forge', magic: 'magic' };

// 날씨가 몸에 닿는 결
export const OUTDOOR = ['field', 'site', 'wild', 'out', 'train', 'hunt', 'trade', 'play', 'poor', 'road', 'sea'];
export const INDOOR = ['still', 'study', 'magic', 'kitchen', 'forge', 'rest', 'family', 'home', 'pray'];
const LABOR = ['field', 'site', 'wild', 'still', 'out', 'kitchen', 'forge', 'mine', 'trade', 'hunt', 'sea'];
const WORKY = ['field', 'site', 'wild', 'still', 'out', 'kitchen', 'forge', 'mine', 'trade', 'study', 'sea'];
const grown = (f) => f.age >= 12;
const FARMY = /밭|고랑|괭이|짚단|소 방울|이랑|씨앗|지렁이|흙냄새|흙이/;

// ---------- 날씨와 때 ----------
export const LINES = [
  // 비
  { k: ['field'], w: (f) => f.weather === 'rain' && grown(f), t: '빗물이 고랑을 타고 흘러 신발이 진흙에 박혔다. 젖은 옷은 저녁이 되도록 마르지 않았다.' },
  { k: ['field'], w: (f) => f.weather === 'rain' && grown(f), t: '비가 그치기를 기다리다 결국 젖은 채로 나섰다. 물 먹은 흙이 무거워 괭이가 두 배는 무거웠다.' },
  { k: ['train'], w: (f) => f.weather === 'rain', t: '빗속에서 목검을 휘둘렀다. 젖은 손잡이가 자꾸 미끄러져 손아귀에 힘을 더 주어야 했다.' },
  { k: ['hunt'], w: (f) => f.weather === 'rain', t: '비에 발자국이 지워져 흔적을 몇 번이나 놓쳤다. 젖은 활시위가 늘어져 신경이 쓰였다.' },
  { k: ['trade'], w: (f) => f.weather === 'rain', t: '비가 와서 천막 아래로 사람들이 몰렸다. 물건보다 비 피할 자리를 두고 더 다퉜다.' },
  { k: ['play'], w: (f) => f.weather === 'rain', t: '비 오는 날이라 처마 밑에서 놀았다. 낙숫물이 떨어지는 자리를 세다가 지겨워졌다.' },
  { k: ['road'], w: (f) => f.weather === 'rain', t: '젖은 길이 미끄러웠다. 수레바퀴 자국마다 흙탕물이 고여 있었다.' },
  { k: ['poor'], w: (f) => f.weather === 'rain', t: '비를 피할 곳을 찾아 다리 밑을 전전했다. 젖은 옷으로 밤을 나니 이가 딱딱 부딪혔다.' },
  { k: ['out'], w: (f) => f.weather === 'rain', t: '빗발 속에 서 있자니 망토 안까지 물이 스몄다. 교대할 때까지 손이 퉁퉁 불어 있었다.' },
  { k: ['study', 'home', 'rest'], w: (f) => f.weather === 'rain', t: '빗소리가 지붕을 두드렸다. 밖에 나갈 일이 없는 날이라 오히려 마음이 가라앉았다.' },
  { k: ['field', 'out', 'hunt', 'trade', 'road'], w: (f) => f.month === 7 && f.weather === 'rain' && grown(f), t: '장마가 길었다. 옷에서 곰팡내가 났고, 마른 데라곤 아궁이 앞뿐이었다.' },
  // 뇌우
  { k: OUTDOOR, w: (f) => f.weather === 'storm', s: 2, t: '천둥이 칠 때마다 손을 멈추고 하늘을 올려다보았다. 번개가 내리꽂힌 언덕 너머에서 연기가 올랐다.' },
  { k: OUTDOOR, w: (f) => f.weather === 'storm', s: 2, t: '먹구름이 몰려와 서둘러 일을 접었다. 집에 닿기도 전에 빗줄기가 쏟아졌다.' },
  { k: INDOOR, w: (f) => f.weather === 'storm', t: '번개가 칠 때마다 창이 하얗게 번쩍였다. 천둥이 지나가면 집 안이 더 조용해졌다.' },
  // 눈
  { k: ['field', 'home'], w: (f) => f.weather === 'snow' && grown(f), t: '눈 덮인 마당을 쓸고 얼어붙은 물동이를 깨는 것으로 하루가 시작되었다.' },
  { k: ['field', 'out'], w: (f) => f.weather === 'snow' && grown(f), t: '눈밭에서 일하다 보니 발가락 감각이 없어졌다. 불가에 앉고 나서야 저릿하게 돌아왔다.' },
  { k: ['train'], w: (f) => f.weather === 'snow', t: '눈 위에서 발 옮기는 연습을 했다. 미끄러질 때마다 차가운 눈이 옷깃으로 파고들었다.' },
  { k: ['hunt'], w: (f) => f.weather === 'snow', t: '눈 위의 발자국은 숨길 수 없다. 쫓는 쪽도, 쫓기는 쪽도.' },
  { k: ['play'], w: (f) => f.weather === 'snow', t: '눈을 굴려 제 키만 한 덩어리를 만들었다. 손이 얼얼해 입김을 불어 녹였다.' },
  { k: ['road'], w: (f) => f.weather === 'snow', t: '눈길에 발이 푹푹 빠졌다. 앞서간 사람의 발자국을 골라 밟으며 걸었다.' },
  { k: ['trade'], w: (f) => f.weather === 'snow', t: '눈 때문에 장에 나온 사람이 반도 안 되었다. 언 손으로 동전을 세다 몇 닢을 떨어뜨렸다.' },
  { k: ['poor'], w: (f) => f.weather === 'snow' || f.weather === 'blizzard', s: 2, t: '눈 오는 밤에는 다들 한데 모여 몸을 붙였다. 아침에 한 사람이 일어나지 않았다.' },
  // 눈보라
  { k: OUTDOOR, w: (f) => f.weather === 'blizzard', s: 2, t: '눈보라가 몰아쳐 한 치 앞이 보이지 않았다. 몇 걸음마다 멈춰 서서 방향을 가늠했다.' },
  { k: INDOOR, w: (f) => f.weather === 'blizzard', s: 1.5, t: '밖에는 눈보라가 몰아쳤다. 문틈으로 새어 드는 바람에 등잔불이 자꾸 누웠다.' },
  // 안개
  { k: ['field'], w: (f) => f.weather === 'fog' && grown(f), t: '안개가 짙어 밭 끝이 보이지 않았다. 멀리서 소 방울 소리만 들려왔다.' },
  { k: ['hunt'], w: (f) => f.weather === 'fog', t: '안개 속에서는 소리가 먼저 온다. 나뭇가지 꺾이는 소리에 몇 번이나 숨을 죽였다.' },
  { k: ['road', 'out'], w: (f) => f.weather === 'fog', t: '안개 낀 길에서 이정표를 두 번이나 지나칠 뻔했다.' },
  { k: ['sea'], w: (f) => f.weather === 'fog', t: '바다에 안개가 내려앉아 뱃머리가 보이지 않았다. 다들 말소리를 낮췄다.' },
  // 바람
  { k: ['field'], w: (f) => f.weather === 'wind' && grown(f), t: '바람이 거세 쌓아 둔 짚단이 날아갔다. 다시 묶느라 반나절이 갔다.' },
  { k: ['trade'], w: (f) => f.weather === 'wind', t: '바람에 천막이 뒤집혀 좌판의 물건을 주워 담느라 바빴다.' },
  { k: ['road', 'out'], w: (f) => f.weather === 'wind', t: '맞바람에 몸을 숙이고 걸었다. 모래알이 볼을 따갑게 때렸다.' },
  { k: ['sea'], w: (f) => f.weather === 'wind' || f.weather === 'storm', s: 1.5, t: '파도가 뱃전을 넘어왔다. 밧줄을 붙든 손바닥이 쓸려 벌겋게 일어났다.' },
  // 더위와 추위
  { k: ['field', 'out'], w: (f) => f.season === '여름' && f.weather === 'clear' && f.tod === 'day' && grown(f), t: '뙤약볕에 등이 타는 것 같았다. 그늘에서 물 한 바가지를 들이켜고 다시 나갔다.' },
  { k: ['train'], w: (f) => f.season === '여름' && f.weather === 'clear', t: '땀이 눈으로 흘러들어 따가웠다. 손잡이가 땀에 젖어 검게 변했다.' },
  { k: ['kitchen', 'forge'], w: (f) => f.season === '여름', t: '여름 화덕 앞은 숨이 턱턱 막혔다. 땀방울이 떨어지지 않게 이마를 자꾸 훔쳤다.' },
  { k: ['kitchen', 'forge'], w: (f) => f.season === '겨울', t: '바깥은 얼어붙었는데 화덕 앞만은 따뜻했다. 이 철에는 다들 부엌 일을 서로 하겠다고 했다.' },
  { k: ['field', 'out'], w: (f) => f.season === '겨울' && f.weather === 'clear' && grown(f), t: '얼어붙은 땅에 괭이가 튕겨 나왔다. 손바닥이 갈라져 피가 비쳤다.' },
  { k: ['study'], w: (f) => f.season === '겨울' && f.weather !== 'blizzard', t: '손이 곱아 글씨가 삐뚤어졌다. 화로 곁으로 자리를 옮기고 손을 비볐다.' },
  { k: ['rest', 'family'], w: (f) => f.season === '겨울', t: '화롯가에 붙어 앉아 하루를 보냈다. 장작 타는 소리가 좋았다.' },
  { k: ['field'], w: (f) => f.season === '봄' && f.weather === 'clear' && grown(f), t: '언 땅이 풀려 흙냄새가 올라왔다. 괭이 끝에 지렁이가 꿈틀거렸다.' },
  { k: ['field', 'road'], w: (f) => f.season === '가을' && f.weather === 'clear', t: '하늘이 높았다. 바람에 마른 풀 냄새가 섞여 있었다.' },
  // 때
  { k: ['field', 'out'], w: (f) => f.tod === 'dawn' && f.season === '겨울' && grown(f), s: 1.5, t: '겨울 새벽, 별이 아직 떠 있을 때 집을 나섰다. 입김이 하얗게 흩어졌다.' },
  { k: ['field'], w: (f) => f.tod === 'dawn' && f.season !== '겨울' && grown(f), t: '첫닭이 울기도 전에 일어나 이슬 젖은 밭에 나갔다. 바짓단이 무릎까지 젖었다.' },
  { k: ['train'], w: (f) => f.tod === 'dawn', t: '새벽 공기가 차서 숨을 들이쉴 때마다 가슴이 시렸다. 그래도 머리는 맑았다.' },
  { k: ['trade'], w: (f) => f.tod === 'dawn', t: '새벽장에 물건을 펼쳤다. 첫 손님을 놓치면 하루가 꼬인다고들 했다.' },
  { k: ['study'], w: (f) => f.tod === 'night', t: '등잔 기름이 다 닳을 때까지 책장을 넘겼다. 눈이 따가워 몇 번이나 비볐다.' },
  { k: ['magic'], w: (f) => f.tod === 'night', t: '집이 다 잠든 뒤에야 마음이 고요해졌다. 귓가에 피 도는 소리까지 들렸다.' },
  { k: ['kitchen'], w: (f) => f.tod === 'night', t: '마지막 손님이 나간 뒤 식은 화덕 앞에서 그릇을 닦았다. 손끝이 퉁퉁 불었다.' },
  { k: ['field', 'out'], w: (f) => f.tod === 'dusk' && grown(f), t: '해 질 녘 붉은 빛이 고랑에 길게 누웠다. 허리를 펴니 집집마다 굴뚝에서 연기가 올랐다.' },
  { k: ['play'], w: (f) => f.tod === 'dusk', t: '해가 지도록 놀다가 저녁 먹으라고 부르는 소리에 흩어졌다.' },

  // ---------- 다친 곳 ----------
  { k: ['field', 'out', 'road', 'hunt', 'trade'], w: (f) => f.hurt === 'leg', s: 2.5, t: (f) => `${J(f.hurtName, '이/가')} 쑤셔 걸음이 자꾸 처졌다. 쉴 때마다 무릎 아래를 주물렀다.` },
  { k: ['train'], w: (f) => f.hurt === 'leg', s: 2.5, t: '다친 다리 쪽으로 무게를 싣지 못해 자세가 자꾸 틀어졌다. 스승이 혀를 찼다.' },
  { k: ['field', 'out', 'kitchen', 'forge', 'mine', 'sea'], w: (f) => f.hurt === 'arm', s: 2.5, t: (f) => `${J(f.hurtName, '을/를')} 천으로 동여매고 일했다. 한 손으로 할 수 있는 일만 골라 했다.` },
  { k: ['train', 'hunt'], w: (f) => f.hurt === 'arm', s: 2.5, t: '칼을 쥔 손에 힘이 다 들어가지 않았다. 아픈 쪽 어깨가 먼저 내려갔다.' },
  { k: ['study'], w: (f) => f.hurt === 'arm', s: 2, t: '다친 손으로 펜을 쥐니 글씨가 남의 것 같았다.' },
  { k: ['field', 'out', 'kitchen', 'forge', 'mine', 'train', 'sea'], w: (f) => f.hurt === 'back', s: 2.5, t: '허리를 숙일 때마다 등의 상처가 당겼다. 짐은 남이 대신 들어 주었다.' },
  { k: ['field', 'out', 'trade', 'study', 'train'], w: (f) => f.hurt === 'head', s: 2, t: '머리의 상처가 한낮이 되면 지끈거렸다. 볕을 피해 그늘만 골라 다녔다.' },
  { k: WORKY.concat(['train', 'hunt']), w: (f) => f.hurt === 'sick', s: 2.5, t: '덜 나은 몸이라 자꾸 식은땀이 났다. 남들보다 일찍 손을 놓았다.' },
  { k: WORKY.concat(['train', 'hunt']), w: (f) => f.hurt === 'wound', s: 2, t: '아물지 않은 상처가 옷에 쓸릴 때마다 이를 악물었다.' },
  { k: ['rest'], w: (f) => !!f.hurt, s: 2, t: (f) => `${J(f.hurtName, '이/가')} 낫기를 기다리며 누워 지냈다. 천장의 얼룩을 다 외울 지경이었다.` },
  { k: '*', w: (f) => f.scarred && (f.weather === 'rain' || f.weather === 'snow' || f.weather === 'storm') && !f.hurt, t: '날이 궂으면 옛 흉터가 먼저 안다. 오늘도 그 자리가 저릿했다.' },

  // ---------- 나이 ----------
  { k: ['field', 'out', 'mine', 'sea'], w: (f) => f.age >= 55, s: 1.5, t: '예전엔 하루면 끝내던 일이 이틀 걸렸다. 허리를 펼 때마다 뼈마디가 소리를 냈다.' },
  { k: ['field', 'out', 'trade', 'kitchen'], w: (f) => f.age >= 58, s: 1.5, t: '젊은 일꾼이 무거운 것을 말없이 대신 들어 주었다. 고맙기도 하고 서글프기도 했다.' },
  { k: ['train', 'hunt'], w: (f) => f.age >= 50, s: 1.5, t: '숨이 먼저 찼다. 몸이 기억하는 동작을 다리가 따라가지 못했다.' },
  { k: ['study', 'magic'], w: (f) => f.age >= 55, s: 1.5, t: '글자가 자꾸 흐려져 책을 멀찍이 들고 읽었다.' },
  { k: ['trade'], w: (f) => f.age >= 55, t: '단골들이 이제는 어르신이라고 불렀다. 흥정이 예전보다 쉬워졌다.' },
  { k: ['field', 'out', 'kitchen'], w: (f) => f.age >= 13 && f.age < 16, t: '어른 몫의 짐을 처음으로 혼자 졌다. 다리가 후들거렸지만 내려놓지 않았다.' },

  // ---------- 배고픔 ----------
  { k: WORKY.concat(['train', 'hunt', 'poor', 'road']), w: (f) => f.hungry, s: 2.5, t: '빈속으로 움직이니 눈앞이 자꾸 노래졌다. 물로 배를 채웠다.' },
  { k: WORKY.concat(['train', 'study', 'poor']), w: (f) => f.hungry, s: 2, t: '배 속에서 나는 소리가 옆 사람에게 들릴까 신경이 쓰였다.' },
  { k: WORKY.concat(['play', 'train', 'home']), w: (f) => f.famine && !f.flush, s: 1.5, t: '흉년이라 점심은 묽은 죽 한 그릇이었다. 저녁까지 버티려면 아껴 먹어야 했다.' },

  // ---------- 돈 사정 ----------
  { k: ['trade'], w: (f) => f.broke && f.age >= 16, s: 1.5, t: '주머니에 남은 동화를 몇 번이고 세었다. 다음 달 방값이 모자랐다.' },
  { k: ['field', 'out', 'kitchen', 'forge', 'mine'], w: (f) => f.broke && f.age >= 16, s: 1.5, t: '오늘 번 돈으로 무엇부터 막을지 셈하며 일했다. 아무리 셈해도 남는 것은 없었다.' },
  { k: ['rest', 'family'], w: (f) => f.broke && f.age >= 16, s: 1.5, t: '쉬는 날에도 돈 걱정에 마음이 편치 않았다.' },
  { k: ['trade'], w: (f) => f.flush, t: '돈주머니가 묵직하니 흥정할 때 목소리부터 달랐다.' },
  { k: ['rest', 'family'], w: (f) => f.flush, t: '넉넉한 살림 덕에 걱정 없이 쉬었다. 이런 날이 오래가지 않는다는 것도 알았다.' },
  { k: ['rest', 'study', 'magic'], w: (f) => f.street, s: 2, t: '길바닥에서 잔 몸은 쉬어도 쉰 것 같지 않았다. 등이 돌처럼 굳어 있었다.' },
  { k: ['play', 'home'], w: (f) => f.age < 13 && f.poorHome, s: 1.5, t: '집안 형편이 어려워 놀다가도 해가 기울면 땔감을 주워 들어갔다.' },

  // ---------- 식구 ----------
  { k: WORKY.concat(['train']), w: (f) => f.newborn, s: 2.5, t: '밤새 아기가 보채 잠을 설쳤다. 일하는 내내 하품을 삼켰다.' },
  { k: LABOR, w: (f) => f.newborn, s: 2, t: '집에 젖먹이가 있으니 한 푼이 아쉬웠다. 쉬는 참에도 손을 놀렸다.' },
  { k: ['family', 'rest'], w: (f) => f.newborn, s: 2.5, t: '아기가 손가락을 꼭 쥐고 놓지 않았다. 그 작은 힘이 이상하게 오래 남았다.' },
  { k: ['field', 'out', 'trade', 'kitchen', 'forge'], w: (f) => f.kids > 0, s: 1.5, t: '집에 돌아가니 아이들이 문간까지 뛰어나왔다. 하루 피로가 반쯤 풀렸다.' },
  { k: ['field', 'trade', 'forge'], w: (f) => f.kids > 0, t: '아이가 일터까지 따라와 한참을 구경하다 돌아갔다. 손놀림을 흉내 내는 것이 우스웠다.' },
  { k: ['field', 'out', 'kitchen', 'forge', 'trade', 'study'], w: (f) => !!f.spouse, t: (f) => `저녁에 돌아가니 ${J(f.spouse, '이/가')} 데워 둔 국이 기다리고 있었다.` },
  { k: ['rest', 'family'], w: (f) => !!f.spouse && f.kids > 1, t: '아이들 떠드는 소리에 쉬는 날도 조용할 틈이 없었다. 그래도 그 소리가 없으면 허전할 것 같았다.' },
  { k: ['field', 'out', 'trade', 'kitchen'], w: (f) => f.widowed, s: 1.5, t: '돌아가도 불 켜진 창이 없었다. 혼자 먹는 저녁이 아직 낯설었다.' },

  // ---------- 고장 ----------
  { k: ['field', 'out', 'trade', 'road', 'train', 'hunt'], w: (f) => f.sea, t: '바닷바람에 소금기가 묻어 입술이 짰다. 갈매기 우는 소리가 하루 종일 따라다녔다.' },
  { k: ['trade', 'kitchen'], w: (f) => f.sea, t: '부두에서 갓 내린 생선 비린내가 골목 안까지 밀려왔다.' },
  { k: ['trade', 'out', 'road'], w: (f) => f.city && !f.sea, t: '사람이 많아 목소리를 높여야 돌아봤다. 소매치기를 조심하라는 말을 몇 번이나 들었다.' },
  { k: ['trade', 'out', 'pray', 'study', 'rest', 'home', 'play', 'poor', 'kitchen', 'forge', 'family', 'train', 'site'], w: (f) => f.place === 'solaris' && f.age >= 7, t: '정오 종이 울리자 거리의 사람들이 일제히 무릎을 꿇었다. 하던 일을 멈추고 따라 했다.' },
  { k: ['study', 'magic', 'rest'], w: (f) => f.place === 'serenia', t: '창밖으로 탑 꼭대기의 마력 등불이 호수에 비쳐 흔들렸다.' },
  { k: ['trade', 'out', 'field'], w: (f) => f.place === 'leocast', t: '백색 성벽이 볕을 받아 눈이 부셨다. 성 밖 골목으로 돌아서면 냄새부터 달라졌다.' },
  { k: ['train', 'out', 'field', 'forge'], w: (f) => f.place === 'graubel', t: '성벽 위에서 교대 나팔이 울렸다. 이 도시에서는 일하는 사람도 칼을 곁에 둔다.' },
  { k: '*', w: (f) => f.place === 'hammer', t: '골짜기 어디서나 망치 소리가 들렸다. 밤이 되어도 그치지 않았다.' },
  { k: OUTDOOR, w: (f) => f.place === 'silverleaf', t: '은빛 잎사귀 사이로 빛이 조각조각 떨어졌다. 엘프들은 곁을 지나가도 발소리가 나지 않았다.' },
  { k: ['trade', 'out', 'field'], w: (f) => f.place === 'fur', t: '토템 기둥 사이로 모피 냄새와 연기가 뒤섞였다. 말이 통하지 않으면 손가락으로 값을 셌다.' },
  { k: ['out', 'trade', 'road', 'train'], w: (f) => f.place === 'eisen', t: '곧은 길마다 제국 깃발이 펄럭였다. 순찰병의 발맞춤 소리가 시계처럼 규칙적이었다.' },
  { k: ['field', 'out', 'hunt', 'rest'], w: (f) => f.frontier, s: 1.5, t: '울타리도 제대로 없는 땅이었다. 해가 지면 다들 불가로 모여들어 어둠 쪽을 등지지 않았다.' },
  { k: ['field', 'out', 'trade'], w: (f) => f.place === 'ern' && f.age >= 12, t: '지나가던 이웃이 이름을 부르며 손을 흔들었다. 이 마을에서는 누가 무엇을 하는지 모두가 안다.' },
  { k: ['field', 'out', 'trade', 'kitchen'], w: (f) => f.plague, s: 1.5, t: '돌림병 소문에 사람들이 서로 얼굴을 가까이 대지 않았다. 기침 소리만 나도 고개가 돌아갔다.' },
  // 공사장·돌일 (48단계): 밭 이야기가 끼지 않게 따로
  { k: ['site'], w: (f) => f.weather === 'rain' && grown(f), t: '비에 젖은 돌이 미끄러워 두 사람이 한 덩이를 맞들었다. 진흙 묻은 밧줄이 손바닥을 쓸었다.' },
  { k: ['site'], w: (f) => f.season === '여름' && f.weather === 'clear' && grown(f), t: '달군 돌에서 열기가 올라왔다. 감독이 물통을 돌릴 때만 다들 허리를 폈다.' },
  { k: ['site'], w: (f) => f.season === '겨울' && grown(f), t: '언 손으로 망치를 쥐니 손가락이 말을 듣지 않았다. 쉬는 참마다 모닥불에 손을 녹였다.' },
  { k: ['site'], w: (f) => f.tod === 'dawn' && grown(f), t: '날이 밝기도 전에 짐수레가 들어왔다. 첫 짐을 내릴 때 손이 아직 굳어 있었다.' },
  { k: ['site'], w: (f) => f.tod === 'dusk' && grown(f), t: '해가 기울자 감독이 끝 종을 쳤다. 먼지를 털어도 옷에서 돌가루가 자꾸 떨어졌다.' },
  { k: ['site'], w: (f) => grown(f), t: '돌 깨는 소리가 하루 종일 귀에 남았다. 저녁 밥상에서도 망치 소리가 들리는 것 같았다.' },
  { k: ['site'], w: (f) => grown(f), t: '옆 사람과 박자를 맞춰 밧줄을 당겼다. 한 사람이라도 늦으면 돌이 기울었다.' },
  // 미궁
  { k: ['depths'], w: () => true, t: '횃불이 닿지 않는 곳에서 물방울 떨어지는 소리가 났다. 다들 숨을 죽이고 그 소리를 셌다.' },
  { k: ['depths'], w: () => true, t: '돌벽에 먼저 간 사람들이 남긴 표시가 있었다. 어떤 것은 화살표였고, 어떤 것은 이름이었다.' },
  { k: ['depths'], w: (f) => f.tired, t: '땅 밑에서는 낮과 밤을 알 수 없었다. 몸이 먼저 지쳐서야 하루가 갔다는 걸 알았다.' },
  // 약탕관·술 솥
  { k: ['still'], w: () => true, t: '김이 오르는 동안 불 앞을 떠나지 못했다. 한눈을 팔면 바닥이 눌어붙는다.' },
  { k: ['still'], w: (f) => f.tod === 'night', t: '밤새 불을 지켰다. 솥이 끓는 소리를 듣다가 몇 번이나 꾸벅 졸았다.' },
  { k: ['still'], w: (f) => f.season === '여름', t: '여름이라 솥 곁에 오래 있으면 머리가 핑 돌았다. 문을 열어 두어도 김이 빠지지 않았다.' },
  // 들·숲 (약초, 짐승)
  { k: ['wild'], w: (f) => f.weather === 'rain', t: '젖은 풀이 무릎까지 감겼다. 비 냄새에 섞여 쓴 풀내가 진하게 올라왔다.' },
  { k: ['wild'], w: (f) => f.season === '봄', t: '새순이 돋은 비탈을 천천히 훑었다. 어린잎은 밟지 않으려고 발끝으로 걸었다.' },
  { k: ['wild'], w: (f) => f.season === '가을', t: '마른 덤불 사이로 열매가 붉게 매달려 있었다. 바람이 불 때마다 낙엽이 발등을 덮었다.' },
  { k: ['wild'], w: (f) => f.season === '겨울', t: '눈 덮인 들에서 짐승 발자국만 또렷했다. 입김이 목도리에 얼어붙었다.' },
  { k: ['wild'], w: (f) => f.tod === 'dawn', t: '이슬이 마르기 전에 나섰다. 풀숲을 헤칠 때마다 바짓단이 젖었다.' },
  { k: ['wild'], w: () => true, t: '바람이 풀을 한쪽으로 눕혔다. 멀리서 짐승 우는 소리가 났다가 그쳤다.' },
];
// 밭 냄새가 없는 들일 줄은 공사장(site)·들(wild) 일에도 쓴다 (48단계: 공사장 품삯 글에 '이슬 젖은 밭'이 끼던 것)
for (const e of LINES) if (Array.isArray(e.k) && e.k.includes('field') && !(typeof e.t === 'string' && FARMY.test(e.t))) { if (!e.k.includes('site')) e.k.push('site'); if (!e.k.includes('wild') && !/짐|돌|망치/.test(typeof e.t === 'string' ? e.t : '')) e.k.push('wild'); }
// 날씨·철·고장을 타지 않는 싸움 줄은 미궁(depths)에도 쓴다
for (const e of LINES) if (Array.isArray(e.k) && e.k.includes('hunt') && !e.k.includes('depths') && !/weather|season|tod|sea|place|frontier|month/.test(String(e.w))) e.k.push('depths');
// 손님·그릇·부엌 일 이야기가 없는 화덕 줄은 약탕관·술 솥(still)에도 쓴다
for (const e of LINES) if (Array.isArray(e.k) && e.k.includes('kitchen') && !e.k.includes('still') && !(typeof e.t === 'string' && /손님|그릇|부엌 일|주방|접시|국자/.test(e.t))) e.k.push('still');

// ---------- 처음 해 보는 일 ----------
// acts: 그 행동을 처음 했을 때. t는 결과 글 앞에 붙는 짧은 장면, hist는 삶의 기록 한 줄.
export const FIRSTS = [
  {
    id: 'wage', minAge: 9,
    acts: ['day_labor', 'inn_kitchen', 'work', 'poor_labor', 'works_labor', 'herd_work', 'cuisine_cook', 'inn_work', 'spell_work', 'slums', 'sea_deck', 'graubel_forge'],
    t: (f) => (f.age < 16
      ? '처음으로 내 손으로 번 돈을 받았다. 동전 몇 닢이 손바닥 위에서 따뜻했다. 집에 가는 내내 주머니를 만지작거렸다.'
      : '처음으로 남의 일을 해 주고 품삯을 받았다. 생각보다 적었고, 생각보다 뿌듯했다.'),
    hist: '처음으로 내 손으로 번 돈을 받았다.',
  },
  {
    id: 'trade', minAge: 10,
    acts: ['trade_market', 'cargo', 'voc_potions', 'voc_pelts', 'farm_market', 'herd_market', 'wilds_sell', 'explore_sell', 'apo_shop', 'beast_sell', 'silverleaf_trade'],
    t: '처음으로 내 물건을 펼쳐 놓고 손님을 기다렸다. 누가 집었다가 내려놓을 때마다 가슴이 내려앉았다.',
    hist: '처음으로 내 물건을 팔아 보았다.',
  },
  {
    id: 'hunt', minAge: 10,
    acts: ['wilds_hunt', 'voc_traps', 'beast_hawking', 'wilds_nest'],
    t: '처음 사냥에 나선 날이었다. 숲은 아는 숲인데 다르게 들렸다. 바스락 소리마다 심장이 먼저 뛰었다.',
    hist: '처음으로 사냥을 나갔다.',
  },
  {
    id: 'drink', minAge: 14,
    acts: ['barka_harbor', 'deep_tavern', 'pirate_den', 'repute_boast'],
    t: '처음으로 어른들 틈에 끼어 술잔을 받았다. 목구멍이 타는 것 같았지만 얼굴에 드러내지 않으려 애썼다. 돌아가는 길은 조금 기울어 있었다.',
    hist: '처음으로 주점에서 술잔을 받았다.',
  },
  {
    id: 'sword', minAge: 6,
    acts: ['sword_father', 'sword_guard', 'harfen_dojo', 'leocast_dojo', 'sword_school_join', 'sword_school_train', 'verden_yard'],
    t: '처음 쥐어 본 검은 생각보다 무거웠다. 휘두르는 것보다 멈추는 것이 더 어려웠다.',
    hist: '처음으로 검을 손에 쥐었다.',
  },
  {
    id: 'mana', minAge: 5,
    acts: ['meditate', 'magic_lesson', 'magic_selfstudy'],
    t: (f) => (f.awake
      ? '처음으로 몸 안의 마력을 더듬어 보았다. 가슴 아래 어딘가에서 미지근한 것이 움직였다가 사라졌다. 착각이었는지 밤새 생각했다.'
      : '처음으로 눈을 감고 마력을 찾아보았다. 아무것도 느껴지지 않았다. 처음엔 다들 그렇다고 했지만, 그 말이 위로가 되지는 않았다.'),
    hist: '처음으로 마력을 더듬어 보았다.',
  },
  {
    id: 'quest', minAge: 14,
    acts: ['quest', 'party_quest'],
    t: '처음으로 의뢰를 받아 길을 나섰다. 길드 게시판에서 떼어 낸 종이를 몇 번이나 다시 읽었다. 돌아올 무렵 그 종이는 땀에 젖어 있었다.',
    hist: '처음으로 의뢰를 받았다.',
  },
  {
    id: 'delve', minAge: 14,
    acts: ['delve', 'deep_descend'],
    t: '미궁 입구의 찬 바람이 얼굴을 쓸었다. 횃불이 닿지 않는 곳에서 무언가 움직였다. 처음 들어가는 사람은 다들 숨을 너무 크게 쉰다고 했다.',
    hist: '처음으로 미궁에 들어갔다.',
  },
  {
    id: 'sea', minAge: 6,
    acts: ['sail', 'sea_deck'],
    t: '처음 배에 올랐다. 땅이 보이지 않게 되자 속이 뒤집혔다. 이틀째가 되어서야 수평선을 똑바로 볼 수 있었다.',
    hist: '처음으로 배를 탔다.',
  },
  {
    id: 'road', minAge: 8,
    acts: ['on_road'],
    t: '처음으로 집을 멀리 떠나 길에서 밤을 보냈다. 하늘은 고향과 같은데 들리는 소리는 하나도 같지 않았다.',
    hist: '처음으로 고향을 멀리 떠나 길에서 잤다.',
  },
  {
    id: 'jail', minAge: 10,
    acts: ['jail_endure', 'jail_labor', 'jail_talk'],
    t: '철창 안에서 처음 맞는 밤이었다. 벽 너머에서 누군가 밤새 기침을 했다. 잠은 새벽녘에야 들었다.',
    hist: '처음으로 옥에 갇혀 밤을 보냈다.',
  },
  {
    id: 'beg', minAge: 6,
    acts: ['poor_beg'],
    t: '처음으로 길에 앉아 손을 내밀었다. 동전을 못 받는 것보다 사람들이 눈을 피하는 것이 더 아팠다.',
    hist: '처음으로 길에서 구걸했다.',
  },
  {
    id: 'mine', minAge: 12,
    acts: ['mine_deep', 'mine_dwarf'],
    t: '처음으로 갱도 깊이 내려갔다. 등불 밖은 온통 어둠이었고, 머리 위 돌의 무게가 살갗으로 느껴졌다.',
    hist: '처음으로 땅 밑 갱도에 내려갔다.',
  },
  {
    id: 'arena', minAge: 14,
    acts: ['contest_arena', 'eisen_arena'],
    t: '처음으로 투기장 모래 위에 섰다. 함성이 사방에서 쏟아져 내 숨소리조차 들리지 않았다.',
    hist: '처음으로 투기장에 섰다.',
  },
  {
    id: 'gamble', minAge: 14,
    acts: ['contest_gamble'],
    t: '처음으로 도박판에 앉았다. 주사위가 구르는 동안 숨 쉬는 것도 잊었다.',
    hist: '처음으로 도박판에 앉았다.',
  },
  {
    id: 'stage', minAge: 10,
    acts: ['voc_busk', 'troupe_show'],
    t: '처음으로 낯선 사람들 앞에서 목소리를 냈다. 첫 소절에서 목이 갈라졌다. 그래도 끝까지 했다.',
    hist: '처음으로 사람들 앞에서 노래했다.',
  },
  {
    id: 'cathedral', minAge: 5,
    acts: ['solaris_mass'],
    t: '처음으로 대성당에 들어섰다. 천장이 너무 높아 고개가 저절로 젖혀졌다. 수천 사람의 기도 소리가 한 사람의 목소리처럼 울렸다.',
    hist: '처음으로 솔라리스 대성당에서 미사를 드렸다.',
  },
  {
    id: 'date', minAge: 15,
    acts: ['love_date'],
    t: '처음으로 마음에 둔 사람과 단둘이 걸었다. 무슨 말을 했는지는 기억나지 않고, 손등이 몇 번 스친 것만 기억났다.',
    hist: '처음으로 마음에 둔 사람과 단둘이 걸었다.',
  },
];

// ---------- 달 요약 한 줄 ----------
export const SKY = {
  blizzard: '눈보라에 길이 막힌 달이었다.',
  snow: '눈이 자주 내린 달이었다.',
  rain: '비가 잦은 달이었다.',
  storm: '천둥 번개가 잦은 달이었다.',
  fog: '아침마다 안개가 깔린 달이었다.',
  wind: '바람이 거센 달이었다.',
  cloudy: '하늘이 내내 낮게 내려앉아 있던 달이었다.',
};
export const CLEAR = {
  봄: '볕이 좋아 들이 하루가 다르게 푸르러진 달이었다.',
  여름: '더위가 길게 이어진 달이었다.',
  가을: '하늘이 높고 맑은 달이었다.',
  겨울: '맑지만 뼈가 시린 추위가 이어진 달이었다.',
};

// ---------- 지금 이 달의 감각 한 줄 (화면 '오늘의 장면'용, 지금 시제) ----------
// [날씨][때] → 문장. 없는 칸은 날씨만 보고 고른다.
export const NOW_SKY = {
  clear: {
    dawn: { 봄: '새벽 들판에 엷은 김이 오른다. 어디선가 종다리가 운다.', 여름: '해 뜨기 전인데도 공기가 벌써 미지근하다.', 가을: '새벽 서리가 풀잎 끝에 하얗게 앉았다.', 겨울: '새벽 공기가 칼날처럼 차다. 숨을 쉴 때마다 콧속이 얼얼하다.' },
    day: { 봄: '볕이 따뜻하다. 바람에 꽃가루와 흙냄새가 섞여 온다.', 여름: '한낮 볕이 뜨겁다. 그늘마다 개가 늘어져 있다.', 가을: '하늘이 높고 맑다. 마른 잎이 발밑에서 바스락거린다.', 겨울: '맑지만 볕에 온기가 없다. 그늘진 길은 아직 얼어 있다.' },
    dusk: { 봄: '해가 기울며 하늘이 복숭앗빛으로 물든다. 굴뚝마다 저녁 연기가 오른다.', 여름: '해 질 녘이 되어서야 더위가 한풀 꺾인다. 풀벌레가 울기 시작한다.', 가을: '노을이 길게 깔리고 바람이 금세 차가워진다.', 겨울: '해가 일찍 떨어진다. 창마다 불이 하나둘 켜진다.' },
    night: { 봄: '밤공기가 부드럽다. 개구리 울음이 논에서 올라온다.', 여름: '별이 쏟아질 듯하다. 밤인데도 풀벌레 소리에 귀가 따갑다.', 가을: '밤하늘이 맑고 깊다. 달빛에 지붕이 하얗다.', 겨울: '별이 시리게 빛난다. 발밑에서 언 땅이 뽀득거린다.' },
  },
  rain: { any: '빗소리가 지붕을 두드린다. 길마다 흙탕물이 고였다.', night: '어둠 속에서 빗소리만 들린다. 처마 끝 낙숫물이 쉬지 않는다.' },
  storm: { any: '먹구름이 낮게 깔렸다. 멀리서 천둥이 우르릉거린다.', night: '번개가 칠 때마다 온 세상이 하얗게 드러났다 사라진다.' },
  snow: { any: '눈이 소리 없이 내려 쌓인다. 발자국이 금세 지워진다.', night: '밤새 눈이 내렸다. 창밖이 달빛보다 환하다.' },
  blizzard: { any: '눈보라가 몰아쳐 한 치 앞이 보이지 않는다. 문을 열기도 어렵다.' },
  fog: { any: '안개가 짙어 몇 걸음 앞도 흐릿하다. 소리만 먼저 닿는다.' },
  wind: { any: '바람이 거세다. 덧문이 덜컹거리고 마른 먼지가 날린다.' },
  cloudy: { any: '하늘이 잿빛으로 낮게 내려앉았다. 금방이라도 무언가 쏟아질 것 같다.' },
};
export const NOW_BODY = {
  leg: (n) => `${n} 쪽이 시큰거린다.`,
  arm: (n) => `${n} 쪽에 힘이 잘 들어가지 않는다.`,
  back: () => '등이 뻣뻣하게 당긴다.',
  head: () => '머리가 묵직하게 지끈거린다.',
  sick: () => '몸 안이 아직 개운하지 않다.',
  wound: () => '아물지 않은 상처가 옷에 쓸린다.',
};
