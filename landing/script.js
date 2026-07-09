const API_BASE_URL = 'http://localhost:3000';

const form = document.getElementById('waitlist-form');
const emailInput = document.getElementById('waitlist-email');
const feedback = document.getElementById('waitlist-feedback');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  feedback.className = 'waitlist-feedback';

  const email = emailInput.value.trim();

  try {
    const response = await fetch(`${API_BASE_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
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
  } catch (error) {
    feedback.textContent = 'Impossible de contacter le serveur.';
    feedback.classList.add('error');
  }
});
