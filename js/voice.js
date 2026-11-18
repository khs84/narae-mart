/* 나래 마트 — 음성 엔진
 *
 * 1순위: assets/audio 에 녹음된 고품질 음성 파일(tools/generate_audio.py 로 생성)
 * 2순위: 브라우저 내장 음성 중 가장 자연스러운 한국어 음성을 자동 선택
 *        (Edge의 "Natural" 음성 > Google 한국어 > 기타 순)
 */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem('narae-mart:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('narae-mart:' + k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 무시 */ } }
  };

  const CLIPS = (window.AUDIO_CLIPS && window.AUDIO_CLIPS.files) || {};
  const synth = window.speechSynthesis || null;

  let voices = [];
  let chosen = null;
  let token = 0;          // 재생 취소용
  let audioEl = null;
  let last = [];          // 다시 듣기용

  function scoreVoice(v) {
    if (!/^ko/i.test(v.lang || '')) return -1;
    const n = v.name || '';
    let s = 1;
    if (/natural|neural/i.test(n)) s += 100;
    if (/online/i.test(n)) s += 40;
    if (/google/i.test(n)) s += 60;
    if (/sunhi|선희|yuna|유나|heami/i.test(n)) s += 5;
    if (!v.localService) s += 3;
    return s;
  }

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter(v => scoreVoice(v) > 0).sort((a, b) => scoreVoice(b) - scoreVoice(a));
    const saved = store.get('voice', '');
    chosen = voices.find(v => v.name === saved) || voices[0] || null;
    Voice.onVoicesChanged && Voice.onVoicesChanged();
  }

  function lineText(id) {
    const d = window.GAME_DATA;
    if (d.lines[id]) return d.lines[id];
    const p = d.level1.concat(d.level2).find(x => x.id === id);
    return p ? p.say : id;
  }

  function playFile(src, myToken) {
    return new Promise(resolve => {
      audioEl = new Audio(src);
      audioEl.playbackRate = Voice.rate / 0.95; // 녹음 기본 속도(0.95)를 기준으로 조절
      const done = () => resolve();
      audioEl.onended = done;
      audioEl.onerror = done;
      audioEl.play().catch(done);
      if (myToken !== token) done();
    });
  }

  function speakText(text, myToken) {
    return new Promise(resolve => {
      if (!synth || myToken !== token) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      if (chosen) u.voice = chosen;
      u.rate = Voice.rate;
      u.pitch = 1.05;
      let finished = false;
      const done = () => { if (!finished) { finished = true; clearTimeout(guard); resolve(); } };
      // 일부 기기에서 onend 가 오지 않는 문제 대비
      const guard = setTimeout(done, 2500 + text.length * 260 / Voice.rate);
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    });
  }

  const Voice = {
    rate: store.get('rate', 0.95),
    onVoicesChanged: null,

    /** 녹음 파일을 쓰는지 여부 */
    usesClips() { return Object.keys(CLIPS).length > 0; },

    list() { return voices; },
    current() { return chosen; },
    setVoice(name) { chosen = voices.find(v => v.name === name) || chosen; store.set('voice', name); },
    setRate(r) { this.rate = r; store.set('rate', r); },

    stop() {
      token++;
      if (synth) synth.cancel();
      if (audioEl) { audioEl.pause(); audioEl = null; }
    },

    /** 문장 id 들을 차례로 읽습니다. (data/game-data.js 의 lines 키 또는 물건 id) */
    async play(ids, remember = true) {
      ids = [].concat(ids);
      if (remember) last = ids;
      this.stop();
      const my = token;
      await new Promise(r => setTimeout(r, 60)); // cancel 직후 speak 누락 방지
      for (const id of ids) {
        if (my !== token) return;
        if (CLIPS[id]) await playFile('assets/audio/' + CLIPS[id], my);
        else await speakText(lineText(id), my);
      }
    },

    /** 녹음 파일이 있으면 재생, 없으면 text 를 내장 음성으로 읽기 (다시 듣기 기록 안 함) */
    async playOr(id, text) {
      if (CLIPS[id]) return this.play(id, false);
      return this.sayText(text);
    },

    /** 미리 녹음할 수 없는 즉석 문장(함께 세기 등). 녹음 모드에서도 내장 음성으로 읽습니다. */
    async sayText(text) {
      this.stop();
      const my = token;
      await new Promise(r => setTimeout(r, 60));
      await speakText(text, my);
    },

    repeat() { if (last.length) this.play(last, false); },

    describe() {
      if (this.usesClips()) return '녹음된 고품질 음성 파일을 사용하고 있어요.';
      if (!synth) return '이 브라우저는 음성을 지원하지 않아요. Edge 또는 Chrome을 사용해 주세요.';
      if (!chosen) return '한국어 음성을 찾지 못했어요. Edge 브라우저를 쓰면 자연스러운 음성이 나와요.';
      if (/natural|neural|google/i.test(chosen.name)) return '자연스러운 음성(' + chosen.name + ')을 쓰고 있어요.';
      return '기본 음성을 쓰고 있어요. Edge 브라우저에서 열면 더 자연스러운 "Natural" 음성을 고를 수 있어요.';
    },

    store
  };

  window.Voice = Voice;

  if (synth) {
    loadVoices();
    if ('onvoiceschanged' in synth) synth.addEventListener('voiceschanged', loadVoices);
    setTimeout(loadVoices, 600);
  }
})();
