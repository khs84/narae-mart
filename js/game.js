/* 나래 마트 — 게임 진행 */
(function () {
  const DATA = window.GAME_DATA;
  const $ = s => document.querySelector(s);
  const { won, num, makeMoney, compose } = window.Money;
  const store = Voice.store;

  const settings = {
    use500: store.get('use500', false),
    showTotal: store.get('showTotal', false),
    sfx: store.get('sfx', true)
  };

  const state = {
    mode: 1, goal: store.get('goal', 5),
    bought: [], counter: [], item: null, wrong: 0, busy: false
  };

  /* ---------- 효과음 (파일 없이 즉석 합성) ---------- */
  let actx = null;
  function tone(freq, dur, when = 0, type = 'sine', vol = .18) {
    if (!settings.sfx) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + when;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + .015);
      g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + dur + .05);
    } catch (e) { /* 효과음 없이 진행 */ }
  }
  const sfx = {
    tap() { tone(880, .09, 0, 'triangle', .12); },
    back() { tone(520, .09, 0, 'triangle', .1); },
    good() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, i * .1, 'triangle')); },
    bad() { tone(260, .18, 0, 'square', .06); tone(200, .25, .16, 'square', .06); }
  };

  /* ---------- 화면 전환 ---------- */
  const screens = ['Start', 'Shelf', 'Pay', 'Match', 'Finish'];
  function show(name) {
    screens.forEach(s => { $('#screen' + s).hidden = s !== name; });
    $('#stamps').style.visibility = name === 'Start' ? 'hidden' : 'visible';
  }

  function renderStamps() {
    const box = $('#stamps');
    box.innerHTML = '';
    for (let i = 0; i < state.goal; i++) {
      const s = document.createElement('div');
      s.className = 'stamp' + (i < state.bought.length ? ' on' : '');
      s.textContent = i < state.bought.length ? '⭐' : '';
      box.appendChild(s);
    }
  }

  function toast(text, kind) {
    const t = $('#toast');
    t.textContent = text;
    t.className = 'toast show ' + (kind || '');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.className = 'toast'; }, 2200);
  }

  function confetti() {
    const fx = $('#fx');
    const pieces = ['⭐', '🎉', '💰', '💛', '✨', '🎊'];
    for (let i = 0; i < 28; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.textContent = pieces[i % pieces.length];
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
      c.style.animationDelay = Math.random() * .4 + 's';
      fx.appendChild(c);
      setTimeout(() => c.remove(), 3600);
    }
  }

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pool = () => state.mode === 1 ? DATA.level1 : state.mode === 2 ? DATA.level2 : DATA.level1.concat(DATA.level2);

  function productTag(p) {
    return `<span class="tag"><b>${num(p.price)}</b><small>${p.priceText}</small></span>`;
  }

  /* ---------- 시작 ---------- */
  function startGame(mode) {
    state.mode = mode;
    state.bought = [];
    renderStamps();
    if (mode === 3) { nextMatch(true); }
    else { showShelf(true); }
  }

  /* ---------- 진열대 ---------- */
  function showShelf(first) {
    state.item = null;
    const left = pool().filter(p => !state.bought.some(b => b.id === p.id));
    const items = shuffle(left).slice(0, 6);
    const shelf = $('#shelf');
    shelf.innerHTML = '';
    items.forEach(p => {
      const b = document.createElement('button');
      b.className = 'product';
      b.setAttribute('aria-label', p.say);
      b.innerHTML = `<span class="emoji">${p.emoji}</span><span class="name">${p.name}</span>${productTag(p)}`;
      b.addEventListener('click', () => { sfx.tap(); openPay(p); });
      shelf.appendChild(b);
    });
    show('Shelf');
    Voice.play(first ? ['welcome', 'pick'] : ['pick']);
  }

  /* ---------- 계산 ---------- */
  function walletValues() {
    if (state.mode === 1) return [5000, 1000];
    return settings.use500 ? [5000, 1000, 500, 100] : [5000, 1000, 100];
  }

  function openPay(p) {
    state.item = p;
    state.counter = [];
    state.wrong = 0;
    $('#payItem').innerHTML = `<div class="emoji">${p.emoji}</div><div class="name">${p.name}</div>${productTag(p)}`;
    const wallet = $('#wallet');
    wallet.innerHTML = '';
    walletValues().forEach(v => {
      const m = makeMoney(v);
      m.addEventListener('click', () => addMoney(v));
      wallet.appendChild(m);
    });
    renderCounter();
    show('Pay');
    Voice.play([p.id, state.mode === 1 ? 'pay_guide_1' : 'pay_guide_2']);
  }

  function addMoney(v) {
    if (state.busy) return;
    if (state.counter.length >= 30) return;
    sfx.tap();
    state.counter.push(v);
    renderCounter();
  }

  function removeMoney(idx) {
    if (state.busy) return;
    sfx.back();
    state.counter.splice(idx, 1);
    renderCounter();
  }

  function counterSum() { return state.counter.reduce((a, b) => a + b, 0); }

  function renderCounter() {
    // 세기 쉽도록 큰 돈부터 정렬
    state.counter.sort((a, b) => b - a);
    const box = $('#counter');
    box.innerHTML = '';
    state.counter.forEach((v, i) => {
      const m = makeMoney(v);
      m.setAttribute('aria-label', Money.KINDS[v].label + ' (누르면 지갑으로)');
      m.addEventListener('click', () => removeMoney(i));
      box.appendChild(m);
    });
    $('#counterTotal').textContent = settings.showTotal && state.counter.length ? '지금 ' + num(counterSum()) : '';
  }

  async function countTogether() {
    if (state.busy || !state.counter.length) {
      if (!state.counter.length) Voice.play('empty');
      return;
    }
    state.busy = true;
    const els = [...document.querySelectorAll('#counter .money')];
    await Voice.play('count_together');
    let run = 0;
    for (let i = 0; i < els.length; i++) {
      run += state.counter[i];
      const el = els[i];
      el.classList.add('counting');
      const lab = document.createElement('span');
      lab.className = 'cnt';
      lab.textContent = num(run);
      el.appendChild(lab);
      $('#counterTotal').textContent = num(run);
      tone(600 + i * 40, .12, 0, 'triangle', .1);
      await Promise.all([Voice.sayText(won(run).replace(' 원', i === els.length - 1 ? ' 원' : '')), wait(700)]);
      el.classList.remove('counting');
    }
    await Voice.sayText('모두 ' + won(run) + '이에요.');
    state.busy = false;
    setTimeout(() => { if (!state.busy && !settings.showTotal) renderCounter(); }, 2500);
  }

  async function pay() {
    if (state.busy) return;
    const sum = counterSum();
    const price = state.item.price;
    if (!sum) { sfx.bad(); Voice.play('empty'); return; }
    if (sum === price) {
      state.busy = true;
      sfx.good(); confetti();
      toast('딩동댕! ' + num(price) + ' 정확해요 ⭐', 'good');
      state.bought.push(state.item);
      renderStamps();
      await Voice.play(pick(['correct_1', 'correct_2', 'correct_3']));
      await wait(500);
      state.busy = false;
      if (state.bought.length >= state.goal) finish();
      else showShelf(false);
      return;
    }
    state.wrong++;
    sfx.bad();
    $('#counter').classList.remove('shake'); void $('#counter').offsetWidth; $('#counter').classList.add('shake');
    toast(sum < price ? '돈이 조금 모자라요' : '돈이 더 많아요', 'bad');
    const ids = [sum < price ? 'less' : 'more'];
    if (state.wrong >= 2) ids.push('hint_offer');
    Voice.play(ids);
    if (state.wrong >= 2) { const b = $('#btnCount'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  }

  /* ---------- 같은 값 찾기 ---------- */
  function nextMatch(first) {
    const all = pool();
    const left = all.filter(p => !state.bought.some(b => b.id === p.id));
    const target = pick(left);
    // 값이 비슷한(헷갈리기 쉬운) 물건 2개를 함께 보여 줍니다
    const near = all
      .filter(p => p.price !== target.price)
      .sort((a, b) => Math.abs(a.price - target.price) - Math.abs(b.price - target.price))
      .slice(0, 6);
    const opts = [target];
    for (const p of shuffle(near)) {
      if (opts.length >= 3) break;
      if (!opts.some(o => o.price === p.price)) opts.push(p);
    }

    const wal = $('#matchWallet');
    wal.innerHTML = '';
    compose(target.price, { use500: settings.use500 }).forEach(v => wal.appendChild(makeMoney(v, false)));

    const box = $('#matchOptions');
    box.innerHTML = '';
    let done = false;
    shuffle(opts).forEach(p => {
      const b = document.createElement('button');
      b.className = 'option';
      b.setAttribute('aria-label', p.say);
      b.innerHTML = `<span class="emoji">${p.emoji}</span><span class="name">${p.name}</span>${productTag(p)}`;
      b.addEventListener('click', async () => {
        if (done) return;
        if (p.id === target.id) {
          done = true;
          b.classList.add('right');
          sfx.good(); confetti();
          toast('딩동댕! 같은 값이에요 ⭐', 'good');
          state.bought.push(p);
          renderStamps();
          await Voice.play('match_correct');
          await wait(600);
          if (state.bought.length >= state.goal) finish(); else nextMatch(false);
        } else {
          sfx.bad();
          b.classList.add('wrong');
          b.disabled = true;
          Voice.play('match_wrong');
        }
      });
      box.appendChild(b);
    });
    show('Match');
    Voice.play(first ? ['welcome', 'match_guide'] : ['match_guide']);
  }

  /* ---------- 끝: 영수증 ---------- */
  function finish() {
    const d = new Date();
    const total = state.bought.reduce((a, p) => a + p.price, 0);
    const rows = state.bought.map(p => `<tr><td>${p.emoji} ${p.name}</td><td>${num(p.price)}</td></tr>`).join('');
    $('#receipt').innerHTML = `
      <h3>🏪 나래 마트</h3>
      <div class="sub">${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} · 영수증</div>
      <table>${rows}<tr class="sum"><td>합계</td><td>${num(total)}</td></tr></table>`;
    show('Finish');
    confetti(); sfx.good();
    Voice.play('finish');
  }

  /* ---------- 설정 ---------- */
  function fillVoices() {
    const sel = $('#setVoice');
    const list = Voice.list();
    sel.innerHTML = '';
    if (Voice.usesClips()) {
      sel.innerHTML = '<option>녹음된 음성 파일 사용 중</option>';
      sel.disabled = true;
    } else if (!list.length) {
      sel.innerHTML = '<option>한국어 음성 없음</option>';
      sel.disabled = true;
    } else {
      sel.disabled = false;
      list.forEach(v => {
        const o = document.createElement('option');
        o.value = v.name;
        o.textContent = v.name + (/natural|neural|google/i.test(v.name) ? '  ★자연스러움' : '');
        if (Voice.current() && v.name === Voice.current().name) o.selected = true;
        sel.appendChild(o);
      });
    }
    $('#voiceInfo').textContent = Voice.describe();
  }
  Voice.onVoicesChanged = fillVoices;

  function openSettings() {
    fillVoices();
    $('#setRate').value = Voice.rate;
    $('#rateOut').textContent = Voice.rate.toFixed(2) + '배';
    $('#set500').checked = settings.use500;
    $('#setTotal').checked = settings.showTotal;
    $('#setSfx').checked = settings.sfx;
    $('#settings').showModal();
  }

  /* ---------- 이벤트 연결 ---------- */
  document.querySelectorAll('.mode-card').forEach(b => b.addEventListener('click', () => { sfx.tap(); startGame(+b.dataset.mode); }));
  document.querySelectorAll('#goalSeg button').forEach(b => {
    b.classList.toggle('on', +b.dataset.goal === state.goal);
    b.addEventListener('click', () => {
      state.goal = +b.dataset.goal; store.set('goal', state.goal);
      document.querySelectorAll('#goalSeg button').forEach(x => x.classList.toggle('on', x === b));
      sfx.tap();
    });
  });
  $('#btnHome').addEventListener('click', () => { Voice.stop(); state.busy = false; show('Start'); });
  $('#btnRepeat').addEventListener('click', () => Voice.repeat());
  $('#btnSettings').addEventListener('click', openSettings);
  $('#btnFull').addEventListener('click', () => {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
  });
  $('#btnBackShelf').addEventListener('click', () => { if (!state.busy) showShelf(false); });
  $('#btnCount').addEventListener('click', countTogether);
  $('#btnClear').addEventListener('click', () => { if (state.busy) return; sfx.back(); state.counter = []; renderCounter(); });
  $('#btnPay').addEventListener('click', pay);
  $('#btnAgain').addEventListener('click', () => startGame(state.mode));
  $('#btnToStart').addEventListener('click', () => { Voice.stop(); show('Start'); });

  $('#setVoice').addEventListener('change', e => { Voice.setVoice(e.target.value); $('#voiceInfo').textContent = Voice.describe(); Voice.play('welcome', false); });
  $('#setRate').addEventListener('input', e => { Voice.setRate(+e.target.value); $('#rateOut').textContent = (+e.target.value).toFixed(2) + '배'; });
  $('#set500').addEventListener('change', e => { settings.use500 = e.target.checked; store.set('use500', settings.use500); });
  $('#setTotal').addEventListener('change', e => { settings.showTotal = e.target.checked; store.set('showTotal', settings.showTotal); if (state.item) renderCounter(); });
  $('#setSfx').addEventListener('change', e => { settings.sfx = e.target.checked; store.set('sfx', settings.sfx); });
  $('#btnVoiceTest').addEventListener('click', () => Voice.play(['welcome', DATA.level2[6].id], false));

  // 전자칠판: 길게 눌러 생기는 메뉴·확대 방지
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());

  show('Start');
})();
