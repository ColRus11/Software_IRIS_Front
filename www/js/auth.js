/**
 * IRIS / Un Mundo en Silencio — Auth Module
 * Django JWT Authentication (djangorestframework-simplejwt)
 */
const IrisAuth = {
    currentUser:    null,  // { id, email, name, role, university }
    currentRole:    null,
    currentProfile: null,
    _initialized:   false,

    // ——————————————————————————————————————
    // INIT — comprueba si hay sesión guardada
    // ——————————————————————————————————————
    init() {
        if (this._initialized) return;
        this._initialized = true;

        const token = localStorage.getItem('iris_access');
        const user  = this._getSavedUser();

        if (token && user) {
            this.currentUser    = user;
            this.currentRole    = user.role;
            this.currentProfile = user;
            this._onLogin(user);
        }
    },

    // ——————————————————————————————————————
    // REGISTER — POST /api/auth/register/
    // ——————————————————————————————————————
    async register(email, password, role, name) {
        const res = await fetch(`${IRIS_CONFIG.API_URL}/auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role, name }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al registrarse.');

        this._saveSession(data);
        return data.user;
    },

    // ——————————————————————————————————————
    // LOGIN — POST /api/auth/login/
    // ——————————————————————————————————————
    async login(email, password, selectedRole) {
        const res = await fetch(`${IRIS_CONFIG.API_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Credenciales inválidas.');

        // Verificar que el rol coincide con lo seleccionado en el form
        if (data.user.role !== selectedRole) {
            throw new Error(`Tu cuenta está registrada como "${data.user.role}", no como "${selectedRole}".`);
        }

        this._saveSession(data);
        return data.user;
    },

    // ——————————————————————————————————————
    // LOGOUT
    // ——————————————————————————————————————
    logout() {
        localStorage.removeItem('iris_access');
        localStorage.removeItem('iris_refresh');
        localStorage.removeItem('iris_user');
        localStorage.removeItem('iris_role');
        this.currentUser    = null;
        this.currentRole    = null;
        this.currentProfile = null;
        this._onLogout();
    },

    // ——————————————————————————————————————
    // TOKEN REFRESH — POST /api/auth/refresh/
    // ——————————————————————————————————————
    async refreshToken() {
        const refresh = localStorage.getItem('iris_refresh');
        if (!refresh) return false;

        try {
            const res = await fetch(`${IRIS_CONFIG.API_URL}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
            if (!res.ok) return false;

            const data = await res.json();
            localStorage.setItem('iris_access', data.access);
            if (data.refresh) localStorage.setItem('iris_refresh', data.refresh);
            return true;
        } catch {
            return false;
        }
    },

    // ——————————————————————————————————————
    // HELPERS
    // ——————————————————————————————————————
    getAccessToken() {
        return localStorage.getItem('iris_access');
    },

    _saveSession(data) {
        localStorage.setItem('iris_access',  data.access);
        localStorage.setItem('iris_refresh', data.refresh);
        localStorage.setItem('iris_user',    JSON.stringify(data.user));
        localStorage.setItem('iris_role',    data.user.role);

        this.currentUser    = data.user;
        this.currentRole    = data.user.role;
        this.currentProfile = data.user;
        this._onLogin(data.user);
    },

    _getSavedUser() {
        try {
            return JSON.parse(localStorage.getItem('iris_user'));
        } catch {
            return null;
        }
    },

    _onLogin(user) {
        if (typeof IrisApp !== 'undefined' && IrisApp.onUserReady) {
            IrisApp.onUserReady(user);
        }
    },

    _onLogout() {
        if (typeof IrisApp !== 'undefined' && IrisApp.onUserLogout) {
            IrisApp.onUserLogout();
        }
    },
};
