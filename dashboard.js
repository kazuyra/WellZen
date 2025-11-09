// Dashboard logic (localStorage + Firebase auth ID key)
// ----------------------------------------------------
import { auth, doSignOut } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protect } from './auth-ui.js';

protect({ requireAuth: true, redirectTo: 'login.html' });

const $ = (s, el=document)=> el.querySelector(s);
const $$ = (s, el=document)=> Array.from(el.querySelectorAll(s));

onAuthStateChanged(auth, (user)=>{
  if(!user) return;
  const display = user.displayName || (user.email||'').split('@')[0] || 'Friend';
  $('#userName').textContent = display;
  init(user.uid);
  $('#logoutBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); doSignOut(); });
});

let uid = null;
let state = null;

// default state for new users
const defaultState = () => ({
  xp: 0,
  lastCheckDate: todayKey(),
  globalStreak: 0,
  habits: [
    { id:id(), name:'Drink Water (8oz)', goal:1, done:0, streak:0, color:'#2fb277' },
    { id:id(), name:'Read 10 minutes', goal:1, done:0, streak:0, color:'#39c487' },
    { id:id(), name:'Move 15 minutes', goal:1, done:0, streak:0, color:'#2fb277' }
  ],
  week: {},        // { 'YYYY-MM-DD': { total, completed } }
  focus: [],       // { start, end, minutes }
  mood: [],        // { ts, mood, note }
  sleep: []        // { ts, hours, bed, wake }
});

function init(userId){
  uid = userId;
  state = read() || defaultState();
  dailyRollover();
  mountTabs();
  renderAll();
  wireToday();
  wireHabits();
  wireFocus();
  wireBreath();
  wireMood();
  wireSleep();
}

// ---------- storage ----------
function key(){ return `tw_user_${uid}`; }
function read(){ try{ return JSON.parse(localStorage.getItem(key())); }catch{ return null; } }
function save(){ localStorage.setItem(key(), JSON.stringify(state)); renderXP(); }

// ---------- utils ----------
function id(){ return Math.random().toString(36).slice(2,10); }
function todayKey(d=new Date()){ return d.toISOString().slice(0,10); }
function sameDay(a,b){ return todayKey(a)===todayKey(b); }

// rollover resets per-day counters and updates streak
function dailyRollover(){
  const today = todayKey();
  if(state.lastCheckDate === today) return;
  // did user complete all habits yesterday?
  const y = new Date(); y.setDate(y.getDate()-1);
  const yKey = todayKey(y);
  const yesterday = state.week[yKey];
  const allDone = yesterday && yesterday.completed >= yesterday.total && yesterday.total>0;
  if(allDone) state.globalStreak += 1; else state.globalStreak = 0;

  // reset per-day done counts
  state.habits.forEach(h=> h.done = 0);
  state.lastCheckDate = today;
  save();
}

// ---------- XP / Level ----------
function addXP(n){ state.xp += n; save(); renderXP(); }
function levelFromXP(xp){ return Math.max(1, Math.floor(xp/100) + 1); }
function renderXP(){
  $('#xpTotal').textContent = state.xp;
  $('#globalStreak').textContent = state.globalStreak;
  $('#levelNum').textContent = levelFromXP(state.xp);
}

// ---------- TABS ----------
function mountTabs(){
  $$('.tab').forEach(btn=>{
    btn.onclick = ()=>{
      $$('.tab').forEach(b=>b.classList.remove('is-active'));
      $$('.tab-panel').forEach(p=>p.classList.remove('is-active'));
      btn.classList.add('is-active');
      $('#'+btn.dataset.tab).classList.add('is-active');
    };
  });
}

// ---------- TODAY ----------
function wireToday(){
  $('#quickAddHabit').onclick = ()=> {
    const name = prompt('New habit name (e.g., “Stretch 5 mins”)');
    if(!name) return;
    state.habits.push({ id:id(), name, goal:1, done:0, streak:0, color:'#2fb277' });
    save(); renderHabitsToday(); renderHabitsList();
  };
  renderHabitsToday();
}
function renderHabitsToday(){
  const ul = $('#todayHabits');
  ul.innerHTML = '';
  if(!state.habits.length){ ul.innerHTML = '<li class="muted">No habits yet.</li>'; return; }
  let completed = 0;
  state.habits.forEach(h=>{
    const li = document.createElement('li');
    li.className = 'check-item' + (h.done>=h.goal ? ' done':'');
    li.innerHTML = `
      <input type="checkbox" ${h.done>=h.goal?'checked':''} aria-label="complete ${h.name}">
      <span>${h.name}</span>
      <span class="badge">${h.done}/${h.goal}</span>
    `;
    li.querySelector('input').onchange = (e)=>{
      h.done = e.target.checked ? h.goal : 0;
      if(h.done>=h.goal){ addXP(5); } // small win
      trackDayAggregate();
      save(); renderHabitsToday(); renderWeekBars();
    };
    ul.appendChild(li);
    if(h.done>=h.goal) completed++;
  });
  $('#todayCompleteNote').textContent = `${completed}/${state.habits.length} done`;
  trackDayAggregate();
}
function trackDayAggregate(){
  const t = todayKey();
  const total = state.habits.length;
  const completed = state.habits.filter(h=>h.done>=h.goal).length;
  state.week[t] = { total, completed };
  save();
  renderWeekBars();
}

// ---------- HABITS ----------
function wireHabits(){
  $('#addHabitBtn').onclick = ()=>{
    const name = prompt('Habit name');
    if(!name) return;
    const goal = Number(prompt('Times per day (default 1)', '1')) || 1;
    state.habits.push({ id:id(), name, goal, done:0, streak:0, color:'#2fb277' });
    save(); renderHabitsList(); renderHabitsToday();
  };
  renderHabitsList();
  renderWeekBars();
}
function renderHabitsList(){
  const ul = $('#habitList'); ul.innerHTML = '';
  state.habits.forEach(h=>{
    const li = document.createElement('li');
    li.className = 'habit';
    li.innerHTML = `
      <div class="left">
        <span class="badge">${h.goal}/day</span>
        <strong>${h.name}</strong>
      </div>
      <div class="actions">
        <button data-act="inc">+1</button>
        <button data-act="edit">Edit</button>
        <button data-act="del">Delete</button>
      </div>
    `;
    li.querySelector('[data-act="inc"]').onclick = ()=>{
      h.done = Math.min(h.goal, (h.done||0)+1);
      if(h.done===h.goal) addXP(5);
      save(); renderHabitsList(); renderHabitsToday();
    };
    li.querySelector('[data-act="edit"]').onclick = ()=>{
      const newName = prompt('Rename habit', h.name) || h.name;
      const newGoal = Number(prompt('Times per day', h.goal)) || h.goal;
      h.name = newName; h.goal = newGoal;
      save(); renderHabitsList(); renderHabitsToday();
    };
    li.querySelector('[data-act="del"]').onclick = ()=>{
      if(confirm('Delete habit?')){
        state.habits = state.habits.filter(x=>x.id!==h.id);
        save(); renderHabitsList(); renderHabitsToday();
      }
    };
    ul.appendChild(li);
  });
}
function renderWeekBars(){
  const container = $('#weekBars'); container.innerHTML = '';
  const days = [...Array(7)].map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()- (6-i)); return d; });
  days.forEach(d=>{
    const key = todayKey(d);
    const rec = state.week[key] || { total:0, completed:0 };
    const pct = rec.total ? Math.round((rec.completed/rec.total)*100) : 0;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = `<div class="bar-fill" style="height:${pct}%;"></div>`;
    container.appendChild(bar);
  });
}

