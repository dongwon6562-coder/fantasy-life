# 음악 악기 샘플을 다시 만드는 법

`assets/audio/music/`의 mp3는 아래 순서로 만들었다. 악기나 음을 더하거나 바꿀 때 쓴다 (ffmpeg, python3 + numpy 필요).

1. `plan.json`: 받을 원본 목록(악기, 음, 주소 `url`, 저장할 이름 `raw`). 하나씩 `raw/` 폴더에 받는다.
   VSCO 2 CE(CC0)와 FluidR3_GM(midi-js-soundfonts, CC BY 3.0). 출처와 라이선스는 `docs/CREDITS.md`.
   (`plan.py`는 VSCO 저장소 SFZ 가지의 악기 정의(`sfz/*.sfz`)에서 이 목록을 뽑던 스크립트다. 악기를 더할 때만 쓴다.)
2. `python3 process.py`: `plan.json`대로 `raw/`를 읽어 `out/*.mp3`와 `manifest_raw.json`을 만든다.
   - 앞 침묵을 자르고, 유지음은 놓는 소리 전까지만 남긴 뒤 크기를 고르게 편다.
   - 6~7초보다 짧은 유지음은 끝 토막과 가장 닮은 앞자리를 교차상관으로 찾아 겹쳐 이어 길게 만든다.
   - 음높이를 재서 어긋난 센트를 적는다. mp3 모노 48~56kbps.
3. `out/*.mp3`를 `assets/audio/music/`에 넣고, `manifest_raw.json`의 값을 `src/audio/samples.js`에 옮긴다
   (glock은 적힌 음보다 한 옥타브 높게 울려서 손으로 고쳐 두었다. bell도 손으로 맞춘 값이다).
4. 확인: `node tools/musiccheck.js`(화음·음역), `node tools/musicmix.js`(악기 균형 어림), `node tools/audiotest.js`.
   곡 크기는 브라우저 OfflineAudioContext로 곡을 끝까지 그려 RMS를 재서 `tracks.js`의 `gain`으로 맞췄다.
