# 🏪 나래 마트 — 화폐 가게놀이 게임

5학년 수학 **Lesson 13 화폐** 학습지(11~15차시)를 바탕으로 만든 가게놀이 게임입니다.
천 원·오천 원 지폐와 백 원 동전으로 물건값을 정확하게 내는 연습을 합니다.
전자칠판 터치에 맞춰 만들었고, 모든 안내는 음성으로 들려줍니다.

## 단계

| 단계 | 활동 | 연결 차시 | 쓰는 돈 |
|---|---|---|---|
| 1단계 | 몇천 원 물건 사기 | 11~12차시 | 천 원, 오천 원 |
| 2단계 | 몇천 몇백 원 물건 사기 | 13~14차시 | 천 원, 오천 원, 백 원 (설정에서 오백 원 추가) |
| 3단계 | 지갑 속 돈과 같은 값 물건 찾기 | 15차시 | — |

목표 개수(3·5·8개)만큼 사면 **영수증**이 나오며 마무리됩니다.

## 놀이 방법
1. 단계를 고르면 진열대가 나옵니다. 사고 싶은 물건을 누릅니다.
2. 아래쪽 **지갑**의 지폐·동전을 누르면 **계산대**에 올라갑니다. 계산대의 돈을 누르면 지갑으로 돌아갑니다.
3. **계산하기**를 누릅니다. 맞으면 도장 ⭐을 받고, 틀리면 "모자라요 / 더 많아요"를 음성으로 알려 줍니다.
4. 두 번 틀리면 **함께 세어 보기**를 권합니다. 이 버튼은 돈을 하나씩 짚으며 "천, 이천, 이천 백…" 하고 함께 셉니다.

## 전자칠판에서 쓰기
- **인터넷 없이 실행**: 폴더를 USB로 옮긴 뒤 `index.html`을 더블클릭합니다. 설치할 것은 없습니다.
- **전체 화면**: 오른쪽 위 ⛶ 버튼을 누르거나 `F11` 키를 누릅니다.
- 모든 버튼은 손가락 터치 크기로 만들었고, 끌기 없이 **누르기만** 하면 됩니다.
- 화면 크기에 맞춰 글자와 그림 크기가 자동으로 바뀝니다 (FHD·4K, 가로·세로 모두 지원).

## 음성
- **모든 문장을 자연스러운 AI 음성(Microsoft SunHi Natural)으로 미리 녹음해 두었습니다** (`assets/audio/`, 242개).
  Chrome, Edge, 전자칠판 내장 브라우저 어디서나 같은 목소리로 나오고, 인터넷이 없어도 재생됩니다.
- '함께 세어 보기'의 "천, 이천, 이천 백…"과 "모두 ○○ 원이에요"도 100원부터 9,900원까지 모두 녹음되어 있습니다.
- ⚙️ 설정에서 말하기 속도를 바꿀 수 있습니다.
- 녹음 파일이 없는 문장은 브라우저 내장 음성 가운데 가장 자연스러운 음성으로 읽습니다.

### 음성 다시 만들기 / 바꾸기
```powershell
pip install edge-tts
python tools/generate_audio.py --reset                       # 기존 녹음 지우기
python tools/generate_audio.py                               # SunHi(여성, 기본)
python tools/generate_audio.py --voice ko-KR-InJoonNeural    # 남성 목소리
# API 키가 있으면: --provider elevenlabs (ELEVENLABS_API_KEY) / --provider gemini (GEMINI_API_KEY)
```

## 물건·가격·문장 바꾸기
`data/game-data.js`에서 물건 이름, 이모지, 가격, 읽어 줄 문장(`say`)과 안내 문장(`lines`)을 고칠 수 있습니다.
문장을 고친 뒤에는 `python tools/generate_audio.py --only <id>`로 그 문장만 다시 녹음합니다. 새 물건을 추가했다면 `python tools/generate_audio.py`를 실행하면 없는 것만 녹음합니다.

## GitHub Pages로 공개하기
```bash
gh repo create narae-mart --public --source . --push
gh api -X POST repos/{owner}/narae-mart/pages -f "source[branch]=main" -f "source[path]=/"
```
몇 분 뒤 `https://<아이디>.github.io/narae-mart/` 주소로 어느 전자칠판에서나 열 수 있습니다.

## 폴더 구조
```
index.html              화면 구성
css/style.css           디자인 (터치·화면 크기 대응)
js/voice.js             음성 엔진 (녹음 파일 → 브라우저 자연 음성 순)
js/money.js             지폐·동전 그림, 금액 읽기(3200 → 삼천 이백 원)
js/game.js              게임 진행
data/game-data.js       물건·가격·음성 문장
assets/audio/           (선택) 녹음된 음성 파일
tools/generate_audio.py 녹음 음성 만들기 (파이썬 표준 라이브러리만 사용)
```

> 지폐·동전은 실제 화폐를 본뜨지 않은 학습용 그림입니다.
