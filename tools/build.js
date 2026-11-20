// 브라우저에서 바로 열 수 있는 한 파일짜리 게임(dist/play.html)을 만든다.
// esbuild로 src를 묶고, style.css를 안에 넣는다.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
// --charset=utf8: 한글을 \uXXXX로 풀지 않는다. 파일이 3.4MB에서 2.6MB로 줄고, 글자 수로는 훨씬 줄어 켜질 때 읽는 시간이 준다 (헤드 16단계)
execSync('npx --yes esbuild@0.24.0 src/main.js --bundle --format=iife --minify --charset=utf8 --outfile=dist/game.js', { stdio: 'inherit' });
const js = readFileSync('dist/game.js', 'utf8');
const css = readFileSync('style.css', 'utf8');
// 글꼴은 화면을 막지 않게 늦게 붙인다 (인터넷이 없거나 느려도 바로 켜지게, 헤드 16단계)
const html = `<meta charset="utf-8">
<title>에른 마을 시험판</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap" media="print" onload="this.media='all'">
<style>
${css}
</style>
<main id="app"></main>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
writeFileSync('dist/play.html', html);
// 아이폰 앱(Capacitor)용: 완전한 HTML 문서. 게임 코드는 game.js로 따로 둔다.
// HTML 안에 3MB짜리 글을 통째로 넣으면 HTML을 읽는 데만 한참 걸려, 첫 화면이 폰 흉내로 2.4초에서 1.4초로 준다 (헤드 21단계)
// 게임 코드가 3.6MB로 커져 읽는 데만 폰에서 1초 넘게 걸린다. 가벼운 첫 장(제목)을 먼저 그린 뒤 game.js를 붙인다 (헤드 24단계)
mkdirSync('dist/www', { recursive: true });
writeFileSync('dist/www/game.js', js);
writeFileSync('dist/www/index.html', `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${html.split('<main id="app"></main>')[0].replace('<meta charset="utf-8">\n', '')}</head>
<body>
<main id="app"><div style="min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:var(--brass);font-family:'Gowun Batang',serif"><div style="font-size:28px;letter-spacing:.2em">에른 마을</div><div style="font-size:13px;color:var(--brass-dim)">세상을 펼치는 중</div></div></main>
<script>requestAnimationFrame(function(){setTimeout(function(){var s=document.createElement('script');s.src='game.js';document.body.appendChild(s);},0);});</script>
</body>
</html>
`);
console.log('dist/play.html', (html.length / 1024).toFixed(0) + 'KB');
