// dashboard.js
// Front-end only (localStorage). Swap to Firestore later if you want persistence across devices.

const $ = (sel, scope=document) => scope.querySelector(sel);
const $$ = (sel, scope=document) => Array.from(scope.querySelectorAll(sel));

/* ========== Storage helpers ========== */
const KEY = 'tw_dash_v1';
const d = JSON.parse(localStorage.getItem(KEY) || '{}');
const data = Object.assign({
  xp: 0,
  level: 1,
  streak: 0,
  lastOpen: null,
  habits: [
    // default starter habits
    { id: 'water', name: 'Drink water (16oz)', days: {}, archived:false },
    { id: 'move',  name: '10 min movement',    days: {}, archived:false },
    { id: 'read',  name: 'Read 5 min',         days: {}, archived:false },
  ],
  focus: [],   // {start, end, minutes}
  moods: [],   // {time, emoji, note}
  sleep: [],   // {date, hours, bed, wake}
  badges: []   // strings
}, d);

const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const todayKey = () => new Date().toISOString().slice(0,10);

/* ========== XP / Level / Streak ========== */
const addXP = (n) => {
  data.xp += n;
  // simple leveling curve
  data.level = Math.max(1, Math.floor(1 + Math.sqrt(data.xp/100)));
  $('#xpTotal').textContent = data.xp;
  $('#levelNum').textContent = data.level;
  save();
};

const updateStreak = () => {
  const t = todayKey();
  if (!data.lastOpen) { data.lastOpen = t; data.streak = 1; }
  else {
    const last = new Date(data.lastOpen);
    const now  = new Date(t);
    const diff = Math.round((now - last)/(1000*60*60*24));
    if (diff === 1) data.streak += 1;
    if (diff > 1)   data.streak = 1; // reset
    data.lastOpen = t;
  }
  $('#globalStreak').textContent = data.streak;
  save();
};

/* ========== Tabs ========== */
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', () => {
    $$('.tab').forEach(b=>b.classList.remove('is-active'));
    $$('.tab-panel').forEach(p=>p.classList.remove('is-active'));
    btn.classList.add('is-active');
    const id = btn.getAttribute('data-tab');
    document.getElementById(id).classList.add('is-active');
  });
});

/* ========== Habits ========== */
const habitList = $('#habitList');
const todayHabits = $('#todayHabits');
const today = todayKey();

function renderHabits() {
  // full list
  habitList.innerHTML = '';
  data.habits.filter(h=>!h.archived).forEach(h=>{
    const li = document.createElement('li');
    li.className = 'habit';
    const doneCount = Object.values(h.days).filter(Boolean).length;
    li.innerHTML = `
      <div class="left">
        <input type="checkbox" ${h.days[today] ? 'checked':''} data-habit="${h.id}" />
        <span class="name">${h.name}</span>
      </div>
      <div class="right">
        <span class="muted small">${doneCount} ✓ total</span>
        <button class="icon archive" title="Archive" data-arch="${h.id}">🗄️</button>
      </div>`;
    habitList.appendChild(li);
  });

  // today’s checklist
  todayHabits.innerHTML = '';
  data.habits.filter(h=>!h.archived).forEach(h=>{
    const li = document.createElement('li');
    li.innerHTML = `
      <label class="check">
        <input type="checkbox" ${h.days[today] ? 'checked':''} data-habit="${h.id}" />
        <span>${h.name}</span>
      </label>`;
    todayHabits.appendChild(li);
  });

  // wire up toggles & archive
  $$('input[type="checkbox"][data-habit]').forEach(cb=>{
    cb.addEventListener('change', () => {
      const id = cb.getAttribute('data-habit');
      const h = data.habits.find(x=>x.id===id);
      h.days[today] = cb.checked;
      if (cb.checked) addXP(5);
      save();
      updateWeekBars();
      updateTodayNote();
      renderBadges();
    });
  });

  $$('[data-arch]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-arch');
      const h = data.habits.find(x=>x.id===id);
      h.archived = true;
      save();
      renderHabits();
      updateWeekBars();
    });
  });
}

