(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const todayKey = () => new Date().toISOString().slice(0,10);

  // ---------- Storage ----------
  const DB_KEY = 'tw_app_v1';
  const defaultState = () => ({
    user: { name: 'Friend', email: '', school: '', interest: '', points: 0 },
    habits: [],                 // {id, name, icon, goal, log: { 'YYYY-MM-DD': n }}
    mood: [],                   // [{date, mood}]
    sleep: [],                  // [{date, hours}]
    journal: []                 // [{date, text}]
  });

  function load() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || defaultState(); }
    catch { return defaultState(); }
  }
  function save(state) { localStorage.setItem(DB_KEY, JSON.stringify(state)); }
  function award(state, pts){ state.user.points += pts; save(state); paintHeader(state); }

  // ---------- UI Helpers ----------
  function el(tag, cls, text){
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  // ---------- Header ----------
  function paintHeader(state){
    $('#userName').textContent = state.user.name || 'Friend';
    $('#points').textContent = state.user.points|0;
    $('#level').textContent = Math.max(1, Math.floor((state.user.points|0)/50)+1);
  }

  // ---------- Habits ----------
  function renderHabits(state){
    const list = $('#habitList');
    const empty = $('#habitsEmpty');
    list.innerHTML = '';
    empty.style.display = state.habits.length ? 'none' : '';

    state.habits.forEach(h => {
      const item = el('li', 'habit');
      const meta = el('div', 'meta');
      meta.append(el('span', null, h.icon || '✅'));
      meta.append(el('span', null, h.name));
      item.append(meta);

      const progress = el('div', 'progress');
      const ticks = [];
      for (let i=0;i<h.goal;i++){
        const t = el('button', 'tick');
        t.setAttribute('aria-label','Mark progress');
        if ((h.log[todayKey()]||0) > i) t.classList.add('done');
        t.addEventListener('click', () => {
          const count = (h.log[todayKey()]||0);
          if (count <= i) {
            h.log[todayKey()] = i+1;
            award(state, 2);
          } else {
            h.log[todayKey()] = i; // allow undo
          }
          save(state);
          renderHabits(state);
          renderStreaks(state);
        });
        ticks.push(t);
        progress.append(t);
      }
      item.append(progress);

      // right actions
      const right = el('div');
      const badge = el('span','badge', `Streak ${streak(h)}`);
      right.append(badge);
      item.append(right);

      list.append(item);
    });
  }

  function streak(h){
    // count backwards from today while log has >=1
    let s=0;
    const d = new Date();
    for(;;){
      const key = d.toISOString().slice(0,10);
      if ((h.log[key]||0) >= 1) { s++; d.setDate(d.getDate()-1); }
      else break;
    }
    return s;
  }

  function addHabitFlow(state){
    const dlg = $('#habitModal');
    $('#habitName').value='';
    $('#habitIcon').value='';
    $('#habitGoal').value='1';
    dlg.showModal();
    $('#saveHabit').onclick = (e)=>{
      e.preventDefault();
      const name = $('#habitName').value.trim();
      const icon = $('#habitIcon').value.trim();
      const goal = Math.max(1, Math.min(10, parseInt($('#habitGoal').value||'1',10)));
      if(!name) return;
      state.habits.push({ id: crypto.randomUUID(), name, icon, goal, log: {} });
      save(state);
      renderHabits(state);
      dlg.close();
    };
  }

  // ---------- Timer ----------
  let timer = { dur: 25*60, left: 25*60, id: null };
  function fmt(s){ const m = Math.floor(s/60), ss = String(s%60).padStart(2,'0'); return m+':'+ss; }
  function paintTimer(){ $('#timerDisplay').textContent = fmt(timer.left); }
  function startTimer(state){
    if (timer.id) return;
    const tick = ()=>{
      timer.left--;
      paintTimer();
      if (timer.left <= 0){
        clearInterval(timer.id); timer.id=null;
        award(state, 5);
        timer.left = timer.dur;
        alert('Nice focus session! +5 pts');
      }
    };
    timer.id = setInterval(tick, 1000);
  }
  function pauseTimer(){ if(timer.id){ clearInterval(timer.id); timer.id=null; } }
  function resetTimer(){ pauseTimer(); timer.left = timer.dur; paintTimer(); }

  // ---------- Mood ----------
  function logMood(state, mood){
    state.mood.unshift({date: new Date().toLocaleString(), mood});
    state.mood = state.mood.slice(0,20);
    award(state, 1);
    save(state);
    paintMood(state);
  }
  function paintMood(state){
    const ul = $('#moodLog'); ul.innerHTML='';
    state.mood.forEach(m => {
      const li = el('li', null, `${m.date}: ${m.mood}`);
      ul.append(li);
    });
  }

  // ---------- Breathing ----------
  let breathing=false; let breathTimer=null;
  function startBreathing(){
    const v = $('#breathVisual');
    v.classList.add('breathing');
    breathing = true;
  }
  function stopBreathing(){
    const v = $('#breathVisual');
    v.classList.remove('breathing');
    breathing = false;
  }

  // ---------- Sleep ----------
  function saveSleep(state){
    const b = $('#bedtime').value;
    const w = $('#waketime').value;
    if(!b || !w) return;
    // compute hours
    const [bh,bm] = b.split(':').map(Number);
    const [wh,wm] = w.split(':').map(Number);
    let start = new Date(); start.setHours(bh,bm,0,0);
    let end = new Date(); end.setHours(wh,wm,0,0);
    if (end <= start) end.setDate(end.getDate()+1);
    const hours = Math.round(((end-start)/36e5)*10)/10;
    state.sleep.unshift({date: todayKey(), hours});
    state.sleep = state.sleep.slice(0,14);
    award(state, 2);
    save(state);
    paintSleep(state);
  }
  function paintSleep(state){
    const ul = $('#sleepLog'); ul.innerHTML='';
    state.sleep.forEach(s => {
      const li = el('li', null, `${s.date}: ${s.hours}h`);
      ul.append(li);
    });
    const recent = state.sleep.slice(0,7);
    const avg = recent.length ? (recent.reduce((a,b)=>a+b.hours,0)/recent.length) : 0;
    $('#sleepAvg').textContent = (Math.round(avg*10)/10).toString();
  }

  // ---------- Journal ----------
  function saveJournal(state){
    const text = $('#journalText').value.trim();
    if(!text) return;
    state.journal.unshift({date: new Date().toLocaleDateString(), text});
    state.journal = state.journal.slice(0,20);
    award(state, 2);
    save(state);
    $('#journalText').value='';
    paintJournal(state);
  }
  function clearJournal(){ $('#journalText').value=''; }
  function paintJournal(state){
    const ul = $('#journalLog'); ul.innerHTML='';
    state.journal.forEach(j => {
      const li = el('li');
      const strong = el('strong', null, j.date + ': ');
      li.append(strong, document.createTextNode(j.text));
      ul.append(li);
    });
  }

  // ---------- Streaks ----------
  function renderStreaks(state){
    const ul = $('#streaks'); ul.innerHTML='';
    state.habits.forEach(h => {
      const li = el('li', null, `${h.icon||'✅'} ${h.name}: `);
      const strong = el('strong', null, streak(h) + ' days');
      li.append(strong);
      ul.append(li);
    });
  }

  // ---------- Profile + bootstrap ----------
  function initProfile(state){
    const user = state.user;
    // if coming from signup (stored in localStorage under 'tw_signup')
    try {
      const signup = JSON.parse(localStorage.getItem('tw_signup'));
      if (signup && signup.email && (!user.email || user.email === '')) {
        state.user = { name: signup.name||'Friend', email: signup.email, school: signup.school||'', interest: signup.interest||'', points: 0 };
        // seed sample habits
        const seed = {
          'Sleep & Recovery': [{name:'Sleep 8h', icon:'😴'}, {name:'No screens 30m before bed', icon:'📵'}],
          'Stress & Mental Health': [{name:'5-min breathing', icon:'🫁'}, {name:'Short walk', icon:'🚶'}],
          'Nutrition & Energy': [{name:'Drink water', icon:'💧', goal:2}, {name:'Eat fruit/veg', icon:'🥗'}],
          'Habits & Productivity': [{name:'Read 10 pages', icon:'📚'}, {name:'Plan tomorrow', icon:'📝'}],
          'Fitness for Students': [{name:'Move 20 min', icon:'🏃'}, {name:'Stretch 5 min', icon:'🧘'}],
        };
        const pick = seed[signup.interest] || [{name:'Daily check-in', icon:'✅'}];
        state.habits = pick.map(x => ({ id: crypto.randomUUID(), name: x.name, icon: x.icon, goal: x.goal||1, log:{} }));
        localStorage.removeItem('tw_signup');
        save(state);
      }
    } catch {}
  }

  // ---------- Wire up ----------
  document.addEventListener('DOMContentLoaded', () => {
    let state = load();
    initProfile(state);
    paintHeader(state);
    renderHabits(state);
    renderStreaks(state);
    paintMood(state);
    paintSleep(state);
    paintJournal(state);

    // Habit actions
    $('#addHabitBtn').addEventListener('click', () => addHabitFlow(state));
    $('#todayCompleteAll').addEventListener('click', () => {
      state.habits.forEach(h => { h.log[todayKey()] = h.goal; });
      award(state, 5);
      save(state); renderHabits(state); renderStreaks(state);
    });

    // Timer actions
    $$('.timer-controls button').forEach(b => {
      b.addEventListener('click', () => {
        const m = parseInt(b.dataset.min,10);
        timer.dur = m*60; timer.left = timer.dur; paintTimer();
      });
    });
    $('#startTimer').addEventListener('click', () => startTimer(state));
    $('#pauseTimer').addEventListener('click', pauseTimer);
    $('#resetTimer').addEventListener('click', resetTimer);
    paintTimer();

    // Mood
    $$('.mood').forEach(btn => btn.addEventListener('click', () => logMood(state, btn.dataset.mood)));

    // Breathing
    $('#startBreath').addEventListener('click', startBreathing);
    $('#stopBreath').addEventListener('click', stopBreathing);

    // Sleep
    $('#saveSleep').addEventListener('click', () => saveSleep(state));

    // Journal
    $('#saveJournal').addEventListener('click', () => saveJournal(state));
    $('#clearJournal').addEventListener('click', clearJournal);

    // Profile
    $('#editProfileBtn').addEventListener('click', () => {
      const name = prompt('Your name', state.user.name||'');
      if (name !== null) state.user.name = name.trim() || 'Friend';
      const school = prompt('School / Team', state.user.school||'');
      if (school !== null) state.user.school = school.trim();
      save(state); paintHeader(state);
    });
    $('#logoutBtn').addEventListener('click', () => {
      if (confirm('Log out? Your local progress will remain on this device.')) {
        // This only clears the "session", not the DB
        sessionStorage.removeItem('tw_session');
        location.href = 'index.html';
      }
    });
  });
})();