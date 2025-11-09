// auth-ui.js
// Handles header UI (show/hide buttons) and logout. Works on any page.

import { auth, doSignOut } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const root = document.body;

onAuthStateChanged(auth, (user) => {
  const authed = !!user;
  root.classList.toggle('auth', authed);
  root.classList.toggle('guest', !authed);

  // Optional: name in dashboard header if present
  const nameEl = document.getElementById('userName');
  if (nameEl && authed) {
    nameEl.textContent = user.displayName || user.email?.split('@')[0] || 'Friend';
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  doSignOut();
});
