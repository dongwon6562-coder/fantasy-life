// 사건 삽화 견본 페이지(dist/vignette-preview.html)를 만든다. 게임과 같은 그림 코드를 쓴다.
//   node tools/vignette-preview.js
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
writeFileSync('dist/_vig_entry.js', `import '../src/content.js';
import { vignetteImage } from '../src/art/vignette.js';
import { conditionText } from '../src/art/scene.js';
globalThis.FL_DATA_URLS = true; // 견본 페이지는 그림을 data 주소로 넣는다
const GROUPS = [
  ['혼인과 탄생', [['혼례', 'wedding'], ['남의 혼례를 멀리서', 'wedding:far'], ['아이가 태어남', 'birth'], ['밤새 앓는 아이', 'birth:fever'], ['손주', 'birth:grand']]],
  ['죽음', [['장례', 'funeral'], ['무덤 앞에서', 'funeral:visit'], ['국상', 'funeral:state', 'leocast'], ['병상', 'bedside'], ['마지막 자리 (대 잇기)', 'bedside:last']]],
  ['전쟁과 큰일', [['출정', 'muster'], ['피란민', 'muster:refugee'], ['역병', 'plague', 'harfen'], ['마물의 밤', 'monsters'], ['늑대', 'monsters:wolves'], ['굶주림', 'famine'], ['불', 'fire'], ['폭동', 'fire:riot', 'harfen']]],
  ['광장과 법', [['포고 (십강 발표)', 'square:herald', 'harfen'], ['방', 'square:notice', 'harfen'], ['태형', 'square:flog', 'verden'], ['이단 심문', 'square:trial', 'solaris'], ['순찰대 (체포)', 'square:guards', 'harfen'], ['감옥', 'prison']]],
  ['궁정과 신앙', [['알현과 서임', 'court', 'leocast'], ['예배당', 'chapel'], ['세례', 'chapel:child'], ['심문관들 앞', 'chapel:inquisition', 'solaris'], ['잔치', 'festival'], ['망자의 밤', 'festival:dead'], ['유랑 극단', 'festival:troupe']]],
  ['바다와 길', [['항해', 'voyage', 'saltmare'], ['폭풍', 'voyage:storm', 'saltmare'], ['부두', 'voyage:harbor', 'barka'], ['해적', 'voyage:pirate', 'saltmare'], ['바다뱀', 'voyage:serpent', 'saltmare'], ['난파', 'voyage:wreck', 'saltmare'], ['떠나는 길', 'road'], ['돌아오는 길', 'road:return']]],
  ['마법과 전설', [['마법진', 'ritual'], ['수정구', 'ritual:orb'], ['폭주', 'ritual:wild'], ['금지된 술법', 'ritual:dark'], ['연구', 'ritual:study'], ['용', 'dragon', 'barka'], ['큰 미궁의 돌문', 'depths'], ['깊은 왕', 'depths:throne']]],
  ['봉인의 흔들림', [['쇠사슬 꿈', 'seal:dream'], ['북쪽으로 가는 조사단', 'seal:map'], ['그림자가 늦게 따라오는 사람', 'seal:alley', 'harfen'], ['창가의 손님', 'seal:visitor'], ['쐐기를 노리는 밤', 'seal:stone'], ['검은 돌 조각', 'seal:shard'], ['북쪽으로 가는 마법사들', 'seal:rite'], ['깨진 밤 다음 날', 'seal:broken']]],
  ['일터', [['의원', 'trade:healer'], ['음유시인', 'trade:bard', 'harfen'], ['선생', 'trade:teacher'], ['연금술사', 'trade:alchemy', 'harfen'], ['목수와 석공', 'trade:builder']]],
  ['큰 짐승 사냥', [['흔적', 'beast:tracks'], ['큰 멧돼지', 'beast:boar'], ['동굴곰', 'beast:bear'], ['잿빛 큰곰', 'beast:ash'], ['흰 수사슴', 'beast:stag'], ['영주의 사슴', 'beast:deer']]],
  ['원수와 복수', [['등 돌린 친구', 'feud:turned'], ['복수를 꾸미는 밤', 'feud:plot'], ['원수의 손', 'feud:strike'], ['내민 손', 'feud:offer'], ['화해', 'feud:peace']]],
  ['제자와 문하', [['가르침', 'mentor:lesson'], ['절하는 제자', 'mentor:bow'], ['현판을 건 날', 'mentor:found']]],
  ['하늘과 땅의 재앙', [['마른 우물', 'nature:drought'], ['둑이 운다', 'nature:flood'], ['얼어 가는 집', 'nature:winter'], ['땅이 운 날', 'nature:quake'], ['검은 구름', 'nature:locust'], ['부두의 밤', 'nature:storm'], ['잠긴 곳간', 'nature:granary']]],
  ['짐승과 사는 삶', [['짐승 사고팔기', 'beastlife:market'], ['돌보기', 'beastlife:care'], ['사역마 맺기', 'beastlife:bond'], ['묻어 준 자리', 'beastlife:grave']]],
  ['봉기', [['헛간의 밤 모임', 'revolt:secret'], ['장원 문 앞', 'revolt:march'], ['꺾인 뒤', 'revolt:gallows']]],
  ['개척', [['수레 행렬', 'frontier:wagons'], ['숲을 연 자리', 'frontier:clearing'], ['먼저 살던 사람들', 'frontier:natives'], ['밤 습격', 'frontier:raid']]],
  ['목축과 유목', [['풀밭의 양 떼', 'herd:pasture'], ['내 말', 'herd:steed'], ['천막의 저녁', 'herd:camp'], ['소도둑의 밤', 'herd:rustle']]],
  ['망자와 저주', [['버려진 집', 'haunt:house'], ['무덤가', 'haunt:grave'], ['넋을 부르는 자리', 'haunt:seance'], ['저주받은 물건', 'haunt:item']]],
  ['광산', [['갱 입구', 'mine:adit'], ['깊은 굴', 'mine:deep'], ['굴 속의 소리', 'mine:knock'], ['무너진 날', 'mine:collapse'], ['문을 막은 광부들', 'mine:picket']]],
  ['노예', [['노예 시장', 'bondage:market'], ['끌려가는 길', 'bondage:coffle'], ['주인집 마당', 'bondage:yard'], ['풀려난 아침', 'bondage:free-kin']]],
  ['큰 한탕', [['지하의 계획', 'heist:plan'], ['지붕 위', 'heist:roof'], ['금고 앞', 'heist:vault-twist'], ['몫 나누기', 'heist:split']]],
  ['재판정', [['피고석', 'trial:dock'], ['말하는 자리', 'trial:plead'], ['판관석', 'trial:bench']]],
  ['요리사', [['큰 부엌', 'cuisine:kitchen'], ['빈 솥 앞에서', 'cuisine:create'], ['연회', 'cuisine:feast'], ['시식관', 'cuisine:taster'], ['요리 겨루기', 'cuisine:contest'], ['고장의 맛', 'cuisine:stall']]],
  ['유배와 망명', [['유배지', 'exile:island'], ['떠나는 배', 'exile:boat'], ['몰래 건너는 밤', 'exile:boat-night'], ['망명 궁정', 'exile:hall'], ['귀환의 배', 'exile:fleet']]],
  ['큰 공사', [['짓는 터', 'works:site'], ['무너진 비계', 'works:fall'], ['땅을 파는 공사', 'works:dig'], ['완공', 'works:open']]],
  ['첩보', [['포섭', 'spy:recruit'], ['문서를 훔치는 밤', 'spy:steal'], ['들킨 순간', 'spy:caught'], ['쪽지를 넘기는 골목', 'spy:drop'], ['미행', 'spy:tail'], ['발각', 'spy:exposed']]],
  ['마나의 흐름', [['마나 샘', 'mana:spring'], ['샘을 차지한 자들', 'mana:claim'], ['마른 샘', 'mana:dry'], ['마나 폭풍', 'mana:storm'], ['마나 앓이', 'mana:sick']]],
  ['내 농장', [['밭갈이', 'farm:plow'], ['씨뿌리기', 'farm:sow'], ['추수', 'farm:harvest'], ['물길', 'farm:water'], ['곳간', 'farm:barn'], ['곡식 팔기', 'farm:sell']]],
  ['왕가의 피', [['다락의 족보', 'claim:scroll'], ['증거를 태우다', 'claim:burn'], ['옹립', 'claim:acclaim'], ['밤의 손님', 'claim:offer'], ['가짜 왕손', 'claim:pretender']]],
  ['성유물', [['유물 발견', 'relic:find'], ['유물의 선택', 'relic:chosen'], ['유물의 거부', 'relic:rejected'], ['유물 쟁탈', 'relic:contest'], ['가짜 유물', 'relic:fake']]],
  ['약초꾼과 약방', [['약초 캐기', 'apothecary:gather'], ['약 달이기', 'apothecary:brew'], ['밤의 약탕기', 'apothecary:poison'], ['약방', 'apothecary:shop'], ['돌림병의 줄', 'apothecary:queue']]],
  ['불로', [['노아', 'ageless:noa'], ['일곱째 서클', 'ageless:seventh'], ['용의 참이름', 'ageless:truename'], ['쐐기에서 새는 숨', 'ageless:breath'], ['옮겨 가는 몸', 'ageless:vessel'], ['이름을 바꾸고 떠나는 새벽', 'ageless:depart'], ['뒤를 막고 선 사람', 'ageless:rear'], ['마지막 새김', 'ageless:imprint']]],
  ['타고남', [['타고남', 'gift']]],
  ['사절과 볼모', [['사절단 행렬', 'envoy:march'], ['협상 탁자', 'envoy:table'], ['깨진 협상', 'envoy:break'], ['볼모의 궁정', 'envoy:hostage'], ['자란 볼모', 'envoy:hostage-grown']]],
  ['정령', [['물의 정령', 'spirit:water'], ['불의 정령', 'spirit:fire'], ['바람의 정령', 'spirit:wind'], ['땅의 정령', 'spirit:earth'], ['계약', 'spirit:pact']]],
  ['술 빚기', [['양조장', 'brew:house'], ['포도 수확', 'brew:vintage'], ['술 창고', 'brew:cellar'], ['밀주', 'brew:still']]],
  ['형제자매', [['함께 자란 집', 'siblings:home'], ['갈라선 상속 자리', 'siblings:split'], ['떠나는 형제', 'siblings:leave']]],
  ['고대 유적', [['무너진 회랑', 'ruins:hall'], ['고대 문자', 'ruins:glyph'], ['깨어나는 것', 'ruins:wake'], ['도굴의 밤', 'ruins:dig']]],
  ['기사단', [['서약식', 'order:vow'], ['성채', 'order:keep'], ['행군', 'order:march'], ['무너진 날', 'order:fall']]],
  ['건국', [['선포', 'founding:proclaim'], ['대관', 'founding:crown'], ['무너진 왕좌', 'founding:fallen']]],
  ['하늘 기수', [['둥지와 알', 'mount:nest'], ['날개 펼친 마수', 'mount:wings'], ['하늘에서 본 땅', 'mount:above'], ['길들이는 마당', 'mount:tame']]],
  ['포구', [['새벽 고깃배', 'harbor:dawn'], ['폭풍', 'harbor:storm'], ['생선 말리는 장대', 'harbor:racks'], ['돌아오지 않는 배', 'harbor:wait']]],
  ['새 집안의 어린 시절', [['귀족 저택', 'origin:manor'], ['마탑', 'origin:tower'], ['성당', 'origin:church'], ['장인 공방', 'origin:workshop'], ['빈민가 골목', 'origin:slum'], ['항구 도시', 'origin:port']]],
  ['마족', [['경계의 요새', 'demon:fort'], ['마족 사절', 'demon:envoy'], ['마족의 땅', 'demon:land']]],
  ['옷감', [['베틀', 'cloth:loom'], ['염색 통', 'cloth:dye'], ['재봉 가게', 'cloth:shop']]],
  ['새 기술', [['공방의 시제품', 'tech:bench'], ['첫 가로등', 'tech:lamp'], ['인쇄소', 'tech:press'], ['쇠수레 길 놓기', 'tech:rail']]],
  ['도시의 삶', [['공장 안', 'city:mill'], ['셋방 골목', 'city:tenement'], ['닫힌 공장 문', 'city:strike'], ['일을 잃은 마부', 'city:idle']]],
  ['새 시대의 다툼', [['기계를 부수는 밤', 'newage:breakers'], ['벽보 앞의 사람들', 'newage:paper'], ['지하실 모임', 'newage:meeting'], ['떠나는 자식', 'newage:quarrel']]],
  ['평생의 벗', [['술잔', 'friend:cup'], ['다시 만남', 'friend:reunion'], ['벗의 장례', 'friend:funeral'], ['멀어짐', 'friend:apart']]],
  ['기술이 퍼지는 길', [['도제의 손', 'spread:hands'], ['비법서', 'spread:book'], ['떠도는 기술자', 'spread:wander'], ['특허장', 'spread:patent']]],
  ['목수와 석공', [['비계', 'build:scaffold'], ['돌 깎기', 'build:stone'], ['성당 지붕', 'build:roof'], ['무너진 다리', 'build:fallen']]],
  ['점령지', [['점령군 깃발', 'occupied:banner'], ['징발', 'occupied:levy'], ['밤의 저항', 'occupied:night'], ['해방의 날', 'occupied:free']]],
  ['길 위의 일', [['역참 마당', 'carrier:yard'], ['짐수레', 'carrier:cart'], ['눈길', 'carrier:snow'], ['도적', 'carrier:bandit']]],
  ['사교계', [['연회장', 'society:feast'], ['살롱', 'society:salon'], ['무도', 'society:ball'], ['망신', 'society:shame']]],
  ['입양', [['문간의 바구니', 'adopt:basket'], ['고아원', 'adopt:hall'], ['양자 의식', 'adopt:rite'], ['친부모', 'adopt:kin']]],
  ['빚', [['전당포', 'credit:pawn'], ['은행가의 장부', 'credit:ledger'], ['빚 독촉', 'credit:dun'], ['탕감', 'credit:pardon']]],
  ['수도원', [['필사실', 'cloister:script'], ['회랑', 'cloister:walk'], ['은둔처', 'cloister:hermit'], ['떠나는 날', 'cloister:leave']]],
  ['산적', [['산채', 'outlaw:den'], ['길목', 'outlaw:pass'], ['토벌', 'outlaw:raid'], ['몸값', 'outlaw:ransom']]],
  ['사냥꾼', [['덫', 'hunter:trap'], ['숲길', 'hunter:trail'], ['모피 장', 'hunter:furs'], ['큰 짐승', 'hunter:beast']]],
  ['의붓가족', [['새 식탁', 'stepfamily:table'], ['문간의 아이', 'stepfamily:door'], ['다툼', 'stepfamily:quarrel'], ['화해', 'stepfamily:peace']]],
  ['다른 종족의 땅', [['엘프: 이슬 받기', 'peoples:elf_dew'], ['엘프: 낙엽의 노래', 'peoples:elf_fall'], ['드워프: 조상의 불 지키기', 'peoples:dwarf_fire'], ['드워프: 첫 망치', 'peoples:dwarf_hammer'], ['수인: 큰 사냥', 'peoples:beast_hunt'], ['수인: 이름 새기는 밤', 'peoples:beast_totem']]],
  ['지도에 없는 땅', [['서리 너머', 'explore:frost'], ['뿌리 아래 골짜기', 'explore:deepwood'], ['구름 위 고원', 'explore:cloud'], ['안개 군도', 'explore:mist'], ['재의 사막', 'explore:ash'], ['첫 왕의 얼음 무덤', 'explore:heart-frost'], ['세계수의 옛 뿌리', 'explore:heart-deepwood'], ['하늘 계단', 'explore:heart-cloud'], ['잠긴 왕궁', 'explore:heart-mist'], ['첫 왕들의 무덤 골짜기', 'explore:heart-ash']]],
  ['군대·사랑·마탑', [['행군', 'army:march'], ['병영', 'army:camp'], ['진급', 'army:promote'], ['전열', 'army:clash'], ['눈길', 'love:meet'], ['함께 걷는 길', 'love:walk'], ['부부 싸움', 'love:quarrel'], ['들킨 비밀', 'love:caught'], ['마탑 안', 'tower:hall'], ['마탑 회의', 'tower:vote']]],
];
const st = { year: 505, month: 6 };
const main = document.getElementById('groups');
const cells = [];
for (const [name, items] of GROUPS) {
  const sec = document.createElement('section');
  sec.innerHTML = '<h2>' + name + '</h2><div class="grid"></div>';
  for (const [label, key, place] of items) {
    const f = document.createElement('figure');
    f.innerHTML = '<img alt=""><figcaption>' + label + '</figcaption>';
    sec.querySelector('.grid').appendChild(f);
    cells.push({ img: f.querySelector('img'), key, place: place || 'ern' });
  }
  main.appendChild(sec);
}
let job = 0;
function show() {
  const mine = ++job; let i = 0;
  document.getElementById('cap').textContent = '용사력 ' + st.year + '년 ' + st.month + '월 · ' + conditionText(st.year, st.month);
  document.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', +b.dataset.m === st.month));
  (function next() {
    if (mine !== job || i >= cells.length) return;
    const c = cells[i++], [plate, variant] = c.key.split(':');
    c.img.src = vignetteImage({ plate, variant, year: st.year, month: st.month, place: c.place, seed: i });
    setTimeout(next, 10);
  })();
}
document.getElementById('months').innerHTML = Array.from({ length: 12 }, (_, i) => '<button class="ghost" data-m="' + (i + 1) + '">' + (i + 1) + '월</button>').join('');
document.getElementById('months').onclick = (e) => { const m = e.target.dataset.m; if (m) { st.month = +m; show(); } };
document.getElementById('prev').onclick = () => { st.year--; show(); };
document.getElementById('next').onclick = () => { st.year++; show(); };
show();
`);
execSync('npx --yes esbuild@0.24.0 dist/_vig_entry.js --bundle --format=iife --minify --outfile=dist/_vig_bundle.js', { stdio: 'inherit' });
const js = readFileSync('dist/_vig_bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>사건 삽화 견본</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
:root { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; --f-display: 'Gowun Batang', 'Noto Serif KR', serif; --f-body: 'IBM Plex Sans KR', system-ui, sans-serif; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg: #efe7d6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; } }
:root[data-theme="light"] { --bg: #efe7d6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; } }
:root[data-theme="dark"] { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--f-body); line-height: 1.6; }
main { max-width: 1180px; margin: 0 auto; padding: 28px 16px 48px; display: grid; gap: 22px; }
h1 { font-family: var(--f-display); font-size: clamp(24px, 4vw, 34px); margin: 0; letter-spacing: .04em; }
h2 { font-family: var(--f-display); font-size: 19px; margin: 0 0 8px; color: var(--brass); }
p { margin: 0; }
.lead { color: var(--muted); max-width: 68ch; }
#groups { display: grid; gap: 26px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
figure { margin: 0; }
figure img { display: block; width: 100%; aspect-ratio: 640 / 240; border: 1px solid var(--line); border-radius: 6px; background: #221c16; }
figcaption { color: var(--muted); font-size: 13px; margin-top: 4px; }
#cap { color: var(--muted); font-size: 14px; margin-left: 6px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
button { font: inherit; cursor: pointer; }
.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; min-height: 40px; }
.ghost:hover { border-color: var(--brass); }
.ghost.on { border-color: var(--brass); color: var(--brass); }
</style>
</head>
<body>
<main>
  <header>
    <h1>사건 삽화 견본</h1>
    <p class="lead">큰 사건이 뜰 때 사건 창 위쪽에 나오는 그림이다. 같은 장면도 달(계절)과 그달의 때·날씨, 장소, 나오는 사람에 따라 달라진다. 달을 바꾸거나 해를 넘겨 본다.</p>
  </header>
  <div class="row"><button class="ghost" id="prev">앞 해</button><button class="ghost" id="next">다음 해</button><span id="cap"></span></div>
  <div class="row" id="months"></div>
  <div id="groups"></div>
</main>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync('dist/vignette-preview.html', html);
console.log('dist/vignette-preview.html', (html.length / 1024).toFixed(0) + 'KB');
