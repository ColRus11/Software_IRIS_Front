/**
 * IRIS / Un Mundo en Silencio — Módulo Firestore
 * Lee y guarda perfiles de usuario en Firestore REST API
 * Basado en FirestoreUserRepository.cs del repo del compañero (UnPaused MAUI)
 */
const IrisFirestore = {

    /**
     * Obtener perfil de usuario desde Firestore
     * @param {string} uid - Firebase UID
     * @param {string} idToken - Firebase ID token para autenticación
     * @returns {Promise<Object|null>}
     */
    async getUserProfile(uid, idToken) {
        try {
            const url = `${IRIS_CONFIG.FIRESTORE_URL}/users/${uid}`;
            const headers = { 'Content-Type': 'application/json' };
            if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

            const response = await fetch(url, { headers });
            if (!response.ok) return null;

            const doc = await response.json();
            const fields = doc.fields || {};

            return {
                uid,
                displayName: fields.displayName?.stringValue || '',
                email: fields.email?.stringValue || '',
                role: fields.role?.stringValue || '',
                university: fields.university?.stringValue || '',
                createdAt: fields.createdAt?.timestampValue || null,
            };
        } catch (err) {
            console.warn('Firestore getUserProfile error:', err);
            return null;
        }
    },

    /**
     * Guardar perfil de usuario en Firestore
     * @param {Object} user - { uid, displayName, email, role, university }
     * @param {string} idToken - Firebase ID token
     */
    async saveUserProfile(user, idToken) {
        try {
            const url = `${IRIS_CONFIG.FIRESTORE_URL}/users/${user.uid}`;
            const body = {
                fields: {
                    displayName: { stringValue: user.displayName || '' },
                    email: { stringValue: user.email || '' },
                    role: { stringValue: user.role || '' },
                    university: { stringValue: user.university || '' },
                    createdAt: { timestampValue: new Date().toISOString() },
                }
            };
            await fetch(url + '?currentDocument.exists=false', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify(body),
            }).catch(() =>
                // Si ya existe, hacer PATCH
                fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify(body),
                })
            );
        } catch (err) {
            console.warn('Firestore saveUserProfile error:', err);
        }
    },

    /**
     * Verificar que el usuario tiene el rol indicado
     * Basado en FirebaseAuthProvider.cs — validación de rol
     * @param {string} uid
     * @param {string} expectedRole
     * @param {string} idToken
     * @returns {Promise<string>} - el rol confirmado
     */
    async verifyRole(uid, expectedRole, idToken) {
        const profile = await this.getUserProfile(uid, idToken);
        if (!profile || !profile.role) {
            // Usuario nuevo — asignar rol seleccionado
            return expectedRole;
        }
        if (profile.role !== expectedRole) {
            throw new Error(`Tu cuenta está registrada como "${profile.role}", no como "${expectedRole}".`);
        }
        return profile.role;
    },
};
