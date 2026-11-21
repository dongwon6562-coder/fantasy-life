// 기능 모듈 목록. 새 모듈을 만들면 여기에 import 한 줄만 추가한다.
// (각 모듈은 import될 때 ACTIONS / EVENTS / HOOKS에 스스로 등록한다)
import './relations.js';
import './adventure/index.js';
import './world.js';
import './events/index.js';
import './tuning.js';
import './underworld/index.js';
import './domain/index.js';
import './realms/index.js';
import './races/index.js';
import './ageless/core.js'; // 불로의 뼈대: 몸 나이가 멈추는 규칙과 공용 상태(g.ageless), 길 등록. 길마다 갈래가 따로 얹는다
import './realms/life.js';
import './faith/index.js';
import './court/index.js';
import './duel/index.js';
import './magic/index.js';
import './war/spellpower.js';
import './audio/index.js';
import './craft/index.js';
import './history/index.js';
import './party/index.js';
import './childhood/index.js';
import './crisis/index.js';
import './era/index.js';
import './later/index.js';
import './early/index.js';
import './legends/index.js';
import './sea/index.js';
import './art/battle.js'; // 전투 연출 (사건 창 그림 칸에 스스로 얹힌다)
import './deep/index.js';
import './research/index.js';
import './kin/index.js';
import './repute/index.js';
import './love/index.js';
import './feud/index.js';
import './mentor/index.js';
import './village/index.js';
import './art/vignette.js'; // 사건 삽화 (큰 사건의 그림 한 장, 사건 창 그림 칸에 스스로 얹힌다)
import './estate/index.js';
import './politics/index.js'; // 움직이는 대륙: 나라끼리 동맹·전쟁·혼인, 왕조 교체, 국경
import './vocation/index.js';
import './seal/index.js'; // 봉인의 흔들림: 봉인석 균열, 쐐기, 마족 첩자, 세력의 대응
import './tower/index.js'; // 마탑과 금지된 마법: 탑 안의 삶, 마도구, 금지 마법, 교단과의 갈등
import './army/index.js';
import './explore/index.js';
import './peoples/index.js'; // 다른 종족의 땅에서 살기: 풍습·의식·받아들여짐, 종족끼리의 편견과 우정, 섞인 혈통 자식
import './nature/index.js'; // 하늘과 땅의 재앙과 계절: 고장마다 재앙, 소출과 흉년, 철마다 다른 살림
import './beasts/index.js';
import './trade/index.js'; // 장사 길과 상단: 고장마다 다른 시세, 대상단, 도적과 통행세, 큰 상회, 맞수 상단
import './arts/index.js'; // 글과 예술: 책·노래·그림·조각 짓기, 후원자, 금서, 대를 넘어 남는 작품
import './contest/index.js'; // 내기와 겨루기: 주사위·카드 도박과 빚, 투기장, 활쏘기·씨름·사냥·마상 시합, 승부 조작
import './elder/index.js'; // 늙음과 마지막 해들: 물러나기, 몸과 기억의 쇠함, 묵은 일 풀기, 마지막 여행, 회고록, 임종, 장례와 무덤
import './health/index.js'; // 병과 의술: 고장마다 도는 병, 누구에게 맡길지, 낫지 않는 병과 장애, 집안 내력
import './oath/index.js'; // 맹세와 의형제: 의형제·의자매, 주군과 가신, 사제의 서원, 낙인, 대를 넘는 두 집안의 약속
import './mystery/index.js'; // 풀리지 않은 일: 실종·독살·도난·유령 소문 조사, 엉뚱한 사람 몰기, 진범의 보복, 대를 넘는 옛 미제
import './omen/index.js'; // 예언과 징조: 큰일을 앞서는 징조와 헛징조, 세 예언, 예언을 이용하는 세력, 예언 속 사람으로 지목되기
import './house/index.js'; // 내 집 마련과 살림: 오두막·집 짓기, 방과 살림, 이웃 다툼·옆집 불·밤손님, 대를 넘는 집, 이사
import './household/index.js'; // 하인과 식솔: 하인·유모·집사·마부 들이고 내보내기, 충성과 불만, 훔치고 엿듣는 하인, 대를 이어 섬기는 집안, 큰 집안의 하인으로 살기
import './law/index.js'; // 법과 재판: 나라마다 다른 법정, 고발하기와 당하기, 증인과 재판관, 변론인, 결투 재판과 신명 재판, 뇌물과 사면, 낙인
import './school/index.js'; // 학원과 시험: 학원 입학과 장학금, 학년 시험, 기사 서임·관리·장인 시험, 부정과 매수, 낙방과 재수, 평생 얽히는 동문
import './poor/index.js'; // 밑바닥에서 살기: 구걸·무료 급식·구빈원, 빈민가 사람들, 날품팔이, 굶주림, 빚 노예와 빚 갚기, 다시 일어서기, 부자일 때 돕거나 부리기
import './letters/index.js'; // 편지와 먼 인연: 떠난 식구·벗·옛사랑과 오가는 편지, 늦게 닿는 소식, 잃은 편지, 남의 편지 뜯기와 위조, 연서, 대를 넘는 인연
import './aftermath/index.js'; // 전쟁 뒤의 삶: 징집과 귀향, 전사자와 행방불명, 상이군인, 전쟁 과부와 고아, 전우 모임과 부탁, 악몽과 술, 불탄 마을 다시 세우기, 적국 출신 이웃
import './inn/index.js'; // 주점과 여관 꾸리기: 내 가게 열기, 술·음식·방, 일꾼, 단골·소문·싸움판, 경쟁 가게, 세금과 경비대, 뒷방 노름과 밀수, 대를 잇는 가게
import './wilds/index.js'; // 마물의 땅: 고장마다 늘고 주는 마물, 둥지와 떼의 이동, 버려진 마을과 돌아오는 사람들, 사냥꾼 길드 현상금, 부산물 시세, 시대마다 새 마물
import './secret/index.js'; // 비밀과 이중생활: 숨겨 둔 사생아, 바꾼 이름과 감춘 출신, 두 집 살림, 밤의 얼굴(의적·밀정·이단), 아는 사람과 입막음, 들통, 대를 넘는 집안 비밀
import './troupe/index.js'; // 유랑극단과 떠돌이 재주꾼: 극단에 들기·꾸리기, 광대·곡예·악사·연극, 고장마다 다른 관객, 귀족 연회, 극단 안의 사랑과 다툼, 검열과 풍자극, 길 위의 사고
import './dragon/index.js'; // 잠든 용: 용왕들의 잠과 깨어남의 징조, 용 숭배자, 용의 보물과 원정대, 용과 말 섞기, 용 사냥과 그 값
import './bondage/index.js'; // 노예와 자유: 붙잡히거나 빚이 팔려 노예가 되기, 노예 시장, 주인 집에서의 삶과 신임, 도망과 추격, 몸값과 해방, 낙인과 새 이름, 노예를 부리는 주인과 사슬을 끊는 사람, 나라마다 다른 법
import './company/index.js'; // 용병단 꾸리기: 내 깃발 세우기, 계약과 고용주, 싸움터에서 이끌기, 몫 나누기와 약탈 규율, 배신과 이적, 맞수 용병단, 죽거나 다친 단원의 식구, 대를 잇는 깃발
import './mine/index.js'; // 광산과 땅 밑 일: 광부 일, 광맥 찾기와 광업권, 내 광산, 갱도 붕괴, 파업, 소유권 다툼, 마석 시세, 드워프에게 배우기, 너무 깊이 파서 깨운 것
import './lineage/index.js'; // 가문의 내력과 가풍: 가훈과 문장, 대대로 내려오는 기술과 버릇, 집안의 자랑과 수치, 족보 꾸미기와 거짓 조상, 가풍을 거스르는 자식, 본가와 분가, 집안 제사와 모임
import './heist/index.js'; // 큰 한탕: 목표 고르기, 사람 모으기와 역할, 정찰과 준비, 결행의 밤과 당일 변수, 몫 나누기와 배신, 장물 처분, 뒤쫓는 사람들
import './haunt/index.js'; // 망자와 저주: 흉가와 버려진 묘지의 잔향, 넋 달래기와 무덤 털기, 영매와 퇴마 사제, 사기꾼 무당, 저주받은 물건, 대를 잇는 집안의 저주, 봉인의 틈에서 힘을 얻은 망령
import './revolt/index.js'; // 봉기와 반란: 고장마다 쌓이는 영민의 분노, 봉기에 가담하거나 이끌기, 반란군 안의 다툼과 배신, 영주 편에서 진압하기, 처형과 숨어 사는 잔당, 이긴 봉기 뒤의 새 질서와 그것이 다시 썩는 일
import './herd/index.js'; // 목축과 유목: 목동 일, 가축 장터와 시세, 겨울 꼴, 가축 병, 늑대와 소도둑, 이웃 목장, 명마 혈통, 철 따라 떠도는 유목민 무리
import './frontier/index.js'; // 개척과 새 땅: 변경 너머 빈 땅 여섯, 개척 허가장, 개척민 모으기, 첫 겨울, 마물과 먼저 살던 이들, 개척촌이 마을·고을이 되는 세월(플레이어 없이도), 이름 붙이기
import './exile/index.js'; // 유배와 망명: 실각이나 큰 죄로 섬·변방에 유배되기, 유배지의 삶과 그곳 사람들, 사면과 대사면, 몰래 돌아오기, 다른 나라로 망명과 받아 준 나라에 진 빚, 망명 궁정과 귀환 원정
import './cuisine/index.js'; // 요리사의 길: 고장마다 다른 맛, 영주·궁정 부엌의 서열, 내 요리 짓기, 요리 겨루기, 연회, 독살 의심과 시식관, 이름난 요리가 대를 넘어 남기, 플레이어 없이 이름을 얻는 세상의 요리
import './works/index.js'; // 세상을 바꾸는 큰 공사: 성벽·큰길·돌다리·운하·대성당·고개길·땅굴길·수로·등대, 부역과 품삯, 석공 길드, 사고와 무너짐, 멈춘 공사, 완공되면 길·교역·고장 모습이 바뀜(플레이어 없이도)
import './spy/index.js'; // 첩보와 밀정: 왕실 밀정청·대귀족 가문·상단 정보망·교단 감찰원, 포섭되거나 찾아가기, 훈련과 가짜 신분, 편지 훔치기·사람 빼내기·소문 심기, 이중간첩, 정체가 드러날 때, 쉽게 놓아주지 않는 조직
import './mana/index.js'; // 마나의 흐름: 수십 년 주기로 출렁이는 대륙의 마나, 마나 샘과 마른 땅, 마나 폭풍, 짙은 해의 마물·재능 있는 아이·마석 값, 샘 차지 다툼, 마나 중독, 샘지기
import './farm/index.js'; // 내 농장 일구기: 밭 사고팔기·빌리기·소작 주기, 작물과 돌려짓기, 씨앗 고르기, 품꾼과 소, 곳간과 장터의 때, 물길 다툼과 경계석, 대를 잇는 땅
import './claim/index.js'; // 숨은 왕가의 피: 끊긴 왕가의 핏줄이 집안에 흐른다는 것이 드러남, 족보와 증거, 그 피를 쓰려는 귀족·밀정·교단·망명 궁정, 숨기기·주장하기·팔기, 가짜 왕손, 대를 넘는 주장
import './apothecary/index.js'; // 약초꾼과 약방: 고장·철마다 다른 약초 말려 두기, 처방 궁리와 약 달이기, 식구에게 내 약, 약방 열기와 약값, 의원 조합·사제·떠돌이 약장수, 가짜 약과 독, 돌림병 때의 약값, 대를 넘는 이름난 처방
import './relic/index.js'; // 용사 시대의 성유물: 레오의 검과 방패, 리아나의 기도서, 노아의 반지, 볼가르의 도끼, 진짜와 가짜, 유물을 쫓는 이들, 주인을 고르는 유물과 그 대가, 스스로 옮겨 다니는 유물
import './ageless/noah.js'; // 노아 실마리: 감시탑 불·꿈속 목소리·반지·목격담·옛 편지를 모아 북쪽 감시탑으로 노아를 찾아가기
import './ageless/dragonname.js'; // 불로의 길 '용의 참이름': 고대어 조각을 모아 잠든 용왕의 이름을 부르면 피 한 방울
import './ageless/bloodyears.js'; // 불로의 길 '핏줄의 세월': 자식의 세월을 열 해씩 받아 산다. 받은 자식은 그만큼 늙는다
import './ageless/after.js'; // 불로가 된 뒤의 삶: 늙지 않는다는 소문, 이름 바꾸고 떠나기, 왕과 교단, 먼저 떠나보내기
import './farewell/index.js'; // 스스로 고르는 죽음: 뒤를 막기·쐐기·역병 마을·배신 대신 죽음·불로를 내려놓기 (뜻 있는 순간의 선택지로만)
import './ageless/seventh.js'; // 불로, 대가 없는 길 일곱째 서클: 짙은 해에 태어남 + 6서클 + 노아의 시험(한 삶에 한 번), 옛 기록의 조각
import './ageless/sealbreath.js'; // 불로, 대가 있는 길 봉인의 숨: 쐐기 틈의 마신의 숨, 한 해마다 봉인이 깎임, 쐐기 지키는 이들이 쫓음
import './ageless/vessel.js'; // 불로, 금지 마법 그릇 옮기기: 남의 젊은 몸으로 옮겨 감, 그 몸의 식구와 기억, 삭는 그릇
import './ageless/imprint.js'; // 불로, 금지 마법 마지막 새김: 자식에게 나를 새김, 대를 이어도 눈을 뜨는 것은 나, 그 아이는 사라짐
import './heredity/index.js'; // 유전과 타고남: 부모를 반쯤 닮는 재능·마력 그릇·성격·생김새(NPC 아이 포함), 가끔 크게 튀는 아이, 시작 때 고르는 큰 재능 하나(마법·검·학문·장사·손재주·신앙)와 성격·생김새, 세상이 알아보는 아이와 시기, 혼인 상대의 핏줄
import './envoy/index.js'; // 사절과 볼모: 나라마다 다른 궁정 말, 외교청 서기·통역·사절·사절단장, 휴전·국경·통상·혼인 협상(전쟁을 막거나 부름), 외교 사고, 볼모로 자라는 아이와 돌아온 뒤 두 나라 사이의 삶, 플레이어 없이도 오가는 사절
