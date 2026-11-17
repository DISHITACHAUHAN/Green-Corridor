/**
 * GREEN CORRIDOR AI PLATFORM - SHARED DASHBOARD UTILITIES & UI CONTROLS
 * Government-Style Interactivity, Table Sorting, Real-time Clock, Accessibility
 */

(function () {
  'use strict';

  // 1. Utility Bar Clock (Formatted as e.g. "Tuesday, November 17, 2026 7:23:21 PM")
  function initLiveClock() {
    const clockEl = document.getElementById('utility-datetime');
    if (!clockEl) return;

    function update() {
      const now = new Date();
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      clockEl.innerHTML = `🕒 ${now.toLocaleDateString('en-IN', options)}`;
    }
    update();
    setInterval(update, 1000);
  }

  // 2. Accessibility Font Resizer (A- / A / A+)
  function initFontResizer() {
    let currentZoom = 100;
    const btnDecrease = document.getElementById('font-decrease');
    const btnReset = document.getElementById('font-reset');
    const btnIncrease = document.getElementById('font-increase');

    if (btnDecrease) {
      btnDecrease.addEventListener('click', () => {
        if (currentZoom > 85) {
          currentZoom -= 5;
          document.body.style.fontSize = (14 * (currentZoom / 100)) + 'px';
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        currentZoom = 100;
        document.body.style.fontSize = '14px';
      });
    }

    if (btnIncrease) {
      btnIncrease.addEventListener('click', () => {
        if (currentZoom < 130) {
          currentZoom += 5;
          document.body.style.fontSize = (14 * (currentZoom / 100)) + 'px';
        }
      });
    }
  }

  // 3. Toast Notifications
  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button style="background:none;border:none;color:#FFF;cursor:pointer;margin-left:12px;font-weight:bold;">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 4500);
  };

  // 4. Notification Bell & Panel Dropdown
  function initNotificationPanel() {
    const bellBtn = document.getElementById('notif-bell-btn');
    const panel = document.getElementById('notif-dropdown-panel');
    const listEl = document.getElementById('notif-dropdown-list');
    const badgeEl = document.getElementById('notif-unread-count');

    if (!bellBtn || !panel) return;

    function renderNotifications() {
      if (!window.GC_DATA) return;
      const notifs = window.GC_DATA.notifications;
      const unread = notifs.filter(n => !n.read).length;

      if (badgeEl) {
        badgeEl.textContent = unread;
        badgeEl.style.display = unread > 0 ? 'inline-block' : 'none';
      }

      if (listEl) {
        if (notifs.length === 0) {
          listEl.innerHTML = '<li style="padding:10px;text-align:center;color:#888;">No recent notifications</li>';
          return;
        }

        listEl.innerHTML = notifs.slice(0, 6).map(n => `
          <li style="padding:8px 12px;border-bottom:1px solid #EEE;font-size:12px;background:${n.read ? '#FFF' : '#F4FBFC'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
              <span class="badge ${n.severity === 'critical' ? 'badge-red' : (n.severity === 'warning' ? 'badge-yellow' : 'badge-blue')}">${n.type}</span>
              <span style="color:#888;font-size:10px;">${n.timestamp}</span>
            </div>
            <div style="color:#333;font-weight:${n.read ? 'normal' : '600'}">${n.message}</div>
          </li>
        `).join('');
      }
    }

    renderNotifications();

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = panel.style.display === 'block';
      panel.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== bellBtn) {
        panel.style.display = 'none';
      }
    });

    // Hook mark-all-read if present
    const markReadBtn = document.getElementById('notif-mark-read');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', () => {
        if (window.GC_DATA) {
          window.GC_DATA.notifications.forEach(n => n.read = true);
          window.GC_DATA.saveAll();
          renderNotifications();
          window.showToast('All notifications marked as read', 'info');
        }
      });
    }
  }

  // 5. Traditional Table Export to CSV
  window.exportTableToCSV = function (tableId, filename = 'export.csv') {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');

    for (let i = 0; i < rows.length; i++) {
      let row = [], cols = rows[i].querySelectorAll('td, th');
      for (let j = 0; j < cols.length; j++) {
        // Strip out actions column or button text if needed
        let cellText = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').trim();
        cellText = cellText.replace(/"/g, '""');
        row.push('"' + cellText + '"');
      }
      csv.push(row.join(','));
    }

    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.showToast(`Exported ${filename} successfully`, 'success');
  };

  // 6. Generic Table Search & Filter Helper
  window.initTableSearch = function (inputId, tableId, filterIndex = null) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;

    input.addEventListener('keyup', function () {
      const filter = input.value.toLowerCase();
      const rows = table.querySelectorAll('tbody tr');

      rows.forEach(row => {
        const text = filterIndex !== null 
          ? (row.cells[filterIndex] ? row.cells[filterIndex].innerText.toLowerCase() : '')
          : row.innerText.toLowerCase();

        row.style.display = text.indexOf(filter) > -1 ? '' : 'none';
      });
    });
  };

  // 7. Modal Handlers
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  };

  // Setup click-outside-to-close for all modals
  function initModalDismiss() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  // 8. Ticker Pause/Play
  function initTickerControls() {
    const tickerText = document.querySelector('.ticker-text');
    const pauseBtn = document.getElementById('ticker-pause-btn');
    if (!tickerText || !pauseBtn) return;

    let isPaused = false;
    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      tickerText.style.animationPlayState = isPaused ? 'paused' : 'running';
      pauseBtn.textContent = isPaused ? '▶' : '⏸';
    });
  }

  // Initialize all common UI upon DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initLiveClock();
    initFontResizer();
    initNotificationPanel();
    initModalDismiss();
    initTickerControls();
  });

})();
