const API_BASE_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  : 'https://api.meylio.fr';

const keyGate = document.getElementById('key-gate');
const keyInput = document.getElementById('admin-key-input');
const keySubmit = document.getElementById('key-submit');
const keyError = document.getElementById('key-error');
const reportsList = document.getElementById('reports-list');
const emptyMessage = document.getElementById('empty-message');
const statusFilter = document.getElementById('status-filter');
const refreshButton = document.getElementById('refresh-button');
const waitlistPanel = document.getElementById('waitlist-panel');
const statPending = document.getElementById('stat-pending');
const statNotified = document.getElementById('stat-notified');
const statPhonePending = document.getElementById('stat-phone-pending');
const statPhoneNotified = document.getElementById('stat-phone-notified');
const statEmailUnverified = document.getElementById('stat-email-unverified');
const statPhoneUnverified = document.getElementById('stat-phone-unverified');
const notifyLaunchButton = document.getElementById('notify-launch-button');
const notifyLaunchSmsButton = document.getElementById('notify-launch-sms-button');
const notifyResult = document.getElementById('notify-result');
const waitlistSources = document.getElementById('waitlist-sources');
const pageviewsPanel = document.getElementById('pageviews-panel');
const statPageviewsTotal = document.getElementById('stat-pageviews-total');
const statPageviews24h = document.getElementById('stat-pageviews-24h');
const statPageviews7d = document.getElementById('stat-pageviews-7d');
const pageviewsSources = document.getElementById('pageviews-sources');

function getAdminKey() {
  return sessionStorage.getItem('meylio.adminKey');
}

function labelFor(user) {
  return user.displayName || user.email || user.phone || user.id.slice(0, 8);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

async function loadReports() {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  const status = statusFilter.value;
  const response = await fetch(`${API_BASE_URL}/admin/reports?status=${status}`, {
    headers: { 'x-admin-key': adminKey },
  });

  if (response.status === 401) {
    sessionStorage.removeItem('meylio.adminKey');
    showKeyGate('Clé invalide, réessaie.');
    return;
  }

  const reports = await response.json();
  renderReports(reports);
}

function renderReports(reports) {
  reportsList.innerHTML = '';

  if (reports.length === 0) {
    reportsList.classList.add('hidden');
    emptyMessage.classList.remove('hidden');
    return;
  }
  emptyMessage.classList.add('hidden');
  reportsList.classList.remove('hidden');

  for (const report of reports) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const suspendedBadge = report.reported.isSuspended
      ? `<span class="badge badge-suspended">Suspendu</span>`
      : '';
    const countBadge =
      report.reportedTotalCount > 1 ? `<span class="badge badge-count">${report.reportedTotalCount} signalements</span>` : '';

    card.innerHTML = `
      <div class="report-top">
        <div class="report-reason">${escapeHtml(report.reason)}</div>
        <div class="report-date">${formatDate(report.createdAt)}</div>
      </div>
      <div class="report-users">
        <div class="user-block">
          <div class="user-label">Signalé par</div>
          <div class="user-name">${escapeHtml(labelFor(report.reporter))}</div>
        </div>
        <div class="user-block">
          <div class="user-label">Personne signalée ${countBadge}${suspendedBadge}</div>
          <div class="user-name">${escapeHtml(labelFor(report.reported))}</div>
        </div>
      </div>
      <div class="actions"></div>
    `;

    const actions = card.querySelector('.actions');

    if (report.status === 'pending') {
      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'secondary';
      dismissBtn.textContent = 'Rejeter';
      dismissBtn.onclick = () => handleAction(report.id, 'dismiss');
      actions.appendChild(dismissBtn);

      const suspendBtn = document.createElement('button');
      suspendBtn.className = 'danger';
      suspendBtn.textContent = 'Suspendre le compte';
      suspendBtn.onclick = () => handleAction(report.id, 'action');
      actions.appendChild(suspendBtn);
    } else if (report.reported.isSuspended) {
      const unsuspendBtn = document.createElement('button');
      unsuspendBtn.className = 'secondary';
      unsuspendBtn.textContent = 'Réactiver le compte';
      unsuspendBtn.onclick = () => handleUnsuspend(report.reported.id);
      actions.appendChild(unsuspendBtn);
    }

    reportsList.appendChild(card);
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

async function handleAction(reportId, action) {
  const adminKey = getAdminKey();
  await fetch(`${API_BASE_URL}/admin/reports/${reportId}/${action}`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey },
  });
  loadReports();
}

