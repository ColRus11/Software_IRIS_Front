# 📖 Diccionario de Variables — IRIS Frontend

Documento de referencia para todo el equipo. Contiene los módulos JS, IDs del DOM, claves de localStorage, configuración, y variables CSS usadas en el frontend de IRIS.

> **Última actualización:** Sprint 1  
> **Tecnología:** Apache Cordova + MaterializeCSS + Vanilla JS  
> **Plataforma:** Browser (desarrollo), futuro: Android/iOS

---

## 📐 Arquitectura de Módulos JS

```
www/js/
├── config.js       → Configuración global (Firebase, API URL, TTS defaults)
├── api.js          → Comunicación HTTP con el backend Django
├── auth.js         → Autenticación Firebase (login, registro, logout)
├── tts.js          → Text-to-Speech con Web Speech Synthesis API
├── questions.js    → Lógica de preguntas (crear, guardar, reproducir)
├── app.js          → Controlador principal (navegación, settings, init)
└── index.js        → Entry point de Cordova
```

---

## ⚙️ Configuración Global (`IRIS_CONFIG`)

**Archivo:** `www/js/config.js`

| Variable | Ruta | Tipo | Valor Default | Descripción |
|----------|------|------|---------------|-------------|
| `API_URL` | `IRIS_CONFIG.API_URL` | `string` | `http://localhost:8000/api` | URL base de la API Django |
| `apiKey` | `IRIS_CONFIG.FIREBASE.apiKey` | `string` | `YOUR_API_KEY` | API Key de Firebase |
| `authDomain` | `IRIS_CONFIG.FIREBASE.authDomain` | `string` | `YOUR_PROJECT.firebaseapp.com` | Dominio de auth Firebase |
| `projectId` | `IRIS_CONFIG.FIREBASE.projectId` | `string` | `YOUR_PROJECT_ID` | ID del proyecto Firebase |
| `storageBucket` | `IRIS_CONFIG.FIREBASE.storageBucket` | `string` | `YOUR_PROJECT.appspot.com` | Bucket de almacenamiento |
| `messagingSenderId` | `IRIS_CONFIG.FIREBASE.messagingSenderId` | `string` | `YOUR_SENDER_ID` | Sender ID de mensajería |
| `appId` | `IRIS_CONFIG.FIREBASE.appId` | `string` | `YOUR_APP_ID` | App ID de Firebase |
| `rate` | `IRIS_CONFIG.TTS.rate` | `number` | `1.0` | Velocidad de voz por defecto |
| `pitch` | `IRIS_CONFIG.TTS.pitch` | `number` | `1.0` | Tono de voz por defecto |
| `lang` | `IRIS_CONFIG.TTS.lang` | `string` | `es-ES` | Idioma de voz por defecto |

> ⚠️ **Nota:** Si `apiKey` === `'YOUR_API_KEY'`, la app entra en **modo demo** (sin Firebase real).

---

## 🏷️ IDs del DOM (`index.html`)

### Páginas

| ID | Elemento | Descripción |
|----|----------|-------------|
| `page-login` | `<div>` | Página de login/registro |
| `app-shell` | `<div>` | Contenedor principal (post-login) |
| `page-home` | `<div>` | Dashboard principal |
| `page-questions` | `<div>` | Página de preguntas con voz |
| `page-history` | `<div>` | Página de historial |
| `page-settings` | `<div>` | Página de configuración |

### Login

| ID | Elemento | Descripción |
|----|----------|-------------|
| `login-form` | `<form>` | Formulario de login |
| `login-email` | `<input>` | Campo de correo electrónico |
| `login-password` | `<input>` | Campo de contraseña |
| `login-submit` | `<button>` | Botón de enviar |
| `login-btn-text` | `<span>` | Texto del botón (cambia entre "Iniciar Sesión" y "Registrarse") |
| `login-toggle` | `<button>` | Toggle entre login y registro |
| `login-error` | `<div>` | Contenedor de mensajes de error |

### Navbar

| ID | Elemento | Descripción |
|----|----------|-------------|
| `navbar-title` | `<span>` | Título dinámico del navbar |
| `btn-stop-tts` | `<button>` | Botón detener voz (oculto por defecto) |
| `btn-settings` | `<button>` | Botón abrir configuración |
| `btn-logout` | `<button>` | Botón cerrar sesión (navbar) |

