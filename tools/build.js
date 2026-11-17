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
// 아이폰 앱(Capacitor)용: 완전한 HTML 문서
mkdirSync('dist/www', { recursive: true });
writeFileSync('dist/www/index.html', `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${html.split('<main id="app"></main>')[0].replace('<meta charset="utf-8">\n', '')}</head>
<body>
<main id="app"></main>${html.split('<main id="app"></main>')[1]}</body>
</html>
`);
console.log('dist/play.html', (html.length / 1024).toFixed(0) + 'KB');
