// 11단계 '무엇을 할 수 있나' 안내: 지금 나이·사는 곳·처지에서 해 볼 수 있는 일과 갈 수 있는 길을 한눈에.
// 읽기만 한다. 다른 고장·다른 나이에서 되는지는 게임을 통째로 베낀 것(JSON)에서 고장과 나이만 바꿔 행동의 available()을 물어본다.
import { ACTIONS } from '../actions.js';
import { WORK } from '../jobs.js';
import { PLACES, travelMonths } from '../places.js';
import { L } from '../adventure/core.js';
import { me, playerAge } from '../game.js';
import { isJailed } from '../crime.js';
import { actionIcon } from '../art/icons.js';
import { J } from '../narrative/text.js';
import { groupNameOf } from './plan.js';
import { esc } from './util.js';

// 갈래: 이름, 하는 일, 묶음 행동, 아무 데서도 안 될 때 보일 말
const PATHS = [
  { id: 'magic', name: '마법과 서클', what: '마력을 다듬어 서클을 이룬다. 서클을 이룬 마법사는 드물다.', acts: ['meditate', 'magic_lesson', 'magic_selfstudy', 'spell_study', 'circle_exam'], lock: '마력을 깨닫는 것이 먼저다. 마력은 어릴 때 우연히, 또는 오랜 수련 끝에 깨어난다.' },
  { id: 'tower', name: '마탑', what: '마탑에 들어가 견습 마도사로 산다. 탑 일을 하며 공을 쌓고, 서클 공인을 받고, 마도구를 만든다.', acts: ['tower_join', 'tower_duty', 'tower_exam', 'tower_craft'], lock: '열네 살부터, 마력을 깨닫고 마법 솜씨를 15쯤 쌓으면 마탑이 있는 고장에서 문을 두드릴 수 있다.' },
  { id: 'sword', name: '검술 유파', what: '유파에 들어가 검을 배우고 단을 딴다. 겨루기와 결투도 있다.', acts: ['sword_school_join', 'sword_school_train', 'sword_rank_test', 'sword_spar', 'sword_father', 'sword_guard'], lock: '여덟 살부터, 유파의 사범이 있는 고장에서 들어갈 수 있다.' },
  { id: 'army', name: '왕국군', what: '모병소에서 입대해 세 해 동안 창을 든다. 공을 세우면 십인장, 백인장으로 오르고, 원정을 떠난다.', acts: ['army_enlist', 'army_resign'], lock: '열여섯 살부터 마흔두 살까지, 병영이 있는 고장의 모병소에서 입대할 수 있다.' },
  { id: 'aftermath', name: '전쟁 뒤의 삶', what: '전쟁이 끝나면 끌려간 사람이 돌아오거나 돌아오지 못한다. 불탄 고장을 다시 세우고, 전쟁 과부와 고아를 돕고, 술과 악몽을 이겨 내고, 상처를 증명해 연금을 청한다.', acts: ['aftermath_rebuild', 'aftermath_aid', 'aftermath_sober', 'aftermath_petition'], lock: '다시 세우기는 열네 살부터 불탄 고장에서, 돕기는 열다섯 살부터 과부나 고아가 있는 고장에서, 술 끊기는 술에 기댈 때, 청원은 열여섯 살부터 몸에 상처가 있을 때 왕도·하르펜·베르덴에서 한 번.' },
  { id: 'inn', name: '주점과 여관', what: '돈을 모아 내 주점이나 여관을 산다. 값을 매기고, 일꾼과 단골을 두고, 세금과 패거리의 자릿세, 경쟁 가게를 견딘다. 뒷방에 노름판을 열거나 밀수품을 숨길 수도 있다. 가게는 자식에게 물려준다.', acts: ['inn_open', 'inn_work', 'inn_manage'], lock: '집값이 있는 고장에서 가게 값만큼 돈이 있으면 연다. 가게 일과 꾸리기는 가게가 있는 고장에서.' },
  { id: 'wilds', name: '마물 사냥', what: '고장마다 마물이 늘고 줄며 둥지가 생기고 떼가 옮겨 다닌다. 마물을 사냥해 부산물을 모아 팔고, 사냥꾼 길드 현상금을 받고, 둥지를 치고, 마물에게 내준 작은 마을을 되찾는다.', acts: ['wilds_hunt', 'wilds_nest', 'wilds_sell', 'wilds_reclaim'], lock: '사냥은 마물이 이따금이라도 나오는 고장에서, 둥지 치기는 둥지가 있을 때, 팔기는 장터가 있는 고장에서, 되찾기는 근처에 버려진 마을이 있을 때.' },
  { id: 'secret', name: '비밀과 이중생활', what: '다른 이름과 출신으로 살거나, 다른 고장에 두 집 살림을 차리거나, 밤에는 의적·밀정·이단의 가면을 쓴다. 비밀마다 들킬 위험이 쌓이고, 아는 사람이 늘수록 위험하다. 들통나면 배우자·평판·법이 따라 움직이고, 집안 비밀은 대를 넘어 드러나기도 한다.', acts: ['secret_alias', 'secret_twohome', 'secret_mask', 'secret_night', 'secret_unmask'], lock: '다른 이름은 열여섯 살부터 태어난 고장을 떠나서, 두 집 살림은 열여덟 살부터 혼인한 몸에 몰래 만나는 사람이 있을 때, 밤의 얼굴은 열여섯 살부터.' },
  { id: 'troupe', name: '유랑극단', what: '떠돌이 극단에 들어가 광대·곡예·악사·배우로 무대에 서거나, 마차를 사서 내 극단을 꾸린다. 고장마다 관객의 입맛이 다르고, 귀족 연회에 불려 가기도 한다. 풍자극은 박수와 검열을 함께 부른다.', acts: ['troupe_join', 'troupe_found', 'troupe_show', 'troupe_manage'], lock: '극단이 와 있는 고장에서 찾아가거나, 무대가 서는 고장에서 돈을 모아 꾸린다. 무대와 살림은 극단에 들어가 있을 때.' },
  { id: 'dragon', name: '용의 땅', what: '천룡 산맥 서쪽, 몇 남지 않은 용왕들이 잠든 땅으로 오른다. 용골 계곡의 뼈, 용을 섬기는 무리, 아는 용의 굴이 있다. 용과 말을 섞을 수도, 보물을 노릴 수도, 칼을 들 수도 있다. 용은 오래 기억한다.', acts: ['dragon_climb'], lock: '구렁목이나 쇠망치 골, 산맥 아래 문턱 고장에서 오른다.' },
  { id: 'guild', name: '소속 (기사단·교단·상단·길드)', what: '큰 무리에 들어가 그 안에서 오른다. 소속이 있어야 하는 일자리도 있다.', acts: ['faction_door'], lock: '어른(열다섯 살)이 되면 찾아갈 수 있다.' },
  { id: 'adventure', name: '모험과 동료', what: '동료를 모아 의뢰를 받고, 폐허와 미궁에 들어간다.', acts: ['gather_party', 'party_manage', 'party_quest', 'quest', 'delve', 'gear'], lock: '어른이 되면 동료를 모을 수 있다. 의뢰는 모험가 길드에 들어가야 받는다.' },
  { id: 'deep', name: '깊은 구렁', what: '끝이 없다는 구렁으로 내려간다. 아래로 갈수록 값진 것과 위험한 것이 함께 있다.', acts: ['deep_descend', 'deep_tavern', 'deep_market', 'deep_throne'], lock: '어른이 되어 구렁목까지 가야 한다.' },
  { id: 'explore', name: '지도에 없는 땅', what: '원정대를 꾸려 미지의 땅으로 간다. 옛 문명의 유적을 찾아 팔거나, 학계에 바치거나, 숨긴다.', acts: ['explore_plan', 'explore_sell', 'explore_give', 'explore_unhide'], lock: '어른이 되어 지도의 끝 고장(에스텔라 폐허, 은잎 마을, 쇠망치 골, 소금바위섬 등)에서 원정대를 꾸릴 수 있다.' },
  { id: 'sea', name: '바다', what: '배를 타고 먼 항구로 가고, 짐을 나르고, 해적을 쫓거나 해적이 된다.', acts: ['sail', 'shipyard', 'cargo', 'sea_bounty', 'pirate_den', 'pirate_raid', 'serpent_lair'], lock: '어른이 되어 항구 고장에 가야 한다.' },
  { id: 'peoples', name: '다른 종족의 땅', what: '엘프의 숲, 드워프의 산, 수인의 초원에서 살며 그 땅의 말과 풍습을 익히고 의식에 함께한다.', acts: ['peoples_custom', 'peoples_rite'], lock: '여덟 살부터, 은잎 마을·쇠망치 골·털가죽 시장 같은 종족의 땅에 가면 풍습을 익힐 수 있다.' },
  { id: 'faith', name: '믿음', what: '신전에서 기도하고 축일을 지킨다. 믿음이 깊어지면 순례를 떠난다.', acts: ['pray', 'worship', 'keep_feast', 'pilgrimage', 'faith_seek', 'holy_heal'], lock: '다섯 살부터 기도할 수 있다.' },
  { id: 'court', name: '궁정', what: '궁정에 드나들며 편을 고르고, 혼담을 넣고, 음모를 꾸민다.', acts: ['court_attend', 'court_side', 'court_match', 'court_plot'], lock: '궁정이 있는 도읍에서, 작위나 관직이나 이름값으로 문이 열린다.' },
  { id: 'domain', name: '작위와 영지', what: '작위를 얻어 영지를 다스리고, 나라를 세울 수도 있다.', acts: ['buy_title', 'domain_rule', 'domain_build', 'pioneer', 'realm_office'], lock: '이름값을 30까지 쌓으면 왕도에서 작위를 살 수 있다. 공을 세워 받기도 한다.' },
  { id: 'shop', name: '장사와 가게', what: '솜씨로 가게를 내고 꾸린다.', acts: ['open_shop', 'shop_manage'], lock: '팔 만한 솜씨와 밑천이 있어야 가게를 낼 수 있다.' },
  { id: 'estate', name: '집과 재산', what: '집을 옮기고, 땅과 가게를 세놓고, 돈을 빌리거나 맡긴다.', acts: ['housing', 'estate_manage', 'estate_borrow', 'estate_invest'], lock: '어른이 되면 집을 옮길 수 있다.' },
  { id: 'research', name: '연구와 발명', what: '공방과 학당에서 새 물건과 새 술식을 궁리한다.', acts: ['research'], lock: '열네 살부터, 연구할 곳이 있는 고장에서 글이나 손재주를 갖추면 된다.' },
  { id: 'legend', name: '이름난 스승', what: '세상에 이름난 사람에게 직접 배운다.', acts: ['legend_lesson'], lock: '열두 살부터, 큰 인물이 머무는 고장에서 그가 받아 줄 때.' },
  { id: 'love', name: '사랑과 혼인', what: '마음에 둔 사람을 만나고, 고백하고, 혼인한다. 배우자도 저만의 일과 바람이 있다.', acts: ['love_date', 'love_spouse', 'love_grave'], lock: '어른이 되어 마음이 가는 사람이 생기면 만나러 갈 수 있다. 사람들과 자주 어울리면 인연이 생긴다.' },
  { id: 'kin', name: '가정과 자식', what: '자식과 시간을 보내고, 무엇을 가르칠지 정하고, 유언을 남긴다.', acts: ['kin_time', 'kin_adopt', 'kin_will'], lock: '자식이 생기거나, 어른이 되어 아이를 거둘 수 있을 때.' },
  { id: 'repute', name: '평판', what: '이름을 알리고, 잔치를 열고, 나쁜 소문을 바로잡는다.', acts: ['repute_boast', 'repute_feast', 'repute_clear'], lock: '고장 사람들이 나를 알아야 한다.' },
  { id: 'nature', name: '철마다 다른 살림', what: '봄에는 파종을 거들고, 장마 앞에 둑을 쌓고, 가을걷이를 하고, 겨울을 날 땔감과 먹을 것을 쟁인다. 가뭄·홍수·혹한 같은 재앙은 고장마다 찾아온다.', acts: ['nature_sow', 'nature_dike', 'nature_harvest', 'nature_winterprep'], lock: '철이 맞아야 한다: 파종 3~4월, 둑 6~7월, 가을걷이 9~10월, 겨울 준비 9~11월.' },
  { id: 'beasts', name: '짐승과 함께', what: '개·말·매를 기르고, 마수를 길들여 팔거나 곁에 두고, 마법사라면 사역마를 부른다. 길든 말은 길을 줄이고, 군마가 있으면 기병이 된다.', acts: ['beast_buy', 'beast_care', 'beast_ride', 'beast_hawking', 'beast_familiar', 'beast_sell'], lock: '장터에서 짐승을 들인다(아이는 열 살부터 개만). 사역마는 1서클부터.' },
  { id: 'health', name: '병과 의술', what: '앓을 때 몸조리를 하고, 나나 식구를 의원·약초꾼·신전·치유 마법사 중 누구에게 맡길지 정한다. 병이 도는 고장에서는 병자를 돌볼 수 있다. 큰 병은 낫지 않는 몸이나 집안 내력을 남기기도 한다.', acts: ['health_rest', 'health_seek', 'health_tend'], lock: '몸조리는 앓을 때, 치료 구하기는 열두 살부터 나나 식구가 앓을 때, 병자 돌보기는 열네 살부터 병이 도는 고장에서.' },
  { id: 'oath', name: '맹세와 의형제', what: '가까운 벗과 피를 섞어 의형제를 맺고, 영주나 국왕에게 무릎을 꿇어 가신이 되고, 이름이 나면 내 가신을 받는다. 신앙이 깊으면 서원을 세우고, 다른 집안과 대를 넘는 약속을 맺는다. 지키면 값을 치르고, 깨면 낙인이 남는다.', acts: ['oath_blood', 'oath_liege', 'oath_man', 'oath_vow', 'oath_pact'], lock: '열여섯 살부터. 의형제는 아주 가까운 벗이 있어야, 서원은 신앙이 깊어야, 가신 받기는 스무 살에 이름이나 영지가 있어야, 집안 약속은 스물다섯 살부터.' },
  { id: 'elder', name: '늙음과 마지막 해들', what: '몸과 기억을 돌보고, 일에서 물러나고, 지난 사람들을 찾아가 묵은 일을 풀고, 마지막 여행을 떠나고, 회고록을 쓰고, 장례 방식을 정한다. 집안 무덤에 성묘도 간다.', acts: ['elder_care', 'elder_retire', 'elder_visit', 'elder_journey', 'elder_memoir', 'elder_funeral', 'elder_tomb'], lock: '쉰 살 무렵부터 열린다. 성묘는 집안 무덤이 생기면 언제든.' },
  { id: 'omen', name: '예언과 징조', what: '하늘과 땅의 징조를 풀어 참된 것인지 헛것인지 가린다. 장터에서 예언을 하면 맞힐 때마다 이름이 나지만, 어긋나면 거짓 예언자가 된다. 세상에 도는 세 예언 속 사람으로 나나 내 자식이 지목되기도 한다.', acts: ['omen_read', 'omen_preach'], lock: '어른이 되면. 징조 풀이는 글을 좀 읽거나 징조가 돌 때, 예언하기는 고을에서 알릴 만한 징조가 있을 때.' },
  { id: 'house', name: '내 집 마련과 살림', what: '땅값이 싼 고장에 오두막을 짓거나 제대로 된 집을 짓는다. 집에 화덕 부엌·텃밭·우물·돌담·서재·작업장 같은 살림을 들이고, 이웃과 지내고, 불과 도둑을 막는다. 집은 대를 넘어 남고, 다른 고장으로 이사할 수도 있다.', acts: ['house_build', 'house_room', 'house_move'], lock: '집 짓기와 이사는 열여섯 살부터, 방 들이기는 내 집에 살 때.' },
  { id: 'household', name: '하인과 식솔', what: '내 집에 하녀·머슴, 유모, 집사, 마부, 찬모, 문지기를 들이고, 상을 주거나 내보낸다. 하인에게도 마음이 있어 불만이 쌓이면 훔치거나 엿듣는다. 대를 이어 우리 집을 섬기는 집안도 생긴다. 거꾸로 내가 큰 집안의 하인으로 들어가 몸종·집사까지 오를 수도 있다.', acts: ['household_hire', 'household_manage', 'household_serve'], lock: '열여섯 살부터. 하인은 내 집이 있는 고장에서, 큰 집안 하인은 그런 집안이 있는 고장에서.' },
  { id: 'law', name: '법과 재판', what: '나라마다 법정이 다르다. 억울한 일을 당하면 고발하고, 법을 배워 남의 변론을 맡는다. 붙잡히면 재판을 청할 수 있고, 고장에 따라 결투 재판·신명 재판·진실의 주문으로 가린다. 뇌물과 사면도 있다. 판결은 집안에 낙인으로 남는다.', acts: ['law_sue', 'law_study', 'law_advocate'], lock: '고발은 고을에서 억울한 일이 있거나 원수가 있을 때, 법 배우기는 고을에서 글을 조금 읽으면, 변론은 큰 도시에서 법 솜씨가 쌓이면.' },
  { id: 'school', name: '학원과 시험', what: '학원에 들어가 세 해 동안 수업을 듣고 해마다 학년 시험을 본다. 기사 서임 시험, 관리 시험, 장인 시험으로 자격을 얻는다. 함께 공부한 동문은 평생 얽히고, 맞수가 생기기도 한다.', acts: ['school_study', 'school_exam'], lock: '시험은 그 시험이 열리는 고장에서, 수업은 학원에 다닐 때.' },
  { id: 'poor', name: '밑바닥에서 살기', what: '돈이 떨어지면 구걸하고, 무료 급식 줄에 서고, 날품을 판다. 빈민가 사람들과 정이 들고, 거지 왕초에게 몫을 내야 할 수도 있다. 빚을 못 갚으면 노역장에서 몸으로 갚는다. 부자가 되면 가난한 이를 돕거나 구빈원을 세울 수도, 밑바닥 사람을 싸게 부릴 수도 있다.', acts: ['poor_beg', 'poor_soup', 'poor_labor', 'poor_bond_work', 'poor_alms', 'poor_hire'], lock: '구걸과 급식은 빈털터리일 때, 날품은 열두 살부터 일자리가 없을 때, 베풀기는 은화 150닢부터, 사람 부리기는 빈민가가 있는 고장에서 은화 100닢부터.' },
  { id: 'letters', name: '편지와 먼 인연', what: '다른 고장에 사는 식구·자식·벗·옛사랑과 편지를 주고받는다. 편지는 몇 달씩 걸리고, 길에서 잃어버리거나 남이 뜯어보기도 한다. 답장을 미루면 사이가 식는다. 글솜씨가 있으면 증서나 연서를 꾸밀 수도 있다.', acts: ['letters_write', 'letters_forge'], lock: '멀리 사는 아는 사람이 있으면. 글을 모르면 대서방에 맡긴다. 문서 꾸미기는 열다섯 살부터 글솜씨가 있어야.' },
  { id: 'mystery', name: '풀리지 않은 일', what: '고장에서 벌어진 실종·독살·도난·유령 소문을 캔다. 현장을 살피고 사람들을 캐물어 단서를 모은다. 캐물을수록 진범이 나를 알아채고, 돈을 내밀거나 보복한다. 엉뚱한 사람을 범인으로 몰 수도 있다. 못 푼 일은 대를 넘어 남는다.', acts: ['mystery_probe'], lock: '열네 살부터, 사는 고장에 풀리지 않은 일이 생기면.' },
  { id: 'contest', name: '내기와 겨루기', what: '여관에서 주사위·카드로 내기를 하고, 투기장에서 싸우고, 활쏘기·씨름·사냥·마상 시합 같은 고장 대회에 나간다. 노름 버릇과 빚, 승부 조작도 있다.', acts: ['contest_gamble', 'contest_arena', 'contest_fair'], lock: '노름은 열다섯 살부터 여관이 있는 고장에서, 투기장은 열여섯 살부터 투기장이 있는 도시에서, 고장 대회는 열리는 달에 그 고장에서.' },
  { id: 'village', name: '이웃과 마을 살이', what: '사는 고장에서 이웃 일을 거들고, 마을 일을 맡고, 회의에서 목소리를 낸다. 우리 사람으로 여겨지면 촌장으로 나설 수 있다.', acts: ['village_help', 'village_duty', 'village_rule'], lock: '부모 집·셋방·내 집에 살아야 이웃이 된다. 마을 일은 얼굴은 아는 이웃부터, 송사는 촌장이 되면 본다.' },
  { id: 'trade', name: '장사 길과 상단', what: '고장마다 다른 시세를 보고 싸게 사서 비싸게 판다. 마차·호위·짐꾼으로 대상단을 꾸리고, 도적과 통행세를 넘어, 지점을 둔 큰 상회로 키운다.', acts: ['trade_market', 'trade_caravan', 'trade_house'], lock: '열네 살부터 장터가 있는 고장에서 사고판다. 대상단은 큰 고장에서, 상회는 장사로 300닢을 남긴 뒤에 세운다.' },
  { id: 'arts', name: '글과 예술', what: '역사서·마법서·여행기·시집·노래·그림·조각을 짓는다. 후원자를 찾고, 작품은 세상에 남아 대를 넘어 읽힌다. 풍자나 금기는 금서가 될 수 있다.', acts: ['arts_begin', 'arts_work', 'arts_seek_patron', 'arts_read'], lock: '열네 살부터, 글·마법·음악·그림 중 하나에 솜씨가 붙으면 작품을 구상할 수 있다. 후원자는 왕도·하르펜·솔라리스 같은 큰 도시에서 찾는다.' },
  { id: 'mentor', name: '제자와 문하', what: '솜씨가 무르익으면 제자를 들여 가르치고, 내 이름을 단 도장·학파·공방을 세운다. 문파는 대를 넘어 남는다.', acts: ['mentor_take', 'mentor_teach', 'mentor_found', 'mentor_heritage'], lock: '스무 살부터, 검술·마법(2서클)·글·약초·대장일·요리·장사 중 하나가 숙련(45)에 이르면 제자를 들일 수 있다.' },
  { id: 'feud', name: '원수와 복수', what: '나를, 내 집안을 미워하는 사람에게 복수를 꾸미거나 화해를 청한다. 원한은 대를 잇기도 한다.', acts: ['feud_plot', 'feud_reconcile'], lock: '원한을 품은 사람이 생기면 열린다. 원한은 다툼, 배신, 선대의 빚에서 생긴다.' },
  { id: 'war', name: '용병과 전쟁', what: '전쟁 중인 나라에 칼을 판다.', acts: ['pol_merc'], lock: '열여섯 살부터, 전쟁 중인 나라가 용병을 구할 때.' },
  { id: 'seal', name: '봉인 조사', what: '마신의 봉인에 얽힌 기록과 조짐을 캔다.', acts: ['seal_study'], lock: '봉인이 흔들린다는 소문이 돌고, 글이나 마법을 갖추면 서고나 마탑에서 할 수 있다.' },
  { id: 'dark', name: '어두운 길', what: '소매치기부터 조직의 일까지. 들키면 감옥에 간다.', acts: ['crime_pickpocket', 'crime_burglary', 'crime_fraud', 'crime_snoop', 'gang_seek', 'gang_job', 'dawn_rite', 'repute_slander', 'forbidden_rite'], lock: '여덟 살부터 소매치기를 할 수 있다. 조직은 그런 무리가 있는 고장에서.' },
];
const PATH_ACTS = new Set(PATHS.flatMap((p) => p.acts));
// 어디서나 하는 흔한 일 (이 고장만의 일로 치지 않는다)
const COMMON = new Set(['play', 'help_home', 'study', 'train_body', 'rest', 'wander', 'visit', 'travel', 'on_road', 'seek_job', 'work', 'day_labor', 'inn_kitchen', 'herbs', 'drift_years', 'era_shop', 'crime_lie_low', 'crime_surrender', 'jail_endure', 'jail_labor', 'jail_talk', 'jail_escape']);

