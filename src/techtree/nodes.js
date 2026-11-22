// 34단계 기술 나무 (도우미스레드3). 기술마다 선행 기술(needs)이 있고, 큰 발명 사이에 작은 기술이 촘촘히 낀다.
// at: 대략의 기술 눈금 (realm.tech와 시대 문턱이 이 눈금을 쓴다. 나오는 해는 판마다 다르다)
// field: 어느 갈래 사람들이 밀어 올리나 (farm 농사, craft 공방, magic 마법, letters 글, sea 바다, war 싸움, city 도시, heal 의술)
// mat: 'stone'이면 마석이 모자랄수록 더디다, 'iron'이면 쇠가 넉넉한 드워프 땅과 전쟁이 밀어 준다
// demand: 이런 형편이면 사람들이 그 기술을 찾는다 (war 전쟁, famine 흉년, plague 돌림병, trade 장사, depletion 마석 고갈 걱정, monsters 마물)
// big: 시대를 바꾸는 큰 발명 (한 삶에 한두 번)
// 처음 열두 가지 id(firestone…railroad)는 그대로다. era goods·jobs·research·화면이 이 id를 쓴다.
const T = (id, name, at, needs, field, by, where, text, look, x = {}) => ({ id, name, at, needs, field, by, where, text, look, ...x });