async function handleUnsuspend(userId) {
  const adminKey = getAdminKey();
  await fetch(`${API_BASE_URL}/admin/users/${userId}/unsuspend`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey },
  });
  loadReports();
}

async function loadWaitlistStats() {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  const response = await fetch(`${API_BASE_URL}/admin/waitlist/stats`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!response.ok) return;

  const stats = await response.json();
  statPending.textContent = stats.pendingEmailCount;
  statNotified.textContent = stats.notifiedEmailCount;
  statPhonePending.textContent = stats.pendingPhoneCount;
  statPhoneNotified.textContent = stats.notifiedPhoneCount;
  statEmailUnverified.textContent = stats.unverifiedEmailCount;
  statPhoneUnverified.textContent = stats.unverifiedPhoneCount;
  notifyLaunchButton.disabled = stats.pendingEmailCount === 0;
  notifyLaunchSmsButton.disabled = stats.pendingPhoneCount === 0;
  renderSourceList(waitlistSources, stats.bySource ?? [], 'Aucune inscription pour l’instant.');
  waitlistPanel.classList.remove('hidden');
}

async function loadPageviewStats() {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  const response = await fetch(`${API_BASE_URL}/admin/pageviews/stats`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!response.ok) return;

  const stats = await response.json();
  statPageviewsTotal.textContent = stats.total;
  statPageviews24h.textContent = stats.last24h;
  statPageviews7d.textContent = stats.last7d;
  renderSourceList(pageviewsSources, stats.bySource ?? [], 'Aucune visite pour l’instant.');
  pageviewsPanel.classList.remove('hidden');
}

function renderSourceList(container, bySource, emptyMessage) {
  if (bySource.length === 0) {
    container.innerHTML = `<p class="source-empty">${emptyMessage}</p>`;
    return;
  }

  const maxCount = Math.max(...bySource.map((row) => row.count));
  container.innerHTML = bySource
    .map((row) => {
      const widthPct = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0;
      return `
        <div class="source-row">
          <span class="source-name" title="${row.source}">${row.source}</span>
          <span class="source-bar-track"><span class="source-bar-fill" style="width:${widthPct}%"></span></span>
          <span class="source-count">${row.count}</span>
        </div>
      `;
    })
    .join('');
}

async function handleNotifyLaunch() {
  const pendingCount = statPending.textContent;
  const confirmed = confirm(
    `Envoyer l'email de lancement à ${pendingCount} personne(s) ? Cette action est irréversible.`
  );
  if (!confirmed) return;

  const adminKey = getAdminKey();
  notifyLaunchButton.disabled = true;
  notifyResult.textContent = 'Envoi en cours…';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/waitlist/notify-launch`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
    });
    const result = await response.json();
    notifyResult.textContent = `${result.sent} email(s) envoyé(s)${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}.`;
  } catch {
    notifyResult.textContent = "Échec de l'envoi. Réessaie.";
  } finally {
    loadWaitlistStats();
  }
}

async function handleNotifyLaunchSms() {
  const pendingCount = statPhonePending.textContent;
  const confirmed = confirm(
    `Envoyer le SMS de lancement à ${pendingCount} personne(s) ? Cette action est irréversible.`
  );
  if (!confirmed) return;

  const adminKey = getAdminKey();
  notifyLaunchSmsButton.disabled = true;
  notifyResult.textContent = 'Envoi en cours…';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/waitlist/notify-launch-sms`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
    });
    const result = await response.json();
    notifyResult.textContent = `${result.sent} SMS envoyé(s)${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}.`;
  } catch {
    notifyResult.textContent = "Échec de l'envoi. Réessaie.";
  } finally {
    loadWaitlistStats();
  }
}