### Dashboard

| ID | Elemento | Descripción |
|----|----------|-------------|
| `nav-questions` | `<a>` | Card "Preguntar con Voz" |
| `nav-history` | `<a>` | Card "Historial" |
| `nav-transcription` | `<a>` | Card "Clase en Vivo" (deshabilitado) |
| `nav-alerts` | `<a>` | Card "Emergencias" (deshabilitado) |

### Preguntas

| ID | Elemento | Descripción |
|----|----------|-------------|
| `question-text` | `<textarea>` | Campo de texto de la pregunta |
| `session-name` | `<input>` | Nombre de la clase/sesión (opcional) |
| `voice-selector` | `<select>` | Selector de voz TTS |
| `btn-speak` | `<button>` | Botón "Reproducir" |
| `btn-save` | `<button>` | Botón "Guardar" |
| `tts-indicator` | `<div>` | Indicador visual TTS (vúmetro) |
| `session-questions` | `<ul>` | Lista de preguntas de la sesión |
| `session-empty` | `<div>` | Mensaje "sin preguntas" |

### Historial

| ID | Elemento | Descripción |
|----|----------|-------------|
| `history-list` | `<ul>` | Lista del historial |
| `history-empty` | `<div>` | Mensaje "historial vacío" |
| `history-loading` | `<div>` | Spinner de carga |
| `history-search` | `<input>` | Campo de búsqueda |

### Settings

| ID | Elemento | Descripción |
|----|----------|-------------|
| `toggle-dark-mode` | `<input checkbox>` | Toggle modo oscuro |
| `voice-rate` | `<input range>` | Slider velocidad de voz (0.5 - 2.0) |
| `voice-rate-label` | `<span>` | Label del valor de velocidad |
| `voice-pitch` | `<input range>` | Slider tono de voz (0.5 - 2.0) |
| `voice-pitch-label` | `<span>` | Label del valor de tono |
| `btn-test-voice` | `<button>` | Botón probar voz |
| `settings-email` | `<span>` | Email del usuario logueado |
| `btn-logout-settings` | `<button>` | Botón cerrar sesión (settings) |

### Otros

| ID | Elemento | Descripción |
|----|----------|-------------|
| `toast` | `<div>` | Notificación toast/snackbar |

---

## 💾 Claves de LocalStorage

| Clave | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `iris_theme` | `string` | Tema visual | `'light'` \| `'dark'` |
| `iris_fontsize` | `string` | Tamaño de fuente | `'normal'` \| `'large'` \| `'xlarge'` |
| `iris_tts_rate` | `string` (float) | Velocidad de voz | `'1.0'` |
| `iris_tts_pitch` | `string` (float) | Tono de voz | `'1.0'` |
| `iris_tts_voice` | `string` | Nombre de la voz seleccionada | `'Microsoft Helena'` |
| `iris_local_questions` | `string` (JSON array) | Preguntas guardadas offline | `'[{"text":"..."}]'` |

---

## 🧩 Módulos JS — Métodos Públicos

### `IrisAuth` (`auth.js`)

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `init()` | — | `void` | Inicializa Firebase Auth |
| `register(email, password)` | `string, string` | `Promise<User>` | Registrar nuevo usuario |
| `login(email, password)` | `string, string` | `Promise<User>` | Iniciar sesión |
| `logout()` | — | `Promise<void>` | Cerrar sesión |

**Propiedad:** `currentUser` — Objeto del usuario actual (`{ uid, email }` o `null`)

### `IrisAPI` (`api.js`)

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `getHeaders()` | — | `Object` | Headers con Content-Type y Firebase UID |
| `createQuestion(data)` | `Object` | `Promise<Object>` | POST crear pregunta |
| `getQuestions(firebaseUid, session?)` | `string, string?` | `Promise<Object>` | GET listar preguntas |
| `markSpoken(questionId)` | `number` | `Promise<Object>` | PATCH marcar como hablada |
| `deleteQuestion(questionId)` | `number` | `Promise<void>` | DELETE eliminar pregunta |

