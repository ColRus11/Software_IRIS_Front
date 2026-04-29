/**
 * IRIS - Monitor de Audio (Vúmetro de Micrófono)
 * Indicador visual en tiempo real de captura de audio
 * Usa Web Audio API (AudioContext + AnalyserNode)
 */
const IrisAudioMonitor = {
    _initialized: false,
    _audioContext: null,
    _analyser: null,
    _microphone: null,
    _stream: null,
    _animationFrame: null,
    _isMonitoring: false,

    // Configuración
    fftSize: 256,
    barCount: 16,
    smoothingTimeConstant: 0.8,

    /**
     * Inicializar módulo (no inicia captura, solo prepara)
     */
    init() {
        if (this._initialized) return;
        this._initialized = true;
        console.log('🎙️ Módulo AudioMonitor inicializado');
    },

    /**
     * Iniciar monitoreo de audio del micrófono
     * @returns {Promise<boolean>}
     */
    async startMonitoring() {
        if (this._isMonitoring) return true;

        try {
            // Solicitar acceso al micrófono
            this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Crear contexto de audio
            this._audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Crear analizador
            this._analyser = this._audioContext.createAnalyser();
            this._analyser.fftSize = this.fftSize;
            this._analyser.smoothingTimeConstant = this.smoothingTimeConstant;

            // Conectar micrófono al analizador
            this._microphone = this._audioContext.createMediaStreamSource(this._stream);
            this._microphone.connect(this._analyser);

            this._isMonitoring = true;

            // Mostrar indicador de estado activo
            this._updateStatus(true);

            // Iniciar visualización
            this._renderLoop();

            return true;
        } catch (error) {
            console.error('Error accediendo al micrófono:', error);
            this._updateStatus(false, error.message);
            return false;
        }
    },

    /**
     * Detener monitoreo de audio
     */
    stopMonitoring() {
        this._isMonitoring = false;

        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }

        if (this._microphone) {
            this._microphone.disconnect();
            this._microphone = null;
        }

        if (this._stream) {
            this._stream.getTracks().forEach(track => track.stop());
            this._stream = null;
        }

        if (this._audioContext) {
            this._audioContext.close();
            this._audioContext = null;
        }

        this._analyser = null;

        // Resetear barras
        this._resetBars();
        this._updateStatus(false);
    },

    /**
     * Loop de renderizado de las barras del vúmetro
     */
    _renderLoop() {
        if (!this._isMonitoring || !this._analyser) return;

        const bufferLength = this._analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this._analyser.getByteFrequencyData(dataArray);

        // Obtener las barras del DOM
        const container = document.getElementById('audio-vu-meter');
        if (!container) {
            this._animationFrame = requestAnimationFrame(() => this._renderLoop());
            return;
        }

        const bars = container.querySelectorAll('.iris-vu-bar');
        const step = Math.floor(bufferLength / bars.length);

        // Calcular nivel promedio para el indicador de estado
        let totalLevel = 0;

        bars.forEach((bar, i) => {
            const value = dataArray[i * step] || 0;
            const percent = (value / 255) * 100;
            const height = Math.max(4, percent);
            bar.style.height = height + '%';
            totalLevel += value;

            // Colorear según nivel
            if (percent > 80) {
                bar.style.backgroundColor = 'var(--iris-error)';
            } else if (percent > 50) {
                bar.style.backgroundColor = 'var(--iris-warning)';
            } else {
                bar.style.backgroundColor = 'var(--iris-success)';
            }
        });

        // Actualizar label de nivel
        const avgLevel = totalLevel / bars.length;
        const levelLabel = document.getElementById('audio-level-label');
        if (levelLabel) {
            if (avgLevel > 20) {
                levelLabel.textContent = '● Capturando audio';
                levelLabel.className = 'iris-vu-status iris-vu-status--active';
            } else {
                levelLabel.textContent = '○ Esperando audio...';
                levelLabel.className = 'iris-vu-status iris-vu-status--waiting';
            }
        }

        this._animationFrame = requestAnimationFrame(() => this._renderLoop());
    },

    /**
     * Resetear las barras del vúmetro
     */
    _resetBars() {
        const container = document.getElementById('audio-vu-meter');
        if (!container) return;

        container.querySelectorAll('.iris-vu-bar').forEach(bar => {
            bar.style.height = '4%';
            bar.style.backgroundColor = 'var(--iris-border)';
        });
    },

    /**
     * Actualizar indicador de estado
     * @param {boolean} active
     * @param {string} errorMsg
     */
    _updateStatus(active, errorMsg = '') {
        const statusDot = document.getElementById('audio-status-dot');
        const levelLabel = document.getElementById('audio-level-label');

        if (statusDot) {
            statusDot.className = active
                ? 'iris-vu-dot iris-vu-dot--active'
                : 'iris-vu-dot iris-vu-dot--inactive';
        }

        if (levelLabel) {
            if (errorMsg) {
                levelLabel.textContent = '✕ Error: ' + errorMsg;
                levelLabel.className = 'iris-vu-status iris-vu-status--error';
            } else if (active) {
                levelLabel.textContent = '● Capturando audio';
                levelLabel.className = 'iris-vu-status iris-vu-status--active';
            } else {
                levelLabel.textContent = '○ Audio inactivo';
                levelLabel.className = 'iris-vu-status iris-vu-status--inactive';
            }
        }
    },

    /**
     * Toggle de monitoreo
     * @returns {Promise<boolean>}
     */
    async toggle() {
        if (this._isMonitoring) {
            this.stopMonitoring();
            return false;
        } else {
            return await this.startMonitoring();
        }
    },

    /**
     * Verificar si está monitoreando
     * @returns {boolean}
     */
    isActive() {
        return this._isMonitoring;
    },

    /**
     * Verificar si el micrófono está disponible
     * @returns {boolean}
     */
    isAvailable() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
};
