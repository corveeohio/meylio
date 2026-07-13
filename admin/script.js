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
const notifyLaunchButton = document.getElementById('notify-launch-button');
const notifyLaunchSmsButton = document.getElementById('notify-launch-sms-button');
const notifyResult = document.getElementById('notify-result');
const waitlistSources = document.getElementById('waitlist-sources');

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
  notifyLaunchButton.disabled = stats.pendingEmailCount === 0;
  notifyLaunchSmsButton.disabled = stats.pendingPhoneCount === 0;
  renderWaitlistSources(stats.bySource ?? []);
  waitlistPanel.classList.remove('hidden');
}

function renderWaitlistSources(bySource) {
  if (bySource.length === 0) {
    waitlistSources.innerHTML = '<p class="source-empty">Aucune inscription pour l’instant.</p>';
    return;
  }

  const maxCount = Math.max(...bySource.map((row) => row.count));
  waitlistSources.innerHTML = bySource
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
  keyError.textContent = message ?? '';
}

keySubmit.addEventListener('click', () => {
  const value = keyInput.value.trim();
  if (!value) return;
  sessionStorage.setItem('meylio.adminKey', value);
  keyGate.classList.add('hidden');
  loadReports();
  loadWaitlistStats();
});

keyInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') keySubmit.click();
});

statusFilter.addEventListener('change', loadReports);
refreshButton.addEventListener('click', () => {
  loadReports();
  loadWaitlistStats();
});
notifyLaunchButton.addEventListener('click', handleNotifyLaunch);
notifyLaunchSmsButton.addEventListener('click', handleNotifyLaunchSms);

if (getAdminKey()) {
  keyGate.classList.add('hidden');
  loadReports();
  loadWaitlistStats();
} else {
  showKeyGate();
}
