/**
 * IRIS - Controlador Principal
 * Inicialización, navegación SPA, y configuración de la aplicación
 */
const IrisApp = {
    currentPage: 'home',
    toastTimeout: null,

    /**
     * Inicializar la aplicación
     */
    init() {
        // Inicializar módulos
        IrisAuth.init();
        IrisTTS.init();
        IrisQuestions.init();
        IrisVideos.init();

        // Configurar navegación
        this._setupNavigation();

        // Configurar login form
        this._setupLoginForm();

        // Configurar settings
        this._setupSettings();

        // Configurar botones de navbar
        this._setupNavbarButtons();

        // Cargar preferencias guardadas
        this._loadPreferences();

        console.log('🟢 IRIS App inicializada');
    },

    /**
     * Callback cuando el usuario está listo (post-login)
     * @param {Object} user
     */
    onUserReady(user) {
        console.log('👤 Usuario listo:', user.email);
        // Navegar a home por defecto
        this.navigateTo('home');
    },

    /**
     * Navegación SPA
     */
    _setupNavigation() {
        // Bottom navigation
        document.querySelectorAll('.iris-bottom-nav__item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // Dashboard cards
        const navMap = {
            'nav-questions': 'questions',
            'nav-history': 'history',
            'nav-videos': 'videos',
        };

        Object.entries(navMap).forEach(([id, page]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo(page);
                });
            }
        });
    },

    /**
     * Navegar a una página
     * @param {string} page - home, questions, history, settings
     */
    navigateTo(page) {
        this.currentPage = page;

        // Ocultar todas las páginas del app-shell
        document.querySelectorAll('#app-shell > .iris-page').forEach(p => {
            p.classList.remove('active');
        });

        // Mostrar página activa
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
        }

        // Actualizar bottom nav
        document.querySelectorAll('.iris-bottom-nav__item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Actualizar título navbar
        const titles = {
            'home': 'IRIS',
            'questions': 'Preguntar con Voz',
            'history': 'Historial',
            'videos': 'Videos y Subtítulos',
            'settings': 'Configuración',
        };
        const navTitle = document.getElementById('navbar-title');
        if (navTitle) navTitle.textContent = titles[page] || 'IRIS';

        // Acciones específicas por página
        if (page === 'history') {
            IrisQuestions.loadHistory();
        }
        if (page === 'videos') {
            IrisVideos.loadVideos();
        }
    },

    /**
     * Configurar formulario de login
     */
    _setupLoginForm() {
        const form = document.getElementById('login-form');
        const toggleBtn = document.getElementById('login-toggle');
        let isRegister = false;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isRegister = !isRegister;
                const btnText = document.getElementById('login-btn-text');
                if (btnText) {
                    btnText.textContent = isRegister ? 'Registrarse' : 'Iniciar Sesión';
                }
                toggleBtn.textContent = isRegister
                    ? '¿Ya tienes cuenta? Inicia sesión'
                    : '¿No tienes cuenta? Regístrate';

                // Limpiar error
                this._showLoginError('');
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;
                const submitBtn = document.getElementById('login-submit');

                if (!email || !password) {
                    this._showLoginError('Completa todos los campos');
                    return;
                }

                // Deshabilitar botón
                submitBtn.disabled = true;
                const originalText = document.getElementById('login-btn-text').textContent;
                document.getElementById('login-btn-text').textContent = 'Cargando...';

                try {
                    if (isRegister) {
                        await IrisAuth.register(email, password);
                        this.showToast('✅ Cuenta creada exitosamente');
                    } else {
                        await IrisAuth.login(email, password);
                        this.showToast('✅ Bienvenido a IRIS');
                    }
                } catch (error) {
                    this._showLoginError(error.message);
                } finally {
                    submitBtn.disabled = false;
                    document.getElementById('login-btn-text').textContent = originalText;
                }
            });
        }
    },

    /**
     * Mostrar error en login
     */
    _showLoginError(message) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.toggle('visible', !!message);
        }
    },

    /**
     * Configurar botones de la navbar
     */
    _setupNavbarButtons() {
        // Settings
        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) {
            btnSettings.addEventListener('click', () => this.navigateTo('settings'));
        }

        // Logout (navbar)
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                if (confirm('¿Cerrar sesión?')) {
                    IrisAuth.logout();
                }
            });
        }

        // Stop TTS
        const btnStopTts = document.getElementById('btn-stop-tts');
        if (btnStopTts) {
            btnStopTts.addEventListener('click', () => {
                IrisTTS.stop();
                this.showToast('⏹ Reproducción detenida');
            });
        }
    },

    /**
     * Configurar panel de settings
     */
    _setupSettings() {
        // Dark mode toggle
        const darkToggle = document.getElementById('toggle-dark-mode');
        if (darkToggle) {
            darkToggle.addEventListener('change', (e) => {
                const theme = e.target.checked ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('iris_theme', theme);
            });
        }

        // Font size buttons
        document.querySelectorAll('.iris-fontsize-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.iris-fontsize-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const size = btn.dataset.size;
                document.documentElement.setAttribute('data-fontsize', size);
                localStorage.setItem('iris_fontsize', size);
            });
        });

        // Voice rate
        const rateSlider = document.getElementById('voice-rate');
        const rateLabel = document.getElementById('voice-rate-label');
        if (rateSlider) {
            rateSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                IrisTTS.setRate(val);
                if (rateLabel) rateLabel.textContent = val.toFixed(1) + 'x';
            });
        }

        // Voice pitch
        const pitchSlider = document.getElementById('voice-pitch');
        const pitchLabel = document.getElementById('voice-pitch-label');
        if (pitchSlider) {
            pitchSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                IrisTTS.setPitch(val);
                if (pitchLabel) pitchLabel.textContent = val.toFixed(1);
            });
        }

        // Test voice button
        const btnTestVoice = document.getElementById('btn-test-voice');
        if (btnTestVoice) {
            btnTestVoice.addEventListener('click', () => {
                IrisTTS.speak('Hola, esta es una prueba de la voz sintética de IRIS.').catch(err => {
                    this.showToast('❌ Error: ' + err.message);
                });
            });
        }

        // Logout from settings
        const btnLogoutSettings = document.getElementById('btn-logout-settings');
        if (btnLogoutSettings) {
            btnLogoutSettings.addEventListener('click', () => {
                if (confirm('¿Cerrar sesión?')) {
                    IrisAuth.logout();
                    this.navigateTo('home');
                }
            });
        }

        // History search
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                IrisQuestions.filterHistory(e.target.value);
            });
        }
    },

    /**
     * Cargar preferencias guardadas
     */
    _loadPreferences() {
        // Theme
        const savedTheme = localStorage.getItem('iris_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const darkToggle = document.getElementById('toggle-dark-mode');
        if (darkToggle) darkToggle.checked = savedTheme === 'dark';

        // Font size
        const savedSize = localStorage.getItem('iris_fontsize') || 'normal';
        document.documentElement.setAttribute('data-fontsize', savedSize);
        document.querySelectorAll('.iris-fontsize-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === savedSize);
        });

        // Voice rate
        const savedRate = localStorage.getItem('iris_tts_rate');
        if (savedRate) {
            const rateSlider = document.getElementById('voice-rate');
            const rateLabel = document.getElementById('voice-rate-label');
            if (rateSlider) rateSlider.value = savedRate;
            if (rateLabel) rateLabel.textContent = parseFloat(savedRate).toFixed(1) + 'x';
        }

        // Voice pitch
        const savedPitch = localStorage.getItem('iris_tts_pitch');
        if (savedPitch) {
            const pitchSlider = document.getElementById('voice-pitch');
            const pitchLabel = document.getElementById('voice-pitch-label');
            if (pitchSlider) pitchSlider.value = savedPitch;
            if (pitchLabel) pitchLabel.textContent = parseFloat(savedPitch).toFixed(1);
        }
    },

    /**
     * Mostrar toast / snackbar
     * @param {string} message
     * @param {number} duration - ms
     */
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        clearTimeout(this.toastTimeout);
        toast.textContent = message;
        toast.classList.add('show');

        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },
};

// ============================================
// Inicializar cuando el DOM esté listo
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    IrisApp.init();
});

// También para Cordova
document.addEventListener('deviceready', () => {
    console.log('📱 Cordova device ready');
}, false);
