/**
 * IRIS - Módulo Text-to-Speech (TTS)
 * Conversión de texto a voz usando Web Speech Synthesis API
 */
const IrisTTS = {
    synth: window.speechSynthesis,
    voices: [],
    selectedVoice: null,
    isSpeaking: false,

    // Configuración
    rate: 1.0,
    pitch: 1.0,

    /**
     * Inicializar TTS y cargar voces disponibles
     */
    init() {
        if (!this.synth) {
            console.error('Web Speech Synthesis API no soportada en este navegador.');
            return;
        }

        // Cargar voces (puede ser asíncrono según el navegador)
        this._loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this._loadVoices();
        }

        // Cargar configuración guardada
        this.rate = parseFloat(localStorage.getItem('iris_tts_rate') || IRIS_CONFIG.TTS.rate);
        this.pitch = parseFloat(localStorage.getItem('iris_tts_pitch') || IRIS_CONFIG.TTS.pitch);
    },

    /**
     * Cargar voces disponibles del sistema
     */
    _loadVoices() {
        this.voices = this.synth.getVoices();

        // Poblar selector de voces
        const selector = document.getElementById('voice-selector');
        if (!selector) return;

        selector.innerHTML = '';

        // Filtrar voces en español primero
        const spanishVoices = this.voices.filter(v => v.lang.startsWith('es'));
        const otherVoices = this.voices.filter(v => !v.lang.startsWith('es'));

        if (spanishVoices.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Español';
            spanishVoices.forEach((voice, i) => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                if (i === 0) option.selected = true;
                optgroup.appendChild(option);
            });
            selector.appendChild(optgroup);
        }

        if (otherVoices.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Otros idiomas';
            otherVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                optgroup.appendChild(option);
            });
            selector.appendChild(optgroup);
        }

        if (this.voices.length === 0) {
            selector.innerHTML = '<option value="">No hay voces disponibles</option>';
        }

        // Seleccionar la primera voz en español por defecto
        const savedVoice = localStorage.getItem('iris_tts_voice');
        if (savedVoice) {
            this.selectedVoice = this.voices.find(v => v.name === savedVoice) || null;
            if (this.selectedVoice) selector.value = savedVoice;
        } else if (spanishVoices.length > 0) {
            this.selectedVoice = spanishVoices[0];
        }

        // Escuchar cambios en el selector
        selector.addEventListener('change', (e) => {
            this.selectedVoice = this.voices.find(v => v.name === e.target.value) || null;
            localStorage.setItem('iris_tts_voice', e.target.value);
        });
    },

    /**
     * Reproducir texto como voz sintética
     * @param {string} text - Texto a reproducir
     * @returns {Promise<void>}
     */
    speak(text) {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('TTS no disponible'));
                return;
            }

            if (!text || text.trim() === '') {
                reject(new Error('No hay texto para reproducir'));
                return;
            }

            // Cancelar cualquier reproducción anterior
            this.stop();

            const utterance = new SpeechSynthesisUtterance(text);

            // Configurar voz
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            utterance.lang = IRIS_CONFIG.TTS.lang;
            utterance.rate = this.rate;
            utterance.pitch = this.pitch;

            // Eventos
            utterance.onstart = () => {
                this.isSpeaking = true;
                this._showIndicator(true);
                this._showStopButton(true);
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                this._showIndicator(false);
                this._showStopButton(false);
                resolve();
            };

            utterance.onerror = (event) => {
                this.isSpeaking = false;
                this._showIndicator(false);
                this._showStopButton(false);
                if (event.error !== 'canceled') {
                    reject(new Error('Error de reproducción: ' + event.error));
                } else {
                    resolve();
                }
            };

            this.synth.speak(utterance);
        });
    },

    /**
     * Detener reproducción
     */
    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
        this.isSpeaking = false;
        this._showIndicator(false);
        this._showStopButton(false);
    },

    /**
     * Mostrar/ocultar indicador visual (vúmetro)
     */
    _showIndicator(show) {
        const indicator = document.getElementById('tts-indicator');
        if (indicator) {
            indicator.classList.toggle('active', show);
        }
    },

    /**
     * Mostrar/ocultar botón de parar en navbar
     */
    _showStopButton(show) {
        const btn = document.getElementById('btn-stop-tts');
        if (btn) {
            btn.classList.toggle('iris-hidden', !show);
        }
    },

    /**
     * Actualizar velocidad
     * @param {number} rate
     */
    setRate(rate) {
        this.rate = rate;
        localStorage.setItem('iris_tts_rate', rate);
    },

    /**
     * Actualizar tono
     * @param {number} pitch
     */
    setPitch(pitch) {
        this.pitch = pitch;
        localStorage.setItem('iris_tts_pitch', pitch);
    },

    /**
     * Verificar si TTS está disponible
     * @returns {boolean}
     */
    isAvailable() {
        return !!this.synth;
    },
};
