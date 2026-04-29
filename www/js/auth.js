/**
 * IRIS / Un Mundo en Silencio — Auth Module
 * Firebase Authentication + Firestore role verification
 * Basado en FirebaseAuthProvider.cs del repo del compañero (UnPaused MAUI)
 */
const IrisAuth = {
    currentUser: null,
    currentRole: null,
    currentProfile: null,
    _initialized: false,

    _isFirebaseReady() {
        const fb = IRIS_CONFIG.FIREBASE;
        return fb.apiKey && fb.apiKey !== 'YOUR_API_KEY'
            && fb.messagingSenderId && fb.messagingSenderId !== ''
            && fb.appId && fb.appId !== '';
    },

    init() {
        if (this._initialized) return;

        if (this._isFirebaseReady()) {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(IRIS_CONFIG.FIREBASE);
                }
                firebase.auth().onAuthStateChanged(async (user) => {
                    if (user) {
                        const savedRole = localStorage.getItem('iris_role');
                        this.currentUser = user;
                        this.currentRole = savedRole || IRIS_CONFIG.ROLES.STUDENT;
                        await this._loadProfile(user);
                        this._onLogin(user);
                    } else {
                        this._onLogout();
                    }
                });
            } catch (error) {
                console.warn('Firebase init error — modo demo:', error.message);
                this._enableDemoMode();
            }
        } else {
            console.info('🔑 Firebase incompleto — modo demo activo.');
            this._enableDemoMode();
        }
        this._initialized = true;
    },

    _enableDemoMode() {
        // NO auto-login — espera a que el usuario llene el formulario
        console.info('🎭 Modo demo activo — cualquier correo/contraseña funciona.');
    },


    async _loadProfile(user) {
        try {
            const idToken = await user.getIdToken();
            const profile = await IrisFirestore.getUserProfile(user.uid, idToken);
            if (profile) {
                this.currentProfile = profile;
                if (profile.role) {
                    this.currentRole = profile.role;
                    localStorage.setItem('iris_role', profile.role);
                }
            }
        } catch (e) {
            console.warn('loadProfile error:', e);
        }
    },

    /**
     * Login con rol — valida contra Firestore (como FirebaseAuthProvider.cs)
     */
    async login(email, password, selectedRole) {
        if (!this._isFirebaseReady()) {
            // MODO DEMO — cualquier correo/contraseña funciona
            this.currentUser = { uid: 'demo-' + Date.now(), email };
            this.currentRole = selectedRole || IRIS_CONFIG.ROLES.STUDENT;
            this.currentProfile = { displayName: email.split('@')[0], role: this.currentRole };
            localStorage.setItem('iris_role', this.currentRole);
            this._onLogin(this.currentUser);
            return this.currentUser;
        }

        const result = await firebase.auth().signInWithEmailAndPassword(email, password).catch(e => { throw this._parseError(e); });
        const user = result.user;
        const idToken = await user.getIdToken();

        // Verificar rol en Firestore (lógica del compañero)
        const confirmedRole = await IrisFirestore.verifyRole(user.uid, selectedRole, idToken).catch(e => { throw e; });

        this.currentUser = user;
        this.currentRole = confirmedRole;
        this.currentProfile = await IrisFirestore.getUserProfile(user.uid, idToken);
        localStorage.setItem('iris_role', confirmedRole);
        return user;
    },

    async register(email, password, selectedRole, displayName) {
        if (IRIS_CONFIG.FIREBASE.apiKey === 'YOUR_API_KEY') {
            this.currentUser = { uid: 'demo-' + Date.now(), email };
            this.currentRole = selectedRole;
            this.currentProfile = { displayName: displayName || email.split('@')[0], role: selectedRole };
            localStorage.setItem('iris_role', selectedRole);
            this._onLogin(this.currentUser);
            return this.currentUser;
        }

        const result = await firebase.auth().createUserWithEmailAndPassword(email, password).catch(e => { throw this._parseError(e); });
        const user = result.user;
        const idToken = await user.getIdToken();

        // Guardar perfil en Firestore con rol (como FirestoreUserRepository.SaveAsync)
        const profile = {
            uid: user.uid,
            displayName: displayName || email.split('@')[0],
            email: user.email,
            role: selectedRole,
            university: '',
        };
        await IrisFirestore.saveUserProfile(profile, idToken);

        this.currentUser = user;
        this.currentRole = selectedRole;
        this.currentProfile = profile;
        localStorage.setItem('iris_role', selectedRole);
        return user;
    },

    async logout() {
        if (this._isFirebaseReady()) {
            try { await firebase.auth().signOut(); } catch(e) { /* ignore */ }
        }
        this.currentUser = null;
        this.currentRole = null;
        this.currentProfile = null;
        localStorage.removeItem('iris_role');
        this._onLogout();
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

    _parseError(error) {
        const messages = {
            'auth/email-already-in-use': 'Este correo ya está registrado.',
            'auth/invalid-email': 'El correo electrónico no es válido.',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
            'auth/user-not-found': 'No existe una cuenta con este correo.',
            'auth/wrong-password': 'La contraseña es incorrecta.',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
            'auth/invalid-credential': 'Credenciales inválidas.',
        };
        return new Error(messages[error.code] || error.message);
    },
};