const can = (g, id) => { const a = ACTIONS.find((x) => x.id === id); if (!a) return false; try { return !!(a.available?.(g) ?? true); } catch { return false; } };

// 게임을 베껴 고장·나이만 바꿔 가며 물어본다. 열 때 한 번만 계산한다.
function survey(game) {
  const here = L(game).place;
  const age = playerAge(game);
  const nowAll = new Set(ACTIONS.filter((a) => can(game, a.id)).map((a) => a.id));
  let clone;
  try { clone = JSON.parse(JSON.stringify(game)); } catch { return { here, age, nowAll, where: {}, adultHere: new Set() }; }
  const cl = L(clone);
  cl.travel = null;
  if (clone.crime) clone.crime.jailed = null;
  // 어른 나이로 (이미 어른이면 그대로)
  const meC = me(clone);
  if (meC && meC.ageMonths < 16 * 12) meC.ageMonths = 16 * 12;
  const ids = ACTIONS.map((a) => a.id).filter((id) => !COMMON.has(id));
  const where = {};
  const adultHere = new Set();
  for (const p of Object.keys(PLACES)) {
    cl.place = p;
    if (cl.queue) cl.queue = [];
    for (const id of ids) {
      if (!can(clone, id)) continue;
      (where[id] ??= []).push(p);
      if (p === here) adultHere.add(id);
    }
  }
  return { here, age, nowAll, where, adultHere };
}

