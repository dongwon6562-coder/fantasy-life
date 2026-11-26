// 사건 삽화: 큰 사건이 뜰 때 사건 창 위쪽 그림 칸(.ev-art)에 그 장면의 그림 한 장을 얹는다.
// 규칙은 건드리지 않는다. 떠 있는 사건을 읽기만 하고, 스스로 화면에 붙는다 (전투 연출과 같은 방식).
//
//   vignetteImage(spec) → 그림 주소 (없으면 '')
//     spec: { plate, variant?, year, month, place, me?, other?, seed? }
//       plate   : wedding funeral birth muster square plague monsters famine fire prison voyage court festival chapel dragon road bedside ritual depths seal trade beast army love tower
//       me/other: 게임 속 사람 (머리·옷 빛깔과 성별·나이를 읽는다). 없어도 된다.
//   vignetteFor(game, { title, text, outcome }) → spec 또는 null : 지금 뜬 사건에 어울리는 그림
//
// 그림은 한 번 그려 JPEG로 바꿔 두고(작은 캔버스는 바로 비운다) 여덟 장까지만 기억한다.
// 전투 연출(.fl-battle)이 붙은 창에는 얹지 않는다.
import { HOOKS } from '../hooks.js';
import { rng, strSeed, canvasUrl, dropUrl } from './sceneKit.js';
import { conditions } from './scene.js';
import { describe } from './scenePlaces.js';
import { skyOf } from './sceneSky.js';
import { paletteOf } from './sceneLand.js';
import { VW, VH, toner, lookFor } from './vignetteKit.js';
import { PLATES as PLATES1 } from './vignettePlates.js';
import { PLATES2 } from './vignettePlates2.js';
import { PLATES3 } from './vignettePlates3.js';
import { PLATES4 } from './vignettePlates4.js';
import { PLATES5 } from './vignettePlates5.js';
import { PLATES6 } from './vignettePlates6.js';
import { PLATES7 } from './vignettePlates7.js';
import { PLATES8 } from './vignettePlates8.js';
import { PLATES9 } from './vignettePlates9.js';
import { PLATES10 } from './vignettePlates10.js';
import { PLATES11 } from './vignettePlates11.js';
import { PLATES12 } from './vignettePlates12.js';
import { PLATES13 } from './vignettePlates13.js';
import { PLATES14 } from './vignettePlates14.js';
import { PLATES15 } from './vignettePlates15.js';
import { PLATES16 } from './vignettePlates16.js';
import { PLATES17 } from './vignettePlates17.js';
import { PLATES18 } from './vignettePlates18.js';
import { PLATES19 } from './vignettePlates19.js';
import { PLATES20 } from './vignettePlates20.js';
import { PLATES21 } from './vignettePlates21.js';
import { PLATES22 } from './vignettePlates22.js';
import { PLATES23 } from './vignettePlates23.js';
import { PLATES24 } from './vignettePlates24.js';
import { PLATES25 } from './vignettePlates25.js';
import { inkFinish } from './vignetteFinish.js';
import { regionOfSite } from './mapTrail.js';
import { paintFinish } from './scenePaint.js';
import { noteMotion } from './sceneMotion.js';

const PLATES = { ...PLATES1, ...PLATES2, ...PLATES3, ...PLATES4, ...PLATES5, ...PLATES6, ...PLATES7, ...PLATES8, ...PLATES9, ...PLATES10, ...PLATES11, ...PLATES12, ...PLATES13, ...PLATES14, ...PLATES15, ...PLATES16, ...PLATES17, ...PLATES18, ...PLATES19, ...PLATES20, ...PLATES21, ...PLATES22, ...PLATES23, ...PLATES24, ...PLATES25 };

const hasDom = typeof document !== 'undefined';
const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };
const SCALE = 1.5; // 그리는 크기: 960x360

