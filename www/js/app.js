/**
 * IRIS / Un Mundo en Silencio — App Controller
 * Router SPA con carga dinámica de páginas + lógica de roles
 */
const IrisApp = {
    currentPage: null,
    selectedRole: 'Student',
    toastTimeout: null,
    _loadedPages: {},          // cache de páginas ya cargadas
    _transcribing: false,

    // ——————————————————————————————————————
    // INIT
    // ——————————————————————————————————————
    async init() {
        // Cargar login primero
        await this._loadPage('login');
        this._showPage('login');

        // Configurar el form ANTES de que el usuario haga login
        this._setupLoginForm();

        // Inicializar módulos
        IrisAuth.init();
        IrisTTS.init();
        IrisNotifications.init();
        IrisAudioMonitor.init();
        IrisTranscription.init();

        this._setupModal();
        this._loadPreferences();
        console.log('🟢 Un Mundo en Silencio — App inicializada');
    },

    // ——————————————————————————————————————
    // CALLBACKS DE AUTH
    // ——————————————————————————————————————
    async onUserReady(user) {
        if (this._ready) {
            // Ya inicializado — solo actualizar saludo y navegar
            this._updateGreeting(user);
            this.navigateTo(this._homePageForRole(IrisAuth.currentRole));
            return;
        }
        this._ready = true;

        // Pre-cargar páginas del rol actual
        const homePage = this._homePageForRole(IrisAuth.currentRole);
        await this._loadPage(homePage);
        await this._loadPage('transcription');
        await this._loadPage('questions');
        await this._loadPage('history');
        await this._loadPage('alerts');
        await this._loadPage('settings');
        // Cargar video-subtitles solo para docente
        if (IrisAuth.currentRole === 'Teacher') {
            await this._loadPage('video-subtitles');
        }

        this._setupSettings();
        this._updateGreeting(user);
        IrisQuestions.init();
        this.navigateTo(homePage);
    },

    onUserLogout() {
        this._ready = false; // permite re-inicializar si vuelve a hacer login
        // Resetear flag del form para que se pueda re-vincular
        const form = document.getElementById('login-form');
        if (form) form._setup = false;
        this.navigateTo('login');
        this.showToast('👋 Sesión cerrada');
    },

    // ——————————————————————————————————————
    // ROUTER
    // ——————————————————————————————————————
    async navigateTo(page) {
        if (!this._loadedPages[page]) {
            await this._loadPage(page);
        }
        this._showPage(page);
        this.currentPage = page;

        // Acciones específicas de página
        if (page === 'history')     IrisQuestions.loadHistory();
        if (page === 'alerts')      this._loadAlerts();
        if (page === 'transcription') this._setupTranscriptionPage();
        if (page === 'settings')    this._updateSettingsDisplay();
        if (page === 'questions')   IrisTTS.onQuestionsPageMounted();

        // Actualizar nav activo
        document.querySelectorAll('[data-nav]').forEach(el => {
            el.classList.toggle('active', el.dataset.nav === page);
        });
    },

    goHome() {
        this.navigateTo(this._homePageForRole(IrisAuth.currentRole));
    },

    _homePageForRole(role) {
        if (role === 'Teacher') return 'teacher-home';
        if (role === 'Admin')   return 'admin-home';
        return 'student-home';
    },

    // ——————————————————————————————————————
    // PAGE LOADER
    // ——————————————————————————————————————
    async _loadPage(page) {
        if (this._loadedPages[page]) return;
        const fileMap = {
            'login':           'pages/login.html',
            'student-home':    'pages/student-home.html',
            'teacher-home':    'pages/teacher-home.html',
            'admin-home':      'pages/admin-home.html',
            'transcription':   'pages/transcription.html',
            'questions':       'pages/questions.html',
            'history':         'pages/history.html',
            'alerts':          'pages/alerts.html',
            'settings':        'pages/settings.html',
            'video-subtitles': 'pages/video-subtitles.html',
        };
        const path = fileMap[page];
        if (!path) return;
        try {
            const res = await fetch(path);
            const html = await res.text();
            const container = document.getElementById('page-container');
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            // Mover todos los children al container
            while (tmp.firstChild) container.appendChild(tmp.firstChild);
            this._loadedPages[page] = true;
        } catch (e) {
            console.error('Error loading page:', page, e);
        }
    },

    _showPage(page) {
        document.querySelectorAll('.ds-page').forEach(p => p.classList.remove('active'));
        const pageId = this._pageIdFor(page);
        const el = document.getElementById(pageId);
        if (el) el.classList.add('active');
    },

    _pageIdFor(page) {
        return `page-${page}`;
    },

    // ——————————————————————————————————————
    // LOGIN FORM SETUP (after pages load)
    // ——————————————————————————————————————
    _setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form || form._setup) return;
        form._setup = true;

        let isRegister = false;
        const toggleBtn = document.getElementById('login-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isRegister = !isRegister;
                document.getElementById('login-btn-text').textContent = isRegister ? 'Registrarse' : 'Log In';
                toggleBtn.textContent = isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
                document.getElementById('login-error').textContent = '';
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email    = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errorEl  = document.getElementById('login-error');
            const submitBtn= document.getElementById('login-submit');
            const btnText  = document.getElementById('login-btn-text');

            if (!email || !password) { errorEl.textContent = 'Completa todos los campos'; return; }

            submitBtn.disabled = true;
            const orig = btnText.textContent;
            btnText.textContent = 'Cargando...';
            errorEl.textContent = '';

            try {
                if (isRegister) {
                    await IrisAuth.register(email, password, this.selectedRole);
                    this.showToast('✅ Cuenta creada — bienvenido');
                } else {
                    await IrisAuth.login(email, password, this.selectedRole);
                    this.showToast('✅ Bienvenido a Un Mundo en Silencio');
                }
            } catch (err) {
                errorEl.textContent = err.message;
            } finally {
                submitBtn.disabled = false;
                btnText.textContent = orig;
            }
        });
    },

    selectRole(role) {
        this.selectedRole = role;
        ['Student', 'Teacher', 'Admin'].forEach(r => {
            const el = document.getElementById(`role-${r.toLowerCase()}`);
            if (el) el.classList.toggle('selected', r === role);
        });
    },

    // ——————————————————————————————————————
    // TRANSCRIPTION
    // ——————————————————————————————————————
    _setupTranscriptionPage() {
        const timeEl = document.getElementById('transcript-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        }
        if (!IrisTranscription.isSupported()) {
            this.showToast('⚠️ Tu navegador no soporta reconocimiento de voz');
        }
    },

    toggleTranscription() {
        if (this._transcribing) {
            IrisTranscription.stop();
            this._transcribing = false;
            document.getElementById('btn-transcript-text').textContent = 'Iniciar Transcripción';
            document.getElementById('transcript-wave')?.classList.remove('active');
            this.showToast('⏹ Transcripción detenida');
        } else {
            const started = IrisTranscription.start(
                (text, isFinal) => {
                    const empty   = document.getElementById('transcript-empty');
                    const content = document.getElementById('transcript-content');
                    const textEl  = document.getElementById('transcript-text');
                    const interim = document.getElementById('transcript-interim');
                    if (empty) empty.style.display = 'none';
                    if (content) content.style.display = 'block';
                    if (textEl) textEl.textContent = IrisTranscription.currentTranscript;
                    if (interim && !isFinal) interim.textContent = text.slice(IrisTranscription.currentTranscript.length);
                    else if (interim) interim.textContent = '';
                },
                (err) => this.showToast('❌ Error de micrófono: ' + err),
                ()    => { this._transcribing = false; document.getElementById('btn-transcript-text').textContent = 'Iniciar Transcripción'; }
            );
            if (started) {
                this._transcribing = true;
                document.getElementById('btn-transcript-text').textContent = 'Detener';
                document.getElementById('transcript-wave')?.classList.add('active');
                this.showToast('🎙️ Transcripción en vivo');
            } else {
                this.showToast('❌ No se pudo acceder al micrófono');
            }
        }
    },

    clearTranscript() {
        IrisTranscription.clear();
        const textEl  = document.getElementById('transcript-text');
        const interim = document.getElementById('transcript-interim');
        const empty   = document.getElementById('transcript-empty');
        const content = document.getElementById('transcript-content');
        if (textEl) textEl.textContent = '';
        if (interim) interim.textContent = '';
        if (empty) empty.style.display = '';
        if (content) content.style.display = 'none';
    },

    async saveTranscript() {
        const text = IrisTranscription.currentTranscript.trim();
        if (!text) { this.showToast('ℹ️ Nada que guardar aún'); return; }
        try {
            await IrisAPI.createQuestion({ text, session_name: 'Transcripción', firebase_uid: IrisAuth.currentUser?.uid || 'anon' });
            this.showToast('✅ Transcripción guardada');
        } catch (e) {
            this.showToast('❌ Error al guardar: ' + e.message);
        }
    },

    // ——————————————————————————————————————
    // ALERTS
    // ——————————————————————————————————————
    async _loadAlerts() {
        const list = document.getElementById('alerts-list');
        const loading = document.getElementById('alerts-loading');
        const btnNew = document.getElementById('btn-new-alert');

        // Mostrar botón nueva alerta solo para admin
        if (btnNew && IrisAuth.currentRole === 'Admin') btnNew.style.display = '';

        if (!list) return;
        if (loading) loading.style.display = 'block';
        list.innerHTML = '';

        try {
            const alerts = await IrisAPI.getAlerts();
            if (loading) loading.style.display = 'none';
            if (!alerts || alerts.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--c-outline);">
                  <span class="material-symbols-outlined" style="font-size:48px;opacity:.4;">notifications_off</span>
                  <p style="margin-top:.75rem;font-size:.9375rem;font-weight:500;">Sin alertas activas</p></div>`;
                return;
            }
            alerts.forEach(a => {
                const color = a.severity === 'emergency' ? 'var(--c-error)' : a.severity === 'warning' ? '#f59e0b' : 'var(--c-secondary)';
                const icon  = a.severity === 'emergency' ? 'emergency' : a.severity === 'warning' ? 'warning' : 'info';
                list.innerHTML += `
                  <div class="ds-alert-item ds-alert-item--${a.severity}">
                    <div class="ds-alert-item__icon" style="background:${color}20;">
                      <span class="material-symbols-outlined" style="color:${color};font-variation-settings:'FILL' 1;">${icon}</span>
                    </div>
                    <div>
                      <p class="ds-alert-item__title">${a.title}</p>
                      <p class="ds-alert-item__body">${a.message}</p>
                    </div>
                  </div>`;
            });
        } catch (e) {
            if (loading) loading.style.display = 'none';
            list.innerHTML = '<p style="color:var(--c-error);padding:1rem;">Error cargando alertas.</p>';
        }
    },

    showNewAlertForm()  { document.getElementById('new-alert-form')?.style.setProperty('display','block'); },
    hideNewAlertForm()  { document.getElementById('new-alert-form')?.style.setProperty('display','none'); },

    async submitAlert() {
        const title    = document.getElementById('alert-title')?.value.trim();
        const message  = document.getElementById('alert-message')?.value.trim();
        const severity = document.getElementById('alert-severity')?.value;
        if (!title || !message) { this.showToast('Completa título y mensaje'); return; }
        try {
            await IrisAPI.createAlert({ title, message, severity });
            this.hideNewAlertForm();
            this.showToast('🚨 Alerta enviada');
            this._loadAlerts();
        } catch (e) {
            this.showToast('❌ Error: ' + e.message);
        }
    },

    // ——————————————————————————————————————
    // GREETING
    // ——————————————————————————————————————
    _updateGreeting(user) {
        const profile = IrisAuth.currentProfile;
        const name = profile?.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
        const display = name.charAt(0).toUpperCase() + name.slice(1);

        ['student-greeting-name','teacher-greeting-name','admin-greeting-name'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = display;
        });

        const emailEl = document.getElementById('settings-email');
        if (emailEl) emailEl.textContent = user.email || 'Usuario';

        const roleEl = document.getElementById('settings-role');
        if (roleEl) roleEl.textContent = IrisAuth.currentRole || '';
    },

    _updateSettingsDisplay() {
        this._updateGreeting(IrisAuth.currentUser || {});
    },

    // ——————————————————————————————————————
    // SETTINGS
    // ——————————————————————————————————————
    _setupSettings() {
        // Theme
        document.querySelectorAll('.iris-theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-theme', btn.dataset.theme);
                localStorage.setItem('iris_theme', btn.dataset.theme);
                document.querySelectorAll('.iris-theme-btn').forEach(b => b.style.borderColor = 'transparent');
                btn.style.borderColor = 'var(--c-secondary)';
            });
        });

        // Font size
        document.querySelectorAll('.iris-fontsize-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-fontsize', btn.dataset.size);
                localStorage.setItem('iris_fontsize', btn.dataset.size);
                document.querySelectorAll('.iris-fontsize-btn').forEach(b => b.style.borderColor = 'transparent');
                btn.style.borderColor = 'var(--c-secondary)';
            });
        });

        // TTS sliders
        const rateSlider  = document.getElementById('voice-rate');
        const rateLabel   = document.getElementById('voice-rate-label');
        const pitchSlider = document.getElementById('voice-pitch');
        const pitchLabel  = document.getElementById('voice-pitch-label');
        if (rateSlider)  rateSlider.addEventListener('input',  e => { IrisTTS.setRate(+e.target.value);  if(rateLabel)  rateLabel.textContent = (+e.target.value).toFixed(1)+'x'; });
        if (pitchSlider) pitchSlider.addEventListener('input', e => { IrisTTS.setPitch(+e.target.value); if(pitchLabel) pitchLabel.textContent = (+e.target.value).toFixed(1); });

        document.getElementById('btn-test-voice')?.addEventListener('click', () => IrisTTS.speak('Hola, esta es una prueba de Un Mundo en Silencio.'));
        // Logout — sin confirm(), directo
        document.getElementById('btn-logout-settings')?.addEventListener('click', () => IrisAuth.logout());

        // Notifications
        document.getElementById('toggle-vibration')?.addEventListener('change', e => IrisNotifications.setVibrationEnabled(e.target.checked));
        document.getElementById('toggle-flash')?.addEventListener('change', e => IrisNotifications.setFlashEnabled(e.target.checked));
        document.getElementById('vibration-pattern')?.addEventListener('change', e => IrisNotifications.setVibrationPattern(e.target.value));
        document.getElementById('btn-test-vibration')?.addEventListener('click', () => IrisNotifications.testVibration());
        document.getElementById('btn-test-flash-msg')?.addEventListener('click',  () => IrisNotifications.testFlash('message'));
        document.getElementById('btn-test-flash-warn')?.addEventListener('click', () => IrisNotifications.testFlash('warning'));
        document.getElementById('btn-test-flash-emg')?.addEventListener('click',  () => IrisNotifications.testFlash('emergency'));

        // Audio monitor
        document.getElementById('btn-toggle-mic')?.addEventListener('click', async () => {
            if (IrisAudioMonitor.isActive()) {
                IrisAudioMonitor.stopMonitoring();
                document.getElementById('btn-mic-text').textContent = 'Probar Micrófono';
                this.showToast('🎙️ Monitor detenido');
            } else {
                const ok = await IrisAudioMonitor.startMonitoring();
                document.getElementById('btn-mic-text').textContent = ok ? 'Detener' : 'Probar Micrófono';
                this.showToast(ok ? '🎙️ Capturando audio' : '❌ No se pudo acceder al micrófono');
            }
        });

        // History search
        document.getElementById('history-search')?.addEventListener('input', e => IrisQuestions.filterHistory(e.target.value));
    },

    // ——————————————————————————————————————
    // MODAL
    // ——————————————————————————————————————
    _setupModal() {
        document.addEventListener('click', e => {
            const modal = document.getElementById('modal-sign-language');
            if (!modal) return;
            if (e.target.id === 'btn-sign-language') {
                modal.style.display = 'flex';
            }
            if (e.target.hasAttribute('data-close-modal') || e.target.closest('[data-close-modal]')) {
                modal.style.display = 'none';
            }
        });
    },

    // ——————————————————————————————————————
    // PREFERENCES
    // ——————————————————————————————————————
    _loadPreferences() {
        const theme = localStorage.getItem('iris_theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        const size = localStorage.getItem('iris_fontsize') || 'normal';
        document.documentElement.setAttribute('data-fontsize', size);
    },

    // ——————————————————————————————————————
    // TOAST
    // ——————————————————————————————————————
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        clearTimeout(this.toastTimeout);
        toast.textContent = message;
        toast.classList.add('show');
        this.toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
    },
};

// ——————————————————————————————————————
// BOOTSTRAP
// ——————————————————————————————————————
document.addEventListener('DOMContentLoaded', () => IrisApp.init());
document.addEventListener('deviceready',      () => console.log('📱 Cordova ready'), false);
