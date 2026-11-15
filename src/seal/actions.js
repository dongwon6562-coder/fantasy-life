// 봉인 조사하기: 서고·마탑·북쪽 성채에서 봉인의 일을 캔다. 아는 것이 늘고, 마탑의 보강 술식에 힘이 보태진다.
import { ACTIONS } from '../actions.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { L, isAdult, tired, check } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { SS, mi, STAGES, sealPower, learn } from './state.js';

const PLACES_OK = { serenia: '마탑 서고', leocast: '왕립 서고', verden: '성당 필사실', graubel: '북쪽 성벽 망루' };
const able = (g) => g.player.stats.int >= 35 || (g.player.skills.magic ?? 0) >= 20 || (g.player.skills.letters ?? 0) >= 30;

ACTIONS.push({
  id: 'seal_study', name: '봉인 조사하기', icon: 'scroll',
  desc: '서고와 마탑, 북쪽 망루에서 마신의 봉인에 얽힌 기록과 조짐을 캔다. 아는 것이 늘고 마탑의 보강 술식에 힘을 보탠다.',
  available: (g) => playerAge(g) >= 15 && isAdult(g) && !L(g).travel && !isJailed(g) && !!PLACES_OK[L(g).place] && able(g) && (SS(g).stage >= 1 || SS(g).known >= 1),
  run(g, rng) {
    const S = SS(g);
    const where = PLACES_OK[L(g).place];
    if (!where || L(g).travel) return '서고를 떠나 있어 베껴 둔 기록만 다시 읽었다.';
    if (S.studyAt === mi(g)) { tired(g, 4); return `${where}에서 어제 베낀 기록을 다시 읽었다. 같은 문장이 다르게 읽혔다.`; }
    S.studyAt = mi(g);
    tired(g, 10);
    gainSkill(g, (g.player.skills.magic ?? 0) >= 20 ? 'magic' : 'letters', 0.5, 'int');
    gainStat(g, 'int', 0.15);
    const v = g.player.stats.int * 0.6 + Math.max(g.player.skills.magic ?? 0, g.player.skills.letters ?? 0) * 0.5;
    if (!check(rng, v, 38)) return `${where}에서 하루를 보냈지만 오래된 글자는 입을 열지 않았다. 같은 쪽을 몇 번이고 넘겼다.`;
    S.me.studied += 1; S.me.guard += 0.5;
    S.study = Math.min(100, S.study + (L(g).place === 'serenia' ? 2.5 : 1.5));
    learn(g, S.me.studied >= 3 ? 2 : 1);
    if (S.me.studied >= 6 && S.stage >= 2) learn(g, 3);
    if (L(g).place === 'graubel') {
      if (S.stage >= 3 && rng.chance(0.25)) { S.me.fragments += 1; return '망루에서 북쪽 하늘을 밤새 지켜보았다. 새벽에 성벽 아래로 검은 돌비가 내렸다. 하나를 주워 왔다. 봉인석에서 떨어져 나온 조각이라고 병사들이 수군거렸다.'; }
      return `망루에서 북쪽 하늘을 지켜보았다. ${S.stage >= 3 ? '지평선 너머가 가끔 검붉게 맥박쳤다. 병사들은 그쪽을 보지 않으려 했다.' : '별빛이 아주 가끔 물결치듯 흔들렸다. 늙은 병사는 그게 오백 년 전부터 그랬다고 했다.'}`;
    }
    const facts = [
      '용사력 원년의 기록을 찾았다. 봉인은 쇠사슬 하나가 아니라 여러 쐐기가 함께 떠받치는 그물이었다.',
      '쐐기 가운데 하나가 왕도 대성당 지하에 있다는 대목을 찾았다. 성녀의 유골함이라 불리는 것이다.',
      '노아의 감시탑 불이 꺼질 때마다 봉인의 울림이 커졌다는 옛 관측 일지를 찾았다.',
      `마탑의 최근 측정치를 베꼈다. 봉인은 지금 '${STAGES[S.stage].name}'의 때에 있다. ${sealPower(g) < 60 ? '숫자를 옮겨 적는 손이 떨렸다.' : '아직은 숫자가 차분하다.'}`,
      '오백 년 전 봉인을 그은 마법사들의 명단을 보았다. 그 가운데 돌아온 이는 셋뿐이었다.',
    ];
    return facts[Math.min(facts.length - 1, S.me.studied - 1)] ?? facts[facts.length - 1];
  },
});
