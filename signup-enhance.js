/* Enhances sign-up page to create a local session and redirect to dashboard */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('main form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name')?.value?.trim() || 'Friend';
    const email = document.getElementById('email')?.value?.trim() || '';
    const school = document.getElementById('school')?.value?.trim() || '';
    const interest = document.getElementById('interest')?.value || '';
    const okTerms = form.querySelector('input[name="terms"]')?.checked;
    if (!email || !okTerms) {
      alert('Please enter a valid email and accept Terms.');
      return;
    }
    // Create a lightweight "account" locally
    localStorage.setItem('tw_signup', JSON.stringify({ name, email, school, interest }));
    sessionStorage.setItem('tw_session', email);
    // Redirect to dashboard
    location.href = 'dashboard.html';
  });
});