function showKeyGate(message) {
  keyGate.classList.remove('hidden');
  reportsList.classList.add('hidden');
  emptyMessage.classList.add('hidden');
  waitlistPanel.classList.add('hidden');
  pageviewsPanel.classList.add('hidden');
  document.getElementById('marketing-panel')?.classList.add('hidden');
  document.getElementById('users-panel')?.classList.add('hidden');
  keyError.textContent = message ?? '';
}

keySubmit.addEventListener('click', () => {
  const value = keyInput.value.trim();
  if (!value) return;
  sessionStorage.setItem('meylio.adminKey', value);
  keyGate.classList.add('hidden');
  loadReports();
  loadWaitlistStats();
  loadPageviewStats();
});

keyInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') keySubmit.click();
});

statusFilter.addEventListener('change', loadReports);
refreshButton.addEventListener('click', () => {
  loadReports();
  loadWaitlistStats();
  loadPageviewStats();
});
notifyLaunchButton.addEventListener('click', handleNotifyLaunch);
notifyLaunchSmsButton.addEventListener('click', handleNotifyLaunchSms);

if (getAdminKey()) {
  keyGate.classList.add('hidden');
  loadReports();
  loadWaitlistStats();
  loadPageviewStats();
} else {
  showKeyGate();
}

const marketingPanel = document.getElementById('marketing-panel');
const mkSubject = document.getElementById('mk-subject');
const mkMessage = document.getElementById('mk-message');
const mkResult = document.getElementById('mk-result');

async function loadMarketingAudience() {
  const adminKey = getAdminKey();
  if (!adminKey) return;
  const response = await fetch(`${API_BASE_URL}/admin/marketing/audience`, { headers: { 'x-admin-key': adminKey } });
  if (!response.ok) return;
  const data = await response.json();
  document.getElementById('stat-mk-total').textContent = data.optedIn;
  document.getElementById('stat-mk-email').textContent = data.withEmail;
  document.getElementById('stat-mk-phone').textContent = data.withPhone;
  marketingPanel.classList.remove('hidden');
}

async function sendMarketing(channel) {
  const adminKey = getAdminKey();
  const audience = Number(document.getElementById(channel === 'email' ? 'stat-mk-email' : 'stat-mk-phone').textContent) || 0;
  if (audience === 0) {
    mkResult.textContent = 'Personne à contacter sur ce canal pour le moment.';
    return;
  }
  if (!window.confirm(`Envoyer ce message à ${audience} personne(s) par ${channel === 'email' ? 'email' : 'SMS'} ?`)) return;
  mkResult.textContent = 'Envoi en cours…';
  const response = await fetch(`${API_BASE_URL}/admin/marketing/send`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, subject: mkSubject.value, message: mkMessage.value }),
  });
  const data = await response.json();
  mkResult.textContent = response.ok ? `Envoyés : ${data.sent} · Échecs : ${data.failed}` : data.error ?? 'Erreur';
}

document.getElementById('mk-send-email').addEventListener('click', () => sendMarketing('email'));
document.getElementById('mk-send-sms').addEventListener('click', () => sendMarketing('sms'));
if (getAdminKey()) loadMarketingAudience();
keySubmit.addEventListener('click', () => setTimeout(loadMarketingAudience, 400));
refreshButton.addEventListener('click', loadMarketingAudience);

const feedbackPanel = document.getElementById('feedback-panel');
const feedbackList = document.getElementById('feedback-list');

function feedbackReplyBlock(feedback) {
  if (feedback.repliedAt) {
    return `<p class="report-date">Répondu le ${formatDate(feedback.repliedAt)}</p>
      <div style="white-space: pre-line;">${escapeHtml(feedback.replyMessage)}</div>`;
  }
  const phone = feedback.user?.phone;
  const email = feedback.user?.email;
  if (!phone && !email) return '<p class="report-date">Aucun contact : réponse impossible.</p>';
  return `
    <p class="report-date">Réponse par ${phone ? `SMS Meylio au ${escapeHtml(phone)}` : `email à ${escapeHtml(email)}`}</p>
    <textarea data-feedback-reply rows="3" maxlength="300" placeholder="Ta réponse (300 caractères maximum)" style="width:100%;padding:10px;border-radius:8px;border:1px solid #2a2a33;background:#14141a;color:#fff"></textarea>
    <div class="notify-buttons"><button data-feedback-send="${escapeHtml(feedback.id)}">Envoyer la réponse</button></div>
    <p class="notify-result" data-feedback-result></p>`;
}

