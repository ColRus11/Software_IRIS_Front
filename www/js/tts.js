/**
 * IRIS / Un Mundo en Silencio — Text-to-Speech Module
 * Web Speech Synthesis API — funciona sin servicios externos
 *
 * FIXES aplicados:
 * - getVoices() es asíncrono en Chrome: se espera el evento voiceschanged
 * - El selector de voces puede no existir en el DOM al inicio (partial cargado dinámicamente)
 *   → se pobla cada vez que la página de preguntas se muestra
 * - El botón "Reproducir" se habilita automáticamente cuando hay voces disponibles
 * - Chrome bug: speechSynthesis se detiene sola a los ~15s → keepAlive workaround
 */
const IrisTTS = {
    synth: window.speechSynthesis,
    voices: [],
    selectedVoice: null,
    isSpeaking: false,
    rate: 1.0,
    pitch: 1.0,
    _keepAliveTimer: null,

    // ─────────────────────────────────────────────────
    // INIT — se llama una vez al arrancar la app
    // ─────────────────────────────────────────────────
    init() {
        if (!this.synth) {
            console.warn('⚠️ Web Speech Synthesis API no disponible en este navegador.');
            return;
        }

        // Recuperar configuración guardada
        this.rate  = parseFloat(localStorage.getItem('iris_tts_rate')  || '1.0');
        this.pitch = parseFloat(localStorage.getItem('iris_tts_pitch') || '1.0');

        // Cargar voces — en Chrome son asíncronas
        const tryLoad = () => {
            const v = this.synth.getVoices();
            if (v.length > 0) {
                this.voices = v;
                this._pickDefaultVoice();
                this._populateSelector(); // por si la página ya está en DOM
            }
        };

        tryLoad(); // llamada sincrónica (funciona en Firefox)
        this.synth.addEventListener('voiceschanged', () => {
            tryLoad();  // llamada asíncrona (necesaria en Chrome)
        });
    },

    // ─────────────────────────────────────────────────
    // Llamar esto cuando la página questions.html se monta
    // ─────────────────────────────────────────────────
    onQuestionsPageMounted() {
        this._populateSelector();
        this._updateButtons();
    },

    // ─────────────────────────────────────────────────
    // VOZ POR DEFECTO
    // ─────────────────────────────────────────────────
    _pickDefaultVoice() {
        const savedName = localStorage.getItem('iris_tts_voice');
        if (savedName) {
            const saved = this.voices.find(v => v.name === savedName);
            if (saved) { this.selectedVoice = saved; return; }
        }
        // Prioridad: es-CO → es-ES → es-* → primer resultado
        const prio = ['es-CO', 'es-MX', 'es-US', 'es-ES', 'es'];
        for (const lang of prio) {
            const found = this.voices.find(v => v.lang.startsWith(lang));
            if (found) { this.selectedVoice = found; return; }
        }
        this.selectedVoice = this.voices[0] || null;
    },

    // ─────────────────────────────────────────────────
    // POBLAR SELECTOR DE VOCES (cada vez que el partial está en DOM)
    // ─────────────────────────────────────────────────
    _populateSelector() {
        const selector = document.getElementById('voice-selector');
        if (!selector) return;

        if (this.voices.length === 0) {
            selector.innerHTML = '<option value="">Cargando voces del navegador…</option>';
            this._updateButtons(false);
            return;
        }

        selector.innerHTML = '';

        // Agrupar: español primero
        const esVoices    = this.voices.filter(v => v.lang.startsWith('es'));
        const otherVoices = this.voices.filter(v => !v.lang.startsWith('es'));

        const addGroup = (label, list) => {
            if (!list.length) return;
            const grp = document.createElement('optgroup');
            grp.label = label;
            list.forEach(voice => {
                const opt = document.createElement('option');
                opt.value = voice.name;
                opt.textContent = `${voice.name} (${voice.lang})`;
                if (this.selectedVoice && voice.name === this.selectedVoice.name) {
                    opt.selected = true;
                }
                grp.appendChild(opt);
            });
            selector.appendChild(grp);
        };

        addGroup('🇪🇸 Español', esVoices);
        addGroup('Otros idiomas', otherVoices);

        // Si no había seleccionada, tomar la primera del selector
        if (!this.selectedVoice) this._pickDefaultVoice();
        if (this.selectedVoice) selector.value = this.selectedVoice.name;

        // Listener (remover primero para evitar duplicados)
        selector.onchange = (e) => {
            this.selectedVoice = this.voices.find(v => v.name === e.target.value) || null;
            if (this.selectedVoice) localStorage.setItem('iris_tts_voice', this.selectedVoice.name);
        };

        this._updateButtons(true);
    },

    // ─────────────────────────────────────────────────
    // HABLAR
    // ─────────────────────────────────────────────────
    speak(text) {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('TTS no disponible en este navegador'));
                return;
            }
            if (!text || !text.trim()) {
                reject(new Error('El campo de pregunta está vacío'));
                return;
            }

            this.stop(); // cancelar lo anterior

            const utterance = new SpeechSynthesisUtterance(text.trim());

            // Asignar voz solo si el usuario seleccionó una (si no, el navegador elige la mejor)
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
                utterance.lang  = this.selectedVoice.lang;
            } else {
                utterance.lang = 'es-CO'; // pista de idioma para el navegador
            }
            utterance.rate  = this.rate;
            utterance.pitch = this.pitch;

            utterance.onstart = () => {
                this.isSpeaking = true;
                this._showIndicator(true);
                this._showStopButton(true);
                this._startKeepAlive(); // fix Chrome bug
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                this._showIndicator(false);
                this._showStopButton(false);
                this._stopKeepAlive();
                resolve();
            };

            utterance.onerror = (e) => {
                this.isSpeaking = false;
                this._showIndicator(false);
                this._showStopButton(false);
                this._stopKeepAlive();
                if (e.error === 'canceled' || e.error === 'interrupted') {
                    resolve(); // cancelación voluntaria, no es error
                } else {
                    console.error('TTS error:', e.error);
                    reject(new Error('Error de voz: ' + e.error));
                }
            };

            this.synth.speak(utterance);
        });
    },

    stop() {
        this._stopKeepAlive();
        if (this.synth) this.synth.cancel();
        this.isSpeaking = false;
        this._showIndicator(false);
        this._showStopButton(false);
    },

    // ─────────────────────────────────────────────────
    // WORKAROUND: Chrome pausa speechSynthesis a los ~15s
    // solución: hacer resume() cada 10s
    // ─────────────────────────────────────────────────
    _startKeepAlive() {
        this._stopKeepAlive();
        this._keepAliveTimer = setInterval(() => {
            if (this.synth && this.synth.speaking) {
                this.synth.pause();
                this.synth.resume();
            }
        }, 10000);
    },

    _stopKeepAlive() {
        if (this._keepAliveTimer) {
            clearInterval(this._keepAliveTimer);
            this._keepAliveTimer = null;
        }
    },

    // ─────────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────────
    _showIndicator(show) {
        const el = document.getElementById('tts-indicator');
        if (el) el.style.display = show ? 'flex' : 'none';
    },

    _showStopButton(show) {
        const el = document.getElementById('btn-stop-tts');
        if (el) el.style.display = show ? '' : 'none';
    },

    _updateButtons(enabled = true) {
        // btn-speak: habilitado cuando hay texto (la voz es opcional, el navegador usa la suya)
        // btn-save:  habilitado cuando hay texto
        // Este método solo controla el estado inicial; el texto lo maneja questions.js
        const speak = document.getElementById('btn-speak');
        const save  = document.getElementById('btn-save');
        // No forzar disabled aquí — questions.js controla esto según el texto
    },

    // ─────────────────────────────────────────────────
    // SETTERS (llamados desde settings.html)
    // ─────────────────────────────────────────────────
    setRate(rate) {
        this.rate = rate;
        localStorage.setItem('iris_tts_rate', rate);
    },

    setPitch(pitch) {
        this.pitch = pitch;
        localStorage.setItem('iris_tts_pitch', pitch);
    },

    isAvailable() {
        return !!this.synth;
    },
};
