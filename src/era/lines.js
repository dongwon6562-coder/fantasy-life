// 바뀐 생활이 행동 글에 묻어나게: 발명이 나온 뒤에만 고를 수 있는 글을 기존 글 묶음에 덧붙인다.
import * as T from '../narrative/actions-text.js';
import { invented, owns } from './state.js';

const inv = (id) => (c, g) => invented(g, id);
const has = (id) => (c, g) => owns(g, id);
const and = (...fs) => (c, g) => fs.every((f) => f(c, g));

T.REST.push(
  { soft: true, when: has('lantern'), t: '등석 등잔 아래서 늦도록 깨어 있었다. 푸른 빛이 벽에 그림자를 길게 늘였다.' },
  { soft: true, season: '겨울', when: has('warmstone'), t: '온석 화로에 발을 대고 졸았다. 장작 타는 소리가 없는 겨울밤은 조금 낯설었다.' },
  { soft: true, when: inv('signal'), t: '창밖 언덕 위 전신탑의 빛이 깜빡이는 걸 세다가 잠들었다.' },
  { soft: true, when: inv('ironcart'), bands: ['young', 'adult', 'old'], t: '멀리서 쇠수레가 지나가는 소리가 들렸다. 말발굽 소리가 아닌 낮은 웅웅거림이 잦아질 때까지 누워 있었다.' },
);
T.WANDER_NOBODY.push(
  { when: inv('streetlamp'), t: '해가 졌는데도 광장이 환했다. 등석 가로등 아래 밤 장사꾼들이 좌판을 펴고 있었다.' },
  { when: inv('manamill'), t: '방앗간 앞이 조용했다. 물레바퀴는 멈춰 있고, 성문 밖 마석 방아만 웅웅 울었다.' },
  { when: inv('press'), t: '벽마다 찍어 낸 방이 붙어 있었다. 글을 읽을 줄 아는 사람들이 그 앞에 모여 소리 내어 읽었다.' },
  { when: inv('plow'), t: '밭마다 마석 쟁기가 지나간 자리가 곧았다. 일손이 남은 젊은이들이 광장에서 서성였다.' },
  { when: inv('ironcart'), t: '길가에서 일거리를 잃은 마부 하나가 말에게 여물을 주고 있었다. 말은 늙었고, 마부도 늙었다.' },
  { when: inv('healstone'), t: '예전 같으면 상처가 곪아 죽었을 이웃이 지팡이를 짚고 걸어 다녔다. 정화석 붕대 덕이라고 했다.' },
);
T.HELP_HOME.push(
  { fam: 'farmer', when: has('plow'), t: '마석 쟁기를 소에 매었다. 반나절 만에 밭 하나를 다 갈았다. 아버지는 좋아하면서도 어딘가 서운한 얼굴이었다.' },
  { fam: 'farmer', when: and(inv('erngrind'), (c) => c.season === '가을'), t: '밀 자루를 마석 방아에 맡겼다. 맷돌을 돌리던 어머니의 팔이 처음으로 쉬었다.' },
  { when: has('firestone'), t: '아침 불을 화석으로 붙였다. 부싯돌로 씨름하던 시간이 통째로 남았다.' },
  { fam: 'merchant', when: inv('signal'), t: '전신탑으로 온 왕도 시세를 아버지가 받아 적었다. 이제 장사는 누가 먼저 아느냐의 싸움이다.' },
  { fam: 'merchant', when: inv('press'), t: '가게 물건 값을 찍어 낸 종이를 붙였다. 흥정할 틈이 줄었다고 아버지가 투덜댔다.' },
);
T.STUDY.push(
  { when: inv('press'), t: '사제가 손으로 베낀 책 대신 찍어 낸 책을 나눠 주었다. 글씨가 너무 고르게 생겨서 오히려 낯설었다.' },
  { when: has('lantern'), t: '해가 진 뒤에도 등석 등잔 아래서 읽었다. 촛농 없는 밤공부는 생각보다 오래 이어졌다.' },
);
T.HERBS.push(
  { when: inv('healstone'), t: '정화석 붕대가 퍼진 뒤로 상처약 값이 떨어졌다. 그래도 열병에는 아직 풀뿌리만 한 게 없다.' },
);
T.TRAIN_BODY.push(
  { when: inv('ironcart'), bands: ['teen', 'young'], t: '쇠수레 길을 따라 달렸다. 쇠수레가 옆으로 지나가며 흙먼지를 뿌렸다. 이겨 보려다 숨이 넘어갈 뻔했다.' },
);