export const TECHS = [
  // ---------- 마석 시대: 손과 물레와 첫 마도구 ----------
  T('collar', '말 목사리', 0.15, [], 'farm', 'company', 'ern', '말 목을 조이지 않는 가죽 목사리를 퍼뜨렸다. 말이 소보다 무거운 쟁기를 끈다', '밭마다 소 대신 말이 쟁기를 끈다. 목사리 만드는 마구장이가 바빠졌다.', { demand: ['famine'] }),
  T('gear', '정밀 톱니', 0.25, [], 'craft', 'company', 'harfen', '쇠 톱니를 고르게 깎는 틀을 만들었다', '대장간 거리 한쪽에 톱니 깎는 집이 생겼다. 맞물려 도는 쇠바퀴 소리가 난다.'),
  T('brick', '벽돌 가마', 0.2, [], 'craft', 'company', 'harfen', '높은 불로 단단한 벽돌을 굽는 가마를 쌓았다', '새로 짓는 집들이 나무 대신 붉은 벽돌로 올라간다. 가마 굴뚝이 성 밖에 늘어섰다.', { demand: ['trade'] }),
  T('paper', '값싼 종이', 0.3, [], 'letters', 'scholar', 'leocast', '넝마를 삶아 값싼 종이를 뜨는 법을 퍼뜨렸다', '양피지 대신 종이에 쓴 쪽지가 오간다. 넝마 줍는 아이들이 생겼다.'),
  T('firestone', '화석(火石)', 0.35, [], 'magic', 'mage', 'ern', '불씨 없이 불을 붙이는 값싼 화석(火石)을 만드는 법을 찾아냈다', '부엌마다 부싯돌 대신 화석이 놓였다.', { mat: 'stone' }),
  T('windmill', '풍차', 0.4, ['gear'], 'craft', 'company', 'verden', '날개 넷 달린 풍차를 세워 물 없는 언덕에서도 곡식을 빻았다', '베르덴 언덕 위로 풍차 날개가 돈다. 물레방아 없는 마을도 가루를 빻는다.'),
  T('glass', '맑은 유리', 0.42, ['firestone'], 'craft', 'company', 'harfen', '화석 가마로 거품 없는 맑은 유리를 구워 냈다', '부잣집 창에 맑은 유리가 끼워졌다. 겨울에도 방 안이 밝다.'),
  T('stonecut', '등석 가공', 0.48, ['firestone'], 'magic', 'mage', 'serenia', '마석을 깎아 빛만 내게 하는 등석 가공법을 세웠다', '세레니아 공방 창마다 푸른 등석이 시험 삼아 켜져 있다.', { mat: 'stone' }),
  T('betterplow', '개량 쟁기', 0.5, ['collar'], 'farm', 'company', 'ern', '쇠 볏을 단 개량 쟁기를 팔기 시작했다. 흙을 뒤집어 엎는다', '쇠 볏 쟁기가 지나간 밭은 고랑이 깊다. 소출이 조금 늘었다.', { demand: ['famine'] }),
  T('streetlamp', '등석 가로등', 0.55, ['stonecut'], 'city', 'company', 'harfen', '하르펜 광장에 등석(燈石) 가로등을 세웠다', '밤에도 광장에 등석 가로등이 켜져 있다. 밤장사가 생겼다.', { mat: 'stone', demand: ['trade'] }),
  T('lens', '렌즈와 안경', 0.62, ['glass'], 'craft', 'scholar', 'leocast', '유리를 갈아 렌즈를 만들고, 눈 나쁜 사람이 쓰는 안경을 만들었다', '늙은 필경사들이 코에 안경을 걸었다. 일을 그만둘 나이가 몇 해 늦어졌다.'),
  T('clock', '기계식 시계', 0.7, ['gear'], 'craft', 'company', 'leocast', '추와 톱니로 도는 기계식 시계를 성당 탑에 걸었다', '대성당 탑에서 시계가 시각마다 종을 친다. 사람들이 해 대신 종소리로 하루를 나눈다.'),
  T('warmstone', '온석 화로', 0.8, ['stonecut'], 'magic', 'company', 'ern', '시골에서도 살 수 있는 값싼 온석 화로를 팔기 시작했다', '집집마다 온석 화로가 하나씩 있다. 겨울 장작 걱정이 줄었다.', { mat: 'stone', big: true }),
  T('compass', '마석 나침반', 0.85, ['stonecut'], 'sea', 'company', 'portel', '늘 북쪽을 가리키는 마석 바늘로 나침반을 만들었다', '안개 낀 날에도 배가 나간다. 뱃사람들이 바늘 든 상자를 품에 넣고 다닌다.', { demand: ['trade'] }),
  T('rotation', '돌려짓기', 0.9, ['betterplow'], 'farm', 'scholar', 'gruental', '밀·콩·묵히기를 해마다 돌려 짓는 법을 퍼뜨렸다', '밭을 셋으로 나눠 해마다 돌려 짓는다. 땅이 덜 지친다.', { demand: ['famine'] }),
  T('purify', '마석 거르기', 0.95, ['stonecut'], 'magic', 'mage', 'serenia', '탁한 마석에서 잡된 기운을 걸러 내는 술식을 찾았다', '마석 거간꾼들이 "거른 돌"과 "날돌"을 따로 값 매긴다.', { mat: 'stone' }),
  T('manamill', '마석 방아', 1.05, ['windmill', 'purify'], 'craft', 'company', 'harfen', '마석으로 돌아가는 방아를 하르펜에 세웠다', '성문 밖에서 마석 방아가 밤낮으로 돈다. 방앗간 주인 둘이 문을 닫았다.', { mat: 'stone' }),
  T('type', '금속 활자', 1.15, ['paper', 'gear'], 'letters', 'scholar', 'leocast', '쇠로 부어 만든 낱자 활자를 짰다', '인쇄공들이 낱자 활자를 상자에 골라 담는다. 한 번 짠 판으로 수백 장을 찍는다.'),
  T('paving', '포장길', 1.2, ['brick', 'gear'], 'city', 'company', 'leocast', '왕도 큰길에 다듬은 돌과 벽돌을 깔았다', '비가 와도 큰길이 진창이 되지 않는다. 수레바퀴 소리가 달라졌다.', { demand: ['trade'] }),
  T('press', '마도 인쇄기', 1.3, ['type', 'manamill'], 'letters', 'scholar', 'leocast', '마도 인쇄기를 만들었다. 책값이 열 분의 일로 떨어졌다', '왕도 서점마다 찍어 낸 책이 쌓여 있다. 글을 읽는 평민이 늘었다.'),
  T('spyglass', '망원경', 1.38, ['lens'], 'sea', 'scholar', 'portel', '렌즈 둘을 통에 넣어 먼 것을 당겨 보는 망원경을 만들었다', '성벽 보초와 뱃사람이 망원경을 든다. 해협 너머 깃발이 보인다.', { demand: ['war'] }),
  T('signal', '마도 전신탑', 1.6, ['stonecut', 'spyglass'], 'magic', 'mage', 'harfen', '왕도와 하르펜 사이에 마도 전신탑을 세웠다. 소식이 하루 만에 닿는다', '언덕 위 전신탑 꼭대기에서 푸른 빛이 깜빡인다. 왕도 소식이 하루 만에 온다.', { mat: 'stone', demand: ['war', 'trade'] }),
  T('shaft', '정밀 굴대', 1.72, ['gear', 'manamill'], 'craft', 'company', 'harfen', '흔들리지 않고 도는 정밀 굴대를 깎아 냈다', '공방마다 굴대 깎는 선반이 들어섰다. 쇠 깎는 소리가 밤까지 난다.'),
  T('erngrind', '작은 마석 방아', 1.9, ['manamill'], 'farm', 'company', 'ern', '에른 같은 작은 마을에도 마석 방아를 들였다', '물레방아 옆에 마석 방아가 들어섰다. 아낙들이 맷돌을 돌리지 않는다.', { mat: 'stone' }),
  T('crane', '항구 기중기', 1.94, ['shaft', 'compass'], 'sea', 'company', 'portel', '마석 방아 굴대로 짐을 들어 올리는 항구 기중기를 세웠다', '부두에 긴 팔 달린 기중기가 섰다. 짐꾼 열이 하던 일을 기중기 하나가 한다.', { mat: 'stone', demand: ['trade'] }),
  T('survey', '측량과 정밀 지도', 1.98, ['compass', 'press'], 'letters', 'scholar', 'leocast', '삼각 측량으로 왕국 전체의 정밀 지도를 찍어 냈다', '관청 벽에 찍어 낸 왕국 지도가 걸렸다. 영주들의 땅 다툼이 지도 앞에서 벌어진다.', { demand: ['war'] }),
  T('furnace', '높은 용광로', 2.1, ['shaft'], 'craft', 'company', 'hammer', '마석 풀무로 바람을 넣는 높은 용광로를 쌓았다', '쇠망치 골 하늘이 밤에도 붉다. 쇳물이 전보다 많이 나온다.', { mat: 'iron', demand: ['war'] }),
  T('plow', '마석 쟁기', 2.3, ['betterplow', 'shaft'], 'farm', 'company', 'ern', '마석을 박은 쟁기를 싸게 팔기 시작했다', '마석 쟁기 덕에 한 사람이 두 사람 몫의 밭을 간다. 일손이 남는 집이 생겼다.', { mat: 'stone', demand: ['famine'] }),
  T('seed', '씨앗 고르기', 2.45, ['rotation', 'press'], 'farm', 'scholar', 'gruental', '잘 여문 씨만 골라 대를 잇는 법을 책으로 펴냈다', '농부들이 씨앗 자루에 해와 밭 이름을 적어 둔다. 흉년에도 조금 덜 굶는다.', { demand: ['famine'] }),
  T('greenhouse', '온실', 2.5, ['glass', 'warmstone', 'rotation'], 'farm', 'scholar', 'gruental', '유리 지붕 밑에 온석을 깔아 겨울에도 푸성귀를 키우는 온실을 지었다', '그륀탈 들판에 유리 지붕이 번쩍인다. 한겨울 장터에 푸른 잎채소가 나온다. 값은 고기보다 비싸다.', { mat: 'stone' }),
  T('forge', '마석 화로', 2.8, ['furnace', 'purify'], 'craft', 'company', 'harfen', '마석 화로를 들인 대장간을 열었다. 쇠가 전보다 단단해졌다', '대장간 거리에 마석 화로의 푸른 불꽃이 늘어서 있다.', { mat: 'stone', big: true }),
  T('quarantine', '검역과 격리', 2.9, ['press'], 'heal', 'scholar', 'portel', '돌림병이 도는 배를 항구 밖에 묶어 두는 검역 규칙을 세웠다', '항구 밖에 노란 깃발 단 배가 묶여 있다. 사십 일이 지나야 뭍에 오른다.', { demand: ['plague'] }),
  T('healstone', '정화석 붕대', 3.3, ['purify', 'quarantine'], 'heal', 'mage', 'leocast', '상처를 덜 곪게 하는 정화석 붕대를 만들었다', '구빈원마다 정화석 붕대가 있다. 상처로 죽는 사람이 줄었다.', { mat: 'stone', demand: ['war', 'plague'] }),
  T('boiler', '마석로', 3.55, ['forge', 'shaft'], 'craft', 'scholar', 'harfen', '마석 열로 물을 끓여 굴대를 돌리는 마석로를 만들었다', '공방 뒤뜰에서 마석로가 김을 뿜는다. 사람 열 몫의 힘이 쇠통 하나에서 나온다.', { mat: 'stone' }),
  T('bridge', '쇠 다리', 3.75, ['forge', 'survey'], 'city', 'company', 'harfen', '강 위에 쇠 들보로 다리를 놓았다', '쇠 다리 위로 짐수레가 줄지어 건넌다. 나룻배 사공들이 다리 밑에서 담배를 피운다.', { mat: 'iron', demand: ['trade'] }),
  T('ironcart', '마석로 쇠수레', 4.0, ['boiler'], 'craft', 'scholar', 'leocast', '말 없이 달리는 마석로 쇠수레를 만들었다', '왕도 대로에 말 없는 쇠수레가 다닌다. 마부들이 일거리를 잃고 있다.', { mat: 'stone' }),
  T('rail', '쇠 레일', 4.3, ['forge', 'bridge'], 'craft', 'company', 'hammer', '휘지 않는 쇠 레일을 길게 뽑아냈다', '쇠망치 골에서 레일을 실은 수레가 줄지어 나온다.', { mat: 'iron', demand: ['trade'] }),
  T('railroad', '쇠수레 길', 4.6, ['ironcart', 'rail'], 'city', 'company', 'harfen', '왕도와 하르펜을 잇는 쇠수레 길을 놓기 시작했다', '성 밖으로 쇠수레 길이 놓이고 있다. 왕도까지 사흘이면 간다는 말이 돈다.', { mat: 'stone', demand: ['trade', 'war'], big: true }),
  // ---------- 뒤 시대: 쇠수레 길 뒤 이백 년. 칼과 마법은 남고, 고서클은 여전히 드물다 ----------
  T('rotary', '마도 윤전기', 4.75, ['press', 'boiler'], 'letters', 'scholar', 'leocast', '종이를 두루마리째 먹여 쉬지 않고 찍는 마도 윤전기를 만들었다', '인쇄소 지하에서 윤전기가 밤새 돈다. 종이 두루마리를 실은 수레가 새벽마다 들어간다.'),
  T('newspaper', '마도 신문', 4.9, ['rotary', 'signal'], 'letters', 'scholar', 'leocast', '마도 윤전기로 날마다 찍어 내는 신문을 내기 시작했다', '새벽마다 신문 뭉치가 성문 안으로 들어온다. 글 모르는 사람도 남이 읽어 주는 신문 소리를 듣는다.', { demand: ['war', 'trade'] }),
  T('pump', '마석 펌프', 5.0, ['boiler'], 'city', 'company', 'harfen', '마석로로 물을 끌어 올리는 펌프를 만들었다', '갱과 저지대에서 마석 펌프가 물을 퍼 올린다. 물에 잠기던 밭이 마른다.', { mat: 'stone' }),
  T('waterworks', '수도와 하수', 5.15, ['pump', 'quarantine'], 'city', 'company', 'leocast', '마석 펌프로 왕도 땅 밑에 수도와 하수 길을 놓았다', '골목마다 쇠 꼭지에서 물이 나온다. 여름 돌림병이 전보다 덜 돈다. 하수 길 밑으로 사는 사람들이 생겼다.', { demand: ['plague'] }),
  T('belt', '동력 띠', 5.25, ['shaft', 'boiler'], 'craft', 'company', 'harfen', '마석로 하나로 굴대 수십 개를 돌리는 가죽 동력 띠를 걸었다', '공방 천장에 가죽 띠가 거미줄처럼 걸려 돈다. 손이 끼어 다친 사람 이야기가 들린다.'),
  T('factory', '마력 공장', 5.4, ['belt', 'railroad'], 'craft', 'company', 'harfen', '마력 굴대 수십 개를 한 지붕 밑에 돌리는 마력 공장을 세웠다', '강가에 마력 공장의 긴 지붕이 늘어섰다. 교대 종이 울릴 때마다 사람들이 쏟아져 나온다. 강물이 가끔 푸르게 번득인다.', { mat: 'stone', demand: ['trade'], big: true }),
  T('diagnose', '수정 진단판', 5.5, ['lens', 'healstone'], 'heal', 'mage', 'serenia', '몸에 대면 아픈 자리가 붉게 비치는 수정 진단판을 만들었다', '마탑 의무실에 수정 진단판이 놓였다. 사제들은 그것을 "눈 없는 점괘"라고 부른다.', { mat: 'stone', demand: ['plague'] }),
  T('medicine', '마도 의술', 5.65, ['diagnose', 'waterworks'], 'heal', 'mage', 'leocast', '정화석과 마력 진단 술식으로 몸속을 들여다보는 마도 의술을 세웠다', '왕도에 마도 의원이 섰다. 사제의 손 대신 수정 진단판이 아픈 데를 찾는다. 성당은 그 앞을 지날 때 눈을 돌린다.', { demand: ['plague', 'war'] }),
  T('hull', '쇠 선체', 5.75, ['forge', 'compass'], 'sea', 'company', 'portel', '나무 대신 쇠판을 이어 붙인 배를 띄웠다', '포르텔 조선소에 쇠 선체가 누워 있다. 망치 소리가 바다 건너까지 들린다.', { mat: 'iron', demand: ['trade', 'war'] }),
  T('steamship', '마석 증기선', 5.9, ['hull', 'boiler'], 'sea', 'company', 'portel', '돛 없이 마석로로 바다를 건너는 증기선을 띄웠다', '부두에 굴뚝 달린 배가 묶여 있다. 바람이 없어도 떠난다. 늙은 뱃사공들이 그 배를 쳐다보지 않는다.', { mat: 'stone', demand: ['trade'] }),
  T('deepmine', '깊은 마석 갱', 6.15, ['pump', 'factory'], 'craft', 'company', 'hammer', '쇠망치 골 밑으로 전보다 세 배 깊은 마석 갱을 뚫었다', '갱 입구에 마석 수레가 줄지어 나온다. 얕은 갱은 다 비었다는 말이 처음 돈다. 드워프 노인들은 땅이 지쳤다고 한다.', { mat: 'iron', demand: ['depletion'] }),
  T('resonance', '공명 술식', 6.25, ['signal', 'lens'], 'magic', 'mage', 'serenia', '두 수정이 같은 떨림으로 울게 하는 공명 술식을 세웠다', '세레니아 실험실에서 수정 두 개가 동시에 운다. 탑 마법사들이 그 소리를 숨죽여 듣는다.', { mat: 'stone' }),
  T('crystal', '통신 수정구', 6.4, ['resonance'], 'magic', 'mage', 'serenia', '멀리 떨어진 두 수정구가 서로의 목소리를 옮기게 했다', '전신소 수정구 앞에 줄이 길다. 왕도의 목소리가 그날로 닿는다. 마탑 문장이 박힌 수정구만 쓸 수 있다.', { mat: 'stone', demand: ['war', 'trade'], big: true }),
  T('refinery', '마석 정련', 6.65, ['deepmine', 'purify'], 'magic', 'mage', 'serenia', '부스러기 마석을 녹여 큰 마석 하나로 다시 굳히는 정련법을 찾았다', '마석 부스러기를 사들이는 수레가 골목을 돈다. 예전에는 버리던 가루가 돈이 된다.', { demand: ['depletion'] }),
  T('rifling', '강선 총열', 6.75, ['factory'], 'war', 'company', 'eisen', '총열 안에 나선 홈을 고르게 파는 기계를 만들었다', '공장 한쪽 문은 늘 잠겨 있다. 안에서 쇠 깎는 소리만 난다.', { mat: 'iron', demand: ['war'] }),
  T('gun', '마도 총포', 6.9, ['rifling', 'refinery'], 'war', 'scholar', 'graubel', '마석을 터뜨려 쇠알을 쏘는 마도 총포를 만들었다. 한 자루 값이 기사 갑옷 한 벌이다', '성벽 위에 마도 총포 몇 자루가 걸려 있다. 한 발 쏘고 마석을 갈아 끼우는 동안 검사는 다섯 걸음을 간다.', { mat: 'stone', demand: ['war', 'monsters'] }),
  T('stonebank', '마석 은행', 7.2, ['refinery', 'newspaper'], 'city', 'company', 'harfen', '마석을 맡기고 어음을 내주는 마석 은행을 열었다', '은행 금고 앞에 창을 든 경비가 선다. 사람들이 은화 대신 마석 어음을 주고받는다. 마석 값이 오르면 온 도시가 들썩인다.', { demand: ['trade', 'depletion'] }),
  T('floatstone', '부양석', 7.3, ['refinery', 'resonance'], 'magic', 'mage', 'serenia', '정련한 마석에 뜨는 술식을 새긴 부양석을 만들었다', '세레니아 탑 꼭대기에 돌 하나가 사슬에 묶인 채 떠 있다. 사슬이 팽팽하다.', { mat: 'stone' }),
  T('airship', '비행선 시제품', 7.5, ['floatstone', 'factory'], 'sea', 'scholar', 'leocast', '부양석 주머니를 매단 비행선 시제품을 띄웠다', '왕도 하늘에 은빛 비행선이 천천히 지나간다. 지붕 위로 그림자가 지나가면 아이들이 소리를 지르며 따라 달린다.', { mat: 'stone', big: true }),
  T('manacell', '축마 술식', 7.8, ['refinery', 'crystal'], 'magic', 'mage', 'serenia', '빈 마석에 마력을 다시 채우는 축마(蓄魔) 술식을 세웠다', '축마소 앞에 빈 마석을 든 사람들이 줄을 선다. 마법사 몇이 하루 종일 돌에 마력을 붓는다. 마석이 바닥나도 끝은 아니라는 말이 돈다.', { demand: ['depletion'] }),
  T('northrail', '북부 쇠수레 길', 8.1, ['railroad', 'deepmine'], 'war', 'company', 'graubel', '쇠수레 길을 북부 성채도시 그라우벨까지 이었다', '그라우벨 성문 밖에 쇠수레 역이 섰다. 남쪽 군량과 병사가 열흘 걸리던 길을 이틀에 온다.', { mat: 'iron', demand: ['war', 'monsters'] }),
  T('skyline', '정기 비행선', 8.4, ['airship', 'manacell'], 'sea', 'company', 'harfen', '왕도와 하르펜, 세레니아를 잇는 정기 비행선을 띄웠다', '비행선 계류탑이 성벽보다 높이 섰다. 부자들은 하늘로 다니고, 가난한 사람들은 그 그림자를 올려다본다.', { mat: 'stone', demand: ['trade'] }),
];
export const TECH = Object.fromEntries(TECHS.map((t) => [t.id, t]));
export const TECH_IDS = TECHS.map((t) => t.id);
// 시대를 바꾸는 큰 발명 (시대 순서대로). ERA_AT은 이 발명들의 at과 같다.
export const ERA_KEYS = [null, 'warmstone', 'forge', 'railroad', 'factory', 'crystal', 'airship'];
// 갈래 이름 (화면용)
export const FIELDS = { farm: '농사', craft: '공방', magic: '마법', letters: '글', sea: '바다', war: '싸움', city: '도시', heal: '의술' };
// 연구할 때 필요한 손 (research)
export const HAND = { farm: 'smith', craft: 'smith', magic: 'magic', letters: 'letters', sea: 'smith', war: 'smith', city: 'smith', heal: 'magic' };