$('#addHabitBtn').addEventListener('click', ()=>{
  const name = prompt('New habit name (keep it tiny & clear):');
  if (!name) return;
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,24) + '-' + Math.random().toString(36).slice(2,6);
  data.habits.push({id, name, days:{}, archived:false});
  save();
  renderHabits();
});

$('#quickAddHabit').addEventListener('click', ()=>{
  $('#addHabitBtn').click();
});

function updateTodayNote(){
  const total = data.habits.filter(h=>!h.archived).length || 1;
  const done  = data.habits.filter(h=>!h.archived && h.days[today]).length;
  const pct = Math.round((done/total)*100);
  $('#todayCompleteNote').textContent = `${done}/${total} done • ${pct}%`;
}
function updateWeekBars(){
  // compute last 7 days % complete
  const days = [...Array(7)].map((_,i)=>{
    const d = new Date(); d.setDate(d.getDate()- (6-i));
    return d.toISOString().slice(0,10);
  });
  const actives = data.habits.filter(h=>!h.archived);
  const html = days.map(k=>{
    const total = actives.length || 1;
    const done  = actives.filter(h => h.days[k]).length;
    const pct   = Math.round((done/total)*100);
    return `<div class="bar"><div class="fill" style="height:${pct}%"></div><span class="lab">${k.slice(5).replace('-','/')}</span></div>`;
  }).join('');
  $('#weekBars').innerHTML = html;
}

/* ========== Focus timer ========== */
let focusInterval=null, focusRemaining=25*60, focusTotal=25*60;
const timeEl = $('#focusTime');