// ---------- FOCUS TIMER ----------
let focusSeconds = 25*60;
let focusTimer = null;
function wireFocus(){
  const timeEl = $('#focusTime');
  const pills = $$('.pill');
  const setTime = (mins)=>{ focusSeconds = mins*60; updateTime(); pills.forEach(p=>p.classList.toggle('is-active', Number(p.dataset.min)===mins)); };
  pills.forEach(p=> p.onclick = ()=> setTime(Number(p.dataset.min)));
  $('[data-action="startFocus"]').onclick = startFocus;
  $('[data-action="pauseFocus"]').onclick = ()=> stopFocus(false);
  $('[data-action="resetFocus"]').onclick = ()=> { stopFocus(false); setTime(25); };
  setTime(25);

  function tick(){
    if(focusSeconds<=0){ stopFocus(true); return; }
    focusSeconds--; updateTime();
  }
  function updateTime(){
    const m = String(Math.floor(focusSeconds/60)).padStart(2,'0');
    const s = String(focusSeconds%60).padStart(2,'0');
    timeEl.textContent = `${m}:${s}`;
  }
  function startFocus(){
    if(focusTimer) return;
    focusTimer = setInterval(tick, 1000);
  }
  function stopFocus(completed){
    if(focusTimer){ clearInterval(focusTimer); focusTimer=null; }
    if(completed){
      addXP(10);
      state.focus.push({ start: Date.now()-(25*60-focusSeconds)*1000, end: Date.now(), minutes: Math.round((25*60)/60) });
      save(); renderFocusLog();
      alert('Nice! Focus session complete. +10 XP.');
    }
  }
  renderFocusLog();
}
function renderFocusLog(){
  const ul = $('#focusLog'); ul.innerHTML='';
  if(!state.focus.length){ ul.innerHTML = '<li class="muted">No sessions yet.</li>'; return; }
  state.focus.slice(-10).reverse().forEach(f=>{
    const d = new Date(f.end||Date.now());
    const li = document.createElement('li');
    li.textContent = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} · ${f.minutes||25} min`;
    ul.appendChild(li);
  });
}

// ---------- BREATH ----------
let breathInt = null, breathStep = 0;
function wireBreath(){
  $('#breathStart').onclick = ()=>{
    if(breathInt) return;
    const circle = $('#breathCircle'), text = $('#breathStep');
    const seq = [
      { label: 'Inhale',   t: 4000, cls:'expand' },
      { label: 'Hold',     t: 7000, cls:'expand' },
      { label: 'Exhale',   t: 8000, cls:'' }
    ];
    breathStep = 0;
    run();
    function run(){
      const s = seq[breathStep % seq.length];
      text.textContent = s.label;
      circle.classList.toggle('expand', !!s.cls);
      breathInt = setTimeout(()=>{ breathStep++; run(); }, s.t);
    }
  };
  $('#breathStop').onclick = ()=>{ clearTimeout(breathInt); breathInt=null; $('#breathCircle').classList.remove('expand'); $('#breathStep').textContent='Inhale'; };
}

// ---------- MOOD ----------
function wireMood(){
  let current = null;
  $$('.mood').forEach(b=>{
    b.onclick = ()=>{ current = b.dataset.mood; $$('.mood').forEach(x=>x.classList.toggle('active', x===b)); };
  });
  $('#saveMood').onclick = ()=>{
    if(!current){ alert('Choose a mood.'); return; }
    state.mood.push({ ts: Date.now(), mood: current, note: $('#moodNote').value.trim() });
    $('#moodNote').value='';
    addXP(2); save(); renderMood();
  };
  renderMood();
}
function renderMood(){
  const ul = $('#moodLog'); ul.innerHTML='';
  if(!state.mood.length){ ul.innerHTML = '<li class="muted">No logs yet.</li>'; return;}
  state.mood.slice(-14).reverse().forEach(m=>{
    const d = new Date(m.ts);
    const li = document.createElement('li');
    li.innerHTML = `<strong>${m.mood}</strong> · ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
      ${m.note?`<div class="muted small">${m.note}</div>`:''}`;
    ul.appendChild(li);
  });
}

// ---------- SLEEP ----------
function wireSleep(){
  $('#saveSleep').onclick = ()=>{
    const hours = Number($('#sleepHours').value||0);
    const bed = $('#sleepBed').value||'';
    const wake = $('#sleepWake').value||'';
    if(!hours){ alert('Enter hours slept.'); return; }
    state.sleep.push({ ts: Date.now(), hours, bed, wake });
    addXP(3); save(); renderSleep();
  };
  renderSleep();
}
function renderSleep(){
  const ul = $('#sleepLog'); ul.innerHTML='';
  if(!state.sleep.length){ ul.innerHTML = '<li class="muted">No logs yet.</li>'; return;}
  state.sleep.slice(-10).reverse().forEach(s=>{
    const d = new Date(s.ts);
    const li = document.createElement('li');
    li.innerHTML = `${d.toLocaleDateString()} — <strong>${s.hours}h</strong> <span class="muted">(${s.bed||'--'} → ${s.wake||'--'})</span>`;
    ul.appendChild(li);
  });
}

// ---------- BADGES ----------
function renderBadges(){
  const grid = $('#badgeGrid'); grid.innerHTML='';
  const badges = [
    { id:'start', label:'Getting Started', cond: ()=> state.xp>=1, emoji:'🌱' },
    { id:'streak3', label:'3-Day Streak', cond: ()=> state.globalStreak>=3, emoji:'🔥' },
    { id:'focus3', label:'3 Focus Sessions', cond: ()=> state.focus.length>=3, emoji:'🎯' },
    { id:'sleep7', label:'7 Sleep Logs', cond: ()=> state.sleep.length>=7, emoji:'😴' },
    { id:'xp500', label:'500 XP', cond: ()=> state.xp>=500, emoji:'🏆' },
  ];
  badges.forEach(b=>{
    const earned = b.cond();
    const card = document.createElement('div');
    card.className = 'reward' + (earned? ' earned':'');
    card.innerHTML = `<div class="big">${b.emoji}</div><div>${b.label}</div>`;
    grid.appendChild(card);
  });
}

function renderAll(){
  renderXP();
  renderHabitsToday();
  renderHabitsList();
  renderWeekBars();
  renderFocusLog();
  renderMood();
  renderSleep();
  renderBadges();
}