/* ---------- 그리기 ---------- */
// 판마다 당겨 그릴 중심(x)과 배율
const FOCUS = { 'birth:': [320, 1], 'wedding:': [320, 1], 'funeral:': [320, 1], 'muster:': [320, 1], 'bedside:last': [320, 1], rites: [320, 1.03], scholar: [320, 1.03], peers: [320, 1.03], accord: [320, 1.03], artifice: [320, 1.03], lands: [320, 1.03], crowns: [320, 1.03], delve: [320, 1.03], demonkind: [320, 1.03], demonland: [320, 1.03], demongod: [320, 1.03], sword: [320, 1.03], spell: [320, 1.03], kindred: [320, 1.03], jail: [320, 1.03], stars: [320, 1.03], survey: [320, 1.03], baseborn: [320, 1.03], migrate: [320, 1.03], undertaker: [320, 1.03], adopt: [320, 1.03], credit: [320, 1.03], cloister: [320, 1.03], outlaw: [330, 1.05], hunter: [330, 1.05], stepfamily: [330, 1.04], occupied: [330, 1.05], carrier: [330, 1.05], society: [330, 1.04], friend: [330, 1.05], spread: [330, 1.05], build: [330, 1.04], tech: [330, 1.05], city: [330, 1.05], newage: [330, 1.05], origin: [330, 1.06], demon: [330, 1.05], cloth: [330, 1.06], founding: [330, 1.06], mount: [330, 1.04], harbor: [330, 1.06], siblings: [330, 1.06], ruins: [330, 1.06], order: [330, 1.06], envoy: [330, 1.08], spirit: [330, 1.06], brew: [330, 1.08], ageless: [330, 1.08], gift: [330, 1.08], claim: [330, 1.08], relic: [330, 1.08], apothecary: [330, 1.08], spy: [330, 1.1], mana: [330, 1.1], farm: [330, 1.08], exile: [330, 1.1], works: [340, 1.08], cuisine: [330, 1.08], revolt: [330, 1.1], frontier: [330, 1.1], herd: [320, 1.1], haunt: [330, 1.1], mine: [340, 1.1], bondage: [330, 1.1], heist: [330, 1.1], trial: [330, 1.08], wedding: [410, 1.15], funeral: [330, 1.2], birth: [300, 1.1], muster: [380, 1.25], square: [330, 1.15], plague: [330, 1.25], monsters: [330, 1.2], famine: [330, 1.15], fire: [300, 1.25], prison: [380, 1.15], voyage: [330, 1.15], court: [400, 1.1], festival: [320, 1.3], chapel: [330, 1.1], dragon: [320, 1], road: [300, 1.25], bedside: [330, 1.15], ritual: [320, 1.2], depths: [330, 1.1], seal: [330, 1.1], trade: [330, 1.1], beast: [310, 1.15], mentor: [320, 1.1], nature: [330, 1.1], beastlife: [330, 1.1], peoples: [320, 1.1], feud: [330, 1.1], explore: [330, 1.1], army: [330, 1.1], love: [360, 1.25], tower: [330, 1.1] };
// 늘 밤이나 해 질 녘이어야 하는 그림
const TOD = { 'rites:feast': 'night', 'rites:host': 'day', 'rites:rite': 'day', 'rites:calendar': 'day', 'rites:contest': 'day', 'rites:mishap': 'night', 'scholar:write': 'night', 'scholar:debate': 'day', 'scholar:shelf': 'day', 'scholar:library': 'day', 'scholar:copy': 'day', 'scholar:censor': 'dusk', 'scholar:lecture': 'day', 'artifice:bench': 'night', 'artifice:cut': 'day', 'artifice:engrave': 'night', 'artifice:blast': 'night', 'artifice:order': 'day', 'artifice:apprentice': 'day', 'artifice:stolen': 'night', 'artifice:heirloom': 'day', 'accord:treaty': 'day', 'accord:blockade': 'day', 'accord:border': 'day', 'accord:wedding': 'day', 'accord:betray': 'night', 'accord:market': 'day', 'accord:map': 'night', 'accord:toll': 'day', 'peers:yard': 'dusk', 'peers:field': 'dusk', 'peers:fallen': 'dusk', 'peers:apart': 'dawn', 'peers:reunion': 'night', 'peers:dock': 'day', 'peers:court': 'day', 'peers:news': 'day', 'delve:gate': 'day', 'delve:town': 'dusk', 'delve:record': 'day', 'delve:return': 'day', 'crowns:elders': 'dawn', 'crowns:tribes': 'night', 'crowns:coup': 'night', 'crowns:emperor': 'day', 'crowns:curia': 'day', 'crowns:tower': 'night', 'crowns:merchant': 'day', 'crowns:clans': 'night', 'crowns:heir': 'day', 'lands:pilgrim': 'day', 'lands:academy': 'dusk', 'lands:lake': 'dawn', 'lands:canopy': 'dusk', 'lands:camp': 'day', 'lands:warport': 'day', 'lands:minetown': 'dusk', 'lands:canal': 'day', 'demonkind:warrior': 'dusk', 'demonkind:trade': 'dusk', 'demonkind:silent': 'day', 'demonkind:hiding': 'day', 'demonland:bones': 'dusk', 'demonland:harbor': 'dusk', 'demonland:city': 'night', 'demonland:outpost': 'night', 'demongod:dream': 'night', 'demongod:shard': 'day', 'demongod:apostle': 'dawn', 'demongod:cult': 'night', 'demongod:war': 'night', 'demongod:choice': 'dusk', 'demongod:watch': 'night', 'sword:vow': 'day', 'sword:deck': 'day', 'sword:flow': 'day', 'sword:heavy': 'day', 'sword:feint': 'dusk', 'sword:axe': 'night', 'sword:twin': 'day', 'sword:fist': 'dusk', 'sword:aura': 'dawn', 'sword:rank': 'day', 'sword:rival': 'dawn', 'sword:spellblade': 'night', 'spell:fire': 'dusk', 'spell:water': 'day', 'spell:wind': 'day', 'spell:earth': 'day', 'spell:light': 'night', 'spell:shadow': 'night', 'spell:life': 'day', 'spell:mind': 'night', 'spell:surge': 'night', 'spell:desk': 'night', 'kindred:grove': 'dusk', 'kindred:minstrel': 'dusk', 'kindred:freed': 'dawn', 'kindred:hall': 'night', 'kindred:trader': 'day', 'kindred:exile': 'day', 'kindred:wolf': 'night', 'kindred:tiger': 'dusk', 'kindred:hawk': 'day', 'kindred:border': 'day', 'kindred:hidden': 'night', 'jail:cell': 'day', 'jail:visit': 'day', 'jail:rope': 'night', 'jail:release': 'dawn', 'stars:roof': 'night', 'stars:comet': 'night', 'stars:eclipse': 'day', 'stars:stall': 'dusk', 'survey:field': 'day', 'survey:shop': 'day', 'survey:stone': 'day', 'survey:war': 'night', 'baseborn:door': 'dusk', 'baseborn:face': 'day', 'baseborn:shield': 'day', 'baseborn:named': 'day', 'migrate:snow': 'day', 'migrate:camp': 'night', 'migrate:gate': 'day', 'migrate:village': 'dawn', 'undertaker:shop': 'day', 'undertaker:cortege': 'day', 'undertaker:night': 'night', 'undertaker:plague': 'dusk', 'adopt:basket': 'dawn', 'adopt:hall': 'day', 'adopt:rite': 'dusk', 'adopt:kin': 'dusk', 'credit:pawn': 'day', 'credit:ledger': 'night', 'credit:dun': 'day', 'credit:pardon': 'dusk', 'cloister:script': 'day', 'cloister:walk': 'day', 'cloister:hermit': 'dawn', 'cloister:leave': 'dawn', 'outlaw:den': 'dusk', 'outlaw:pass': 'day', 'outlaw:raid': 'dawn', 'outlaw:ransom': 'dusk', 'hunter:trap': 'dawn', 'hunter:trail': 'day', 'hunter:furs': 'day', 'hunter:beast': 'day', 'stepfamily:table': 'night', 'stepfamily:door': 'dusk', 'stepfamily:quarrel': 'night', 'stepfamily:peace': 'dusk', 'occupied:banner': 'day', 'occupied:levy': 'day', 'occupied:night': 'night', 'occupied:free': 'dawn', 'carrier:yard': 'dawn', 'carrier:cart': 'day', 'carrier:snow': 'day', 'carrier:bandit': 'dusk', 'society:feast': 'night', 'society:salon': 'dusk', 'society:ball': 'night', 'society:shame': 'night', 'friend:cup': 'night', 'friend:reunion': 'dusk', 'friend:funeral': 'day', 'friend:apart': 'dusk', 'spread:hands': 'day', 'spread:book': 'night', 'spread:wander': 'day', 'spread:patent': 'day', 'build:scaffold': 'day', 'build:stone': 'day', 'build:roof': 'day', 'build:fallen': 'day', 'tech:bench': 'night', 'tech:lamp': 'dusk', 'tech:press': 'day', 'tech:rail': 'day', 'city:mill': 'day', 'city:tenement': 'dusk', 'city:strike': 'day', 'city:idle': 'day', 'newage:breakers': 'night', 'newage:paper': 'day', 'newage:meeting': 'night', 'newage:quarrel': 'dusk', 'origin:manor': 'day', 'origin:tower': 'night', 'origin:church': 'day', 'origin:workshop': 'day', 'origin:slum': 'dusk', 'origin:port': 'day', 'demon:fort': 'night', 'demon:envoy': 'dusk', 'demon:land': 'dusk', 'cloth:loom': 'day', 'cloth:dye': 'day', 'cloth:shop': 'day', 'founding:proclaim': 'dawn', 'founding:fallen': 'dusk', 'mount:nest': 'dusk', 'mount:wings': 'day', 'mount:above': 'day', 'mount:tame': 'day', 'harbor:dawn': 'dawn', 'harbor:storm': 'night', 'harbor:racks': 'day', 'harbor:wait': 'dusk', 'siblings:home': 'night', 'siblings:split': 'dusk', 'siblings:leave': 'dawn', 'ruins:hall': 'day', 'ruins:dig': 'night', 'order:fall': 'dusk', 'ageless:imprint': 'night', 'envoy:march': 'day', 'envoy:table': 'dusk', 'envoy:break': 'night', 'envoy:hostage': 'day', 'envoy:hostage-grown': 'day', 'spirit:water': 'night', 'spirit:fire': 'night', 'spirit:wind': 'day', 'spirit:earth': 'dawn', 'spirit:pact': 'night', 'brew:house': 'day', 'brew:vintage': 'day', 'brew:cellar': 'night', 'brew:still': 'night', 'ageless:noa': 'night', 'ageless:seventh': 'night', 'ageless:truename': 'night', 'ageless:breath': 'night', 'ageless:vessel': 'night', 'ageless:depart': 'dawn', 'ageless:rear': 'dusk', gift: 'night', 'claim:scroll': 'night', 'claim:burn': 'night', 'claim:acclaim': 'dusk', 'claim:offer': 'night', 'claim:pretender': 'day', 'relic:find': 'day', 'relic:chosen': 'day', 'relic:rejected': 'night', 'relic:contest': 'dusk', 'relic:fake': 'day', 'apothecary:gather': 'dawn', 'apothecary:brew': 'dusk', 'apothecary:poison': 'night', 'apothecary:shop': 'day', 'apothecary:queue': 'day', 'spy:recruit': 'night', 'spy:steal': 'night', 'spy:caught': 'night', 'spy:drop': 'dusk', 'spy:tail': 'night', 'spy:exposed': 'dawn', 'mana:spring': 'dusk', 'mana:storm': 'night', 'mana:sick': 'night', 'mana:dry': 'day', 'farm:plow': 'dawn', 'farm:sow': 'day', 'farm:harvest': 'day', 'farm:water': 'day', 'farm:barn': 'dusk', 'farm:sell': 'day', 'exile:boat-night': 'night', 'exile:hall': 'night', 'exile:hall-plot': 'night', 'exile:fleet': 'dawn', 'exile:island': 'dusk', 'works:open': 'day', 'cuisine:create': 'night', 'cuisine:feast': 'dusk', 'cuisine:taster': 'dusk', 'cuisine:contest': 'day', 'revolt:secret': 'night', 'revolt:march': 'dusk', 'revolt:gallows': 'dawn', 'revolt:gallows-me': 'dawn', 'frontier:raid': 'night', 'herd:camp': 'dusk', 'herd:rustle': 'night', 'herd:steed': 'dawn', 'haunt:house': 'night', 'haunt:grave': 'night', 'haunt:grave-kneel': 'night', 'haunt:seance': 'night', 'haunt:fraud': 'night', 'haunt:item': 'night', 'mine:picket': 'dusk', 'mine:collapse': 'dusk', 'bondage:coffle': 'dusk', 'bondage:free': 'dawn', 'bondage:free-kin': 'dawn', 'heist:roof': 'night', 'heist:plan': 'night', 'heist:split': 'night', 'heist:vault': 'night', 'heist:vault-twist': 'night', 'trial:dock': 'day', 'trial:plead': 'day', 'trial:bench': 'day', 'nature:flood': 'night', 'nature:storm': 'night', 'nature:winter': 'dusk', 'nature:granary': 'dusk', 'nature:drought': 'day', 'nature:locust': 'day', 'beastlife:bond': 'night', 'beastlife:grave': 'dusk', 'peoples:elf_fall': 'night', 'peoples:beast_totem': 'night', 'peoples:beast_hunt': 'dusk', 'feud:turned': 'dusk', 'feud:plot': 'night', 'feud:strike': 'night', 'feud:peace': 'dawn', 'seal:stone': 'night', 'seal:visitor': 'night', 'seal:alley': 'dusk' };
// 날씨가 정해진 그림
const WX = { 'rites:host': 'clear', 'rites:calendar': 'clear', 'rites:contest': 'clear', 'rites:feast': 'clear', 'scholar:censor': 'cloudy', 'accord:blockade': 'cloudy', 'accord:market': 'cloudy', 'accord:toll': 'cloudy', 'peers:field': 'cloudy', 'peers:fallen': 'cloudy', 'delve:gate': 'cloudy', 'lands:lake': 'fog', 'lands:warport': 'cloudy', 'lands:minetown': 'cloudy', 'demonkind:warrior': 'cloudy', 'demonkind:trade': 'cloudy', 'demonkind:silent': 'fog', 'demonland:bones': 'cloudy', 'demonland:harbor': 'cloudy', 'demonland:city': 'cloudy', 'demonland:outpost': 'cloudy', 'demongod:apostle': 'clear', 'demongod:choice': 'cloudy', 'sword:deck': 'cloudy', 'demongod:watch': 'cloudy', 'sword:flow': 'clear', 'sword:heavy': 'cloudy', 'sword:feint': 'cloudy', 'sword:twin': 'clear', 'sword:fist': 'clear', 'sword:aura': 'clear', 'sword:rival': 'fog', 'sword:spellblade': 'clear', 'spell:fire': 'clear', 'spell:water': 'cloudy', 'spell:wind': 'cloudy', 'spell:earth': 'clear', 'spell:light': 'clear', 'kindred:grove': 'clear', 'kindred:minstrel': 'clear', 'kindred:freed': 'clear', 'kindred:trader': 'clear', 'kindred:exile': 'cloudy', 'kindred:wolf': 'clear', 'kindred:tiger': 'clear', 'kindred:hawk': 'clear', 'kindred:border': 'clear', 'jail:rope': 'clear', 'jail:release': 'clear', 'stars:roof': 'clear', 'stars:comet': 'clear', 'stars:eclipse': 'clear', 'stars:stall': 'clear', 'survey:field': 'clear', 'survey:stone': 'cloudy', 'baseborn:door': 'cloudy', 'baseborn:shield': 'clear', 'migrate:snow': 'cloudy', 'migrate:camp': 'clear', 'migrate:gate': 'cloudy', 'migrate:village': 'clear', 'undertaker:cortege': 'cloudy', 'undertaker:night': 'clear', 'undertaker:plague': 'cloudy', 'adopt:basket': 'cloudy', 'adopt:kin': 'cloudy', 'credit:dun': 'cloudy', 'credit:pardon': 'clear', 'cloister:walk': 'clear', 'cloister:hermit': 'fog', 'cloister:leave': 'clear', 'outlaw:den': 'clear', 'outlaw:pass': 'clear', 'outlaw:raid': 'cloudy', 'outlaw:ransom': 'cloudy', 'hunter:trap': 'cloudy', 'hunter:trail': 'clear', 'hunter:furs': 'clear', 'hunter:beast': 'cloudy', 'stepfamily:peace': 'clear', 'occupied:banner': 'cloudy', 'occupied:levy': 'cloudy', 'occupied:night': 'cloudy', 'occupied:free': 'clear', 'carrier:yard': 'clear', 'carrier:cart': 'clear', 'carrier:snow': 'cloudy', 'carrier:bandit': 'cloudy', 'friend:reunion': 'clear', 'friend:funeral': 'cloudy', 'friend:apart': 'cloudy', 'spread:wander': 'clear', 'build:scaffold': 'clear', 'build:stone': 'clear', 'build:roof': 'clear', 'build:fallen': 'cloudy', 'tech:lamp': 'clear', 'tech:rail': 'clear', 'city:tenement': 'cloudy', 'city:strike': 'cloudy', 'city:idle': 'clear', 'newage:paper': 'cloudy', 'origin:slum': 'cloudy', 'origin:port': 'clear', 'demon:fort': 'cloudy', 'demon:envoy': 'fog', 'demon:land': 'cloudy', 'cloth:dye': 'clear', 'founding:proclaim': 'clear', 'founding:fallen': 'cloudy', 'mount:nest': 'clear', 'mount:wings': 'cloudy', 'mount:above': 'clear', 'mount:tame': 'cloudy', 'harbor:dawn': 'clear', 'harbor:storm': 'storm', 'harbor:racks': 'clear', 'harbor:wait': 'cloudy', 'siblings:leave': 'clear', 'ruins:hall': 'clear', 'ruins:dig': 'clear', 'order:fall': 'cloudy', 'envoy:march': 'clear', 'spirit:water': 'clear', 'spirit:fire': 'clear', 'spirit:wind': 'cloudy', 'spirit:earth': 'fog', 'brew:vintage': 'clear', 'brew:still': 'clear', 'ageless:seventh': 'clear', 'ageless:breath': 'clear', 'ageless:depart': 'clear', 'ageless:rear': 'cloudy', 'claim:pretender': 'cloudy', 'relic:contest': 'cloudy', 'relic:fake': 'clear', 'apothecary:gather': 'clear', 'apothecary:queue': 'cloudy', 'spy:tail': 'cloudy', 'spy:exposed': 'cloudy', 'mana:spring': 'clear', 'mana:storm': 'clear', 'mana:dry': 'clear', 'farm:plow': 'clear', 'farm:sow': 'cloudy', 'farm:harvest': 'clear', 'farm:water': 'clear', 'farm:barn': 'clear', 'farm:sell': 'clear', 'exile:boat-night': 'cloudy', 'exile:fleet': 'clear', 'works:open': 'clear', 'herd:rustle': 'clear', 'haunt:house': 'fog', 'haunt:grave': 'clear', 'haunt:grave-kneel': 'clear', 'heist:roof': 'clear', 'frontier:raid': 'clear', 'bondage:free': 'clear', 'bondage:free-kin': 'clear', 'revolt:gallows': 'cloudy', 'revolt:gallows-me': 'cloudy', 'nature:drought': 'clear', 'nature:locust': 'clear', 'nature:quake': 'cloudy', 'nature:flood': 'rain', 'nature:storm': 'storm', 'nature:winter': 'snow', 'nature:granary': 'cloudy', 'beastlife:bond': 'clear' };
// 너무 어둡게 나오는 그림은 어두운 곳만 한 겹 밝힌다 (screen)
const LIFT = { 'rites:feast': 'rgba(120,100,90,.2)', 'rites:mishap': 'rgba(116,100,96,.24)', 'scholar:write': 'rgba(110,100,96,.22)', 'artifice:bench': 'rgba(110,104,120,.24)', 'artifice:engrave': 'rgba(110,104,120,.24)', 'artifice:blast': 'rgba(110,104,120,.26)', 'artifice:stolen': 'rgba(110,104,124,.3)', 'peers:reunion': 'rgba(124,104,92,.26)', 'accord:betray': 'rgba(116,100,112,.28)', 'accord:map': 'rgba(124,104,92,.22)', 'delve:shallow': 'rgba(120,104,96,.26)', 'delve:deep': 'rgba(90,110,130,.26)', 'delve:rival': 'rgba(120,104,96,.26)', 'delve:lord': 'rgba(110,90,130,.26)', 'crowns:coup': 'rgba(120,100,110,.3)', 'crowns:emperor': 'rgba(120,104,110,.28)', 'crowns:clans': 'rgba(124,104,92,.28)', 'crowns:tribes': 'rgba(110,96,110,.3)', 'lands:under': 'rgba(120,100,90,.26)', 'demongod:watch': 'rgba(108,100,124,.4)', 'demonkind:warrior': 'rgba(110,84,100,.2)', 'demonkind:trade': 'rgba(100,90,124,.22)', 'demonland:bones': 'rgba(110,84,100,.2)', 'demonland:harbor': 'rgba(96,92,128,.24)', 'demonland:city': 'rgba(104,84,124,.26)', 'demonland:outpost': 'rgba(96,104,132,.22)', 'demongod:cult': 'rgba(110,92,84,.18)', 'demongod:dream': 'rgba(100,90,116,.14)', 'sword:spellblade': 'rgba(104,108,136,.34)', 'spell:light': 'rgba(96,104,132,.22)', 'kindred:wolf': 'rgba(100,108,132,.36)', 'kindred:grove': 'rgba(96,116,100,.16)', 'jail:cell': 'rgba(104,104,112,.2)', 'jail:rope': 'rgba(96,104,128,.22)', 'stars:comet': 'rgba(96,104,132,.2)', 'migrate:camp': 'rgba(96,100,124,.26)', 'undertaker:night': 'rgba(96,104,128,.22)', 'hunter:trap': 'rgba(104,112,100,.2)', 'hunter:trail': 'rgba(100,110,92,.18)', 'hunter:beast': 'rgba(104,110,92,.18)', 'stepfamily:quarrel': 'rgba(110,96,84,.14)', 'occupied:night': 'rgba(96,100,124,.24)', 'carrier:bandit': 'rgba(100,110,96,.2)', 'society:shame': 'rgba(110,96,88,.14)', 'friend:cup': 'rgba(110,92,80,.16)', 'spread:book': 'rgba(100,92,96,.18)', 'newage:breakers': 'rgba(120,96,80,.2)', 'newage:meeting': 'rgba(110,92,80,.18)', 'newage:quarrel': 'rgba(100,92,96,.16)', 'tech:bench': 'rgba(84,96,120,.16)', 'demon:fort': 'rgba(96,84,120,.26)', 'demon:land': 'rgba(110,80,110,.22)', 'origin:slum': 'rgba(110,96,84,.2)', 'origin:tower': 'rgba(84,96,130,.18)', 'harbor:storm': 'rgba(84,104,132,.3)', 'ruins:dig': 'rgba(84,100,130,.26)', 'ruins:wake': 'rgba(84,110,120,.2)', 'ruins:glyph': 'rgba(120,100,84,.18)', 'spirit:water': 'rgba(84,104,132,.24)', 'spirit:pact': 'rgba(110,100,90,.22)', 'ageless:imprint': 'rgba(104,92,120,.2)', 'ageless:truename': 'rgba(124,100,80,.26)', 'ageless:vessel': 'rgba(84,116,100,.24)', depths: 'rgba(120,100,84,.28)', 'nature:flood': 'rgba(84,104,132,.28)', 'nature:storm': 'rgba(84,104,132,.26)', 'explore:deepwood': 'rgba(84,116,84,.3)', 'explore:heart-deepwood': 'rgba(84,116,84,.3)', 'explore:heart-ash': 'rgba(124,92,80,.34)', 'feud:strike': 'rgba(84,92,124,.24)', 'seal:dream': 'rgba(110,84,92,.26)', 'exile:boat-night': 'rgba(84,104,132,.3)', 'beastlife:bond': 'rgba(84,100,130,.2)' };
// 방 안 그림이 대부분인 판: 해 쪽 빛과 발밑 어둠을 얹지 않는다
const INSIDE = new Set(['rites:rite', 'scholar:write', 'scholar:debate', 'scholar:shelf', 'scholar:library', 'scholar:copy', 'scholar:lecture', 'artifice', 'accord:treaty', 'accord:betray', 'accord:map', 'peers:reunion', 'peers:dock', 'peers:court', 'peers:news', 'delve:party', 'delve:shallow', 'delve:deep', 'delve:rival', 'delve:lord', 'crowns:emperor', 'crowns:curia', 'crowns:tower', 'crowns:merchant', 'crowns:clans', 'crowns:coup', 'crowns:heir', 'lands:under', 'bedside', 'birth', 'chapel', 'prison', 'court', 'ritual', 'depths', 'trial', 'society', 'stepfamily', 'heist', 'cuisine', 'tech', 'mine', 'adopt:hall', 'adopt:rite', 'credit:pawn', 'credit:ledger', 'cloister:script', 'baseborn:face', 'baseborn:named', 'undertaker:shop', 'jail:cell', 'jail:visit', 'survey:shop', 'survey:war', 'spell:shadow', 'spell:life', 'spell:mind', 'spell:surge', 'spell:desk', 'kindred:hall', 'kindred:hidden', 'demonkind:hiding', 'demongod:dream', 'demongod:shard', 'demongod:cult', 'demongod:war', 'sword:axe', 'sword:rank', 'sword:vow']);
const cache = new Map();
export function vignetteImage(spec) {
  if (!hasDom || !spec || !PLATES[spec.plate]) return '';
  const year = spec.year ?? 505, month = spec.month ?? 6, place = spec.place ?? 'ern';
  const me = lookFor(spec.me, 11), other = lookFor(spec.other, (spec.seed ?? 5) + 17);
  if (!spec.other) other.female = !me.female;
  const key = [spec.plate, spec.variant ?? '', year, month, place, spec.seed ?? 0, me.hair, me.cloth, me.female, Math.floor(me.age / 10), other.hair, other.cloth].join('|');
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    const D = describe(place), k = year * 12 + month;
    const c = conditions(year, month);
    const weather = WX[`${spec.plate}:${spec.variant ?? ''}`] ?? (c.weather === 'snow' && D.biome === 'island' ? 'rain' : c.weather);
    const S = skyOf(TOD[`${spec.plate}:${spec.variant ?? 'stone'}`] ?? TOD[spec.plate] ?? c.tod, weather, D.biome, k), P = paletteOf(month, D.biome, !!spec.famine);
    const cv = document.createElement('canvas'); cv.width = VW * SCALE; cv.height = VH * SCALE;
    const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
    const seed = (strSeed(spec.plate + (spec.variant ?? '')) ^ (D.seed * 7 + (spec.seed ?? 0) * 131)) >>> 0;
    // 작은 화면에서도 사람이 보이도록 판마다 정해 둔 곳을 중심으로 조금 당겨 그린다
    const [fx, fk] = FOCUS[`${spec.plate}:${spec.variant ?? ''}`] ?? FOCUS[spec.plate] ?? [320, 1.15];
    ctx.translate(fx, VH); ctx.scale(fk, fk); ctx.translate(-fx, -VH);
    PLATES[spec.plate]({ ctx, S, P, D, R: rng(seed), t: toner(S), q: D.seed % 89, k, month, year, me, other, variant: spec.variant ?? null });
    const lf = LIFT[`${spec.plate}:${spec.variant ?? ''}`] ?? LIFT[spec.plate];
    if (lf) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lf; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore(); }
    paintFinish(ctx, cv.width, cv.height, S, { hz: 0.56, strength: 0.85, land: false, edgeK: 0.6 });
    inkFinish(ctx, cv.width, cv.height, S, { inside: INSIDE.has(spec.plate) || INSIDE.has(`${spec.plate}:${spec.variant ?? ''}`) });
    const vw = cv.width, vh = cv.height;
    url = canvasUrl(cv, 'image/jpeg', 0.86);
    noteMotion(url, { kind: 'vig', w: vw, h: vh, weather, tod: S.tod, embers: spec.plate === 'fire' || spec.plate === 'dragon' || spec.variant === 'still' || spec.variant === 'riot' });
  } catch { url = ''; }
  if (!url) return '';
  while (cache.size >= 24) { const [k0, old] = cache.entries().next().value; cache.delete(k0); dropUrl(old); }
  cache.set(key, url);
  return url;
}

