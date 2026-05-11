/**
 * IRIS / Un Mundo en Silencio — Configuración Global
 * Auth: Django JWT (djangorestframework-simplejwt)
 */
const IRIS_CONFIG = {
    // Django API URL — desarrollo local
    API_URL: 'http://localhost:8000/api',

    // TTS por defecto
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
