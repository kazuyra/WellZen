// ================= HabitTide Auth (Firebase v9+ Modular via CDN) =================
// Works on static hosts (GitHub Pages). Provides: sign-up, sign-in, Google sign-in,
// sign-out, and a dashboard guard. NO bundler needed.

// ---- Firebase web app config (yours) ----
const firebaseConfig = {
  apiKey: "AIzaSyCuYSXZsfNh5RKaz-9zkPt-mEtaGkUCKlc",
  authDomain: "teenwell-acbe4.firebaseapp.com",
  projectId: "teenwell-acbe4",
  storageBucket: "teenwell-acbe4.firebasestorage.app",
  messagingSenderId: "977644389409",
  appId: "1:977644389409:web:679ceae6be098148a5cf60",
  measurementId: "G-RTES2SB52V"
};

// ---- Import SDKs from CDN (must use full URLs on static hosts) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";

// ---- Init ----
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

// ---- Helpers ----
const $ = (id) => document.getElementById(id);
const toast = (m) => alert(m); // swap for a nicer toast if you want

// ---- SIGN UP (email/password) ----
export async function signupWithEmail() {
  const name = $('name')?.value?.trim();
  const email = $('email')?.value?.trim();
  const pass = $('password')?.value?.trim();
  const terms = document.querySelector('input[name="terms"]')?.checked;

  if (!email || !pass || !terms) return toast("Email, password, and Terms are required.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });

    // Seed your dashboard’s local onboarding (so your current UI still personalizes)
    localStorage.setItem('tw_signup', JSON.stringify({
      name: name || cred.user.displayName || 'Friend',
      email
    }));
    sessionStorage.setItem('tw_session', email);

    location.href = 'dashboard.html';
  } catch (err) {
    toast(err.message);
  }
}

// ---- SIGN IN (email/password) ----
export async function signinWithEmail() {
  const email = $('email')?.value?.trim();
  const pass = $('password')?.value?.trim();
  if (!email || !pass) return toast("Email and password required.");
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    sessionStorage.setItem('tw_session', email);
    location.href = 'dashboard.html';
  } catch (err) {
    toast(err.message);
  }
}

// ---- GOOGLE SIGN-IN ----
export async function signinWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const email = cred.user.email || '';
    localStorage.setItem('tw_signup', JSON.stringify({
      name: cred.user.displayName || 'Friend', email
    }));
    sessionStorage.setItem('tw_session', email);
    location.href = 'dashboard.html';
  } catch (err) {
    toast(err.message);
  }
}

// ---- SIGN OUT ----
export async function doSignOut() {
  await signOut(auth);
  sessionStorage.removeItem('tw_session');
  location.href = 'index.html';
}

// ---- REQUIRE AUTH ON DASHBOARD ----
export function requireAuthOnDashboard() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.href = 'login.html';
    } else {
      // mirror to your existing UI/session checks
      sessionStorage.setItem('tw_session', user.email || '1');
      const slot = document.getElementById('userName');
      if (slot && (!slot.textContent || slot.textContent === 'Friend')) {
        slot.textContent = user.displayName || 'Friend';
      }
    }
  });
}