### `IrisTTS` (`tts.js`)

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `init()` | — | `void` | Inicializa Speech Synthesis |
| `speak(text)` | `string` | `Promise<void>` | Reproducir texto como voz |
| `stop()` | — | `void` | Detener reproducción |
| `setRate(rate)` | `number` | `void` | Cambiar velocidad |
| `setPitch(pitch)` | `number` | `void` | Cambiar tono |
| `isAvailable()` | — | `boolean` | Verificar soporte TTS |

**Propiedades:** `isSpeaking`, `selectedVoice`, `voices[]`, `rate`, `pitch`

### `IrisQuestions` (`questions.js`)

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `init()` | — | `void` | Setup event listeners |
| `speakQuestion()` | — | `Promise<void>` | Reproducir pregunta actual |
| `saveQuestion()` | — | `Promise<void>` | Guardar sin reproducir |
| `loadHistory()` | — | `Promise<void>` | Cargar historial del backend |
| `filterHistory(query)` | `string` | `void` | Filtrar historial por texto |

### `IrisApp` (`app.js`)

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `init()` | — | `void` | Inicializar toda la app |
| `onUserReady(user)` | `Object` | `void` | Callback post-login |
| `navigateTo(page)` | `string` | `void` | Navegar a página |
| `showToast(message, duration?)` | `string, number?` | `void` | Mostrar notificación |

**Páginas válidas para `navigateTo`:** `'home'`, `'questions'`, `'history'`, `'settings'`

---

## 🎨 Variables CSS Personalizadas

**Archivo:** `www/css/app.css`

| Variable | Descripción | Uso |
|----------|-------------|-----|
| `--iris-primary` | Color primario | Botones, badges, navbar |
| `--iris-accent` | Color de acento | Botón reproducir, iconos destacados |
| `--iris-error` | Color de error | Botón logout, mensajes de error |
| `--iris-success` | Color de éxito | Iconos de clase en vivo |
| `--iris-warning` | Color de advertencia | Iconos de emergencia |
| `--iris-bg` | Color de fondo | Body, páginas |
| `--iris-surface` | Color de superficie | Cards, formularios |
| `--iris-text` | Color de texto | Texto principal |
| `--iris-text-secondary` | Color de texto secundario | Subtítulos, metadata |

> Estas variables cambian automáticamente según `data-theme="light"` o `data-theme="dark"`.

---

## 📜 Clases CSS Principales

| Clase | Descripción |
|-------|-------------|
| `iris-page` | Contenedor de página |
| `iris-page.active` | Página visible |
| `iris-hidden` | Elemento oculto |
| `iris-btn` | Botón base |
| `iris-btn--primary` | Botón color primario |
| `iris-btn--accent` | Botón color acento |
| `iris-btn--outline` | Botón con borde |
| `iris-btn--small` | Botón pequeño |
| `iris-navbar` | Barra de navegación superior |
| `iris-bottom-nav` | Navegación inferior |
| `iris-bottom-nav__item.active` | Item activo en nav inferior |
| `iris-dashboard__card` | Card del dashboard |
| `iris-toast.show` | Toast visible |
| `iris-tts-indicator.active` | Vúmetro TTS animado |
| `iris-toggle` | Toggle switch (dark mode) |
| `iris-spinner` | Spinner de carga |

---

## 🔗 Headers HTTP Personalizados

| Header | Valor | Descripción |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Tipo de contenido |
| `X-Firebase-UID` | `string` | UID del usuario autenticado (enviado al backend) |

---

## 🔥 Errores de Firebase Auth (Español)

| Código Firebase | Mensaje al usuario |
|-----------------|-------------------|
| `auth/email-already-in-use` | Este correo ya está registrado. |
| `auth/invalid-email` | El correo electrónico no es válido. |
| `auth/weak-password` | La contraseña debe tener al menos 6 caracteres. |
| `auth/user-not-found` | No existe una cuenta con este correo. |
| `auth/wrong-password` | La contraseña es incorrecta. |
| `auth/too-many-requests` | Demasiados intentos. Intenta más tarde. |
| `auth/invalid-credential` | Credenciales inválidas. Verifica tu correo y contraseña. |
