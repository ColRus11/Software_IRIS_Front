/**
 * IRIS — Módulo Avatar LSC
 */
const IrisAvatar = {
    _inited: false,
    _animActual: null,
    _secuenciaCancelada: false,
    _velocidad: 1,

    SEÑAS: {
        A: { desc: 'Puño cerrado, pulgar al costado' },
        B: { desc: 'Cuatro dedos extendidos, pulgar doblado' },
        C: { desc: 'Mano curvada en C' },
        D: { desc: 'Índice apunta arriba' },
        E: { desc: 'Dedos doblados, pulgar bajo los dedos' },
        F: { desc: 'Índice y pulgar se tocan' },
        I: { desc: 'Meñique extendido, resto cerrado' },
        L: { desc: 'Índice arriba, pulgar extendido — forma L' },
        M: { desc: '3 dedos sobre pulgar' },
        N: { desc: '2 dedos sobre pulgar' },
        O: { desc: 'Dedos y pulgar forman una O' },
        R: { desc: 'Índice y medio cruzados' },
        S: { desc: 'Puño cerrado, pulgar encima' },
        U: { desc: 'Índice y medio extendidos juntos' },
        V: { desc: 'Índice y medio en V' },
        Y: { desc: 'Pulgar y meñique extendidos' },
    },

    LETRAS_LOTTIE: ['A', 'M', 'O', 'R', 'S'],

    init() {
        if (this._inited) return;
        this._inited = true;
        this._setupInput();
        this._setupMic();
        this._setupSpeed();
    },

    mostrarLetra(letra, onTerminado) {
        letra = letra.toUpperCase();
        const config = this.SEÑAS[letra];

        document.getElementById('avatar-empty-state').style.display = 'none';
        document.getElementById('avatar-letra-display').textContent = letra;
        document.getElementById('avatar-nombre-seña').textContent =
            config ? '— ' + config.desc : '— Seña en desarrollo';

        const archivo = this.LETRAS_LOTTIE.includes(letra) ? letra : 'X';
        const container = document.getElementById('avatar-lottie');
        if (container) {
            container.innerHTML = '';
            if (this._animActual) { this._animActual.destroy(); this._animActual = null; }
            const anim = lottie.loadAnimation({

                container: container,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                path: 'img/lotties/' + archivo + '.json'
            }); 
            this._animActual = anim;
            anim.setSpeed(this._velocidad);
            anim.addEventListener('complete', () => {
                if (onTerminado) onTerminado();
            });
        }
    },

    mostrarPalabra(palabra) {
        const letras = palabra.toUpperCase().replace(/[^A-Z]/g, '').split('');
        if (!letras.length) return;
        this._secuenciaCancelada = true;
        if (this._animActual) { this._animActual.destroy(); this._animActual = null; }
        this._secuenciaCancelada = false;
        let i = 0;
        const siguiente = () => {
            if (this._secuenciaCancelada || i >= letras.length) return;
            this.mostrarLetra(letras[i], () => { i++; siguiente(); });
        };
        siguiente();
    },

    _setupInput() {
        const input = document.getElementById('avatar-letra-input');
        if (!input) return;
        input.addEventListener('input', e => {
            const v = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
            e.target.value = v;
            if (v) this.mostrarPalabra(v);
            else {
                const container = document.getElementById('avatar-lottie');
                if (container) container.innerHTML = '';
                document.getElementById('avatar-empty-state').style.display = '';
                document.getElementById('avatar-letra-display').textContent = '';
                document.getElementById('avatar-nombre-seña').textContent = '';
            }
        });
    },

    _setupSpeed() {
        const slider = document.getElementById('avatar-speed-slider');
        const label = document.getElementById('avatar-speed-label');
        if (!slider) return;
        slider.addEventListener('input', e => {
            this._velocidad = parseFloat(e.target.value);
            if (label) label.textContent = this._velocidad.toFixed(1) + 'x';
            if (this._animActual) this._animActual.setSpeed(this._velocidad);
        });
    },

    _setupMic() {
        const btn = document.getElementById('avatar-btn-mic');
        const status = document.getElementById('avatar-mic-status');
        if (!btn) return;

        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            btn.disabled = true; btn.style.opacity = '0.4'; return;
        }

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recog = new SR();
        recog.lang = 'es-CO'; recog.interimResults = false; recog.maxAlternatives = 1;

        let recognizing = false;
        const icon = () => btn.querySelector('.material-symbols-outlined');

        recog.onstart = () => { recognizing = true; if (status) status.textContent = '🔴 Escuchando...'; icon().textContent = 'mic_off'; };
        recog.onend = () => { recognizing = false; if (status) status.textContent = ''; icon().textContent = 'mic'; };
        recog.onerror = () => { recognizing = false; if (status) status.textContent = ''; icon().textContent = 'mic'; };
        recog.onresult = e => {
            const palabra = e.results[0][0].transcript.trim().toUpperCase().replace(/[^A-Z]/g, '');
            if (palabra) {
                const inp = document.getElementById('avatar-letra-input');
                if (inp) inp.value = palabra;
                this.mostrarPalabra(palabra);
            }
        };

        btn.addEventListener('click', () => { if (recognizing) recog.stop(); else recog.start(); });
    },
};