const API_BASE_URL = 'https://api.meylio.fr';

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

  const body = method === 'email' ? { email: emailInput.value.trim() } : { phone: normalizePhone(phoneInput.value) };

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
