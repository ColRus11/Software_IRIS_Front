/**
 * IRIS / Un Mundo en Silencio — Módulo de Transcripción
 * Usa Web Speech API (SpeechRecognition) — sin costo, sin Azure
 * Alternativa a AzureSpeechToTextService.cs del repo del compañero
 */
const IrisTranscription = {
    recognition: null,
    isListening: false,
    currentTranscript: '',
    onTranscriptUpdate: null, // callback(text, isFinal)
    onError: null,            // callback(error)
    onEnd: null,              // callback()

    /**
     * Inicializar Web Speech API
     * @returns {boolean} - true si el navegador lo soporta
     */
    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('⚠️ Web Speech API no soportada en este navegador/dispositivo.');
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'es-CO';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            let interim = '';
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += transcript + ' ';
                    this.currentTranscript += finalText;
                } else {
                    interim += transcript;
                }
            }

            if (this.onTranscriptUpdate) {
                this.onTranscriptUpdate(
                    this.currentTranscript + interim,
                    !!finalText
                );
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (this.onError) this.onError(event.error);
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Reconectar automáticamente si todavía debe estar activo
                try { this.recognition.start(); } catch (e) { /* ignore */ }
            } else {
                if (this.onEnd) this.onEnd();
            }
        };

        return true;
    },

    /**
     * Iniciar transcripción
     * @param {Function} onUpdate - callback(fullText, isFinal)
     * @param {Function} onErr - callback(errorMessage)
     * @param {Function} onFinish - callback()
     * @returns {boolean}
     */
    start(onUpdate, onErr, onFinish) {
        if (!this.recognition && !this.init()) return false;

        this.currentTranscript = '';
        this.isListening = true;
        this.onTranscriptUpdate = onUpdate;
        this.onError = onErr;
        this.onEnd = onFinish;

        try {
            this.recognition.start();
            return true;
        } catch (e) {
            console.error('Error starting recognition:', e);
            return false;
        }
    },

    /**
     * Detener transcripción
     * @returns {string} - texto completo transcrito
     */
    stop() {
        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { /* ignore */ }
        }
        return this.currentTranscript.trim();
    },

    /**
     * Limpiar transcript actual
     */
    clear() {
        this.currentTranscript = '';
    },

    /**
     * Verificar soporte
     */
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },
};
