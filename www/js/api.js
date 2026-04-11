/**
 * IRIS - Módulo API
 * Comunicación con el backend Django REST
 */
const IrisAPI = {
    /**
     * Obtener headers para las peticiones
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        // Agregar Firebase token si existe
        const user = IrisAuth.currentUser;
        if (user && user.uid) {
            headers['X-Firebase-UID'] = user.uid;
        }
        return headers;
    },

    /**
     * Crear una nueva pregunta
     * @param {Object} data - { text, session_name, firebase_uid }
     * @returns {Promise<Object>}
     */
    async createQuestion(data) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/questions/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API createQuestion error:', error);
            throw error;
        }
    },

    /**
     * Obtener preguntas del usuario
     * @param {string} firebaseUid - UID de Firebase
     * @param {string} session - (opcional) filtrar por sesión
     * @returns {Promise<Object>}
     */
    async getQuestions(firebaseUid, session = null) {
        try {
            let url = `${IRIS_CONFIG.API_URL}/questions/?firebase_uid=${encodeURIComponent(firebaseUid)}`;
            if (session) {
                url += `&session=${encodeURIComponent(session)}`;
            }
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API getQuestions error:', error);
            throw error;
        }
    },

    /**
     * Marcar pregunta como reproducida con voz
     * @param {number} questionId
     * @returns {Promise<Object>}
     */
    async markSpoken(questionId) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/questions/${questionId}/mark_spoken/`, {
                method: 'PATCH',
                headers: this.getHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API markSpoken error:', error);
            throw error;
        }
    },

    /**
     * Eliminar pregunta
     * @param {number} questionId
     * @returns {Promise<void>}
     */
    async deleteQuestion(questionId) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/questions/${questionId}/`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('API deleteQuestion error:', error);
            throw error;
        }
    },

    // ────── Video API (SCRUM-38) ──────

    /**
     * Subir un video — SCRUM-39
     * @param {File} file
     * @param {string} title
     * @param {string} language
     * @returns {Promise<Object>}
     */
    async uploadVideo(file, title, language = 'es') {
        try {
            const formData = new FormData();
            formData.append('video_file', file);
            formData.append('title', title);
            formData.append('language', language);

            const user = IrisAuth.currentUser;
            if (user && user.uid) {
                formData.append('firebase_uid', user.uid);
            }

            const headers = {};
            if (user && user.uid) {
                headers['X-Firebase-UID'] = user.uid;
            }

            const response = await fetch(`${IRIS_CONFIG.API_URL}/videos/`, {
                method: 'POST',
                headers: headers,
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || err.video_file?.[0] || `Error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API uploadVideo error:', error);
            throw error;
        }
    },

    /**
     * Listar videos del docente
     * @param {string} firebaseUid
     * @returns {Promise<Array>}
     */
    async getVideos(firebaseUid) {
        try {
            let url = `${IRIS_CONFIG.API_URL}/videos/`;
            if (firebaseUid) {
                url += `?firebase_uid=${encodeURIComponent(firebaseUid)}`;
            }
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API getVideos error:', error);
            throw error;
        }
    },

    /**
     * Obtener detalle de un video con subtítulos
     * @param {number} videoId
     * @returns {Promise<Object>}
     */
    async getVideo(videoId) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/videos/${videoId}/`, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API getVideo error:', error);
            throw error;
        }
    },

    /**
     * Generar subtítulos automáticos — SCRUM-41
     * @param {number} videoId
     * @returns {Promise<Object>}
     */
    async generateSubtitles(videoId) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/videos/${videoId}/generate_subtitles/`, {
                method: 'POST',
                headers: this.getHeaders(),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || err[0] || `Error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API generateSubtitles error:', error);
            throw error;
        }
    },

    /**
     * Editar un subtítulo — SCRUM-43
     * @param {number} subtitleId
     * @param {string} text
     * @returns {Promise<Object>}
     */
    async editSubtitle(subtitleId, text) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/subtitles/${subtitleId}/`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({ text }),
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API editSubtitle error:', error);
            throw error;
        }
    },

    /**
     * Publicar un video — SCRUM-45
     * @param {number} videoId
     * @returns {Promise<Object>}
     */
    async publishVideo(videoId) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/videos/${videoId}/publish/`, {
                method: 'PATCH',
                headers: this.getHeaders(),
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API publishVideo error:', error);
            throw error;
        }
    },
};
