// 브라우저에서 바로 열 수 있는 한 파일짜리 게임(dist/play.html)을 만든다.
// esbuild로 src를 묶고, style.css를 안에 넣는다.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
execSync('npx --yes esbuild@0.24.0 src/main.js --bundle --format=iife --minify --outfile=dist/game.js', { stdio: 'inherit' });
const js = readFileSync('dist/game.js', 'utf8');
const css = readFileSync('style.css', 'utf8');
const html = `<title>에른 마을 시험판</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
${css}
</style>
<main id="app"></main>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
writeFileSync('dist/play.html', html);
console.log('dist/play.html', (html.length / 1024).toFixed(0) + 'KB');