/* ---------- 어느 사건에 어느 그림인가 ---------- */
// 사건 id로 바로 정해지는 것. 값: 'plate' 또는 'plate:variant'
const BY_ID = {
  rel_heartbreak: 'wedding:far',
  ch_first_death: 'funeral', ch_grave_visit: 'funeral:visit', king_mourning: 'funeral:state', later_old_friend_dies: 'funeral', legend_death_news: 'funeral:visit', adult_inheritance: 'funeral:visit', chain_war_return: 'funeral:visit',
  sibling_born: 'birth', later_grandchild: 'birth:grand', infant_fever: 'birth:fever',
  chain_conscript: 'muster', north_volunteers: 'muster', war_levy_horse: 'muster', civil_banner: 'muster', war_refugees: 'muster:refugee', refugee_orphan: 'muster:refugee',
  legend_rank_entry: 'square:herald', coronation: 'square:herald', lord_procession: 'square:herald', tax_day: 'square:herald', guild_bounty: 'square:notice', magic_exam_notice: 'square:notice', adult_mage_registration: 'square:notice',
  lord_public_flogging: 'square:flog', adult_heretic_trial: 'square:trial', inquisitor_visit: 'square:trial',
  plague_quarantine: 'plague',
  monster_raid: 'monsters', dungeon_overflow_rumor: 'monsters', goblins: 'monsters', wolves: 'monsters:wolves',
  famine_neighbor: 'famine', farm_blight: 'famine', harsh_winter: 'famine',
  chain_loan_threat: 'fire', civil_looters: 'fire', bread_riot: 'fire:riot', era_mill_anger: 'fire:riot', ut_coffin: 'undertaker:shop', ut_shop: 'undertaker:shop', ut_wash: 'undertaker:shop', ut_funeral: 'undertaker:cortege', ut_plague: 'undertaker:plague', ut_plot: 'undertaker:night', ut_plotsell: 'undertaker:night', ut_watch: 'undertaker:night', cr_bank_wobble: 'credit:pawn', cr_crown_ask: 'credit:ledger', cr_debtor_plea: 'credit:dun', credit_bank: 'credit:ledger', credit_lend: 'credit:ledger', credit_pawn: 'credit:pawn', out_toll: 'outlaw:pass', out_ambush: 'outlaw:pass', out_ride: 'outlaw:pass', out_captive: 'outlaw:ransom', out_kin_taken: 'outlaw:ransom', out_purge: 'outlaw:raid', out_hunt: 'outlaw:raid', out_join: 'outlaw:den', out_chief: 'outlaw:den', out_amnesty: 'outlaw:den', out_village_deal: 'outlaw:den', out_robin_gift: 'outlaw:den', out_give: 'outlaw:den', out_lie_low: 'outlaw:den', hunter_big: 'hunter:beast', hunter_trader: 'hunter:furs', hunter_sell: 'hunter:furs', hunter_caught: 'hunter:trail', hunter_journey: 'hunter:trail', hunter_royal: 'hunter:trail', hunter_go: 'hunter:trail', hunter_poach: 'hunter:trail', hunter_lodge: 'hunter:trap', hunter_apprentice: 'hunter:trap', spread_keep: 'spread:book', spread_steal: 'spread:book', spread_patent: 'spread:patent', spread_sell_abroad: 'spread:patent', spread_faith_block: 'spread:patent', spread_wanderer: 'spread:wander', spread_patron: 'spread:hands', era_old_hands: 'city:idle', era_ironcart_clash: 'city:idle', era_pamphlet: 'newage:paper', era_child_spark: 'tech:bench',
  harvest_festival: 'festival', seal_festival: 'festival', era_lamp_festival: 'festival', night_of_dead: 'festival:dead', traveling_troupe: 'festival:troupe',
  baptism: 'chapel:child', coming_of_age: 'chapel', ch_school_first: 'chapel:child', ch_school_recite: 'chapel:child',
  legend_dragon_reveal: 'dragon', dragon_hoard_rumor: 'dragon',
  adult_leave_home: 'road', chain_friend_leaving: 'road', later_child_leaves: 'road', ch_bestie_crossroads: 'road', later_return_home: 'road:return', adult_old_friend_returns: 'road:return',
  chain_illness_start: 'bedside', chain_illness_turn: 'bedside', later_will: 'bedside', adult_parent_aging: 'bedside',
  mana_test: 'ritual:orb', mana_awaken: 'ritual', circle_exam_run: 'ritual', circle_exam_control: 'ritual', magic_misfire: 'ritual:wild', chain_darkmage_reveal: 'ritual:dark', magic_forbidden_copy: 'ritual:dark', duel_aura_awakening: 'ritual',
  legend_magnus_audience: 'court',
  seal_dream: 'seal:dream', seal_scholar: 'seal:map', seal_spy_found: 'seal:alley', seal_demon_offer: 'seal:visitor', seal_wedge_raid: 'seal:stone', seal_fragment_buyer: 'seal:shard', seal_council_voice: 'court', seal_rite_call: 'seal:rite', seal_after_break: 'seal:broken',
  health_quack: 'square:notice', health_doctor: 'trade:healer', health_quarantine: 'plague', health_body: 'road',
  arts_critic: 'square:notice', arts_reader: 'ritual:study', arts_forger: 'trade:bard', arts_rival: 'court', arts_forbidden_find: 'ritual:dark', arts_burning: 'fire',
  omen_false_prophet: 'square:herald', omen_witness: 'seal:dream', omen_faction: 'trade:bard', omen_hunter: 'seal:alley', omen_pilgrims: 'funeral:visit', omen_church: 'chapel:inquisition',
  dragon_seekers: 'trade:bard', dragon_dream: 'seal:dream', dragon_shadow: 'dragon', dragon_preacher: 'square:herald', dragon_cult_revenge: 'seal:alley', dragon_cult_tithe: 'ritual:dark',
  mine_strike_owner: 'mine:picket', mine_dispute: 'court', mine_widow: 'funeral:visit', mine_knocking: 'mine:knock', mine_found_out: 'square:guards',
  haunt_fraud: 'haunt:fraud', haunt_cursed_buy: 'haunt:item', haunt_dying_curse: 'funeral:visit', haunt_night: 'haunt:house', haunt_ancestor: 'haunt:grave-kneel', haunt_wraith_call: 'haunt:grave', haunt_curse_strike: 'haunt:item',
  frontier_call: 'square:herald', frontier_refugees: 'muster:refugee', frontier_claim: 'frontier:clearing', frontier_elect: 'frontier:clearing',
  works_corvee: 'square:notice',
  mana_crave: 'mana:sick', mana_child: 'ritual:study',
  relic_rumor: 'trade:bard', relic_fake: 'relic:fake', relic_claim: 'relic:contest', relic_challenge: 'road',
  spirit_glimpse: 'spirit:wind', spirit_church: 'square:guards', spirit_tower: 'ritual:study',
  wilds_herd: 'monsters', wilds_refugees: 'muster:refugee', wilds_settle: 'trade:builder', wilds_buyer: 'trade:alchemy',
  school_call: 'square:notice', school_dorm: 'night', school_noble: 'court', school_alum_help: 'road:return', school_alum_plea: 'dusk', school_alum_rival: 'square:guards', school_reunion: 'festival', school_parent_alum: 'road:return',
  law_accused: 'trial:dock', law_wrong: 'square:notice', law_witness: 'trial:plead', law_judge: 'trial:bench', law_pardon: 'prison', law_stain: 'road',
  research_buyer: 'ritual:study', research_claim: 'ritual:study', research_mentor: 'ritual:study', research_rival: 'ritual:study', research_spy_offer: 'ritual:study', research_sue: 'square:herald',
};
// 장면 종류(life.scene.kind)로 정해지는 것
const BY_SCENE = {
  // 24단계: 새 판(vignettePlates5)으로 잇는 사건들
  exile_court: 'exile:hall', exile_escape: 'exile:boat-night', exile_flee: 'exile:boat-night', exile_petition: 'exile:island', exile_plot: 'exile:hall-plot', exile_settle: 'exile:island', works_labor: 'works:site', works_oversee: 'works:site',
  revolt_stir: 'revolt:secret', revolt_raid: 'revolt:march', revolt_suppress: 'revolt:gallows', frontier_go: 'frontier:wagons', herd_rustle: 'herd:rustle', herd_band_join: 'herd:camp', herd_work: 'herd:pasture', haunt_visit: 'haunt:house', mine_prospect: 'mine:adit', mine_dwarf: 'mine:deep', bondage_drive: 'bondage:coffle', bondage_escape: 'bondage:free', bondage_manumit: 'bondage:free', bondage_ransom: 'bondage:free-kin', bondage_rescue: 'bondage:free', bondage_serve: 'bondage:yard', heist_fence: 'heist:split', heist_lay_low: 'heist:plan', heist_plan: 'heist:plan', heist_go: 'heist:roof', law_advocate: 'trial:plead', law_sue: 'trial:plead',
  dragon_climb: 'dragon', dragon_bones: 'dragon', dragon_cult: 'ritual:dark', dragon_lair: 'dragon', dragon_talk: 'dragon', dragon_young: 'dragon', dragon_fire: 'fire',
  mine_claim: 'mine:adit', mine_manage: 'mine:adit', mine_deep: 'mine:deep', mine_collapse: 'mine:collapse', mine_picket: 'mine:picket',
  haunt_spot: 'haunt:house', haunt_medium: 'haunt:seance', haunt_rite: 'haunt:seance', haunt_item: 'haunt:item', haunt_lift: 'chapel:inquisition',
  frontier_charter: 'court', frontier_gather: 'frontier:wagons', frontier_arrive: 'frontier:wagons', frontier_work: 'frontier:clearing', frontier_natives: 'frontier:natives', frontier_name: 'frontier:clearing', frontier_raid: 'frontier:raid', frontier_winter: 'nature:winter',
  works_overseer: 'works:site', works_guild: 'works:site', works_skim: 'works:site', works_fall: 'works:fall', works_fund: 'works:site', works_open: 'works:open',
  mana_well: 'mana:spring', mana_storm: 'mana:storm', mana_siege: 'mana:claim',
  relic_trail: 'relic:find', relic_choose: 'relic:find', relic_offer: 'relic:contest',
  spirit_learn: 'spirit:pact', spirit_meet: 'spirit:water', spirit_tithe: 'spirit:water', spirit_whim: 'spirit:wind',
  nature_drought: 'nature:drought', nature_flood: 'nature:flood', nature_winter: 'nature:winter', nature_quake: 'nature:quake', nature_locust: 'nature:locust', nature_storm: 'nature:storm', nature_granary: 'nature:granary',
  beast_buy: 'beastlife:market', beast_sell: 'beastlife:market', beast_event: 'beastlife:care', beast_familiar: 'beastlife:bond', beast_death: 'beastlife:grave',
  heir: 'bedside:last',
  arrest: 'square:guards', caught_illegal: 'square:guards', bounty_hunters: 'square:guards',
  faith_inquisition: 'chapel:inquisition', realm_inquisitor: 'chapel:inquisition', faith_convert: 'chapel', faith_high: 'chapel', pilgrim_end: 'chapel',
  fief_grant: 'court', buy_title: 'court', domain_rank: 'court', nation_name: 'court', realm_office: 'court', civil_side: 'muster',
  sail: 'voyage:harbor', shipyard: 'voyage:harbor', cargo: 'voyage:harbor', sea_event: 'voyage', pirate_den: 'voyage:pirate', pirate_raid: 'voyage:pirate', navy_hunt: 'voyage:pirate', sea_bounty: 'voyage', serpent_lair: 'voyage:serpent',
  farewell: 'road', realm_raid: 'fire',
  court_offer: 'court', court_patron: 'court', court_marriage: 'court', court_plot: 'court', court_fall: 'court', court_turn: 'court', court_affair: 'court',
  // 11단계: 군대·사랑·마탑
  army_march: 'army:march', army_muster: 'muster', army_press: 'muster', army_clash: 'army:clash', army_promote: 'army:promote', army_term: 'army:camp', army_enlist: 'army:camp', army_event: 'army:camp', army_ransom: 'prison', army_hunted: 'square:guards',
  love_glance: 'love:meet', love_admirer: 'love:meet', love_wish: 'love:meet', love_temptation: 'love:walk', love_bloom: 'bedside', love_wedding: 'wedding', love_arranged: 'wedding', love_unrequited: 'wedding:far',
  love_quarrel: 'love:quarrel', love_betrayed: 'love:quarrel', love_caught: 'love:caught', love_leave: 'road', love_after: 'funeral:visit',
  tower_join: 'tower:hall', tower_pick: 'tower:hall', tower_craft_pick: 'trade:alchemy', tower_duty: 'tower:hall', tower_master_lesson: 'tower:hall', tower_master_errand: 'tower:hall', tower_vote: 'tower:vote', tower_exam: 'ritual', tower_burning: 'fire', tower_inquisitor: 'chapel:inquisition', tower_exposed: 'chapel:inquisition',
  tower_black_invite: 'ritual:dark', forbidden_pick: 'ritual:dark', tower_master_death: 'bedside:last', tower_clinic: 'trade:healer', tower_craft: 'trade:alchemy',
  research_pick: 'ritual:study',
  // 12단계: 원수와 복수
  feud_turned: 'feud:turned', feud_plot: 'feud:plot', feud_strike: 'feud:strike', feud_offer: 'feud:offer', feud_peace: 'feud:peace', feud_deathbed: 'bedside',
  // 13단계: 제자와 문하
  mentor_pick: 'mentor:lesson', mentor_lesson: 'mentor:lesson', mentor_graduate: 'mentor:bow', mentor_surpass: 'mentor:bow', mentor_found: 'mentor:found', mentor_betray: 'road', mentor_reclaim: 'feud:offer', mentor_succession: 'bedside:last',
  // 14단계: 이웃과 마을 살이 (새 그림 없이 있는 판을 붙임)
  village_meeting: 'square:herald', village_election: 'square:notice', village_task: 'trade:builder', village_judge: 'square:herald', village_snub: 'feud:turned', village_quarrel: 'feud:turned', village_stranger: 'muster:refugee',
  // 12단계: 다른 종족의 땅 (의식과 이름 받기는 아래에서 땅에 따라 고른다)
  peoples_friend: 'feud:peace', peoples_grudge: 'trade:bard', peoples_defend: 'square:herald', peoples_slavers: 'seal:alley', peoples_mixed_marriage: 'wedding', peoples_halfelf_years: 'funeral:visit',
  // 12단계: 탐험 (가는 길과 깊은 곳은 아래에서 땅에 따라 고른다)
  explore_plan: 'seal:map', explore_home: 'road:return', explore_give: 'ritual:study',
  deep_descend: 'depths', deep_throne: 'depths:throne',
  // 14단계: 장사 길과 상단 (trade_event는 아래에서 일에 따라 고른다)
  trade_market: 'beastlife:market', trade_caravan: 'road', trade_bandits: 'feud:strike', trade_toll: 'square:guards', trade_house: 'mentor:found', trade_rival: 'feud:plot', trade_event: 'beastlife:market',
  // 14단계: 글과 예술 (기존 그림을 이어 붙임)
  // 27단계: 불로 (나머지 장면은 갈래가 들어오는 대로 잇는다)
  imprint_rite: 'ageless:imprint', seventh_call: 'ageless:noa', seventh_trial: 'ageless:seventh', sealbreath_draw: 'ageless:breath', vessel_rite: 'ageless:vessel',
  // 28단계 도우미2: 사절과 볼모
  envoy_talks: 'envoy:table', envoy_incident: 'envoy:break', envoy_pledge: 'night', envoy_kid_war: 'bedside', envoy_hostage_sent: 'envoy:march', envoy_hostage_life: 'envoy:hostage', envoy_hostage_war: 'square:guards', envoy_hostage_return: 'road:return', envoy_between: 'feud:plot',
  // 27단계 도우미2: 노아 실마리·불로의 두 길·불로가 된 뒤·스스로 고르는 죽음
  noah_sighting: 'ageless:noa', noah_journey: 'night', noah_meet: 'ageless:noa', dragonname_tablet: 'seal:map', dragonname_call: 'ageless:truename',
  bloodyears_offer: 'bedside', bloodyears_rite: 'night', bloodyears_due: 'bedside', after_rumor: 'ageless:depart', after_hunted: 'square:guards',
  after_farewell: 'funeral:visit', farewell_rearguard: 'ageless:rear', farewell_wedge: 'seal:alley', farewell_plague: 'bedside', farewell_honor: 'night', farewell_letgo: 'funeral:visit',
  // 26단계: 숨은 왕가의 피
  claim_reveal: 'claim:scroll', claim_suitor: 'claim:offer', claim_threat: 'night', claim_pretender: 'claim:pretender', claim_crown: 'claim:acclaim',
  // 25단계: 첩보와 밀정 (spy_job·spy_hunter는 아래에서 일에 따라 고른다)
  spy_recruit: 'spy:recruit', spy_job: 'spy:drop', spy_caught: 'spy:caught', spy_exposed: 'spy:exposed', spy_turn: 'spy:recruit',
  spy_double: 'spy:drop', spy_hunter: 'spy:tail',
  // 24단계: 유배와 망명 (새 삽화가 오기 전까지 있는 판을 붙임)
  exile_decree: 'exile:boat', exile_life: 'exile:island', exile_pardon: 'road:return', exile_spotted: 'seal:alley', exile_choose: 'seal:map',
  exile_host: 'exile:hall', exile_plot_ev: 'exile:hall-plot', exile_return: 'exile:fleet',
  // 23단계: 봉기와 반란 (새 그림 없이 있는 판을 붙임)
  revolt_call: 'revolt:secret', revolt_quarrel: 'revolt:secret', revolt_betray: 'revolt:secret', revolt_parley: 'revolt:march', revolt_crushed: 'revolt:gallows',
  revolt_gallows: 'revolt:gallows', revolt_won: 'revolt:march', revolt_rot: 'revolt:secret', revolt_hunted: 'seal:alley', revolt_legacy: 'funeral:visit',
  // 22단계: 가문의 내력과 가풍 (새 그림 없이 있는 판을 붙임)
  lineage_motto: 'ritual:study', lineage_crest: 'square:herald', lineage_forge: 'seal:map',
  lineage_exposed: 'square:guards', lineage_blacksheep: 'bedside', lineage_branch_ev: 'road:return',
  lineage_claim: 'feud:peace', lineage_gathering: 'wedding',
  // 21단계: 노예와 자유 (새 그림 없이 있는 판을 붙임)
  bondage_taken: 'bondage:coffle', bondage_debtsold: 'bondage:market', bondage_master: 'bondage:yard', bondage_family: 'bondage:free-kin', bondage_hunters: 'seal:alley', bondage_newname: 'bondage:free', bondage_brand: 'bondage:yard', bondage_market: 'bondage:market', bondage_owned: 'bondage:yard-master',
  // 20단계: 비밀과 이중생활 (새 그림 없이 있는 판을 붙임)
  secret_bastard: 'bedside', secret_child: 'funeral:visit', secret_alias: 'seal:map', secret_mask: 'seal:alley', secret_knower: 'seal:alley', secret_exposed: 'square:guards', secret_halfsib: 'funeral:visit', secret_legacy: 'ritual:study',
  // 19단계: 전쟁 뒤의 삶 (새 그림 없이 있는 판을 붙임)
  aftermath_return: 'road:return', aftermath_aid: 'funeral:visit', aftermath_widow: 'funeral:visit', aftermath_foreigner: 'square:guards', aftermath_night: 'bedside', aftermath_reunion: 'feud:peace',
  // 18단계: 편지와 먼 인연 (새 그림 없이 있는 판을 붙임)
  letters_write: 'ritual:study', letters_send: 'road', letters_arrive: 'road:return', letters_found: 'road', letters_forge: 'ritual:study', letters_bundle: 'funeral:visit',
  // 17단계: 하인과 식솔 (새 그림 없이 있는 판을 붙임)
  household_hire: 'mentor:bow', household_manage: 'mentor:bow', household_thief: 'square:guards', household_ears: 'seal:alley', household_skim: 'ritual:study', household_grievance: 'mentor:bow',
  household_old: 'bedside', household_heir: 'mentor:bow', household_serve: 'court', household_errand: 'road', household_overheard: 'seal:alley', household_framed: 'square:guards', household_strongbox: 'seal:alley',
  // 16단계: 맹세와 의형제 (새 그림 없이 있는 판을 붙임)
  oath_blood: 'feud:peace', oath_blood_call: 'feud:strike', oath_blood_mourn: 'funeral:visit', oath_liege_offer: 'court', oath_liege_call: 'muster', oath_liege_gone: 'court',
  oath_man: 'mentor:bow', oath_man_turn: 'road', oath_vow: 'chapel', oath_vow_test: 'chapel', oath_pact: 'feud:offer', oath_pact_call: 'square:herald', oath_pact_due: 'wedding',
  // 15단계: 늙음과 마지막 해들 (새 그림 없이 있는 판을 붙임)
  elder_retire: 'mentor:bow', elder_amends: 'feud:peace', elder_journey: 'road', elder_memoir: 'ritual:study', elder_memoir_read: 'ritual:study', elder_funeral_wish: 'chapel',
  elder_forget: 'road:return', elder_deathbed: 'bedside:last', elder_funeral: 'funeral', elder_grave_foe: 'funeral:visit', elder_grave_stranger: 'funeral:visit',
  // 15단계: 병과 의술
  health_treat: 'bedside',
  // 16단계: 예언과 징조 (새 그림 없이 있는 판을 붙임)
  omen_named: 'seal:visitor',
  // 17단계: 법과 재판
  law_trial: 'trial:dock',
  // 19단계: 마물의 땅
  wilds_nest: 'monsters',
  // 18단계: 학원과 시험
  school_exam: 'square:notice', school_take: 'ritual:study', school_appoint: 'court', school_fee: 'ritual:study', school_finals: 'ritual:study',
  arts_pick: 'ritual:study', arts_theme: 'ritual:study', arts_done: 'ritual:study', arts_patron: 'court', arts_ban: 'chapel:inquisition',

  // 15단계: 내기와 겨루기 (기존 그림을 이어 붙임)
  contest_gamble: 'trade:bard', contest_urge: 'trade:bard', contest_arena: 'feud:strike', contest_fair: 'festival', contest_round: 'festival',
  // 16단계: 풀리지 않은 일 (기존 그림을 이어 붙임)
  mystery_case: 'square:notice', mystery_offer: 'feud:plot', mystery_revenge: 'feud:strike', mystery_old: 'ritual:study',
  // 17단계: 내 집 마련과 살림 (기존 그림을 이어 붙임)
  house_build: 'trade:builder', house_work: 'trade:builder', house_warm: 'festival', house_room: 'trade:builder', house_event: 'square:notice', house_heir: 'funeral:visit', house_move: 'road', house_move_house: 'road',
  // 18단계: 밑바닥에서 살기 (기존 그림을 이어 붙임)
  poor_boss: 'seal:alley', poor_slum: 'seal:alley', poor_chance: 'road:return', poor_rise: 'road:return', poor_bond: 'square:notice', poor_bond_work: 'trade:builder',
  poor_alms: 'chapel', poor_hire: 'trade:builder', poor_bondsman: 'seal:alley',
  // 19단계: 주점과 여관 꾸리기 (기존 그림을 이어 붙임)
  // 20단계: 유랑극단 (기존 그림을 이어 붙임)
  troupe_arrive: 'festival', troupe_show: 'trade:bard', troupe_manage: 'road', troupe_fire: 'road', troupe_move: 'road', troupe_event: 'road',
  // 32단계: 내 나라 세우기, 포구와 어부의 삶 (하늘 기수 mount_*는 plate32가 글을 보고 고른다)
  found_urge: 'feud:plot', found_declare: 'founding:proclaim', found_name: 'founding:proclaim', found_dynasty: 'founding:crown', found_crown: 'founding:crown', found_succession: 'founding:crown', found_fall: 'founding:fallen',
  found_envoy: 'envoy:table', found_council: 'court', found_law: 'court', found_tax: 'square:herald', found_capital: 'works:site', found_petition: 'court', found_plot: 'feud:plot', found_pretender: 'claim:pretender', found_raise: 'muster',
  harbor_boat: 'harbor:dawn', harbor_cure: 'harbor:racks', harbor_storm: 'harbor:storm', harbor_event: 'harbor:dawn',
  // 33단계: 마족 (새 집안 origin_*은 아래에서 집안에 따라 고른다)
  demon_contact: 'demon:envoy', demon_trade: 'demon:envoy', demon_truce: 'demon:envoy', demon_box: 'demon:envoy', demon_betrayal: 'feud:strike', demon_raid: 'demon:fort',
  demon_halfblood: 'seal:alley', demon_blood_seen: 'square:guards', demon_blood_shows: 'bedside', demon_hunted: 'square:guards', demon_voyage: 'demon:land', demon_crossing: 'demon:land',
  herd_market: 'beastlife:market', herd_tend: 'herd:pasture', herd_steed: 'herd:steed', herd_band: 'herd:camp', herd_band_life: 'herd:camp', herd_event: 'herd:pasture',
  apo_brew: 'apothecary:brew', apo_shop: 'apothecary:shop', apo_event: 'apothecary:shop',
  heredity_seen: 'mentor:lesson', heredity_envy: 'square:notice',
  brew_make: 'brew:house', brew_cellar: 'brew:cellar', brew_event: 'brew:cellar',
  farm_land: 'farm:plow', farm_sow: 'farm:sow', farm_manage: 'farm:barn', farm_market: 'farm:sell', farm_harvest: 'farm:harvest', farm_event: 'feud:offer',
  cuisine_taste: 'cuisine:stall', cuisine_kitchen: 'cuisine:kitchen', cuisine_post: 'cuisine:kitchen', cuisine_create: 'cuisine:create', cuisine_contest: 'cuisine:contest', cuisine_feast: 'cuisine:feast', cuisine_event: 'cuisine:kitchen', cuisine_cook: 'cuisine:kitchen', cuisine_serve: 'cuisine:feast',
  heist_target: 'heist:plan', heist_crew: 'heist:plan', heist_scout: 'heist:roof', heist_day: 'heist:roof', heist_twist: 'heist:vault-twist', heist_split: 'heist:split', heist_event: 'heist:plan',
  company_found: 'muster', company_board: 'army:camp', company_fight: 'army:clash', company_manage: 'army:camp', company_rules: 'army:camp', company_take: 'muster', company_event: 'army:camp',
  inn_open: 'trade:builder', inn_work: 'trade:bard', inn_manage: 'ritual:study', inn_price: 'ritual:study', inn_hire: 'trade:builder', inn_fire: 'trade:builder', inn_event: 'trade:bard',
};
// 42단계 다른 종족 집안(g.kindred.id)의 어린 시절 그림
const KINDRED_ART = { elf_elder: 'kindred:grove', elf_minstrel: 'kindred:minstrel', elf_freed: 'kindred:freed', dwarf_heir: 'kindred:hall', dwarf_trader: 'kindred:trader', dwarf_outcast: 'kindred:exile', beast_wolf: 'kindred:wolf', beast_tiger: 'kindred:tiger', beast_hawk: 'kindred:hawk', half_elf_border: 'kindred:border', half_elf_noble: 'origin:manor', hd_hidden: 'kindred:hidden', hd_frontier: 'demon:land' };
const ORIGIN_ART = { count_bastard: 'origin:manor', tower_blood: 'origin:tower', sexton: 'origin:church', capital_artisan: 'origin:workshop', slum_orphan: 'origin:slum', port_folk: 'origin:port', march_guard: 'demon:fort' };
const TRADE_ART = { famine: 'famine', army: 'muster', smuggle: 'seal:alley', credit: 'court', guard_thief: 'square:flog', porter: 'road', rumor: 'trade:bard' };
// 새 일(voc_path의 길 id, voc_event의 사건 id)마다의 그림. 없으면 지금 하는 일의 일터 그림
const VOC_ART = {
  royal_physician: 'court', plague_doctor: 'plague', court_bard: 'court', ballad: 'trade:bard', school: 'trade:teacher', book: 'ritual:study', elixir: 'trade:alchemy', stone: 'trade:alchemy', build: 'trade:builder', white_stag: 'beast:stag', beast_slayer: 'beast:ash',
  lords_deer: 'beast:deer', wolf_pack: 'monsters:wolves', lost_child: 'beast:tracks', tavern_brawl: 'trade:bard', tower_inspect: 'trade:alchemy',
};
const JOB_ART = { physician: 'trade:healer', bard: 'trade:bard', tutor: 'trade:teacher', scholar: 'trade:teacher', alchemist: 'trade:alchemy', carpenter: 'trade:builder', mason: 'trade:builder', hunter: 'beast:tracks' };
const BEAST_ART = { great_boar: 'beast:boar', cave_bear: 'beast:bear', ash_bear: 'beast:ash' };
// 결과 글(그 뒤)에서 알아보는 것. 앞에 있는 것이 먼저다.
const BY_OUTCOME = [
  [/예배당 종이 울렸다|혼례를 올렸|부부가 되었|혼인 서약/, 'wedding'],
  [/감옥|옥에 갇|옥살이|쇠창살|지하 감방|갇혀 지냈|노역|포승줄/, 'prison'],
  [/태어났다|아이를 안았|갓난/, 'birth'],
  [/장례를 치|관을 내렸|무덤 앞에|묻어 주었|숨을 거두었|세상을 떠났/, 'funeral'],
  [/난파|배가 부서|가라앉았/, 'voyage:wreck'],
];
// 제목에서 알아보는 것 (id로 정해지지 않은 사건과 장면에 쓴다)
const BY_TITLE = [
  [/혼례|혼인|결혼/, 'wedding'], [/장례|국상|부고|무덤|유품/, 'funeral'], [/출산|갓난|손주|동생/, 'birth'],
  [/폭풍|풍랑/, 'voyage:storm', 'sea'], [/해적/, 'voyage:pirate', 'sea'], [/바다뱀|해룡|크라켄/, 'voyage:serpent', 'sea'],
  [/역병|열병|돌림병/, 'plague'], [/징집|원군|출정|징발|전선/, 'muster'], [/피란|난민/, 'muster:refugee'],
  [/마물|고블린|늑대|물결|포위|범람/, 'monsters'], [/기근|흉년|굶주/, 'famine'], [/폭동|약탈/, 'fire:riot'], [/불타|화재|방화/, 'fire'],
  [/십강|포고|칙령|사면령/, 'square:herald'], [/태형|처형|효수/, 'square:flog'], [/이단|심문/, 'square:trial'],
  [/서임|작위|알현|대관|책봉/, 'court'], [/수확제|축제|잔치|봉인제/, 'festival'], [/세례|성인식|서품/, 'chapel'],
  [/용왕|드래곤|와이번의 둥지/, 'dragon'], [/승급 시험|수정구|폭주/, 'ritual'], [/체포|감옥/, 'square:guards'],
];
// 나라의 큰일(crisis_turn) 장면은 제목이 '큰일 이름: 단계 이름'이다
function crisisPlate(title, text) {
  if (/열병|역병|환자|번짐|절정|잦아듦/.test(title)) return /잦아듦/.test(title) ? 'funeral' : 'plague';
  if (/전쟁|징집령|전선|고향 앞|전쟁의 끝/.test(title)) return /전쟁의 끝/.test(title) ? 'funeral:visit' : /전선/.test(title) ? 'muster:refugee' : 'muster';
  if (/검은 물결|징조|범람|포위|반격/.test(title)) return /징조/.test(title) ? 'monsters:wolves' : /여파/.test(title) ? 'fire' : 'monsters';
  return /불/.test(text) ? 'fire' : null;
}
// 31단계 갈래(형제자매 sib*, 고대 유적 ruin*, 기사단 order*·knight*): 장면 이름의 앞머리와 글의 낱말로 판을 고른다.
// 그 갈래들이 장면 id를 정하면 BY_SCENE에 따로 적어 더 꼭 맞게 고를 수 있다 (거기 적힌 것이 먼저다).
export function plate31(key, words = '') {
  const k = String(key ?? '');
  if (/^sib/.test(k)) return /상속|유산|유언|몫|가업|갈라|다투|다툼|의절/.test(words) ? 'siblings:split' : /떠나|떠났|먼 길|배웅|소식|돌아오지/.test(words) ? 'siblings:leave' : 'siblings:home';
  if (/^ruin/.test(k)) return /깨어|깨우|눈을 뜨|움직이기|깨운/.test(words) ? 'ruins:wake' : /고대어|해독|문자|글자|술식|마도서|비문|석판/.test(words) ? 'ruins:glyph' : /도굴|파헤|빼돌/.test(words) ? 'ruins:dig' : 'ruins:hall';
  if (/^(order|knight)/.test(k)) return /이단|해산|무너|몰락|체포|화형|사슬/.test(words) ? 'order:fall' : /서약|서임|맹세|입단|종자|계율/.test(words) ? 'order:vow' : /행군|토벌|순례길|국경|출정|원정/.test(words) ? 'order:march' : 'order:keep';
  return null;
}
// 32단계 갈래(건국 founding*, 하늘 기수 mount*, 포구 harbor*): 31단계와 같은 방식. BY_SCENE에 적힌 것이 먼저다.
export function plate32(key, words = '') {
  const k = String(key ?? '');
  if (/^found/.test(k)) return /무너|멸망|함락|망했|폐위|쫓겨|빼앗|잿더미|마지막 왕/.test(words) ? 'founding:fallen' : /대관|왕관|즉위|기름을 붓|관을 씌|왕위를 잇/.test(words) ? 'founding:crown' : 'founding:proclaim';
  if (/^mount/.test(k)) return /둥지|알을|알 하나|벼랑|훔치|새끼를 꺼/.test(words) ? 'mount:nest' : /길들|굴레|눈가리개|물렸|할퀴|새끼|조련|먹이를|다쳤/.test(words) ? 'mount:tame' : /하늘에서|날아올|구름 위|내려다|전령|날았|비행|하늘길/.test(words) ? 'mount:above' : 'mount:wings';
  if (/^harbor/.test(k)) return /폭풍|풍랑|돌풍|뒤집|파도가/.test(words) ? 'harbor:storm' : /돌아오지|실종|과부|기다리|빈 배|장례|잃었/.test(words) ? 'harbor:wait' : /말리|덕장|소금|절이|손질|염장|건어/.test(words) ? 'harbor:racks' : 'harbor:dawn';
  return null;
}
// 33단계 갈래(새 집안 origin*, 마족 demon*, 옷감 cloth*): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
export function plate33(key, words = '') {
  const k = String(key ?? '');
  if (/^origin/.test(k)) return /마탑|술식|마법사 집안|탑주|마도서/.test(words) ? 'origin:tower' : /성당|성당지기|사제|종지기|제단|촛불|성가/.test(words) ? 'origin:church' : /공방|모루|풀무|장인|도제|망치|가마/.test(words) ? 'origin:workshop' : /빈민|고아|골목|굶|훔|동냥|뒷골목/.test(words) ? 'origin:slum' : /항구|부두|뱃사람|선창|돛|북방|바다/.test(words) ? 'origin:port' : 'origin:manor';
  if (/^demon/.test(k)) return /사절|휴전|거래|협상|담판|교섭|약조|맞교환/.test(words) ? 'demon:envoy' : /마대륙|마족의 땅|원정|경계 너머|깊숙이|마족 도시|서열/.test(words) ? 'demon:land' : 'demon:fort';
  if (/^cloth/.test(k)) return /염색|물들|쪽|꼭두서니|염료|빛깔/.test(words) ? 'cloth:dye' : /재봉|가게|손님|치수|옷을 짓|예복|상복|혼례복|유행|바느질/.test(words) ? 'cloth:shop' : 'cloth:loom';
  return null;
}
// 34단계 갈래(기술 나무 tech*·invent*, 도시의 삶 cityday*, 새 시대의 다툼 newage*): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
export function plate34(key, words = '') {
  const k = String(key ?? '');
  if (/^(tech|invent|later_era)/.test(k)) return /가로등|등석|점등|광장|첫선|구경/.test(words) ? 'tech:lamp' : /인쇄|활자|신문|책값|찍어/.test(words) ? 'tech:press' : /쇠수레 길|침목|철길|다리를 놓|공사|인부|측량/.test(words) ? 'tech:rail' : 'tech:bench';
  if (/^(cityday|city_)/.test(k)) return /파업|일손을 놓|품삯을 올|공장 문|해고|쫓겨/.test(words) ? 'city:strike' : /셋방|골목|집세|이웃|단칸|굴뚝 아래/.test(words) ? 'city:tenement' : /마부|뱃사공|필경사|일거리를 잃|사라지는|옛 일|마구간/.test(words) ? 'city:idle' : 'city:mill';
  if (/^newage/.test(k)) return /부수|망치|불을 지|깨뜨|기계 파괴/.test(words) ? 'newage:breakers' : /모임|지하|비밀|결사|암호|맹세/.test(words) ? 'newage:meeting' : /아버지|어머니|자식|아들|딸|집을 나|부모|물려받/.test(words) ? 'newage:quarrel' : 'newage:paper';
  return null;
}
// 35단계 갈래(평생의 벗 friend*, 기술이 퍼지는 길 spread*·techspread*, 목수와 석공 build*): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
export function plate35(key, words = '') {
  const k = String(key ?? '');
  if (/^(friend_|fr_)/.test(k)) /* 평생의 벗 장면은 fr_로 시작한다 (35단계 src/friends/) */ return /장례|무덤|부고|묻|세상을 떠|숨을 거|임종/.test(words) ? 'friend:funeral' : /다시 만|오랜만|돌아왔|몇 해 만|알아보/.test(words) ? 'friend:reunion' : /멀어|질투|배신|등을 돌|틀어|발길을 끊|갈라/.test(words) ? 'friend:apart' : 'friend:cup';
  if (/^(spread|techspread)_/.test(k)) return /비법|훔|베끼|책|금서|감추|궤/.test(words) ? 'spread:book' : /떠도는|떠돌이|기술자|다른 고장|수레|고개/.test(words) ? 'spread:wander' : /특허|왕실|인장|허가|관청|팔아넘|교단/.test(words) ? 'spread:patent' : 'spread:hands';
  if (/^build(er)?_/.test(k)) return /무너|붕괴|책임|깔려|금이 가/.test(words) ? 'build:fallen' : /지붕|들보|서까래|성당|상량/.test(words) ? 'build:roof' : /돌|석공|정으로|표식|채석/.test(words) ? 'build:stone' : 'build:scaffold';
  return null;
}
// 36단계 갈래(점령지 occupied*·occ_, 길 위의 일 carrier*, 사교계 society*·soc_·so_): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
export function plate36(key, words = '') {
  const k = String(key ?? '');
  if (/^(occupied|occup|occ)_/.test(k)) return /해방|풀려|물러갔|되찾|부역자|심판/.test(words) ? 'occupied:free' : /징발|빼앗|끌고 갔|곡식|세금|공출|몰수/.test(words) ? 'occupied:levy' : /저항|숨어|밤|통금|벽보|밀고|보복|몰래/.test(words) ? 'occupied:night' : 'occupied:banner';
  if (/^carrier_/.test(k)) return /도적|산적|매복|길을 막|털/.test(words) ? 'carrier:bandit' : /눈|진창|빠졌|폭설|얼어|무너진 다리|빙판/.test(words) ? 'carrier:snow' : /역참|마구간|말을 갈|여물|묵/.test(words) ? 'carrier:yard' : 'carrier:cart';
  if (/^(society|soc|so)_/.test(k)) return /망신|추문|쑥덕|웃음거리|수군|쫓겨|체면/.test(words) ? 'society:shame' : /무도|춤|왈츠|악사/.test(words) ? 'society:ball' : /살롱|시를|낭독|응접실|재주|담론|연주/.test(words) ? 'society:salon' : 'society:feast';
  return null;
}
// 41단계 갈래(옥살이 pr_·prison_, 별 st_·stars_·comet_, 측량 sv_·survey_·map_): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
// 43단계 유파(g.sword.school)별 검 그림
// 43단계 마신 장면(dg_)은 id로 판을 고른다
const DG_ART = { dg_dream: 'demongod:dream', dg_shard_call: 'demongod:dream', dg_lore: 'demongod:war', dg_relic: 'demongod:shard', dg_relic_find: 'demongod:shard', dg_order_invite: 'demongod:cult', dg_order: 'demongod:cult', dg_revenge: 'seal:alley', dg_watch_invite: 'demongod:watch', dg_watch: 'demongod:watch', dg_crossroad: 'demongod:choice' };
// 43단계 마족 장면(dk_)은 장면 kind로 먼저 가르고, 어린 날·바람·짐·이름은 집안(g.demonkind.id)의 판을 쓴다. 장면 안의 sid(dg_horn 같은)는 보지 않는다
const DK_ART = { dk_garbes: 'demonkind:warrior', dk_elinor: 'demonkind:trade', dk_silent: 'demonkind:silent', dk_hidden: 'demonkind:hiding' };
const DK_SCENE = { dk_rank: 'demonkind:warrior', dk_war: 'demonkind:warrior', dk_cross: 'demonland:outpost', dk_home: 'demonland:harbor', dk_banned: 'demonkind:hiding', dk_stranger: 'demonland:city' };
// 44단계: 새 고장 장면(ld_)은 고장 id로, 왕가 장면(cr_)은 나라(scene.realm)로 판을 고른다
const LAND_ART = { milles: 'farm:harvest', rosen: 'origin:manor', roten: 'lands:minetown', stein: 'lands:warport', abel: 'lands:pilgrim', riana: 'cloister:walk', luen: 'lands:lake', scholae: 'lands:academy', krossen: 'carrier:yard', libera: 'lands:canal', kalten: 'migrate:village', wolfwood: 'hunter:furs', iela: 'lands:canopy', silver: 'lands:canopy', border: 'kindred:border', garum: 'crowns:tribes', wolf: 'lands:camp', grondar: 'lands:under' };
const PE_ART = { pe_young: 'peers:yard', pe_parting: 'peers:apart', pe_gather: 'peers:reunion', pe_ask: 'peers:reunion', pe_repay: 'peers:reunion', pe_rival: 'peers:apart', pe_court: 'peers:court', pe_last: 'peers:fallen' };
const PE_CROSS = { up: 'peers:court', down: 'peers:news', even: 'peers:reunion', outlaw: 'peers:apart', war: 'peers:field' };
const AC_ART = { ac_levy: 'accord:toll', ac_search: 'accord:toll', ac_patrol: 'accord:border', ac_dispute: 'accord:border', ac_smuggle: 'accord:blockade', ac_embargo: 'accord:blockade', ac_mediate: 'accord:treaty', ac_betray: 'accord:betray', ac_spy: 'accord:map', ac_spywork: 'accord:map', ac_stance: 'accord:map' };
const AF_ART = { af_learn: 'artifice:apprentice', af_cut: 'artifice:cut', af_sell: 'artifice:order', af_make: 'artifice:engrave', af_pick: 'artifice:bench', af_done: 'artifice:engrave', af_blast: 'artifice:blast', af_order: 'artifice:order', af_offer: 'artifice:order', af_shop: 'artifice:bench', af_pupil: 'artifice:apprentice', af_pupils: 'artifice:apprentice', af_pupil_go: 'artifice:apprentice', af_seek: 'artifice:stolen', af_chase: 'artifice:stolen' };
const CROWN_ART = { valhart: 'crowns:emperor', holy: 'crowns:curia', serenia: 'crowns:tower', free: 'crowns:merchant', elf: 'crowns:elders', dwarf: 'crowns:clans', beast: 'crowns:tribes', leonia: 'court', march: 'court' };
const SCHOOL_ART = { yusu: 'sword:flow', ganggeom: 'sword:heavy', hwanyeong: 'sword:feint', seonghwi: 'sword:vow', moru: 'sword:axe', ipsae: 'sword:twin', balto: 'sword:fist', mulgyeol: 'sword:deck' };
// 43단계: 마족으로 태어나기(dk_·demonkind_), 마신(dg_·demongod_), 검술과 마검사(sw_·sword_).
// 45단계: 함께 자란 세대(pe_·peers_), 나라 사이의 흐름(ac_·accord_), 마도구 장인(af_·artifice_)
export function plate45(key, words = '') {
  const k = String(key ?? ''), w = `${k} ${words}`;
  if (/^(pe|peers)_/.test(k)) return /죽었|전사|부고|묘|무덤|세상을 떠|fallen|dead|grave/.test(w) ? 'peers:fallen' : /소식|편지|들려|풍문|전해 들|news|letter/.test(w) ? 'peers:news' : /갈라|등을 돌|틀어|적이 되|맞섰|멀어|apart|rift|enemy/.test(w) ? 'peers:apart' : /전장|싸움터|군막|진영|병사|field|war/.test(w) ? 'peers:field' : /궁|조정|벼슬|관복|대신|court/.test(w) ? 'peers:court' : /부두|항구|배를|뱃사람|상단|dock|port/.test(w) ? 'peers:dock' : /어릴|어린 날|골목|마당|소꿉|같이 놀|yard|child/.test(w) ? 'peers:yard' : 'peers:reunion';
  if (/^(ac|accord)_/.test(k)) return /봉쇄|막힌 항|항구를 막|뱃길이 막|blockade/.test(w) ? 'accord:blockade' : /깨졌|파기|배신|찢|저버|betray|broken/.test(w) ? 'accord:betray' : /혼인|신부|시집|정략|wedding|marriage/.test(w) ? 'accord:wedding' : /통행세|관세|세관|관문|toll|tariff/.test(w) ? 'accord:toll' : /국경|경계석|초소|넘어|border/.test(w) ? 'accord:border' : /시세|물가|장터|값이|동났|market|price/.test(w) ? 'accord:market' : /조약|맺|서명|인장|강화|동맹|treaty|pact|sign/.test(w) ? 'accord:treaty' : 'accord:map';
  if (/^(af|artifice)_/.test(k)) return /폭발|터졌|터져|불길|날아갔|사고|blast|explod|burst/.test(w) ? 'artifice:blast' : /도둑|훔|도난|빼돌|베껴|stolen|theft/.test(w) ? 'artifice:stolen' : /대물림|물려|가보|유품|대를 이어|heirloom|inherit/.test(w) ? 'artifice:heirloom' : /도제|제자|견습|가르|apprentice|pupil/.test(w) ? 'artifice:apprentice' : /주문|의뢰|손님|맡기|값을|order|client/.test(w) ? 'artifice:order' : /새기|새겼|술식|문양|각인|engrave|rune/.test(w) ? 'artifice:engrave' : /마석|깎|세공|원석|cut|stone/.test(w) ? 'artifice:cut' : 'artifice:bench';
  return null;
}
// 47단계: 축제와 인생 의례(rt_·rites_), 학자의 길(sc_·scholar_)
const RT_ART = { rt_game: 'rites:contest', rt_dance: 'rites:feast', rt_brawl: 'rites:mishap', rt_pick: 'rites:feast', rt_fire: 'rites:mishap', rt_vigil: 'festival:dead', rt_hunt: 'beast:tracks', rt_sponsor: 'rites:calendar', rt_host: 'rites:host', rt_naming: 'rites:rite', rt_coming: 'rites:rite', rt_wedmix: 'wedding', rt_mourn: 'funeral' };
const SC_ART = { sc_read: 'scholar:library', sc_job: 'scholar:shelf', sc_copy: 'scholar:copy', sc_survey: 'survey:field', sc_write: 'scholar:write', sc_plan: 'scholar:write', sc_draft: 'scholar:write', sc_finish: 'scholar:copy', sc_translate: 'scholar:write', sc_censor: 'scholar:censor', sc_school: 'scholar:lecture', sc_debate: 'scholar:debate', sc_lecture: 'scholar:lecture', sc_secretcopy: 'scholar:copy', sc_elder: 'scholar:write' };
const RT_WORDS = [[/사고|다쳤|무너|불이 번|엎어|망쳤|싸움이 났|mishap|fire|accident/, 'rites:mishap'], [/겨루|씨름|활쏘기|경주|시합|줄다리|contest|race|game/, 'rites:contest'], [/달력|절기|날을 받|길일|calendar|season/, 'rites:calendar'], [/성년|관례|돌잔치|이름 짓|축복|세례|의식|예식|rite|naming|coming|bless/, 'rites:rite'], [/잔치를 열|대접|손님|차렸|host|guest/, 'rites:host'], [/축제|잔치|춤|feast|fest|dance/, 'rites:feast']];
const SC_WORDS = [[/금서|불태|검열|압수|태워|censor|burn|ban/, 'scholar:censor'], [/논쟁|토론|반박|맞붙|debate|dispute/, 'scholar:debate'], [/강의|가르|제자|학생|lecture|teach/, 'scholar:lecture'], [/베끼|필사|사본|copy|scribe/, 'scholar:copy'], [/장서|책을 모|서가|모은 책|shelf|collect/, 'scholar:shelf'], [/도서관|서고|library/, 'scholar:library'], [/쓰|짓|원고|저술|write|book|treatise/, 'scholar:write']];
const byWords = (table, ...texts) => { for (const t of texts) for (const [re, art] of table) if (re.test(t)) return art; return null; };
export function plate47(key, words = '') {
  const k = String(key ?? '');
  if (/^(rt|rites)_/.test(k)) return RT_ART[k] ?? byWords(RT_WORDS, k, words) ?? 'rites:feast';
  if (/^(sc|scholar)_/.test(k)) return SC_ART[k] ?? byWords(SC_WORDS, k, words) ?? 'scholar:library';
  return null;
}
// 44단계: 새 고장의 살이(ld_·lands_), 나라마다 다른 궁정(cr_·crowns_), 미궁 깊게(dv_·delve_)
export function plate44(key, words = '') {
  const k = String(key ?? ''), w = `${k} ${words}`;
  if (/^(ld|lands)_/.test(k)) return /순례|성지|성당 계단|pilgrim/.test(w) ? 'lands:pilgrim' : /학원 거리|책방|필경|학생|academy/.test(w) ? 'lands:academy' : /호수|호숫가|잔교|그물|lake/.test(w) ? 'lands:lake' : /나무 위|줄다리|엘프|canopy|elf/.test(w) ? 'lands:canopy' : /산 아래|드워프|굴 도시|화덕|under|dwarf/.test(w) ? 'lands:under' : /야영지|초원|수인|부족|camp|beast/.test(w) ? 'lands:camp' : /군항|군선|함대|warport|navy/.test(w) ? 'lands:warport' : /광산|갱도|광부|mine/.test(w) ? 'lands:minetown' : 'lands:canal';
  if (/^(cr|crowns)_/.test(k)) return /정변|반정|찬탈|뒤엎|coup/.test(w) ? 'crowns:coup' : /후계|계승|왕위 다툼|상속|heir|success/.test(w) ? 'crowns:heir' : /황제|황가|발하르트|emperor|valhart/.test(w) ? 'crowns:emperor' : /교황|교황청|성국|추기경|curia|holy/.test(w) ? 'crowns:curia' : /마탑|의회|세레니아|tower|serenia/.test(w) ? 'crowns:tower' : /평의회|상인|자유도시|연맹|merchant|free/.test(w) ? 'crowns:merchant' : /장로|엘프|elder|elf/.test(w) ? 'crowns:elders' : /씨족|드워프|clan|dwarf/.test(w) ? 'crowns:clans' : /부족|수인|연합|tribe|beast/.test(w) ? 'crowns:tribes' : 'crowns:heir';
  if (/^(dv|delve)_/.test(k)) return /주인|가장 깊은|마지막 방|lord|master/.test(w) ? 'delve:lord' : /다른 공략대|다툼|가로채|마주쳤|rival/.test(w) ? 'delve:rival' : /기록|이름을 새|돌판|record/.test(w) ? 'delve:record' : /돌아왔|살아 나|부축|귀환|return/.test(w) ? 'delve:return' : /공략대|꾸리|모집|동료를 구|party/.test(w) ? 'delve:party' : /미궁 도시|좌판|시세|장터|town/.test(w) ? 'delve:town' : /깊은 층|심층|수정|버섯|deep/.test(w) ? 'delve:deep' : /층|복도|내려|floor|shallow/.test(w) ? 'delve:shallow' : 'delve:gate';
  return null;
}
export function plate43(key, words = '') {
  const k = String(key ?? ''), w = `${k} ${words}`;
  if (/^(dk|demonkind)_/.test(k)) return /숨어|숨긴|인간 땅|들키|모자|분을|hiding|hidden/.test(w) ? 'demonkind:hiding' : /침묵|이름 없는|관의 골짜기|silent|nameless/.test(w) ? 'demonkind:silent' : /교역|사절|엘리노어|저울|장부|상단|trade|envoy/.test(w) ? 'demonkind:trade' : /뼈의 들|bones/.test(w) ? 'demonland:bones' : /사슬 항구|항구|부두|harbor/.test(w) ? 'demonland:harbor' : /초소|해협|얼음|outpost|strait/.test(w) ? 'demonland:outpost' : /전사|가르베스|수련|칼을|창을|서열|결투|warrior/.test(w) ? 'demonkind:warrior' : 'demonland:city';
  if (/^(dg|demongod)_/.test(k)) return /파편|조각|유물|shard|relic/.test(w) ? 'demongod:shard' : /사도|apostle/.test(w) ? 'demongod:apostle' : /마신교|모임|집회|신도|입교|cult/.test(w) ? 'demongod:cult' : /봉인 전쟁|벽화|옛 이야기|원년|기록|전승|lore|war/.test(w) ? 'demongod:war' : /감시탑|파수꾼|watch/.test(w) ? 'demongod:watch' : /쐐기|지키는|깨려|갈림|choice|wedge/.test(w) ? 'demongod:choice' : 'demongod:dream';
  if (/^(sw|sword)_/.test(k)) return /마검|spellblade|magic/.test(w) ? 'sword:spellblade' : /검기|기운을 실|aura/.test(w) ? 'sword:aura' : /승급|인가|면허|등급이 올|rank|promot/.test(w) ? 'sword:rank' : /이름난|검객|도전|겨루|rival|famed|challenge/.test(w) ? 'sword:rival' : /성휘|맹세|성기사|vow/.test(w) ? 'sword:vow' : /물결칼|곡도|갑판|뱃전|deck/.test(w) ? 'sword:deck' : /도끼|드워프|axe/.test(w) ? 'sword:axe' : /쌍검|엘프|twin/.test(w) ? 'sword:twin' : /맨손|주먹|권법|수인|fist/.test(w) ? 'sword:fist' : /강검|제국|heavy/.test(w) ? 'sword:heavy' : /환영|허초|속임|feint/.test(w) ? 'sword:feint' : 'sword:flow';
  return null;
}
// 42단계: 다른 종족 집안(kd_·kindred_), 마법 계열과 주문 짓기(sp_·spell_), 마법 생업(mj_·magejob_).
// sp_water·sp_fire·sp_wind·sp_earth는 정령의 자리 id라 건너뛴다.
const SCHOOL42 = [[/폭주|터져|터졌|걷잡|휩쓸|탈진|쓰러졌|역류/, 'surge'], [/짓기|짓는|지은 주문|고쳐 쓴|술식|이름을 붙|책상|밤새|연구|초고/, 'desk'], [/그림자|어둠|그늘|암흑/, 'shadow'], [/정신|환영|기억|홀리|마음을 읽|심문/, 'mind'], [/생명|치유|고쳤|살렸|상처|병자|되살/, 'life'], [/빛|결계|밝혔|밝히|광휘|횃불 없이/, 'light'], [/불|화염|불꽃|태웠|서리|얼어/, 'fire'], [/물|비를|비가|우물|얼음|정화|홍수/, 'water'], [/바람|돌풍|폭풍|회오리/, 'wind'], [/흙|돌|바위|땅|갱도|벽을 세/, 'earth']];
export function plate42(key, words = '') {
  const k = String(key ?? '');
  if (/^(kd|kindred)_/.test(k)) {
    const w = `${k} ${words}`;
    if (/half_?demon|반마족|뿔/.test(w)) return /변경|march|border|마족 땅/.test(w) ? 'demon:land' : 'kindred:hidden';
    if (/half_?elf|반엘프/.test(w)) return /귀족|숨은 혈통|noble|hidden|서자/.test(w) ? 'origin:manor' : 'kindred:border';
    if (/dwarf|드워프|씨족/.test(w)) return /쫓겨|추방|exile|outcast|떠돌/.test(w) ? 'kindred:exile' : /상인|장터|지상|trader|merchant|좌판/.test(w) ? 'kindred:trader' : 'kindred:hall';
    if (/beast|수인|부족|wolf|tiger|hawk|늑대|호랑이/.test(w)) return /tiger|호랑이/.test(w) ? 'kindred:tiger' : /hawk|매 부족|매의|벼랑/.test(w) ? 'kindred:hawk' : 'kindred:wolf';
    if (/elf|엘프/.test(w)) return /악사|노래|류트|minstrel|bard|도시/.test(w) ? 'kindred:minstrel' : /노예|풀려|사슬|족쇄|freed|slave/.test(w) ? 'kindred:freed' : 'kindred:grove';
    return 'kindred:border';
  }
  if (/^(sp|spell)_/.test(k) && !/^sp_(water|fire|wind|earth)$/.test(k)) {
    const en = k.match(/_(fire|water|wind|earth|light|shadow|life|mind|surge|craft|desk)/)?.[1];
    if (en) return `spell:${en === 'craft' ? 'desk' : en}`;
    return `spell:${SCHOOL42.find(([re]) => re.test(words))?.[1] ?? 'desk'}`;
  }
  if (/^(mj|magejob)_/.test(k)) return /tutor|teach|pupil|board/.test(k) ? 'spell:desk' : /merc/.test(k) ? 'spell:fire' : /fail/.test(k) ? 'spell:surge' : /비를|비가|기우|우물|정화|물/.test(words) ? 'spell:water' : /서리|불을|불 붙|화덕|용병|전장|싸움/.test(words) ? 'spell:fire' : /가정교사|가르|제자|수업|글/.test(words) ? 'spell:desk' : /병|상처|고쳤/.test(words) ? 'spell:life' : /갱도|굴|흙|둑|돌/.test(words) && !/밝/.test(words) ? 'spell:earth' : 'spell:light';
  return null;
}
// 옥살이 판 이름은 jail(옛 prison 판은 재판 뒤 한 장으로 그대로 둔다).
export function plate41(key, words = '') {
  const k = String(key ?? '');
  if (/^(pr|prison|gaol)_/.test(k)) return /탈옥|밧줄|담을 넘|땅굴|빠져나|달아났|도망/.test(words) ? 'jail:rope' : /출소|풀려|석방|형기|나왔다|문이 열|사면/.test(words) ? 'jail:release' : /면회|찾아왔|창살 너머|편지|뇌물|옥졸에게/.test(words) ? 'jail:visit' : 'jail:cell';
  if (/^(st|stars|comet|eclipse|astro)_/.test(k)) return /혜성|꼬리별|별똥|유성/.test(words) ? 'stars:comet' : /일식|월식|해가 가려|해가 사라|검은 해/.test(words) ? 'stars:eclipse' : /별점|점쟁이|점을 치|운세|노점|사기|복채/.test(words) ? 'stars:stall' : 'stars:roof';
  if (/^(sv|survey|map|carto)_/.test(k)) return /경계석|경계 다툼|경계를|말뚝|증인|땅 싸움/.test(words) ? 'survey:stone' : /군용|장군|군막|전선|작전|진군|군대/.test(words) ? 'survey:war' : /공방|도제|지도를 팔|먹선|베껴|양피지|주문/.test(words) ? 'survey:shop' : 'survey:field';
  return null;
}
// 40단계 갈래(서자 bb_·baseborn_, 피난 mg_·migrate_·refugee_, 장의사 ut_·undertaker_·grave_): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
// mg_drum·mg_wolf 같은 33단계 집안 장면(산맥 용병 집안)은 건너뛴다.
export function plate40(key, words = '') {
  const k = String(key ?? '');
  if (/^(bb|baseborn|bastard)_/.test(k)) return /인정|성을 받|성을 내|이름을 받|내 아들|내 딸|망토|족보에/.test(words) ? 'baseborn:named' : /문장 없는|민무늬|방패|시합|기사|종자|서임|용병/.test(words) ? 'baseborn:shield' : /문간|문 앞|찾아갔|찾아왔|데리고|집사|문을 두드|쫓겨/.test(words) ? 'baseborn:door' : 'baseborn:face';
  if (/^(mg|migrate|migration|refugee)_/.test(k) && !/^mg_(drum|wolf|fled|oath|served|signed)$/.test(k)) return /난민촌|천막|움막|죽 솥|구호|배급/.test(words) ? 'migrate:camp' : /성문|닫|막아|받아 주지|돌려보|내쫓|쫓아/.test(words) ? 'migrate:gate' : /새 마을|정착|터를 잡|집을 짓|이주민 마을|섞여|뿌리/.test(words) ? 'migrate:village' : 'migrate:snow';
  if (/^(ut|undertaker|grave|gravekeeper)_/.test(k)) return /역병|돌림병|수레|넘쳐|구덩이|한꺼번에/.test(words) ? 'undertaker:plague' : /도굴|묘지기|밤|무덤을 파|순찰|등불|묘지/.test(words) ? 'undertaker:night' : /행렬|장례|운구|상여|발인|조문/.test(words) ? 'undertaker:cortege' : 'undertaker:shop';
  return null;
}
// 39단계 갈래(입양 adopt*·adoption_·foundling_·orphan_, 빚 credit*·debt_·loan_·pawn_·bank_, 수도원 cloister*·abbey_·monk_·hermit_): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
export function plate39(key, words = '') {
  const k = String(key ?? '');
  if (/^(adopt(ion)?|foundling|orphan|ad)_/.test(k)) return /문간|바구니|버려진|버려져|강보|문 앞에 놓/.test(words) ? 'adopt:basket' : /친부모|친어머니|친아버지|낳아 준|낳은 이|찾아왔|출생/.test(words) ? 'adopt:kin' : /양자|입적|족보|성을 주|의식|대를 잇|문서/.test(words) ? 'adopt:rite' : 'adopt:hall';
  if (/^(credit|debt|loan|pawn|bank)_|^cr_(bank_wobble|crown_ask|debtor_plea)$/.test(k)) return /탕감|불태|태웠|면제|빚이 사라|갚았|다 갚/.test(words) ? 'credit:pardon' : /독촉|빚쟁이|끌어|압류|들이닥|문을 두드|빼앗|차압/.test(words) ? 'credit:dun' : /전당|저당|맡기|맡겼|잡히/.test(words) ? 'credit:pawn' : 'credit:ledger';
  if (/^(cloister|abbey|monk|monastery|hermit|cl)_/.test(k)) return /떠나|환속|세속으로|돌아가|벗었|나섰/.test(words) ? 'cloister:leave' : /은둔|은자|산속|움막|암자|동굴|홀로/.test(words) ? 'cloister:hermit' : /필사|양피지|책|글씨|깃펜|서고|베껴/.test(words) ? 'cloister:script' : 'cloister:walk';
  return null;
}
// 37단계 갈래(산적 outlaw*·out_·ol_, 사냥꾼 hunter*·hunt_·hu_, 의붓가족 stepfamily*·step_·sf_): 같은 방식. BY_SCENE에 적힌 것이 먼저다.
export function plate37(key, words = '') {
  const k = String(key ?? '');
  if (/^(outlaws?|out|ol)_/.test(k)) return /몸값|잡혀|붙잡|인질|풀려|납치/.test(words) ? 'outlaw:ransom' : /토벌|현상금|병사|불태|소탕|쳐들어|교수/.test(words) ? 'outlaw:raid' : /길목|통행세|털|매복|수레|상인|고갯길/.test(words) ? 'outlaw:pass' : 'outlaw:den';
  if (/^(hunter|hunt|hu)_/.test(k)) return /멧돼지|곰|큰 짐승|달려들|물렸|받혔|다쳤|맞섰/.test(words) ? 'hunter:beast' : /모피|가죽|상인|장터|값|팔/.test(words) ? 'hunter:furs' : /덫|올무|올가미|놓았|걸렸/.test(words) ? 'hunter:trap' : 'hunter:trail';
  if (/^(stepfamily|stepfam|step|sf)_/.test(k)) return /다퉜|다툼|싸움|싸웠|밀쳤|소리를 질|상속|대들|주먹/.test(words) ? 'stepfamily:quarrel' : /마음을 열|화해|처음으로|불렀다|받아들|웃었|손을 잡/.test(words) ? 'stepfamily:peace' : /데려온|문간|문 앞|찾아왔|낯선 집|보따리|친아버지|친어머니|친부모/.test(words) ? 'stepfamily:door' : 'stepfamily:table';
  return null;
}
const atSea = (g) => safe(() => !!(g.life?.travel && g.sea?.voyage) || !!g.life?.atSea, false);

