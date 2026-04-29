/**
 * IRIS / Un Mundo en Silencio — API Module
 * Comunicación con el backend Django REST
 */
const IrisAPI = {
    getHeaders() {
        const h = { 'Content-Type': 'application/json' };
        if (IrisAuth.currentUser?.uid) h['X-Firebase-UID'] = IrisAuth.currentUser.uid;
        if (IrisAuth.currentRole)      h['X-User-Role']    = IrisAuth.currentRole;
        return h;
    },

    async _req(path, options = {}) {
        const res = await fetch(`${IRIS_CONFIG.API_URL}${path}`, {
            headers: this.getHeaders(), ...options,
        });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.status === 204 ? null : res.json();
    },

    // ── Questions (existente) ──────────────────────
    createQuestion: (data) => IrisAPI._req('/questions/', { method: 'POST', body: JSON.stringify(data) }),
    getQuestions:   (uid, session) => IrisAPI._req(`/questions/?firebase_uid=${encodeURIComponent(uid)}${session ? '&session='+encodeURIComponent(session) : ''}`),
    markSpoken:     (id)  => IrisAPI._req(`/questions/${id}/mark_spoken/`, { method: 'PATCH' }),
    deleteQuestion: (id)  => IrisAPI._req(`/questions/${id}/`, { method: 'DELETE' }),

    // ── Alerts (nuevo) ────────────────────────────
    getAlerts:    ()     => IrisAPI._req('/alerts/'),
    createAlert:  (data) => IrisAPI._req('/alerts/', { method: 'POST', body: JSON.stringify(data) }),

    // ── Transcriptions (nuevo) ────────────────────
    getTranscriptions:    ()     => IrisAPI._req('/transcriptions/'),
    createTranscription:  (data) => IrisAPI._req('/transcriptions/', { method: 'POST', body: JSON.stringify(data) }),

    // ── User Profile (nuevo) ──────────────────────
    getUserProfile:  (uid)  => IrisAPI._req(`/users/profile/?firebase_uid=${encodeURIComponent(uid)}`),
    saveUserProfile: (data) => IrisAPI._req('/users/profile/', { method: 'POST', body: JSON.stringify(data) }),
};
