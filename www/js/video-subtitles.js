/**
 * IRIS / Un Mundo en Silencio — Video Subtitle Generator
 * Genera subtítulos (.SRT / .VTT) desde video usando Web Speech API
 * No requiere Azure ni servicios de pago
 */
const IrisVideoSubs = {
    videoFile: null,
    segments: [],          // [{index, start, end, text}]
    recognition: null,
    isTranscribing: false,
    currentStart: 0,       // timestamp en segundos cuando inició el segmento actual
    interimText: '',

    // ─────────────────────────────────────────
    // CARGA DE VIDEO
    // ─────────────────────────────────────────
    handleDrop(event) {
        event.preventDefault();
        document.getElementById('vs-dropzone').style.borderColor = 'var(--c-outline-var)';
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            this.loadVideo(file);
        } else {
            IrisApp.showToast('⚠️ Solo se aceptan archivos de video');
        }
    },

    loadVideo(file) {
        if (!file) return;
        this.videoFile = file;

        // Mostrar info del archivo
        document.getElementById('vs-filename').textContent = file.name;
        document.getElementById('vs-filesize').textContent = this._formatSize(file.size);
        document.getElementById('vs-file-info').style.display = 'flex';

        // Crear URL y asignar al player
        const url = URL.createObjectURL(file);
        const player = document.getElementById('vs-player');
        player.src = url;

        // Mostrar pasos 2 y 3
        document.getElementById('vs-step-transcribe').style.display = 'block';
        document.getElementById('vs-step-results').style.display = 'block';

        IrisApp.showToast('✅ Video cargado — reproduce y transcribe');
    },

    reset() {
        this.stopTranscription();
        this.segments = [];
        this.videoFile = null;

        const player = document.getElementById('vs-player');
        if (player.src) URL.revokeObjectURL(player.src);
        player.src = '';

        document.getElementById('vs-file-info').style.display = 'none';
        document.getElementById('vs-step-transcribe').style.display = 'none';
        document.getElementById('vs-step-results').style.display = 'none';
        this._renderSegments();
    },

    // ─────────────────────────────────────────
    // REPRODUCCIÓN
    // ─────────────────────────────────────────
    onTimeUpdate() {
        const player = document.getElementById('vs-player');
        const t = player.currentTime;
        // Mostrar subtítulo activo en el overlay
        const active = this.segments.find(s => t >= s.start && t <= s.end);
        const overlay = document.getElementById('vs-subtitle-overlay');
        const sub     = document.getElementById('vs-current-subtitle');
        if (active) {
            overlay.style.display = 'block';
            sub.textContent = active.text;
        } else {
            overlay.style.display = 'none';
        }
    },

    onPlay() {
        // Auto-iniciar transcripción al reproducir si ya estaba activa
        if (this.isTranscribing && this.recognition) {
            try { this.recognition.start(); } catch(e) {}
        }
    },

    onPause() {
        // Pausar reconocimiento también
        if (this.isTranscribing && this.recognition) {
            try { this.recognition.stop(); } catch(e) {}
        }
    },

    onEnded() {
        this.stopTranscription();
        IrisApp.showToast('✅ Video terminado — revisa los subtítulos');
    },

    // ─────────────────────────────────────────
    // TRANSCRIPCIÓN
    // ─────────────────────────────────────────
    toggleTranscription() {
        if (this.isTranscribing) {
            this.stopTranscription();
        } else {
            this.startTranscription();
        }
    },

    startTranscription() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            IrisApp.showToast('❌ Tu navegador no soporta reconocimiento de voz (usa Chrome)');
            return;
        }

        const player = document.getElementById('vs-player');

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'es-CO';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            let finalText = '';
            let interimText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += t;
                } else {
                    interimText += t;
                }
            }

            // Mostrar texto en vivo
            const liveEl = document.getElementById('vs-live-text');
            if (liveEl) liveEl.textContent = interimText || finalText;

            if (finalText.trim()) {
                const startTime = this.currentStart;
                const endTime   = player.currentTime;
                this._addSegment(startTime, endTime, finalText.trim());
                this.currentStart = endTime;
            }
        };

        this.recognition.onerror = (e) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                IrisApp.showToast('⚠️ Error de micrófono: ' + e.error);
            }
        };

        this.recognition.onend = () => {
            // Reconectar automáticamente si el video sigue reproduciéndose
            if (this.isTranscribing && !player.paused && !player.ended) {
                this.currentStart = player.currentTime;
                try { this.recognition.start(); } catch(e) {}
            }
        };

        this.isTranscribing = true;
        this.currentStart   = player.currentTime;

        try {
            this.recognition.start();
        } catch(e) {
            IrisApp.showToast('❌ No se pudo acceder al micrófono');
            this.isTranscribing = false;
            return;
        }

        // UI
        document.getElementById('vs-btn-text').textContent = 'Detener';
        document.getElementById('vs-btn-transcribe').style.background = 'var(--c-error)';
        document.getElementById('vs-live-status').style.display = 'flex';

        // Auto-play video
        player.play().catch(() => {});

        IrisApp.showToast('🎙️ Escuchando — reproduce el video con volumen alto');
    },

    stopTranscription() {
        this.isTranscribing = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch(e) {}
            this.recognition = null;
        }

        document.getElementById('vs-btn-text').textContent = 'Iniciar Transcripción';
        const btn = document.getElementById('vs-btn-transcribe');
        if (btn) btn.style.background = '';

        const status = document.getElementById('vs-live-status');
        if (status) status.style.display = 'none';
    },

    clearSegments() {
        this.segments = [];
        this._renderSegments();
        IrisApp.showToast('🗑️ Segmentos eliminados');
    },

    // ─────────────────────────────────────────
    // SEGMENTOS
    // ─────────────────────────────────────────
    _addSegment(start, end, text) {
        // Evitar duplicados o segmentos muy cortos
        if ((end - start) < 0.3) return;

        const seg = {
            index: this.segments.length + 1,
            start: Math.round(start * 1000) / 1000,
            end:   Math.round(end   * 1000) / 1000,
            text,
        };
        this.segments.push(seg);
        this._renderSegments();
    },

    _renderSegments() {
        const list  = document.getElementById('vs-segments-list');
        const empty = document.getElementById('vs-segments-empty');
        const count = document.getElementById('vs-seg-count');
        if (!list) return;

        count.textContent = `${this.segments.length} segmento${this.segments.length !== 1 ? 's' : ''}`;

        if (this.segments.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        list.innerHTML = this.segments.map((s, i) => `
          <div style="display:flex;gap:0.75rem;align-items:flex-start;padding:0.75rem;background:var(--c-surface-low);border-radius:0.75rem;border:1px solid rgba(0,0,0,.04);">
            <span style="font-size:0.6875rem;font-weight:700;color:var(--c-outline);min-width:28px;text-align:right;padding-top:2px;">${s.index}</span>
            <div style="flex:1;min-width:0;">
              <p style="font-size:0.6875rem;font-weight:600;color:var(--c-secondary);margin-bottom:4px;font-family:monospace;">${this._formatTime(s.start)} → ${this._formatTime(s.end)}</p>
              <p contenteditable="true"
                onblur="IrisVideoSubs.editSegment(${i}, this.textContent)"
                style="font-size:0.9375rem;color:var(--c-primary);outline:none;line-height:1.4;cursor:text;">${s.text}</p>
            </div>
            <button onclick="IrisVideoSubs.deleteSegment(${i})"
              style="background:none;border:none;cursor:pointer;color:var(--c-outline);padding:0;flex-shrink:0;">
              <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
            </button>
          </div>
        `).join('');
    },

    editSegment(index, newText) {
        if (this.segments[index]) {
            this.segments[index].text = newText.trim();
        }
    },

    deleteSegment(index) {
        this.segments.splice(index, 1);
        this.segments.forEach((s, i) => s.index = i + 1);
        this._renderSegments();
    },

    // ─────────────────────────────────────────
    // EXPORTAR
    // ─────────────────────────────────────────
    downloadSRT() {
        if (!this.segments.length) { IrisApp.showToast('ℹ️ No hay segmentos para exportar'); return; }
        const content = this.segments.map(s =>
            `${s.index}\n${this._toSRTTime(s.start)} --> ${this._toSRTTime(s.end)}\n${s.text}\n`
        ).join('\n');
        this._download(content, `${this._baseName()}.srt`, 'text/plain');
        IrisApp.showToast('✅ Descargando subtítulos SRT');
    },

    downloadVTT() {
        if (!this.segments.length) { IrisApp.showToast('ℹ️ No hay segmentos para exportar'); return; }
        const content = 'WEBVTT\n\n' + this.segments.map(s =>
            `${this._toVTTTime(s.start)} --> ${this._toVTTTime(s.end)}\n${s.text}\n`
        ).join('\n');
        this._download(content, `${this._baseName()}.vtt`, 'text/vtt');
        IrisApp.showToast('✅ Descargando subtítulos VTT');
    },

    _download(content, filename, type) {
        const blob = new Blob([content], { type });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    _baseName() {
        if (!this.videoFile) return 'subtitulos';
        return this.videoFile.name.replace(/\.[^.]+$/, '');
    },

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────
    _formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = (s % 60).toFixed(1).padStart(4, '0');
        return `${String(m).padStart(2,'0')}:${sec}`;
    },

    _toSRTTime(s) {
        const h   = Math.floor(s / 3600);
        const m   = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms  = Math.round((s % 1) * 1000);
        return `${pad(h)}:${pad(m)}:${pad(sec)},${String(ms).padStart(3,'0')}`;
        function pad(n) { return String(n).padStart(2,'0'); }
    },

    _toVTTTime(s) {
        return this._toSRTTime(s).replace(',', '.');
    },

    _formatSize(bytes) {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },
};