/** 지금 뜬 사건(또는 그 결과)에 어울리는 그림. 없으면 null */
export function vignetteFor(g, { title = '', text = '', outcome = false } = {}) {
  if (!g) return null;
  let pick = null;
  if (outcome) pick = BY_OUTCOME.find(([re]) => re.test(text))?.[1] ?? null;
  else {
    const pe = g.pendingEvent, id = pe?.id ?? '';
    if (id === 'duel_round' || id === 'duel_start') return null;
    const kind = id === 'life_scene' ? g.life?.scene?.kind : null;
    if (kind === 'fight' || kind === 'battle') return null;
    pick = BY_ID[id] ?? BY_SCENE[id] ?? (kind === 'crisis_turn' ? crisisPlate(title, text) : null) ?? (kind ? BY_SCENE[kind] : null) ?? null;
    pick ??= plate31(kind ?? id, `${title} ${text}`) ?? plate32(kind ?? id, `${title} ${text}`) ?? plate33(kind ?? id, `${title} ${text}`) ?? plate34(kind ?? id, `${title} ${text}`) ?? plate35(kind ?? id, `${title} ${text}`) ?? plate36(kind ?? id, `${title} ${text}`) ?? plate37(kind ?? id, `${title} ${text}`) ?? plate39(kind ?? id, `${title} ${text}`) ?? plate40(kind ?? id, `${title} ${text}`) ?? plate41(kind ?? id, `${title} ${text}`) ?? plate42(kind ?? id, `${title} ${text}`) ?? plate43(kind ?? id, `${title} ${text}`) ?? plate44(kind ?? id, `${title} ${text}`) ?? plate45(kind ?? id, `${title} ${text}`) ?? plate47(kind ?? id, `${title} ${text}`);
    if (kind === 'sea_event') pick = /폭풍|풍랑/.test(title) ? 'voyage:storm' : /해적|검은 돛/.test(title) ? 'voyage:pirate' : /뱀|괴물|촉수/.test(title + text) ? 'voyage:serpent' : 'voyage';
    if (kind === 'voc_path' || kind === 'voc_event') { const sc = g.life.scene; pick = VOC_ART[sc.path ?? sc.ev] ?? JOB_ART[g.life?.job?.id] ?? null; }
    if (kind === 'peoples_rite' && g.life.scene.id) pick = `peoples:${g.life.scene.id}`;
    if (kind === 'herd_event') pick = { sick: 'herd:pasture', wolves: 'monsters', rustlers: 'herd:rustle', neighbor: 'feud:offer', dealer: 'beastlife:market', raid: 'herd:rustle', race: 'herd:steed', dzud: 'nature:winter' }[g.life.scene.ev] ?? pick;
    if (kind === 'apo_event') pick = { doctor: 'square:notice', priest: 'chapel:inquisition', quack: 'square:herald', poison: 'apothecary:poison', plague: 'apothecary:queue', harmed: 'bedside', rare: 'apothecary:gather' }[g.life.scene.ev] ?? pick;
    if (kind === 'brew_event') pick = { taxman: 'square:notice', ban: 'square:herald', smuggler: 'brew:still', festival: 'festival' }[g.life.scene.ev] ?? pick;
    if (kind === 'spirit_meet' || kind === 'spirit_whim') pick = { sp_water: 'spirit:water', sp_fire: 'spirit:fire', sp_wind: 'spirit:wind', sp_earth: 'spirit:earth' }[g.life.scene.id] ?? pick;
    if (/^origin_/.test(kind ?? '')) pick = ORIGIN_ART[g.origins?.id] ?? (/elf|dwarf|beast|wolf|tiger|hawk|demon/.test(g.origins?.id ?? '') ? plate42(`kd_${g.origins.id}`) : null) ?? pick;
    if (/^kd_/.test(kind ?? id)) pick = ((kind ?? id) === 'kd_horns' ? 'kindred:hidden' : KINDRED_ART[g.kindred?.id]) ?? pick;
    if (/^ld_/.test(kind ?? id)) pick = LAND_ART[g.life?.scene?.id] ?? LAND_ART[g.life?.place] ?? pick;
    if (/^cr_/.test(kind ?? id) && !/^cr_(bank_wobble|crown_ask|debtor_plea)$/.test(kind ?? id)) { const ck = kind ?? id; pick = (ck === 'cr_coup' ? 'crowns:coup' : ck === 'cr_side' ? 'crowns:heir' : CROWN_ART[g.life?.scene?.realm]) ?? pick; }
    if (/^dv_/.test(kind ?? id)) { const dk = kind ?? id, fl = g.life?.scene?.floor ?? 0; pick = ({ dv_crew: 'delve:party', dv_plan: 'delve:gate', dv_rival: 'delve:rival', dv_go: 'delve:gate' }[dk] ?? (dk === 'dv_run' ? (/가장 깊은 곳/.test(text) ? 'delve:lord' : fl >= 8 ? 'delve:deep' : fl >= 1 ? 'delve:shallow' : 'delve:gate') : null)) ?? pick; }
    if (/^dk_/.test(kind ?? id)) pick = DK_SCENE[kind ?? id] ?? DK_ART[g.demonkind?.id] ?? pick;
    if (/^dg_/.test(kind ?? id)) pick = DG_ART[kind ?? id] ?? pick;
    if (/^pe_/.test(kind ?? id)) pick = ((kind ?? id) === 'pe_cross' ? PE_CROSS[g.life?.scene?.mode] : PE_ART[kind ?? id]) ?? pick;
    if (/^ac_/.test(kind ?? id)) pick = AC_ART[kind ?? id] ?? pick;
    if (/^af_/.test(kind ?? id)) pick = (kind ?? id) === 'af_pupil_go' && /훔|빼돌|들고 나|사라졌/.test(text) ? 'artifice:stolen' : AF_ART[kind ?? id] ?? pick;
    if (/^sw_/.test(kind ?? id)) { const sk = kind ?? id; pick = (sk === 'sw_rite' || sk === 'sw_found' ? 'sword:rank' : sk === 'sw_secret' ? SCHOOL_ART[g.sword?.school] : null) ?? pick; }
    if (kind === 'harbor_event') pick = { first: 'harbor:dawn', ground: 'feud:offer', smuggler: 'seal:alley', pirate: 'voyage:pirate', salvage: 'harbor:wait', widow: 'harbor:wait', festival: 'festival', omen: 'harbor:wait' }[g.life.scene.ev] ?? pick;
    if (kind === 'farm_event') pick = { water: 'farm:water', boundary: 'feud:offer', blight: 'nature:locust', hands: 'feud:plot', tenant: 'famine', buyer: 'farm:sell', thief: 'seal:alley', levy: 'square:guards' }[g.life.scene.ev] ?? pick;
    if (kind === 'cuisine_event') pick = { plot: 'feud:plot', suspect: 'cuisine:taster', taster: 'cuisine:taster', rival: 'cuisine:contest', shortage: 'cuisine:create', guest: 'cuisine:feast', apprentice: 'cuisine:kitchen', spoiled: 'cuisine:create' }[g.life.scene.ev] ?? pick;
    if (kind === 'law_trial') pick = safe(() => g.law.cases.find((c) => c.id === g.life.scene.cid)?.role) === 'accused' ? 'trial:dock' : 'trial:plead';
    if (pick === 'works:site' && /^w_(road|canal|pass|tunnel|aqueduct)$/.test(g.life?.scene?.id ?? '')) pick = 'works:dig';
    if (kind === 'heist_event') pick = { caught: 'square:guards', close: 'heist:roof', rat: 'feud:turned', blab: 'feud:plot', greed: 'feud:offer', informant: 'square:guards' }[g.life.scene.ev] ?? pick;
    if (kind === 'company_event') pick = { maimed: 'bedside', sack: 'fire', unpaid: 'feud:plot', turn: 'feud:turned', ransom: 'prison', rival: 'feud:offer', mutiny: 'feud:strike', widow: 'funeral:visit', desert: 'road' }[g.life.scene.ev] ?? pick;
    if (kind === 'troupe_event') pick = { censor: 'square:trial', quarrel: 'feud:offer', love: 'festival', lover: 'road', feast: 'court', theft: 'seal:alley' }[g.life.scene.ev] ?? pick;
    if (kind === 'inn_event') pick = { brawl: 'feud:strike', guest: 'square:herald', gang: 'seal:alley', smuggle: 'seal:alley', guard: 'square:notice', arrears: 'square:notice', tax: 'court', rival_open: 'feud:plot', rival: 'feud:plot' }[g.life.scene.ev] ?? pick;
    if (kind === 'poor_slum') pick = { winter: 'famine', share: 'seal:alley', sick: 'famine', kid: 'seal:alley', gang: 'feud:plot' }[g.life.scene.ev] ?? pick;
    if (kind === 'house_event') pick = { fire: 'fire', thief: 'seal:alley', neighbor: 'feud:offer' }[g.life.scene.ev] ?? pick;
    if (id === 'peoples_name') pick = { silverleaf: 'peoples:elf_dew', hammer: 'peoples:dwarf_fire', fur: 'peoples:beast_totem' }[g.life?.place] ?? pick;
    if (kind === 'explore_leg' || kind === 'explore_heart' || kind === 'explore_name') { const rg = kind === 'explore_name' ? regionOfSite(g.life.scene.site) : g.explore?.exp?.region; if (rg) pick = kind === 'explore_leg' ? `explore:${rg}` : `explore:heart-${rg}`; }
    if (kind === 'trade_event') pick = TRADE_ART[g.life.scene.ev] ?? pick;
    if (kind === 'spy_job') pick = { letter: 'spy:steal', extract: 'spy:tail', rumor: 'spy:drop', watch: 'spy:tail', burn: 'spy:tail' }[g.life.scene.mission] ?? pick;
    if (kind === 'spy_hunter') pick = { offer: 'spy:recruit' }[g.life.scene.ev] ?? pick;
    if (kind === 'voc_beast') pick = BEAST_ART[g.life.scene.beast] ?? 'beast:boar';
    if (!pick) pick = BY_TITLE.find(([re, , need]) => re.test(title) && (!need || kind || atSea(g)))?.[1] ?? null;
  }
  if (!pick) return null;
  const [plate, variant] = pick.split(':');
  const me = safe(() => g.people.find((p) => p.id === g.player.id));
  // 사랑 장면은 그 장면의 상대를 그린다
  const other = safe(() => ((plate === 'love' || plate === 'feud' || /^(feud|mentor)_/.test(g.life.scene?.kind ?? '')) && g.life.scene?.id != null ? g.people.find((p) => p.id === g.life.scene.id) : null)) ?? safe(() => g.people.find((p) => p.id === me.spouseId)) ?? null;
  return {
    plate, variant: variant ?? null, year: g.date?.year ?? 505, month: g.date?.month ?? 6, place: g.life?.place ?? 'ern',
    famine: !!g.world?.famine, me, other, seed: strSeed(String(title)) % 997,
  };
}

