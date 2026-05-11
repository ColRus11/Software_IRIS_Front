/**
 * IRIS / Un Mundo en Silencio — Módulo de Transcripción
 * Web Speech API — crea una instancia nueva en cada start() para evitar estado inválido.
 */
const IrisTranscription = {
    recognition:       null,
    isListening:       false,
    currentTranscript: '',
    _networkRetries:   0,
    _maxRetries:       3,

    onTranscriptUpdate: null,
    onError:            null,
    onEnd:              null,

    init() {
        // Solo verifica soporte; la instancia se crea en start()
        return this.isSupported();
    },

    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },

    start(onUpdate, onErr, onFinish) {
        if (!this.isSupported()) return false;

        this.currentTranscript  = '';
        this._networkRetries    = 0;
        this.isListening        = true;
        this.onTranscriptUpdate = onUpdate;
        this.onError            = onErr;
        this.onEnd              = onFinish;

        this._createAndStart();
        return true;
    },

    _createAndStart() {
        // Detener instancia anterior si existe
        if (this.recognition) {
            try { this.recognition.abort(); } catch (_) {}
            this.recognition = null;
        }

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang             = 'es-ES';   // es-ES tiene mayor cobertura que es-CO en la API de Google
        rec.continuous       = true;
        rec.interimResults   = true;
        rec.maxAlternatives  = 1;

        rec.onresult = (event) => {
            this._networkRetries = 0; // reset en resultado exitoso
            let interim   = '';
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += t + ' ';
                    this.currentTranscript += t + ' ';
                } else {
                    interim += t;
                }
            }

            if (this.onTranscriptUpdate) {
                this.onTranscriptUpdate(this.currentTranscript + interim, !!finalText);
            }
        };

        rec.onerror = (event) => {
            if (event.error === 'no-speech') return; // silencio normal — ignorar

            if (event.error === 'network') {
                // Error de red: reintentar automáticamente hasta 3 veces
                this._networkRetries++;
                if (this._networkRetries <= this._maxRetries) {
                    console.warn(`Speech API network error — reintento ${this._networkRetries}/${this._maxRetries}`);
                    setTimeout(() => {
                        if (this.isListening) this._createAndStart();
                    }, 1000 * this._networkRetries);
                    return;
                }
            }

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                if (this.onError) this.onError('Permiso de micrófono denegado. Revisa la configuración del navegador.');
                this.isListening = false;
                return;
            }

            if (this.onError) this.onError(event.error);
        };

        rec.onend = () => {
            if (this.isListening && this.recognition === rec) {
                // Reiniciar continuo (Chrome a veces corta la sesión)
                try { rec.start(); } catch (_) {
                    // Si falla el restart en la misma instancia, crear una nueva
                    setTimeout(() => {
                        if (this.isListening) this._createAndStart();
                    }, 500);
                }
            } else {
                if (this.onEnd) this.onEnd();
            }
        };

        try {
            rec.start();
            this.recognition = rec;
        } catch (e) {
            console.error('Error al iniciar reconocimiento de voz:', e);
            if (this.onError) this.onError(e.message);
        }
    },

    stop() {
        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (_) {}
            this.recognition = null;
        }
        return this.currentTranscript.trim();
    },

    clear() {
        this.currentTranscript = '';
    },
};
