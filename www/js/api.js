/**
 * IRIS / Un Mundo en Silencio — API Module
 * Comunicación con el backend Django REST + JWT
 */
const IrisAPI = {
    _getHeaders() {
        const token = IrisAuth.getAccessToken();
        return {
            'Content-Type':  'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
    },

    async _req(path, options = {}) {
        const res = await fetch(`${IRIS_CONFIG.API_URL}${path}`, {
            headers: this._getHeaders(), ...options,
        });

        // Token expirado — intentar refresh y reintentar una vez
        if (res.status === 401) {
            const refreshed = await IrisAuth.refreshToken();
            if (refreshed) {
                const retry = await fetch(`${IRIS_CONFIG.API_URL}${path}`, {
                    headers: this._getHeaders(), ...options,
                });
                if (!retry.ok) throw new Error(`Error ${retry.status}: ${retry.statusText}`);
                return retry.status === 204 ? null : retry.json();
            }
            // Refresh falló — sesión inválida
            IrisAuth.logout();
            throw new Error('Sesión expirada. Inicia sesión de nuevo.');
        }

        if (!res.ok) {
            let msg = `Error ${res.status}: ${res.statusText}`;
            try { const e = await res.json(); msg = e.detail || e.error || msg; } catch {}
            throw new Error(msg);
        }
        return res.status === 204 ? null : res.json();
    },

    // ── Questions ──────────────────────────────────
    createQuestion: (data)    => IrisAPI._req('/questions/', { method: 'POST', body: JSON.stringify(data) }),
    getQuestions:   (session) => IrisAPI._req(`/questions/${session ? '?session=' + encodeURIComponent(session) : ''}`),
    markSpoken:     (id)      => IrisAPI._req(`/questions/${id}/mark_spoken/`, { method: 'PATCH' }),
    deleteQuestion: (id)      => IrisAPI._req(`/questions/${id}/`, { method: 'DELETE' }),

    // ── Alerts ─────────────────────────────────────
    getAlerts:   ()     => IrisAPI._req('/alerts/'),
    createAlert: (data) => IrisAPI._req('/alerts/', { method: 'POST', body: JSON.stringify(data) }),

    // ── Transcriptions ─────────────────────────────
    getTranscriptions:   ()     => IrisAPI._req('/transcriptions/'),
    createTranscription: (data) => IrisAPI._req('/transcriptions/', { method: 'POST', body: JSON.stringify(data) }),

    // ── Group Transcriptions ───────────────────────
    getGroupSessions:         ()     => IrisAPI._req('/group-transcriptions/'),
    createGroupSession:       (data) => IrisAPI._req('/group-transcriptions/', { method: 'POST', body: JSON.stringify(data) }),

    // ── User Profile ───────────────────────────────
    getMe:        ()     => IrisAPI._req('/auth/me/'),
    updateMe:     (data) => IrisAPI._req('/auth/me/', { method: 'PATCH', body: JSON.stringify(data) }),
};
