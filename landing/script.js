const API_BASE_URL = 'https://api.meylio.fr';

function captureSource() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');
  if (utmSource && !localStorage.getItem('meylio.utmSource')) {
    localStorage.setItem('meylio.utmSource', utmSource.slice(0, 100));
  }
  return localStorage.getItem('meylio.utmSource') || undefined;
}

captureSource();

const LAUNCH_DATE = new Date('2026-08-31T00:00:00+02:00');

function updateCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  const diffMs = LAUNCH_DATE.getTime() - Date.now();
  if (diffMs <= 0) {
    el.classList.add('is-launched');
    el.querySelector('.countdown-label').textContent = "C'est ouvert !";
    el.querySelector('.countdown-timer').remove();
    clearInterval(countdownInterval);
    return;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('countdown-days').textContent = pad(days);
  document.getElementById('countdown-hours').textContent = pad(hours);
  document.getElementById('countdown-minutes').textContent = pad(minutes);
  document.getElementById('countdown-seconds').textContent = pad(seconds);
}

updateCountdown();
const countdownInterval = setInterval(updateCountdown, 1000);

const form = document.getElementById('waitlist-form');
const emailInput = document.getElementById('waitlist-email');
const phoneInput = document.getElementById('waitlist-phone');
const feedback = document.getElementById('waitlist-feedback');
const emailTab = document.getElementById('waitlist-method-email');
const phoneTab = document.getElementById('waitlist-method-phone');

let method = 'email';

function setMethod(next) {
  method = next;
  const isEmail = method === 'email';
  emailInput.hidden = !isEmail;
  phoneInput.hidden = isEmail;
  emailInput.required = isEmail;
  phoneInput.required = !isEmail;
  emailTab.classList.toggle('is-active', isEmail);
  phoneTab.classList.toggle('is-active', !isEmail);
}

emailTab.addEventListener('click', () => setMethod('email'));
phoneTab.addEventListener('click', () => setMethod('phone'));

function normalizePhone(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  const withoutLeadingZero = trimmed.replace(/\D/g, '').replace(/^0+/, '');
  return `+33${withoutLeadingZero}`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  feedback.className = 'waitlist-feedback';

  const source = captureSource();
  const body = {
    ...(method === 'email' ? { email: emailInput.value.trim() } : { phone: normalizePhone(phoneInput.value) }),
    ...(source ? { source } : {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      feedback.textContent = data.error ?? 'Une erreur est survenue.';
      feedback.classList.add('error');
      return;
    }

    feedback.textContent =
      data.message === 'Déjà inscrit' ? 'Tu es déjà sur la liste !' : data.message;
    feedback.classList.add('success');
    form.reset();
    setMethod(method);
  } catch (error) {
    feedback.textContent = 'Impossible de contacter le serveur.';
    feedback.classList.add('error');
  }
});
