/**
 * IRIS - Configuración Global
 * Firebase config y constantes de la aplicación
 */
const IRIS_CONFIG = {
    // Django API URL (development)
    API_URL: 'http://localhost:8000/api',

    // Firebase Configuration
    // TODO: Reemplazar con tu configuración real de Firebase
    FIREBASE: {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    },

    // Valores por defecto de TTS
    TTS: {
        rate: 1.0,
        pitch: 1.0,
        lang: 'es-ES'
    }
};
