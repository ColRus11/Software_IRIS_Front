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
};
