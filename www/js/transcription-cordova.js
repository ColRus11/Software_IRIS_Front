/**
 * IRIS / Un Mundo en Silencio — Módulo de Transcripción (Cordova / iOS Nativo)
 * Usa cordova-plugin-speechrecognition
 */
const IrisTranscription = {
    isListening: false,
    currentTranscript: '',
    onTranscriptUpdate: null,
    onError: null,
    onEnd: null,

    /**
     * Inicializar (solicita permisos)
     */
    init() {
        if (!window.plugins || !window.plugins.speechRecognition) {
            console.warn('⚠️ Plugin de Speech Recognition no encontrado.');
            return false;
        }

        // Solicitar permisos de micrófono y reconocimiento si no los tiene
        window.plugins.speechRecognition.hasPermission((hasPermission) => {
            if (!hasPermission) {
                window.plugins.speechRecognition.requestPermission(
                    () => console.log('Permisos concedidos'),
                    (err) => console.error('Permisos denegados', err)
                );
            }
        }, (err) => console.error(err));

        return true;
    },

    /**
     * Iniciar transcripción
     */
    start(onUpdate, onErr, onFinish) {
        if (!window.plugins || !window.plugins.speechRecognition) return false;

        this.currentTranscript = '';
        this.isListening = true;
        this.onTranscriptUpdate = onUpdate;
        this.onError = onErr;
        this.onEnd = onFinish;

        const options = {
            language: "es-CO",
            matches: 1,
            showPartial: true,
            showPopup: false // en iOS no aplica, en Android evita el popup de Google
        };

        window.plugins.speechRecognition.startListening(
            (matches) => {
                if (!this.isListening) return;
                
                // matches[0] contiene el resultado de la frase actual.
                // En iOS, esto acumula la frase mientras no haya un silencio largo.
                const partialText = matches[0];
                
                // NOTA: Para este prototipo cordova, actualizamos el texto directamente.
                if (this.onTranscriptUpdate) {
                    this.onTranscriptUpdate(partialText, false);
                }
                
                // Guardamos el texto en currentTranscript
                this.currentTranscript = partialText;
            },
            (err) => {
                console.error('Speech recognition error:', err);
                if (this.onError) this.onError(err);
                if (this.onEnd) this.onEnd();
                this.isListening = false;
            },
            options
        );

        return true;
    },

    /**
     * Detener transcripción
     */
    stop() {
        this.isListening = false;
        if (window.plugins && window.plugins.speechRecognition) {
            window.plugins.speechRecognition.stopListening(
                () => {
                    if (this.onEnd) this.onEnd();
                },
                (err) => console.error('Error al detener', err)
            );
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
        return !!(window.plugins && window.plugins.speechRecognition);
    },
};