const dist = (a, b) => { try { return travelMonths(a, b); } catch { return 99; } };
const pname = (p) => PLACES[p]?.name ?? p;
function placeList(list, here, max = 4) {
  const s = [...new Set(list)].filter((p) => p !== here).sort((a, b) => dist(here, a) - dist(here, b));
  if (!s.length) return '';
  const names = s.slice(0, max).map((p) => `${pname(p)}${dist(here, p) < 99 ? ` (${dist(here, p)}달)` : ''}`);
  return `${names.join(', ')}${s.length > max ? ` 외 ${s.length - max}곳` : ''}`;
}

function jobsBlock(game, sv) {
  const here = sv.here;
  const adult = sv.age >= 15;
  const cur = L(game).job?.id;
  const jobs = Object.values(WORK).filter((d) => !d.faction && Array.isArray(d.places));
  const local = jobs.filter((d) => d.places.includes(here));
  const row = (d) => {
    let why = null;
    try { why = d.req?.(game) ?? null; } catch { why = null; }
    const st = d.id === cur ? ['지금 하는 일', 'on'] : !adult ? ['어른이 되면', 'later'] : why ? [`조건: ${why}`, 'later'] : ['지금 얻을 수 있다', 'now'];
    const wage = Math.round((d.wage?.[0] ?? 0) * (PLACES[here]?.wage ?? 1));
    return `<li class="${st[1]}"><span class="nm">${esc(d.name)}</span><span class="st">${esc(st[0])}</span>${wage ? `<span class="note">견습 품삯 은화 ${wage}닢쯤</span>` : ''}</li>`;
  };
  const far = jobs.filter((d) => !d.places.includes(here)).map((d) => {
    const near = [...d.places].sort((a, b) => dist(here, a) - dist(here, b))[0];
    return { d, near, m: dist(here, near) };
  }).sort((a, b) => a.m - b.m);
  return `<section class="wy-sec">
    <h3>${esc(pname(here))}의 일자리 <small>${local.length}가지</small></h3>
    ${local.length ? `<ul class="wy-jobs">${local.map(row).join('')}</ul>` : '<p class="note">이 고장에는 구할 만한 일자리가 없다.</p>'}
    <p class="note">일자리는 할 일의 '일과 벌이'에서 "일자리 구하기"로 얻는다.${adult ? '' : ' 열다섯 살부터 구할 수 있다.'}</p>
    ${far.length ? `<details class="wy-more"><summary>다른 고장에만 있는 일 ${far.length}가지</summary>
      <ul class="wy-far">${far.map(({ d, near, m }) => `<li><span class="nm">${esc(d.name)}</span><span class="note">${esc(pname(near))}${m < 99 ? ` (${m}달)` : ''}${d.places.length > 1 ? ` 외 ${d.places.length - 1}곳` : ''}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

function pathCard(game, sv, p) {
  const nowActs = p.acts.filter((id) => sv.nowAll.has(id));
  const laterHere = sv.age < 16 && p.acts.some((id) => sv.adultHere.has(id)) && !nowActs.length;
  const elsewhere = p.acts.flatMap((id) => sv.where[id] ?? []);
  let st, line;
  if (nowActs.length) {
    st = 'now';
    const names = nowActs.map((id) => ACTIONS.find((a) => a.id === id)?.name).filter(Boolean);
    line = `지금 할 수 있다: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` 외 ${names.length - 3}가지` : ''} · 할 일의 '${groupNameOf(nowActs[0])}'`;
  } else if (laterHere) {
    st = 'later';
    line = '여기서, 조금 더 자라면 할 수 있다.';
  } else if (elsewhere.length) {
    st = 'far';
    line = `${sv.age < 16 ? '자라서 ' : ''}가 볼 곳: ${placeList(elsewhere, sv.here)}`;
  } else {
    st = 'lock';
    line = p.lock;
  }
  const ic = ACTIONS.find((a) => a.id === p.acts[0]);
  return `<li class="wy-path ${st}">
    <span class="ic">${actionIcon(ic ?? { id: p.id }, 22)}</span>
    <div class="tx"><div class="top"><strong>${esc(p.name)}</strong><span class="bd">${{ now: '지금', later: '자라면', far: '다른 고장', lock: '아직' }[st]}</span></div>
      <span class="what">${esc(p.what)}</span>
      <span class="how">${esc(line)}</span></div>
  </li>`;
}

function localBlock(sv) {
  // 이 고장(과 몇 곳)에서만 되는 일: 갈래에 들지 않은 행동 가운데 세 곳 이하에서만 되는 것
  const ids = ACTIONS.map((a) => a.id).filter((id) => !PATH_ACTS.has(id) && !COMMON.has(id) && (sv.where[id] ?? []).includes(sv.here) && (sv.where[id] ?? []).length <= 3);
  if (!ids.length) return '';
  return `<section class="wy-sec"><h3>${esc(pname(sv.here))}에서만 할 수 있는 일</h3>
    <ul class="wy-local">${ids.map((id) => { const a = ACTIONS.find((x) => x.id === id); const now = sv.nowAll.has(id); return `<li class="${now ? 'now' : 'later'}"><span class="ic">${actionIcon(a, 20)}</span><span class="nm">${esc(a.name)}</span><span class="st">${now ? '지금' : '자라면'}</span></li>`; }).join('')}</ul></section>`;
}

export function renderWays(game) {
  const sv = survey(game);
  const job = L(game).job;
  const jail = (() => { try { return isJailed(game); } catch { return false; } })();
  const travel = L(game).travel;
  const head = [`${sv.age}살`, travel ? `${J(pname(travel.to), '으로/로')} 가는 길` : `${pname(sv.here)}에 산다`, job && WORK[job.id] ? `${WORK[job.id].name} 일을 한다` : sv.age >= 15 ? '일자리는 없다' : ''].filter(Boolean).join(' · ');
  const sorted = [...PATHS].map((p) => ({ p, html: pathCard(game, sv, p) }));
  const rank = (h) => (h.includes('wy-path now') ? 0 : h.includes('wy-path later') ? 1 : h.includes('wy-path far') ? 2 : 3);
  sorted.sort((a, b) => rank(a.html) - rank(b.html) || (a.p.id === 'dark') - (b.p.id === 'dark'));
  const nNow = sorted.filter((x) => rank(x.html) === 0).length;
  return `<div class="wy-body">
    <p class="wy-head">${esc(head)}</p>
    ${jail ? '<p class="note warn">지금은 감옥에 있다. 나가기 전에는 감옥 안에서 할 수 있는 일만 고를 수 있다.</p>' : ''}
    ${travel ? '<p class="note">길 위에 있어서 지금은 고장에서 하는 일을 고를 수 없다. 도착하면 아래 일들이 열린다.</p>' : ''}
    <p class="note">이 세계에서는 정해진 목표가 없다. 아래에서 끌리는 길을 골라 할 일에 넣으면 된다. 같은 사람도 여러 길을 함께 걸을 수 있다.</p>
    <section class="wy-sec"><h3>걸어 볼 수 있는 길 <small>지금 ${nNow}가지</small></h3>
      <ul class="wy-paths">${sorted.map((x) => x.html).join('')}</ul></section>
    ${jobsBlock(game, sv)}
    ${localBlock(sv)}
  </div>`;
}

/* ---------- 안내 창 ---------- */
let getGame = () => null;
let st = null;
export const waysButton = (label = '무엇을 할 수 있나') => `<button class="ghost sm ways-open" data-ways="1">${esc(label)}</button>`;

export function initWays(gameGetter) {
  getGame = gameGetter;
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-ways]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const g = getGame();
    if (g) openWays(g);
  }, true);
}

export function openWays(game) {
  closeWays();
  const el = document.createElement('div');
  el.className = 'ways-ov';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', '무엇을 할 수 있나');
  let body;
  try { body = renderWays(game); } catch (err) { console.error(err); body = '<p class="note">안내를 만들지 못했다.</p>'; }
  el.innerHTML = `<div class="ways-panel card">
    <div class="ways-top"><h2>무엇을 할 수 있나</h2><button class="ghost sm" data-ways-close aria-label="닫기">닫기</button></div>
    ${body}
  </div>`;
  document.body.appendChild(el);
  st = { el, prevFocus: document.activeElement };
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-ways-close]')) closeWays(); });
  document.addEventListener('keydown', onKey);
  el.querySelector('[data-ways-close]')?.focus();
}

export function closeWays() {
  if (!st) return;
  document.removeEventListener('keydown', onKey);
  st.el.remove();
  try { st.prevFocus?.focus?.(); } catch { /* 없어진 단추 */ }
  st = null;
}
function onKey(e) { if (st && e.key === 'Escape') { e.preventDefault(); closeWays(); } }
