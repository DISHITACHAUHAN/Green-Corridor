/**
 * GREEN CORRIDOR AI PLATFORM - PHASE 8: REAL-TIME AMBULANCE TRACKING
 *
 * Provides WebSocket-based live GPS tracking for emergency ambulances.
 * Dynamically updates Leaflet markers, speed indicators, ETAs, and connection badges
 * across Control Room, Ambulance, Hospital, and Mission Detail dashboards.
 */

(function () {
  'use strict';

  class MissionTracker {
    constructor() {
      this.ws = null;
      this.currentMissionId = null;
      this.ambulanceMarker = null;
      this.mapInstance = null;
      this.reconnectTimer = null;
      this.pingInterval = null;
      this.historyTrail = null;
      this.listeners = [];
    }

    /**
     * Connect to the WebSocket tracking endpoint for a specific mission.
     * @param {string} missionId - e.g. "GC-2024-001"
     * @param {Object} options - { map: L.Map, marker: L.Marker, badgeElId: string }
     */
    connect(missionId, options = {}) {
      if (!missionId) return;

      if (this.currentMissionId === missionId && this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log(`[Tracking] Already connected to mission ${missionId}`);
        return;
      }

      this.disconnect();
      this.currentMissionId = missionId;
      if (options.map) this.mapInstance = options.map;
      if (options.marker) this.ambulanceMarker = options.marker;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/tracking/${encodeURIComponent(missionId)}`;

      console.log(`[Tracking] Connecting WebSocket to: ${wsUrl}`);
      this.updateStatusBadge('connecting', 'Connecting...');

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`[Tracking] Connected to mission: ${missionId}`);
          this.updateStatusBadge('connected', '🟢 Live Tracking Connected');

          // Keep-alive heartbeat ping every 25s
          this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send('ping');
            }
          }, 25000);
        };

        this.ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'gps_update' && payload.data) {
              this.handleGPSUpdate(payload.data);
            } else if (payload.type === 'connection_established') {
              console.log('[Tracking] Handshake confirmed:', payload);
            }
          } catch (e) {
            console.error('[Tracking] Message parse error:', e);
          }
        };

        this.ws.onclose = (event) => {
          console.warn(`[Tracking] WebSocket closed for ${missionId}:`, event.code, event.reason);
          this.updateStatusBadge('disconnected', '⚪ Offline / Reconnecting...');
          this.cleanupTimers();

          // Reconnect after 3 seconds if not intentionally closed
          if (this.currentMissionId === missionId) {
            this.reconnectTimer = setTimeout(() => {
              this.connect(missionId, options);
            }, 3000);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[Tracking] WebSocket error:', err);
          this.updateStatusBadge('error', '🔴 Tracking Connection Error');
        };
      } catch (err) {
        console.error('[Tracking] Failed to instantiate WebSocket:', err);
        this.updateStatusBadge('error', '🔴 Connection Failed');
      }
    }

    /**
     * Handles an incoming GPS telemetry update.
     */
    handleGPSUpdate(gps) {
      const lat = parseFloat(gps.latitude);
      const lng = parseFloat(gps.longitude);
      const speed = gps.speed || 0;
      const heading = gps.heading || 0;
      const eta = gps.eta_minutes;

      // 1. Update Leaflet map marker
      this.updateMapMarker(lat, lng, gps);

      // 2. Update telemetry display DOM elements if present
      this.updateDOMTelemetry(gps);

      // 3. Notify external listeners
      this.listeners.forEach((fn) => {
        try {
          fn(gps);
        } catch (e) {
          console.error(e);
        }
      });
    }

    /**
     * Updates or creates the ambulance marker on the Leaflet map.
     */
    updateMapMarker(lat, lng, gps) {
      if (!this.mapInstance && typeof window.map !== 'undefined') {
        this.mapInstance = window.map;
      }

      if (!this.mapInstance) return;

      const popupHtml = `
        <div style="font-size:12px; line-height:1.4;">
          <strong style="color:#07899E; font-size:13px;">🚑 Ambulance ${gps.ambulance_id}</strong><br>
          <strong>Speed:</strong> ${gps.speed} km/h<br>
          <strong>Heading:</strong> ${gps.heading || 'N/A'}°<br>
          <strong>ETA:</strong> ${gps.eta_minutes ? gps.eta_minutes + ' mins' : 'Calculating'}<br>
          <span style="font-size:10px; color:${gps.is_simulated ? '#D97706' : '#218653'};">
            ${gps.is_simulated ? '⚡ Live GPS Simulated Telemetry' : '📡 Real-Time GPS'}
          </span>
        </div>
      `;

      if (this.ambulanceMarker) {
        this.ambulanceMarker.setLatLng([lat, lng]);
        if (this.ambulanceMarker.getPopup()) {
          this.ambulanceMarker.getPopup().setContent(popupHtml);
        }
      } else {
        const ambIcon = L.divIcon({
          html: '<div style="font-size:24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); animation: pulse 1.5s infinite;">🚑</div>',
          className: 'amb-live-map-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        this.ambulanceMarker = L.marker([lat, lng], { icon: ambIcon }).bindPopup(popupHtml);
        if (typeof window.markersLayer !== 'undefined') {
          window.markersLayer.addLayer(this.ambulanceMarker);
        } else {
          this.ambulanceMarker.addTo(this.mapInstance);
        }
      }
    }

    /**
     * Updates text telemetry values on the page.
     */
    updateDOMTelemetry(gps) {
      const speedEls = document.querySelectorAll('.live-tracking-speed');
      speedEls.forEach((el) => {
        el.textContent = `${gps.speed} km/h`;
      });

      const coordsEls = document.querySelectorAll('.live-tracking-coords');
      coordsEls.forEach((el) => {
        el.textContent = `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`;
      });

      const etaEls = document.querySelectorAll('.live-tracking-eta');
      etaEls.forEach((el) => {
        if (gps.eta_minutes) el.textContent = `${gps.eta_minutes} Mins`;
      });

      const simTag = document.getElementById('tracking-sim-indicator');
      if (simTag) {
        simTag.style.display = gps.is_simulated ? 'inline-block' : 'none';
      }
    }

    /**
     * Updates visual status badge.
     */
    updateStatusBadge(state, text) {
      const badges = document.querySelectorAll('.tracking-status-badge');
      badges.forEach((badge) => {
        badge.textContent = text;
        badge.className = 'tracking-status-badge badge ' + (
          state === 'connected' ? 'badge-success' :
          state === 'connecting' ? 'badge-warning' :
          state === 'error' ? 'badge-danger' : 'badge-neutral'
        );
      });
    }

    cleanupTimers() {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }

    disconnect() {
      this.cleanupTimers();
      this.currentMissionId = null;
      if (this.ws) {
        try {
          this.ws.close();
        } catch (e) {}
        this.ws = null;
      }
      this.updateStatusBadge('disconnected', '⚪ Tracking Inactive');
    }

    onUpdate(fn) {
      this.listeners.push(fn);
    }
  }

  // Global Tracker instance
  window.GC_TRACKER = new MissionTracker();

  // Helper APIs for starting/stopping simulated GPS movement
  window.startGpsSimulation = async function (missionId = 'GC-2024-001', ambulanceId = 'AMB-001') {
    try {
      const res = await fetch('/api/v1/tracking/simulator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: missionId,
          ambulance_id: ambulanceId,
          interval_seconds: 1.5,
          speed_kmh: 62.0,
          loop: true,
        }),
      });
      const data = await res.json();
      console.log('[Tracking] Simulator started:', data);
      if (typeof window.showToast === 'function') {
        window.showToast(`Simulated GPS tracking started for ${missionId}!`, 'success');
      }
      // Ensure WebSocket is connected to this mission
      window.GC_TRACKER.connect(missionId);
      return data;
    } catch (err) {
      console.error('[Tracking] Failed to start simulator:', err);
    }
  };

  window.stopGpsSimulation = async function (missionId = null) {
    try {
      const url = missionId
        ? `/api/v1/tracking/simulator/stop?mission_id=${encodeURIComponent(missionId)}`
        : '/api/v1/tracking/simulator/stop';
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      console.log('[Tracking] Simulator stopped:', data);
      if (typeof window.showToast === 'function') {
        window.showToast('GPS movement simulator stopped.', 'info');
      }
      return data;
    } catch (err) {
      console.error('[Tracking] Failed to stop simulator:', err);
    }
  };
})();
