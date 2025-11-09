// ================= TeenWell Auth UI (site-wide) =================
// Requires your existing auth.js (Firebase via CDN).
// Makes the whole site react to login state on static hosting.

import { auth, doSignOut } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// tiny helpers
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

function applyAuthState(user) {
  const isAuthed = !!user;

  // Useful body flags (and CSS hooks)
  document.body.classList.toggle('auth', isAuthed);
  document.body.classList.toggle('guest', !isAuthed);

  // Toggle UI: anything marked with data-auth="in" shows only when signed in,
  // and data-auth="out" shows only when signed out.
  $$('[data-auth="in"]').forEach(el => el.style.display = isAuthed ? '' : 'none');
  $$('[data-auth="out"]').forEach(el => el.style.display = isAuthed ? 'none' : '');

  // Personalize name slots
  const display = user?.displayName || (user?.email?.split('@')[0]) || 'Friend';
  $$('#userName, [data-slot="userName"]').forEach(el => el.textContent = display);

  // Wire any logout buttons
  $$('#logoutBtn, [data-action="logout"]').forEach(btn => {
    btn.onclick = (e)=>{ e.preventDefault(); doSignOut(); };
  });
}

// Run on every page that includes this file
onAuthStateChanged(auth, applyAuthState);

// Optional: export a quick page-guard you can call on protected pages
export function protect({ requireAuth=false, redirectTo='login.html' }={}) {
  onAuthStateChanged(auth, (user) => {
    applyAuthState(user);
    if (requireAuth && !user) location.href = redirectTo;
  });
}
