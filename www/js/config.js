/**
 * IRIS / Un Mundo en Silencio — Configuración Global
 * Firebase proyecto: unpaused-app
 */
const IRIS_CONFIG = {
    // Django API URL (production)
    API_URL: 'https://softwareirisback-production.up.railway.app/api',

    // Firebase — credenciales reales del proyecto
    FIREBASE: {
        apiKey:            "AIzaSyAeA6H1i3GQsnLXak7-fNg-v71vVWvVlQY",
        authDomain:        "unpaused-app.firebaseapp.com",
        projectId:         "unpaused-app",
        storageBucket:     "unpaused-app.firebasestorage.app",
        messagingSenderId: "358160506187",
        appId:             "1:358160506187:web:6bdf8e7c73ac8c0b00dcce"
    },

    // Firestore REST base URL
    FIRESTORE_URL: "https://firestore.googleapis.com/v1/projects/unpaused-app/databases/(default)/documents",

    // Valores por defecto de TTS
    TTS: {
        rate:  1.0,
        pitch: 1.0,
        lang:  'es-CO'
    },

    // Roles del sistema
    ROLES: {
        STUDENT: 'Student',
        TEACHER: 'Teacher',
        ADMIN:   'Admin'
    }
};
