# 출처와 라이선스

## 효과음·환경음 (29단계)

`assets/audio/sfx/`와 `assets/audio/amb/`의 소리는 전부 [Freesound](https://freesound.org)에 올라온 **CC0(퍼블릭 도메인)** 녹음입니다.
CC0라서 출처 표기 의무는 없지만, 누가 녹음했는지 남겨 둡니다. 녹음 하나하나의 라이선스를 Freesound 페이지에서 확인했습니다
(모두 `creativecommons.org/publicdomain/zero/1.0`). 비상업 전용(CC-BY-NC)이나 출처가 불분명한 녹음은 쓰지 않았습니다.

음악·그림 쪽 출처는 각 담당이 이 문서에 따로 절을 두어 적습니다.

### 어떻게 다듬었나

1. 이름마다(효과음 74개, 환경음 깔개 7개, 가끔 나는 소리 28개) 후보를 Freesound에서 찾아 길이·평점·제목으로 거르고, 귀에 거슬리는 것(합성음, 음악, 말소리)을 뺐습니다.
2. 44.1kHz 모노로 바꾸고 35Hz 아래를 걸러 낸 뒤, 소리가 난 부분만 잘라 앞 침묵을 없애고 꼬리를 줄였습니다. 원본에서 찢어진(클리핑) 부분이 있는 녹음은 버리고 다른 녹음으로 바꿨습니다.
3. 크기를 묶음마다 맞췄습니다(RMS 기준 화면 −26dB, 행동 −20dB, 전투 −17dB, 고비 −19dB, 가끔 나는 소리 −23dB, 깔개 −24dB, 꼭지는 −1dB 아래).
4. 깔개(바람·비·지붕 비·개울·난롯불·웅성거림·땅울림)는 원본에서 크기가 가장 고른 26초를 골라 끝과 처음을 2초 겹쳐 24초짜리 이음매 없는 고리로 만들었습니다. 이음매 앞뒤 크기 차이는 0.1~4.3dB로, 녹음 안에서 원래 출렁이는 정도(0.6~3.1dB)와 비슷합니다.
5. 짧은 소리는 묶음 파일(sfx/ui·act·fight·life, amb/shots)에 0.3초씩 띄워 담고 AAC(m4a)로 압축했습니다. 자리는 `src/audio/sfx.js`의 `SPRITE` 표에 있습니다. 전부 합쳐 약 3.9MB.
6. 게임 안에서는 브라우저(Chromium)로 실제로 틀어 장면과 효과음마다 1초 창 RMS와 꼭지를 재서, 예전 합성 소리와 비슷한 자리(환경음은 예전보다 2~3dB 또렷하게)에 오도록 `LEVEL`·`BED_NORM`·각 소리의 gain을 맞췄습니다.

### 녹음 목록 (140개)

| Freesound | 제목 | 녹음한 사람 | 쓰인 곳 |
|---|---|---|---|
| [19291](https://freesound.org/s/19291/) | foley cloth rustle.wav | martian | steal |
| [37596](https://freesound.org/s/37596/) | Sword.wav | hello_flowers | parry, sword |
| [63535](https://freesound.org/s/63535/) | knock1.wav | florian_reinke | deny |
| [75162](https://freesound.org/s/75162/) | crow.wav | nigelcoop | crow |
| [76888](https://freesound.org/s/76888/) | Small bowl.wav | airtaxi | meditate |
| [80937](https://freesound.org/s/80937/) | gust of wind.wav | Tony B kksm | gust |
| [81801](https://freesound.org/s/81801/) | Silencyo_CC_Fire in Fireplace_Close Up_Reverberant2.aif | silencyo | 깔개 fire |
| [119837](https://freesound.org/s/119837/) | Floorboard_creak.aif | kbnevel | creak |
| [121990](https://freesound.org/s/121990/) | coinBag.wav | tomf_ | coin |
| [138487](https://freesound.org/s/138487/) | Shield Hit | JustInvoke | shield |
| [146558](https://freesound.org/s/146558/) | Hybrid Monster Growl | john129pats | growl |
| [146932](https://freesound.org/s/146932/) | Wind Gust | crashoverride6 | gust |
| [148645](https://freesound.org/s/148645/) | hunting-horn-bass.wav | nanoPlink | farhorn |
| [156927](https://freesound.org/s/156927/) | bkClose.wav | tia666 | close |
| [160215](https://freesound.org/s/160215/) | Unlocking Door Lock | qubodup | lock |
| [164785](https://freesound.org/s/164785/) | INT Cave Room tone.wav | deleted_user_2104797 | 깔개 rumble |
| [171178](https://freesound.org/s/171178/) | MonsterGrowl.mp3 | yatoimtop | growl |
| [178615](https://freesound.org/s/178615/) | The Rustle of a Bush | Montacue | herb |
| [179222](https://freesound.org/s/179222/) | Knife Stab.wav | Mixedupmoviestuff | stab |
| [182504](https://freesound.org/s/182504/) | Horse Clip Clopping Downhill (stereo) | swiftoid | hooves |
| [182507](https://freesound.org/s/182507/) | Bird Chirp | swiftoid | bird |
| [185051](https://freesound.org/s/185051/) | Scroll.wav | justeluis | scroll |
| [191579](https://freesound.org/s/191579/) | wood fire 1 | TimBahrij | pop |
| [195795](https://freesound.org/s/195795/) | Closing book | ondondvo | close |
| [198401](https://freesound.org/s/198401/) | ANI - Wine Glass - Hard | ani_music | ward |
| [202107](https://freesound.org/s/202107/) | Unrolling Scroll.wav | spookymodem | scroll |
| [213005](https://freesound.org/s/213005/) | Shovel.wav | abstraktgeneriert | farm |
| [222521](https://freesound.org/s/222521/) | Cracking Earthquake (cracking soil, cracking stone) | uagadugu | quake |
| [233255](https://freesound.org/s/233255/) | Single Bird Chirp | alegemaate | bird |
| [240640](https://freesound.org/s/240640/) | Metallic Whoosh.wav | MissCellany | slash |
| [243699](https://freesound.org/s/243699/) | Hidden Wall Opening | ertfelda | dungeon |
| [243780](https://freesound.org/s/243780/) | thunder growling | bastipictures | thunder |
| [244357](https://freesound.org/s/244357/) | skylark.wav | squashy555 | lark |
| [245919](https://freesound.org/s/245919/) | Wooden blocks falling.wav | sophiehall3535 | play |
| [245922](https://freesound.org/s/245922/) | Wooden blocks falling 2.wav | sophiehall3535 | play |
| [253953](https://freesound.org/s/253953/) | Thunder 1 | Yoyodaman234 | crack |
| [257349](https://freesound.org/s/257349/) | small water drops | arseniiv | drop |
| [262635](https://freesound.org/s/262635/) | Ice Crack 1 | j_p_higgins | frost |
| [263595](https://freesound.org/s/263595/) | swoosh.wav | PorkMuncher | slash |
| [270588](https://freesound.org/s/270588/) | Anvil Hit 2 | michorvath | smith |
| [270589](https://freesound.org/s/270589/) | Anvil Hit 1 | michorvath | smith |
| [275679](https://freesound.org/s/275679/) | wooden rods single strike.ogg | adharca | tap |
| [276600](https://freesound.org/s/276600/) | body_hit.wav | insanity54 | hit |
| [319809](https://freesound.org/s/319809/) | Book slamming shut 1 | zmobie | save |
| [320144](https://freesound.org/s/320144/) | Blanket Movement 6 | OwlStorm | rest |
| [324760](https://freesound.org/s/324760/) | coin drop on concrete | PetervH | coin |
| [326460](https://freesound.org/s/326460/) | creaking floor OWI.wav | miekyj | creak |
| [329324](https://freesound.org/s/329324/) | funeral bell-cloche funèbre.wav | aoristos | bell |
| [334169](https://freesound.org/s/334169/) | Sword Clash | loudernoises | sword |
| [334219](https://freesound.org/s/334219/) | Clothes Rustling 1 | WasabiWielder | steal |
| [336023](https://freesound.org/s/336023/) | Rocks.wav | adamgryu | farfall |
| [347562](https://freesound.org/s/347562/) | Distant Thunder Clap_Gentle.wav | mikala_oidua | thunder |
| [349201](https://freesound.org/s/349201/) | Magic mallet.wav | Hotlavaman | magic |
| [350875](https://freesound.org/s/350875/) | Coin_C_07 | cabled_mess | coin |
| [351619](https://freesound.org/s/351619/) | Straw Broom.wav | ReiyaManor | home |
| [353125](https://freesound.org/s/353125/) | Paper Rustle | BenjaminNelan | choose |
| [354132](https://freesound.org/s/354132/) | Frog croaking sound effect | betterchinese | frog |
| [360646](https://freesound.org/s/360646/) | Paper drawn with rustle | Mafon2 | letter |
| [361427](https://freesound.org/s/361427/) | Wind_Chime_Monte_00.wav | monte32 | chime |
| [361470](https://freesound.org/s/361470/) | Crow Caw | Jofae | crow |
| [365132](https://freesound.org/s/365132/) | Crowd Cheering | SoundsExciting | cheer |
| [368094](https://freesound.org/s/368094/) | Door Open and Close With a Creak | ahubbar1 | door |
| [370877](https://freesound.org/s/370877/) | Chains.wav | cribbler | chain |
| [370938](https://freesound.org/s/370938/) | fire-crackling.wav | jmehlferber | pop |
| [375599](https://freesound.org/s/375599/) | Bell Tree (bell_tree_woodscrape1.wav) | sgossner | magic |
| [389625](https://freesound.org/s/389625/) | Footsteps_Grass_1.wav | SilentStrikeZ | wander |
| [389807](https://freesound.org/s/389807/) | Turning Book Page.wav | krnash | book |
| [392180](https://freesound.org/s/392180/) | Battle_horn_1.wav | kirmm | warhorn |
| [394179](https://freesound.org/s/394179/) | Longbow Release 2.wav | saturdaysoundguy | hunt |
| [395258](https://freesound.org/s/395258/) | Cave Water Droplet 1.WAV | Selulance | drip |
| [395259](https://freesound.org/s/395259/) | Cave Water Droplet 2.wav | Selulance | drip |
| [397551](https://freesound.org/s/397551/) | Page Turn 04 | LilMati | tab |
| [397607](https://freesound.org/s/397607/) | cicada | swordofkings128 | cicada |
| [398430](https://freesound.org/s/398430/) | Wolf howl | NaturesTemper | howl |
| [398496](https://freesound.org/s/398496/) | wind chimes - single 04.wav | Anthousai | chime |
| [398734](https://freesound.org/s/398734/) | owl.wav | Anthousai | owl |
| [402465](https://freesound.org/s/402465/) | Door Open Close Heavy Wooden Hard Loud Creak Seal Theatre | LampEight | door |
| [410751](https://freesound.org/s/410751/) | Arrow strike.mp3 | plantmonkey | hunt |
| [411742](https://freesound.org/s/411742/) | Knife Stab Pull.wav | neilsher | stab |
| [412558](https://freesound.org/s/412558/) | Combust.wav | GrimGrum | fire |
| [424871](https://freesound.org/s/424871/) | Sound of crickets at night | joanaseabra | cricket |
| [425488](https://freesound.org/s/425488/) | Geese Fly Overhead - Sweden | EpicWizard | geese |
| [428603](https://freesound.org/s/428603/) | Strong Rain on Roof from Inside of the Room | Erbsland-Music | 깔개 roof |
| [434144](https://freesound.org/s/434144/) | Drink pour.wav | mfearnley | drink |
| [434339](https://freesound.org/s/434339/) | Hammer hitting an anvil | draftcraft | hammer |
| [437356](https://freesound.org/s/437356/) | Rustling leaves | giddster | leaves |
| [443065](https://freesound.org/s/443065/) | Leaves_Rustling_Edited.wav | AmberdeMeillon | leaves |
| [444023](https://freesound.org/s/444023/) | knife-chop.mp3 | jstan904 | cook |
| [447931](https://freesound.org/s/447931/) | Unfold a map | Breviceps | letter |
| [448975](https://freesound.org/s/448975/) | flag.wav | GeorgeHopkins | flag |
| [452379](https://freesound.org/s/452379/) | Small Bell #2 | steffcaffrey | pray |
| [452554](https://freesound.org/s/452554/) | axe chop into wood little debris.wav | kyles | labor |
| [452705](https://freesound.org/s/452705/) | Sweeping the floor | parkersenk | home |
| [460459](https://freesound.org/s/460459/) | Ambient Rumble | Fission9 | moan |
| [465697](https://freesound.org/s/465697/) | Owl Hoot | Breviceps | owl |
| [466375](https://freesound.org/s/466375/) | Page flipping.wav | carlerichudon10 | tab |
| [466559](https://freesound.org/s/466559/) | Water Drip | spanrucker | drop |
| [468097](https://freesound.org/s/468097/) | Cricket Buzzing At Night | sarooptech | cricket |
| [470710](https://freesound.org/s/470710/) | traditional stamp.wav | I.fekry | stamp |
| [480656](https://freesound.org/s/480656/) | R16-15-Army Marching.wav | craigsmith | march |
| [480838](https://freesound.org/s/480838/) | R23-36-Water Against Wooden Boat.wav | craigsmith | ship |
| [497916](https://freesound.org/s/497916/) | 11.2) Punching bag.WAV | 16FPanskaLipovska_Katerina | body |
| [505833](https://freesound.org/s/505833/) | Footsteps grass.wav | jedg | wander |
| [507466](https://freesound.org/s/507466/) | Clean fast Swoosh.aiff | Danjocross | slash |
| [511094](https://freesound.org/s/511094/) | Happy Bird Singing | se2001 | bird |
| [517803](https://freesound.org/s/517803/) | BLACKBIRD - 1 | SamuelGremaud | bird2 |
| [523760](https://freesound.org/s/523760/) | Attack Blocked.wav | LilMati | guard |
| [528953](https://freesound.org/s/528953/) | Walking on sand and gravel 2 | fthgurdy | travel |
| [530061](https://freesound.org/s/530061/) | Gates of Hell 2 (Gate Slam 2) | magnuswaker | jail |
| [536903](https://freesound.org/s/536903/) | thunder dry crack rumble.wav | cognito perceptu | bolt |
| [537435](https://freesound.org/s/537435/) | Wood Chop 8.wav | wavecal22 | labor |
| [538438](https://freesound.org/s/538438/) | horse with old cart.wav | bruno.auzet | cart |
| [553214](https://freesound.org/s/553214/) | Small Bell | NachtmahrTV | pray |
| [553733](https://freesound.org/s/553733/) | wind open field | Globofonia | 깔개 wind |
| [566189](https://freesound.org/s/566189/) | Pickup_Note_01.wav | scholzi982 | choose |
| [569109](https://freesound.org/s/569109/) | Short Wind/Air Woosh \| A gust of wind | NIKOKnecht | gale |
| [573336](https://freesound.org/s/573336/) | Medium Rain Ambience_edlarez_vsnr.wav | visionear | 깔개 rain |
| [573584](https://freesound.org/s/573584/) | Croaking Frogs | Breviceps | frog |
| [575316](https://freesound.org/s/575316/) | run road.wav | taure | flee |
| [583754](https://freesound.org/s/583754/) | brook.mp3 | Bia12 | 깔개 brook |
| [593458](https://freesound.org/s/593458/) | Chain rattling | georgesavic | chain |
| [593472](https://freesound.org/s/593472/) | Rustling Plants | georgesavic | herb |
| [615337](https://freesound.org/s/615337/) | Paper_Flip_01 | Rookster | tab |
| [616615](https://freesound.org/s/616615/) | 120807 Footsteps up stone stairs, slow, boots, echo, Aarhus.wav | TRP | steps |
| [624163](https://freesound.org/s/624163/) | ice_cracking_01.flac | wwstudioswastaken | frost |
| [629987](https://freesound.org/s/629987/) | Knocking on Wood Door (1) | Flem0527 | visit |
| [636103](https://freesound.org/s/636103/) | SHIELDHIT1.wav | fonografico | shield |
| [637466](https://freesound.org/s/637466/) | crowd int show movement walla murmur active whispers no steps nice smooth detailed sweetener.flac | kyles | 깔개 crowd |
| [641896](https://freesound.org/s/641896/) | Block - [Rpg] 1 | colorsCrimsonTears | guard |
| [651292](https://freesound.org/s/651292/) | Digging in wet course sand (1) | f3bbbo | farm |
| [667280](https://freesound.org/s/667280/) | Knock on Wood | alegemaate | deny |
| [673315](https://freesound.org/s/673315/) | Glass Clink.wav | Dentrabert | drink |
| [676674](https://freesound.org/s/676674/) | Page flip.wav | cameronpride | book |
| [703590](https://freesound.org/s/703590/) | distant church wedding bells | mudflea2 | bells |
| [704935](https://freesound.org/s/704935/) | Wooden Tap | AidanSounds | tap |
| [759526](https://freesound.org/s/759526/) | Wax seal | Cerise_Virtuelle | stamp |
| [766864](https://freesound.org/s/766864/) | OBJPBag-Int_FourHitPunchingBag_Zus_OwSFX_Hard | ZusIsKing | body |
| [824588](https://freesound.org/s/824588/) | St Peters Church, Kinver - Distant Tolling Bell | TicAshfield | bell |
| [829282](https://freesound.org/s/829282/) | Beginner chopping vegetables on a cutting board | megahope | cook |
| [846523](https://freesound.org/s/846523/) | Another blackbird | sgo.75 | bird2 |

## 음악 (29단계)

곡은 모두 이 게임을 위해 새로 썼습니다(`src/audio/tracks.js`, 38곡). 악기 소리만 아래 녹음을 빌려 씁니다.
녹음 파일은 `assets/audio/music/`에 있고(167개, 약 4MB), 목록은 `src/audio/samples.js`입니다.

| 악기 (파일 앞머리) | 출처 | 라이선스 |
|---|---|---|
| harp, strings, spic, pizz, trem, flute, oboe, clarinet, bassoon, trumpet, trombone, timp, bell, glock, organ | [VSCO 2: Community Edition](https://github.com/sgossner/VSCO-2-CE) (Versilian Studios, Sam Gossner 외) | CC0 1.0 (퍼블릭 도메인) |
| lute, choir, recorder, cello, horn, bass, taiko, tom, wood | FluidR3_GM 사운드폰트(Frank Wen)를 음마다 뽑아 둔 [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (Benjamin Gleitzman) | Creative Commons Attribution 3.0 |

### 어떻게 다듬었나

1. 악기마다 서너 음에 하나씩 녹음을 골라 받았습니다(그 사이 음은 가까운 녹음의 빠르기를 바꿔 냅니다).
2. 44.1kHz 모노로 바꾸고, 소리가 시작되는 자리에 맞춰 앞을 자르고, 길이를 악기에 맞게(짧은 것 0.3초, 긴 것 6초) 줄여 끝을 부드럽게 닫았습니다.
3. 크기를 맞췄습니다(긴 소리는 RMS, 뜯거나 치는 소리는 꼭지 기준). 음높이를 재서 어긋난 만큼(센트)을 목록에 적어 두고, 낼 때 바로잡습니다.
4. mp3(모노 48~56kbps)로 압축했습니다.
5. 게임 안에서는 브라우저(Chromium)로 곡을 처음부터 끝까지 실제로 그려 곡마다 RMS·꼭지·찢어짐·1초 창 크기 변화를 재고, 악기별 음높이도 다시 재서(몇 센트 안) 맞췄습니다.