async function loadFeedback() {
  const adminKey = getAdminKey();
  if (!adminKey) return;
  const response = await fetch(`${API_BASE_URL}/admin/feedback`, { headers: { 'x-admin-key': adminKey } });
  if (!response.ok) return;
  const feedbacks = await response.json();
  feedbackList.innerHTML = feedbacks.length === 0
    ? '<p class="empty">Aucun avis pour le moment.</p>'
    : feedbacks.map((feedback) => `
      <div class="report-card">
        <div class="report-top">
          <strong>${escapeHtml(feedback.user?.displayName ?? 'Anonyme')}</strong>
          <span class="report-date">${feedback.rating ? '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating) : 'sans note'} · v${escapeHtml(feedback.appVersion ?? '?')} · ${formatDate(feedback.createdAt)}</span>
        </div>
        <div class="report-reason" style="white-space: pre-line;">${escapeHtml(feedback.message)}</div>
        <div data-feedback-card>${feedbackReplyBlock(feedback)}</div>
      </div>`).join('');
  feedbackPanel.classList.remove('hidden');
}

feedbackList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-feedback-send]');
  if (!button) return;
  const card = button.closest('[data-feedback-card]');
  const result = card.querySelector('[data-feedback-result]');
  const message = card.querySelector('[data-feedback-reply]').value.trim();
  if (!message) {
    result.textContent = 'Écris ta réponse avant d’envoyer.';
    return;
  }
  button.disabled = true;
  result.textContent = 'Envoi en cours…';
  try {
    const response = await fetch(`${API_BASE_URL}/admin/feedback/${button.dataset.feedbackSend}/reply`, {
      method: 'POST',
      headers: { 'x-admin-key': getAdminKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'L’envoi a échoué.');
    loadFeedback();
  } catch (error) {
    result.textContent = error.message;
    button.disabled = false;
  }
});

if (getAdminKey()) loadFeedback();
keySubmit.addEventListener('click', () => setTimeout(loadFeedback, 400));
refreshButton.addEventListener('click', loadFeedback);

async function loadUserStats() {
  const adminKey = getAdminKey();
  if (!adminKey) return;
  const response = await fetch(`${API_BASE_URL}/admin/users/stats`, { headers: { 'x-admin-key': adminKey } });
  if (!response.ok) return;
  const stats = await response.json();
  const set = (id, value) => { document.getElementById(id).textContent = value; };
  set('stat-users-total', stats.total);
  set('stat-users-7d', stats.last7d);
  set('stat-users-prev7d', stats.previous7d);
  set('stat-users-30d', stats.last30d);
  set('stat-users-active7d', stats.active7d);
  set('stat-users-active30d', stats.active30d);
  set('stat-users-verified', stats.verified);
  set('stat-users-premium', stats.premium);
  set('stat-users-suspended', stats.suspended);
  const e = stats.engagement7d;
  set('users-engagement', `7 derniers jours : ${e.likes} likes · ${e.matches} matchs · ${e.messages} messages. ${e.matchesTotal} matchs au total.`);
  renderSourceList(
    document.getElementById('users-funnel'),
    stats.funnel.map((row) => ({ source: row.step, count: row.count })),
    'Aucun compte pour le moment.'
  );
  renderSourceList(document.getElementById('users-music'), stats.music, 'Aucun compte pour le moment.');
  renderSourceList(
    document.getElementById('users-by-day'),
    stats.byDay.map((row) => ({ source: row.day.split('-').reverse().slice(0, 2).join('/'), count: row.count })),
    'Aucune inscription.'
  );
  document.getElementById('users-panel').classList.remove('hidden');
}

if (getAdminKey()) loadUserStats();
keySubmit.addEventListener('click', () => setTimeout(loadUserStats, 400));
refreshButton.addEventListener('click', loadUserStats);