/* ---------- 화면에 얹기 ---------- */
let game = null;
const keep = (g) => { game = g; };
HOOKS.newGame.push(keep); HOOKS.migrate.push(keep); HOOKS.afterMonth.push(keep); (HOOKS.heir ??= []).push(keep);

let last = null;   // 사건이 떠 있을 때 고른 그림 (그 뒤 화면에서도 이어 쓴다)
/** 지금 사건 창에 걸린 그림의 판 이름 ('court:…'). 없으면 null. 소리 쪽이 그곳의 울림을 고르는 데 쓴다 */
export const currentPlate = () => (last ? `${last.plate}${last.variant ? `:${last.variant}` : ''}` : null);
let styled = false;
function css() {
  if (styled) return; styled = true;
  const st = document.createElement('style');
  st.textContent = `.ev-art.fl-vig{height:auto!important;aspect-ratio:${VW}/${VH}}
.ev-art.fl-vig::after{background:linear-gradient(transparent 74%,var(--panel))!important}
.ev-art.fl-vig i{background-position:50% 50%!important;animation-duration:40s!important}
@keyframes fl-vig-in{from{opacity:0;filter:brightness(.35) blur(5px)}to{opacity:1;filter:none}}
html.motion .ev-art.fl-vig-in{animation:fl-vig-in 1.9s ease both}`;
  document.head.appendChild(st);
}
function refresh() {
  const ev = document.querySelector('.overlay .event');
  if (!ev) { last = null; return; }
  const art = ev.querySelector('.ev-art');
  if (art?.classList.contains('fl-battle')) return; // 전투 연출이 차지한 창
  const out = ev.querySelector('.outcome');
  const title = ev.querySelector('#ev-title')?.textContent ?? '';
  let spec;
  if (out) spec = safe(() => vignetteFor(game, { title, text: out.textContent ?? '', outcome: true })) ?? last;
  else { spec = safe(() => vignetteFor(game, { title, text: ev.querySelector('.ev-text')?.textContent ?? '' })); last = spec; }
  if (!spec) return;
  if (out) last = spec;
  const url = vignetteImage(spec);
  if (!url) return;
  css();
  let host = art;
  if (!host) { host = document.createElement('div'); host.className = 'ev-art'; host.setAttribute('aria-hidden', 'true'); ev.prepend(host); }
  let i = host.querySelector('i');
  if (!i) { i = document.createElement('i'); host.prepend(i); }
  const want = `url("${url}")`;
  if (i.dataset.vig !== url) {
    i.style.backgroundImage = want; i.dataset.vig = url;
    // 그림이 새로 걸릴 때는 어둠에서 천천히 드러난다 (30단계)
    host.classList.remove('fl-vig-in'); void host.offsetWidth; host.classList.add('fl-vig-in');
  }
  host.classList.add('fl-vig');
}
function init() {
  const watch = () => {
    const app = document.getElementById('app');
    if (!app) return;
    let queued = false;
    // 전투 연출이 먼저 자리를 잡도록 한 박자 늦게 본다
    new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(() => queueMicrotask(() => { queued = false; safe(refresh); })); } }).observe(app, { childList: true });
    safe(refresh);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
}
if (hasDom) init();
