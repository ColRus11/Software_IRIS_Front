/**
 * IRIS - Módulo de Autenticación
 * Firebase Authentication (email + password)
 */
const IrisAuth = {
    currentUser: null,
    _initialized: false,

    /**
     * Inicializar Firebase Auth
     */
    init() {
        if (this._initialized) return;

        // Inicializar Firebase solo si la config es válida
        if (IRIS_CONFIG.FIREBASE.apiKey !== 'YOUR_API_KEY') {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(IRIS_CONFIG.FIREBASE);
                }
                // Escuchar cambios de autenticación
                firebase.auth().onAuthStateChanged((user) => {
                    this.currentUser = user;
                    if (user) {
                        this._onLogin(user);
                    } else {
                        this._onLogout();
                    }
                });
            } catch (error) {
                console.warn('Firebase init error (modo demo activo):', error.message);
                this._enableDemoMode();
            }
        } else {
            console.info('🔑 Firebase no configurado. Usando modo demo.');
            this._enableDemoMode();
        }

        this._initialized = true;
    },

    /**
     * Modo demo cuando Firebase no está configurado
     */
    _enableDemoMode() {
        this.currentUser = {
            uid: 'demo-user-' + Date.now(),
            email: 'demo@iris.app',
        };
        // Mostrar app directamente en modo demo
        setTimeout(() => this._onLogin(this.currentUser), 100);
    },

    /**
     * Registrar nuevo usuario
     * @param {string} email
     * @param {string} password
     */
    async register(email, password) {
        if (IRIS_CONFIG.FIREBASE.apiKey === 'YOUR_API_KEY') {
            // Modo demo
            this.currentUser = { uid: 'demo-' + Date.now(), email };
            this._onLogin(this.currentUser);
            return this.currentUser;
        }

        try {
            const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            throw this._parseError(error);
        }
    },

    /**
     * Iniciar sesión
     * @param {string} email
     * @param {string} password
     */
    async login(email, password) {
        if (IRIS_CONFIG.FIREBASE.apiKey === 'YOUR_API_KEY') {
            // Modo demo
            this.currentUser = { uid: 'demo-' + Date.now(), email };
            this._onLogin(this.currentUser);
            return this.currentUser;
        }

        try {
            const result = await firebase.auth().signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            throw this._parseError(error);
        }
    },

    /**
     * Cerrar sesión
     */
    async logout() {
        if (IRIS_CONFIG.FIREBASE.apiKey !== 'YOUR_API_KEY') {
            await firebase.auth().signOut();
        }
        this.currentUser = null;
        this._onLogout();
    },

    /**
     * Callback cuando el usuario inicia sesión
     */
    _onLogin(user) {
        // Ocultar login, mostrar app
        document.getElementById('page-login').classList.remove('active');
        document.getElementById('page-login').classList.add('iris-hidden');
        document.getElementById('app-shell').classList.remove('iris-hidden');

        // Actualizar email en settings
        const emailEl = document.getElementById('settings-email');
        if (emailEl) emailEl.textContent = user.email || 'Usuario';

        // Notificar a la app
        if (typeof IrisApp !== 'undefined' && IrisApp.onUserReady) {
            IrisApp.onUserReady(user);
        }
    },

    /**
     * Callback cuando el usuario cierra sesión
     */
    _onLogout() {
        document.getElementById('page-login').classList.add('active');
        document.getElementById('page-login').classList.remove('iris-hidden');
        document.getElementById('app-shell').classList.add('iris-hidden');

        // Limpiar formulario
        const form = document.getElementById('login-form');
        if (form) form.reset();
    },

    /**
     * Parsear errores de Firebase a mensajes en español
     */
    _parseError(error) {
        const messages = {
            'auth/email-already-in-use': 'Este correo ya está registrado.',
            'auth/invalid-email': 'El correo electrónico no es válido.',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
            'auth/user-not-found': 'No existe una cuenta con este correo.',
            'auth/wrong-password': 'La contraseña es incorrecta.',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
            'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
        };
        return new Error(messages[error.code] || error.message);
    },
};