function fmt(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.floor(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
function setFocusMins(min){
  focusRemaining = focusTotal = min*60;
  timeEl.textContent = fmt(focusRemaining);
  $$('.pill').forEach(p=>p.classList.remove('is-active'));
  $(`.pill[data-min="${min}"]`).classList.add('is-active');
}
setFocusMins(25);

$('.timer-controls [data-action="startFocus"]').addEventListener('click', ()=>{
  if (focusInterval) return;
  focusInterval = setInterval(()=>{
    focusRemaining -= 1;
    timeEl.textContent = fmt(Math.max(0,focusRemaining));
    if (focusRemaining<=0){
      clearInterval(focusInterval); focusInterval=null;
      data.focus.push({start: Date.now()-focusTotal*1000, end: Date.now(), minutes: Math.round(focusTotal/60)});
      addXP(10);
      save();
      renderFocusLog();
      alert('Focus complete! +10 XP');
    }
  }, 1000);
});
$('.timer-controls [data-action="pauseFocus"]').addEventListener('click', ()=>{
  clearInterval(focusInterval); focusInterval=null;
});
$('.timer-controls [data-action="resetFocus"]').addEventListener('click', ()=>{
  clearInterval(focusInterval); focusInterval=null;
  setFocusMins(focusTotal/60);
});
$$('.pill').forEach(p=>p.addEventListener('click', ()=> setFocusMins(Number(p.dataset.min)) ));

function renderFocusLog(){
  const ul = $('#focusLog');
  ul.innerHTML = data.focus.slice(-10).reverse().map(f=>{
    const d = new Date(f.end).toLocaleString();
    return `<li>${d} — ${f.minutes} min</li>`;
  }).join('') || '<li class="muted small">No sessions yet.</li>';
}

/* ========== Breathing ========== */
let breathId=null, breathStep=0;
const breathSteps = [
  {label:'Inhale', secs:4},
  {label:'Hold',   secs:7},
  {label:'Exhale', secs:8},
];
$('#breathStart').addEventListener('click', ()=>{
  if (breathId) return;
  const circle = $('#breathCircle');
  const label  = $('#breathStep');
  let t = breathSteps[breathStep].secs;
  label.textContent = breathSteps[breathStep].label;
  circle.classList.add('play');
  breathId = setInterval(()=>{
    t -= 1;
    if (t<=0){
      breathStep = (breathStep+1)%breathSteps.length;
      t = breathSteps[breathStep].secs;
      label.textContent = breathSteps[breathStep].label;
      circle.classList.toggle('invert', breathStep===2);
    }
  }, 1000);
});
$('#breathStop').addEventListener('click', ()=>{
  clearInterval(breathId); breathId=null;
  $('#breathCircle').classList.remove('play','invert');
  $('#breathStep').textContent = 'Inhale';
  breathStep = 0;
});

/* ========== Mood ========== */
let selectedMood = null;
$$('.mood').forEach(b=>{
  b.addEventListener('click', ()=>{
    selectedMood = b.dataset.mood;
    $$('.mood').forEach(x=>x.classList.remove('is-active'));
    b.classList.add('is-active');
  });
});
$('#saveMood').addEventListener('click', ()=>{
  if (!selectedMood) { alert('Pick a mood emoji first 🙂'); return; }
  data.moods.push({ time: Date.now(), emoji: selectedMood, note: $('#moodNote').value.trim() });
  addXP(2);
  $('#moodNote').value = '';
  $$('.mood').forEach(x=>x.classList.remove('is-active'));
  selectedMood = null;
  save();
  renderMoodLog();
});
function renderMoodLog(){
  const ul = $('#moodLog');
  ul.innerHTML = data.moods.slice(-15).reverse().map(m=>{
    const d = new Date(m.time).toLocaleString();
    const note = m.note ? ` — <span class="muted">${m.note}</span>` : '';
    return `<li>${m.emoji} ${d}${note}</li>`;
  }).join('') || '<li class="muted small">No moods yet.</li>';
}

/* ========== Sleep ========== */
$('#saveSleep').addEventListener('click', ()=>{
  const hours = Number($('#sleepHours').value);
  const bed   = $('#sleepBed').value || null;
  const wake  = $('#sleepWake').value || null;
  if (!hours && hours !== 0) return alert('Enter hours slept.');
  data.sleep.push({date: today, hours, bed, wake});
  addXP(3);
  save();
  renderSleepLog();
});
function renderSleepLog(){
  const ul = $('#sleepLog');
  ul.innerHTML = data.sleep.slice(-14).reverse().map(s=>{
    const hw = (s.bed && s.wake) ? ` • ${s.bed}–${s.wake}` : '';
    return `<li>${s.date}: ${s.hours} hrs${hw}</li>`;
  }).join('') || '<li class="muted small">No sleep logs yet.</li>';
}

/* ========== Badges ========== */
const BADGES = [
  { id:'first-check',   when: ()=> data.habits.some(h=>Object.values(h.days).some(Boolean)), label:'First Check ✓' },
  { id:'streak-3',      when: ()=> data.streak >= 3,  label:'3-day Streak' },
  { id:'streak-7',      when: ()=> data.streak >= 7,  label:'7-day Streak' },
  { id:'focus-3',       when: ()=> data.focus.length >= 3, label:'Focused x3' },
  { id:'sleep-7',       when: ()=> data.sleep.length >= 7, label:'Sleep Logger' },
  { id:'xp-200',        when: ()=> data.xp >= 200, label:'200 XP' },
];

function renderBadges(){
  BADGES.forEach(b=>{
    if (!data.badges.includes(b.id) && b.when()){
      data.badges.push(b.id); save();
    }
  });
  const grid = $('#badgeGrid');
  grid.innerHTML = BADGES.map(b=>{
    const earned = data.badges.includes(b.id);
    return `<div class="badge ${earned?'earned':''}" title="${b.label}">
      <span>${earned?'🏆':'🔒'}</span>
      <p>${b.label}</p>
    </div>`;
  }).join('');
}

/* ========== Init ========== */
function init(){
  $('#xpTotal').textContent = data.xp;
  $('#levelNum').textContent = data.level;
  updateStreak();
  renderHabits();
  renderFocusLog();
  renderMoodLog();
  renderSleepLog();
  updateWeekBars();
  updateTodayNote();
  renderBadges();
}
init();
