/**
 * IRIS - Módulo de Notificaciones Hápticas y Visuales
 * Patrones de vibración y destellos de color para alertas accesibles
 */
const IrisNotifications = {
    _initialized: false,

    // Preferencias del usuario
    prefs: {
        vibrationEnabled: true,
        flashEnabled: true,
        vibrationPattern: 'short', // short, long, sos
    },

    // Patrones de vibración predefinidos (milisegundos)
    vibrationPatterns: {
        short:     [100],
        medium:    [200, 100, 200],
        long:      [500, 200, 500],
        sos:       [100, 50, 100, 50, 100, 150, 300, 50, 300, 50, 300, 150, 100, 50, 100, 50, 100],
        emergency: [1000, 200, 1000, 200, 1000],
        double:    [100, 100, 100],
    },

    // Colores de destello por tipo de alerta
    flashColors: {
        message:   { color: 'rgba(33, 150, 243, 0.4)', duration: 600 },   // Azul
        success:   { color: 'rgba(76, 175, 80, 0.4)', duration: 600 },    // Verde
        warning:   { color: 'rgba(255, 152, 0, 0.5)', duration: 800 },    // Naranja
        emergency: { color: 'rgba(244, 67, 54, 0.6)', duration: 1200 },   // Rojo
        class:     { color: 'rgba(156, 39, 176, 0.4)', duration: 600 },   // Púrpura
    },

    /**
     * Inicializar módulo de notificaciones
     */
    init() {
        if (this._initialized) return;

        // Crear overlay de flash si no existe
        this._createFlashOverlay();

        // Cargar preferencias guardadas
        this._loadPreferences();

        this._initialized = true;
        console.log('🔔 Módulo de notificaciones inicializado');
    },

    /**
     * Crear overlay de destello visual
     */
    _createFlashOverlay() {
        if (document.getElementById('iris-flash-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'iris-flash-overlay';
        overlay.className = 'iris-flash-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
    },

    /**
     * Cargar preferencias desde localStorage
     */
    _loadPreferences() {
        const saved = localStorage.getItem('iris_notification_prefs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(this.prefs, parsed);
            } catch (e) {
                console.warn('Error cargando preferencias de notificaciones:', e);
            }
        }
    },

    /**
     * Guardar preferencias en localStorage
     */
    _savePreferences() {
        localStorage.setItem('iris_notification_prefs', JSON.stringify(this.prefs));
    },

    /**
     * Activar/desactivar vibraciones
     * @param {boolean} enabled
     */
    setVibrationEnabled(enabled) {
        this.prefs.vibrationEnabled = enabled;
        this._savePreferences();
    },

    /**
     * Activar/desactivar destellos visuales
     * @param {boolean} enabled
     */
    setFlashEnabled(enabled) {
        this.prefs.flashEnabled = enabled;
        this._savePreferences();
    },

    /**
     * Cambiar patrón de vibración
     * @param {string} pattern - short, medium, long, sos
     */
    setVibrationPattern(pattern) {
        if (this.vibrationPatterns[pattern]) {
            this.prefs.vibrationPattern = pattern;
            this._savePreferences();
        }
    },

    // ============================
    // Métodos de notificación
    // ============================

    /**
     * Notificación de mensaje nuevo (vibración corta, destello azul)
     */
    notifyMessage() {
        this._vibrate('short');
        this._flash('message');
    },

    /**
     * Notificación de éxito (vibración doble, destello verde)
     */
    notifySuccess() {
        this._vibrate('double');
        this._flash('success');
    },

    /**
     * Notificación de advertencia (vibración media, destello naranja)
     */
    notifyWarning() {
        this._vibrate('medium');
        this._flash('warning');
    },

    /**
     * Notificación de emergencia (vibración larga, destello rojo intenso)
     */
    notifyEmergency() {
        this._vibrate('emergency');
        this._flash('emergency');
    },

    /**
     * Notificación de inicio de clase (vibración media, destello púrpura)
     */
    notifyClass() {
        this._vibrate('medium');
        this._flash('class');
    },

    /**
     * Probar el patrón de vibración actual
     */
    testVibration() {
        const pattern = this.prefs.vibrationPattern;
        this._vibrate(pattern, true);
    },

    /**
     * Probar un destello visual
     * @param {string} type - message, success, warning, emergency, class
     */
    testFlash(type = 'message') {
        this._flash(type, true);
    },

    // ============================
    // Métodos internos
    // ============================

    /**
     * Ejecutar vibración
     * @param {string} patternName
     * @param {boolean} force - Ignorar preferencia del usuario (para pruebas)
     */
    _vibrate(patternName, force = false) {
        if (!force && !this.prefs.vibrationEnabled) return;
        if (!navigator.vibrate) {
            console.info('Vibration API no disponible en este dispositivo');
            return;
        }

        const pattern = this.vibrationPatterns[patternName] || this.vibrationPatterns.short;
        navigator.vibrate(pattern);
    },

    /**
     * Ejecutar destello visual
     * @param {string} type
     * @param {boolean} force - Ignorar preferencia del usuario (para pruebas)
     */
    _flash(type, force = false) {
        if (!force && !this.prefs.flashEnabled) return;

        const overlay = document.getElementById('iris-flash-overlay');
        if (!overlay) return;

        const config = this.flashColors[type] || this.flashColors.message;

        // Reset animation
        overlay.classList.remove('active');
        overlay.style.backgroundColor = config.color;
        overlay.style.animationDuration = config.duration + 'ms';

        // Trigger reflow to restart animation
        void overlay.offsetWidth;

        overlay.classList.add('active');

        // Remove class after animation completes
        setTimeout(() => {
            overlay.classList.remove('active');
        }, config.duration);
    },

    /**
     * Verificar si la Vibration API está disponible
     * @returns {boolean}
     */
    isVibrationAvailable() {
        return !!navigator.vibrate;
    },
};
