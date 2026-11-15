// 초상 견본 페이지(dist/portrait-preview.html)를 만든다. 게임과 같은 그림 코드를 쓴다.
//   node tools/portrait-preview.js
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { portrait, looksOf } from '../src/art/portrait.js';

mkdirSync('dist', { recursive: true });
const NAMES = ['아델', '브람', '세라', '도윈', '엘린', '가렛', '헬가', '이든', '요나', '카이', '리아', '모건', '노라', '오웬', '페이', '로한', '실비', '토르', '우나', '베른'];
const P = (i, o = {}) => ({ id: i, name: NAMES[i % NAMES.length], lastName: '성' + (i * 7 % 13), sex: i % 2 ? 'm' : 'f', ageMonths: 12 * 28, job: 'farmer', alive: true, affection: 0, ...o });
const cell = (svg, label) => `<figure>${svg}<figcaption>${label}</figcaption></figure>`;
const row = (cells, cls = '') => `<div class="grid ${cls}">${cells.join('')}</div>`;
const S = 132;

// 1. 예전과 지금 (main의 예전 그림 코드를 불러와 같은 사람을 그린다)
let before = '';
try {
  const old = execSync('git show 1ed7960:src/art/portrait.js', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  writeFileSync('dist/_old_portrait.mjs', old);
  const { portrait: oldPortrait } = await import(pathToFileURL(resolve('dist/_old_portrait.mjs')).href);
  const who = [[5, 'hunter', 28], [6, 'merchant', 34], [11, 'old_knight', 58], [12, 'weaver', 66], [3, 'smith', 44], [8, 'priest', 23]];
  before = `<section><h2>예전과 지금</h2><p class="lead">같은 사람을 예전 그림과 새 그림으로 나란히 놓았다. 위가 예전, 아래가 지금.</p>
    ${row(who.map(([i, job, a]) => cell(oldPortrait(null, P(i, { job, ageMonths: a * 12 }), { size: S }), '예전')), 'six')}
    ${row(who.map(([i, job, a]) => cell(portrait(null, P(i, { job, ageMonths: a * 12 }), { size: S }), `${a}살`)), 'six')}</section>`;
} catch { /* 예전 코드를 못 찾으면 이 칸은 뺀다 */ }

// 2. 한 사람의 평생
const AGES = [1, 6, 11, 15, 22, 32, 45, 58, 70, 84];
const lives = [[3, 'guard'], [4, 'adventurer'], [9, 'smith'], [14, 'weaver']].map(([i, job]) => row(AGES.map((a) => cell(portrait(null, P(i, { ageMonths: a * 12, job: a < 13 ? 'child' : job }), { size: 104 }), `${a}살`)), 'ten')).join('');

// 3. 직업
const JOBS = [['farmer', '농부'], ['laborer', '품팔이'], ['miller', '방앗간지기'], ['herbalist', '약초꾼'], ['weaver', '직조공'], ['hunter', '사냥꾼'], ['smith', '대장장이'], ['carpenter', '목수'], ['baker', '빵장수'], ['innkeeper', '여관 주인'], ['apprentice', '견습생'], ['merchant', '상인'], ['guild_clerk', '길드 서기'], ['trade_master', '상단주'], ['guildmaster', '길드장'], ['gang_boss', '뒷골목 두목'],
  ['guard', '경비병'], ['adventurer', '모험가'], ['old_knight', '늙은 기사'], ['knight', '기사'], ['knight_captain', '기사단장'], ['sword_master', '검술 사범'], ['priest', '사제'], ['bishop', '주교'], ['hedge_mage', '떠돌이 마법사'], ['court_mage', '궁정 마법사'], ['scholar', '학자'], ['elder', '촌장'], ['count', '백작'], ['child', '아이']];
const jobs = row(JOBS.map(([job, name], k) => cell(portrait(null, P(20 + k * 3, { job, ageMonths: 12 * (job === 'child' ? 9 : job === 'elder' || job === 'old_knight' || job === 'bishop' ? 62 : 24 + (k * 11) % 30) }), { size: S }), name)), 'six');

// 4. 표정
const MOODS = [['', '보통'], ['warm', '웃음'], ['cold', '찡그림'], ['tired', '지침'], ['stressed', '근심'], ['sick', '아픔']];
const moods = [[5, 'hunter'], [6, 'merchant'], [12, 'herbalist']].map(([i, job]) => row(MOODS.map(([m, n]) => cell(portrait(null, P(i, { job }), { size: S, mood: m }), n)), 'six')).join('');

// 5. 종족
const RACES = [['elf', '엘프', {}], ['elf', '엘프', {}], ['half_elf', '하프 엘프', {}], ['dwarf', '드워프', {}], ['dwarf', '드워프', {}], ['demon', '마족', {}], ['demon', '마족', {}], ['half_demon', '반마족', {}],
  ['beast', '수인 · 늑대', { beast: 'wolf' }], ['beast', '수인 · 고양이', { beast: 'cat' }], ['beast', '수인 · 호랑이', { beast: 'tiger' }], ['beast', '수인 · 사자', { beast: 'lion' }], ['beast', '수인 · 곰', { beast: 'bear' }], ['beast', '수인 · 매', { beast: 'hawk' }]];
const RJOBS = ['court_mage', 'hunter', 'adventurer', 'smith', 'knight', 'gang_boss', 'scholar', 'merchant', 'guard', 'weaver', 'sword_master', 'knight_captain', 'laborer', 'hunter'];
const races = row(RACES.map(([race, name, extra], k) => cell(portrait(null, P(40 + k * 5 + (k === 3 || k === 11 ? 1 : 0), { race, job: RJOBS[k], ageMonths: 12 * (race === 'elf' ? 180 : race === 'dwarf' ? 90 : 30 + k * 2), ...extra }), { size: S }), name)), 'six');

// 6. 흉터
const SCARS = [['왼뺨의 칼자국'], ['눈가의 흉터'], ['이마의 흉터', '턱의 흉터'], ['입술의 흉터'], ['화상 자국'], ['코의 흉터', '오른뺨의 칼자국', '눈가의 흉터']];
const scars = row(SCARS.map((sc, k) => cell(portrait(null, P(60 + k * 3, { job: k % 2 ? 'adventurer' : 'old_knight', ageMonths: 12 * (30 + k * 6) }), { size: S, scars: sc }), sc.join(', '))), 'six');

// 7. 가족
const fa = P(81, { job: 'smith', ageMonths: 12 * 46, sex: 'm' }), mo = P(82, { job: 'weaver', ageMonths: 12 * 43, sex: 'f' });
const kids = [0, 1, 2, 3].map((k) => P(90 + k, { fatherId: 81, motherId: 82, sex: k % 2 ? 'm' : 'f', ageMonths: 12 * [21, 17, 12, 6][k], job: ['apprentice', 'apprentice', 'child', 'child'][k], lastName: fa.lastName }));
const game = { people: [fa, mo, ...kids] };
const family = row([cell(portrait(game, fa, { size: S }), `아버지 · ${looksOf(game, fa)}`), cell(portrait(game, mo, { size: S }), `어머니 · ${looksOf(game, mo)}`), ...kids.map((c) => cell(portrait(game, c, { size: S }), `${c.sex === 'm' ? '아들' : '딸'} ${Math.floor(c.ageMonths / 12)}살 · ${looksOf(game, c)}`))], 'six');

// 8. 작은 크기
const small = `<div class="small">${Array.from({ length: 24 }, (_, k) => portrait(null, P(100 + k, { job: JOBS[k % JOBS.length][0], ageMonths: 12 * (16 + (k * 7) % 55) }), { size: 48 })).join('')}</div>`;

// 9. 삶의 흔적 (10단계)
const PW = (i, o = {}) => P(i, { wealth: 150, health: 80, history: [], ...o });
const meGame = (inj, sc, extra = {}) => { const p = PW(77, { isPlayer: true, job: 'idle', sex: 'm' }); return [{ player: { id: 77, scars: sc, injuries: inj, money: 100, familyMoney: 100, stress: 10, fatigue: 30 }, life: { gear: { armor: 3 }, stats: { fights: 20 }, home: 'own' }, people: [p], ...extra }, p]; };
const meCell = (label, inj, sc, extra) => { const [g, p] = meGame(inj, sc, extra); return cell(portrait(g, p, { size: S }), label); };
const hurt = row([
  meCell('멀쩡할 때', [], []), meCell('머리를 다침', [{ name: '곤봉에 맞은 머리', months: 2 }], []), meCell('얻어맞음', [{ name: '뒷골목에서 맞은 갈비뼈', months: 2 }], []),
  meCell('팔을 베임', [{ name: '칼에 베인 팔', months: 3 }], []), meCell('열병', [{ name: '잿빛 열병', months: 2 }], []), meCell('크게 다침', [{ name: '등에 꽂힌 칼자국', months: 4, mortal: true }, { name: '칼에 베인 팔', months: 3 }], []),
], 'six');
const lifeScars = row([
  meCell('싸움 몇 번', [], ['굽은 단검에 베인 팔', '장검에 베인 허벅지']), meCell('싸움 수십 번', [], ['굽은 단검에 베인 팔', '장검에 베인 허벅지', '도끼에 베인 옆구리', '늑대에게 물린 다리', '칼에 베인 뺨', '창에 베인 어깨']),
  meCell('얼굴을 여러 번 베임', [], ['발톱에 베인 이마', '칼에 베인 눈가', '늑대에게 물린 턱', '검에 베인 목']),
  meCell('감옥에 갇힘', [], [], { crime: { jailed: { months: 6 } } }), meCell('거리에서 지냄', [], [], { player: { id: 77, scars: [], injuries: [], money: 0, familyMoney: 0, stress: 80 }, life: { home: 'street', gear: {}, stats: {} } }),
  meCell('영지를 얻음', [], ['칼에 베인 뺨'], { domain: { name: '영지' } }),
], 'six');
const VJ = [['old_knight', '늙은 기사', 61], ['mercenary', '용병', 44], ['pirate_lord', '해적 두목', 52], ['gang_boss', '뒷골목 두목', 48], ['adventurer', '모험가', 39], ['sword_master', '검술 사범', 57], ['pirate', '해적', 35], ['knight_captain', '기사단장', 50], ['delver', '구렁 탐사꾼', 42], ['hunter', '사냥꾼', 55], ['smith', '대장장이', 49], ['guard', '경비병', 46]];
const veterans = row(VJ.map(([job, name, a], k) => cell(portrait(null, PW(200 + k * 7, { job, ageMonths: 12 * a, sex: k % 4 === 3 ? 'f' : 'm' }), { size: S }), `${name} · ${a}살`)), 'six');
const tiers = [[5, 'farmer', '농부'], [8, 'weaver', '직조공'], [13, 'guild_clerk', '서기']].map(([i, job, name]) => row([[-50, '빚더미'], [20, '가난'], [150, '보통'], [900, '넉넉'], [4000, '부자']].map(([w, t]) => cell(portrait(null, PW(i, { job, wealth: w }), { size: S }), `${name} · ${t}`)), 'five')).join('');
const NEWJ = [['physician', '의원'], ['bard', '음유시인'], ['tutor', '선생'], ['scholar', '학자'], ['alchemist', '연금술사'], ['carpenter', '목수'], ['mason', '석공'], ['fisher', '어부'], ['sailor', '뱃사람'], ['sea_captain', '선장'], ['pirate', '해적'], ['pirate_lord', '해적 두목'], ['mercenary', '용병'], ['soldier', '병사'], ['heavy', '중갑 전사'], ['delver', '구렁 탐사꾼'], ['trapper', '덫사냥꾼'], ['rat_boss', '쥐굴 두목'], ['gang_member', '조직원'],
  ['fence', '장물아비'], ['prisoner', '죄수'], ['beggar', '걸인'], ['inquisitor', '이단심문관'], ['acolyte', '신전 일꾼'], ['sea_priest', '바다 신관'], ['keeper', '불씨지기'], ['official', '관리'], ['courtier', '궁정 관리'], ['minister', '대신'], ['lord', '영주'], ['royal', '왕족'],
  ['artificer', '마도구 장인'], ['gardener', '정원지기'], ['undertaker', '장의사'], ['warden', '간수'], ['idle', '일 없는 사람'], ['trade_master', '상단주']];
const newJobs = row(NEWJ.map(([job, name], k) => cell(portrait(null, PW(20 + k * 3, { job, ageMonths: 12 * (26 + (k * 11) % 34) }), { size: S }), name)), 'six');
const LA = [18, 26, 34, 42, 50, 58, 66, 74, 82, 92];
const weathered = [[14, 'fisher', 10], [7, 'scholar', 900]].map(([i, job, w]) => row(LA.map((a) => cell(portrait(null, PW(i, { ageMonths: a * 12, job, wealth: w }), { size: 104 }), `${a}살`)), 'ten')).join('');
const R2 = [['elf', '엘프', {}], ['half_elf', '하프 엘프', {}], ['dwarf', '드워프', {}], ['dwarf', '드워프', {}], ['demon', '마족', {}], ['half_demon', '반마족', {}], ['beast', '수인 · 늑대', { beast: 'wolf' }], ['beast', '수인 · 고양이', { beast: 'cat' }], ['beast', '수인 · 호랑이', { beast: 'tiger' }], ['beast', '수인 · 사자', { beast: 'lion' }], ['beast', '수인 · 곰', { beast: 'bear' }], ['beast', '수인 · 매', { beast: 'hawk' }]];
const R2J = ['scholar', 'merchant', 'smith', 'weaver', 'mercenary', 'adventurer', 'guard', 'herbalist', 'mercenary', 'knight_captain', 'laborer', 'hunter'];
const races2 = row(R2.map(([race, name, extra], k) => cell(portrait(null, PW(45 + k * 5, { race, job: R2J[k], sex: [0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1][k] ? 'm' : 'f', ageMonths: 12 * (race === 'elf' ? 200 : race === 'dwarf' ? 90 : 28 + k * 2), ...extra }), { size: S }), name)), 'six');

const html = `<title>인물 초상 견본</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
/* 게임과 같은 촛불 서재 빛깔(어두운 모습으로 고정). 초상이 주인공이라 글은 작게 받친다. */
:root { --bg: #17130f; --panel: #221c16; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a;
  --f-display: 'Gowun Batang', 'Noto Serif KR', serif; --f-body: 'IBM Plex Sans KR', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 15px; line-height: 1.6; }
.wrap { max-width: 980px; margin: 0 auto; padding: 28px 16px 64px; display: grid; gap: 36px; }
h1, h2 { font-family: var(--f-display); margin: 0; text-wrap: balance; }
h1 { font-size: clamp(26px, 5vw, 38px); line-height: 1.25; }
h2 { font-size: 21px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
.eyebrow { color: var(--brass); letter-spacing: .16em; font-size: 12px; }
.lead, .head p { margin: 0; color: var(--muted); max-width: 64ch; }
section { display: grid; gap: 14px; }
.grid { display: grid; gap: 14px 10px; }
.grid.six { grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); }
.grid.ten { grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; }
.grid.five { grid-template-columns: repeat(5, minmax(0, 1fr)); }
figure { margin: 0; display: grid; justify-items: center; gap: 4px; min-width: 0; }
figure svg { width: 100%; height: auto; max-width: 150px; display: block; }
figcaption { font-size: 12.5px; color: var(--muted); text-align: center; text-wrap: balance; }
.small { display: flex; flex-wrap: wrap; gap: 8px; }
.what { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; }
.what ul { margin: 0; padding-left: 1.2em; display: grid; gap: 6px; color: var(--muted); font-size: 14px; }
.what b { color: var(--ink); font-weight: 500; }
@media (max-width: 640px) { .grid.ten { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
</style>
<div class="wrap">
  <header class="head" style="display:grid;gap:8px">
    <span class="eyebrow">용사력 500년 · 인물 초상</span>
    <h1>인물 초상</h1>
    <p>게임 속 모든 사람의 얼굴은 그 자리에서 그려진다. 같은 사람은 언제나 같은 얼굴이고, 나이를 먹고, 기분이 얼굴에 드러나고, 부모를 닮는다.</p>
  </header>
  <section class="what"><ul>
    <li><b>얼굴에 명암이 생겼다.</b> 빛이 왼쪽 위에서 들어와 이마와 광대는 밝고 눈두덩과 턱 밑은 어둡다. 굵은 테두리 선은 뺐다.</li>
    <li><b>이목구비가 사람마다 다르다.</b> 턱과 광대, 눈매와 눈꺼풀, 콧대, 입술, 눈썹이 따로 정해진다.</li>
    <li><b>머리 모양 열여덟 가지, 수염 일곱 가지.</b> 나이가 들면 세고, 벗어지고, 틀어 올린다.</li>
    <li><b>직업마다 옷과 쓰개가 다르다.</b> 사슬 갑옷, 판금 어깨, 모피 깃, 영대, 앞치마, 두건까지 서른 가지쯤.</li>
    <li><b>종족.</b> 엘프, 하프 엘프, 드워프, 수인 여섯 부족, 마족과 반마족. 오래 사는 종족은 몸 나이로 늙는다.</li>
    <li><b>흉터는 이름에 적힌 자리에 난다.</b> 뺨, 눈가, 이마, 입술, 턱, 화상.</li>
    <li><b>얼굴이 삶을 담는다.</b> 다친 곳, 흉터, 살림 형편, 하는 일과 신분, 볕에 그을린 정도가 저절로 초상에 얹힌다.</li>
  </ul></section>
  <section><h2>다친 얼굴</h2><p class="lead">내가 다치면 초상에 바로 드러난다. 머리 붕대, 멍든 눈, 팔걸이 천, 열에 뜬 얼굴.</p>${hurt}</section>
  <section><h2>살아온 흔적</h2><p class="lead">얼굴을 베이면 그 자리에 흉터가 남고, 몸의 흉터가 쌓이면 끊긴 눈썹이나 휜 콧대 같은 자잘한 흔적이 는다. 처지가 바뀌면 옷도 바뀐다.</p>${lifeScars}</section>
  <section><h2>싸우며 산 사람들</h2><p class="lead">기사, 용병, 해적, 뒷골목 사람은 나이가 들수록 흉터가 있기 쉽다. 눈을 잃은 사람은 안대를 한다.</p>${veterans}</section>
  <section><h2>살림 형편</h2><p class="lead">같은 사람, 같은 일이라도 형편에 따라 옷이 다르다. 가난하면 빛이 바래고 기운 자리가 보이고 얼굴이 야윈다.</p>${tiers}</section>
  <section><h2>새 옷차림</h2><p class="lead">바다, 뒷골목, 싸움터, 신전, 궁정의 사람들.</p>${newJobs}</section>
  <section><h2>볕에 산 얼굴과 책상 앞의 얼굴</h2><p class="lead">위는 어부, 아래는 학자. 밖에서 일한 사람은 살갗이 그을리고 주름이 일찍 깊어진다. 일흔을 넘기면 관자놀이가 꺼지고 눈빛이 흐려진다.</p>${weathered}</section>
  <section><h2>종족의 얼굴</h2><p class="lead">드워프의 두꺼운 눈썹뼈와 땋은 머리, 수인의 코와 뺨 털, 매 부족의 눈 밑 줄무늬, 마족의 타고난 무늬.</p>${races2}</section>
  <section><h2>한 사람의 평생</h2><p class="lead">한 줄이 한 사람이다. 한 살부터 여든넷까지.</p>${lives}</section>
  <section><h2>직업과 옷차림</h2>${jobs}</section>
  <section><h2>표정</h2><p class="lead">내 얼굴은 피로와 근심, 다친 몸을 따르고, 다른 사람의 얼굴은 나를 대하는 마음을 따른다.</p>${moods}</section>
  <section><h2>종족</h2>${races}</section>
  <section><h2>흉터</h2>${scars}</section>
  <section><h2>가족</h2><p class="lead">아이들은 부모의 머리색, 눈색, 피부, 얼굴 생김을 섞어 물려받는다.</p>${family}</section>
  <section><h2>작은 크기</h2><p class="lead">인물 수첩의 목록에서는 이 크기로 보인다.</p>${small}</section>
</div>
`;
writeFileSync('dist/portrait-preview.html', html);
console.log('dist/portrait-preview.html', (html.length / 1024).toFixed(0) + 'KB');
