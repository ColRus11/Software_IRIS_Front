/**
 * IRIS / Un Mundo en Silencio — Transcripción Grupal
 * Un dispositivo, múltiples hablantes — el usuario cambia el hablante activo.
 */
const IrisGroupTranscription = {
    _active:         false,
    _currentSpeaker: 1,
    _maxSpeakers:    4,
    _entries:        [],   // { speakerIndex, speakerLabel, text, time }
    _recognition:    null,

    // Paleta de 8 colores — se cicla si hay más hablantes
    _speakerStyles: [
        { color: '#041627', bg: '#f0f4f8', icon: 'person'   },
        { color: '#006a6a', bg: '#e0fafa', icon: 'person_2' },
        { color: '#7c3aed', bg: '#ede9fe', icon: 'person_3' },
        { color: '#b45309', bg: '#fef3c7', icon: 'person_4' },
        { color: '#be185d', bg: '#fce7f3', icon: 'person'   },
        { color: '#0369a1', bg: '#e0f2fe', icon: 'person_2' },
        { color: '#065f46', bg: '#d1fae5', icon: 'person_3' },
        { color: '#92400e', bg: '#fef3c7', icon: 'person_4' },
    ],

    // ——————————————————————————————————————
    // INIT — se llama cada vez que se monta la página
    // ——————————————————————————————————————
    onPageMounted() {
        this._renderSpeakerButtons();
        this._renderStream();
        this._restoreSaveButton();
        this.loadHistory();
    },

    // ——————————————————————————————————————
    // TOGGLE START / STOP
    // ——————————————————————————————————————
    toggle() {
        if (this._active) {
            this._stop();
        } else {
            this._start();
        }
    },

    _start() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            IrisApp.showToast('⚠️ Tu navegador no soporta reconocimiento de voz');
            return;
        }
        this._active = true;
        this._updateUI(true);
        IrisApp.showToast('🎙️ Capturando — ' + this._speakerLabel(this._currentSpeaker));
        this._createAndStart();
    },

    _createAndStart() {
        // Limpiar instancia anterior si existe
        if (this._recognition) {
            try { this._recognition.abort(); } catch (_) {}
            this._recognition = null;
        }

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang             = 'es-ES';
        rec.continuous       = true;
        rec.interimResults   = true;
        rec.maxAlternatives  = 1;

        rec.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    const clean = t.trim();
                    if (clean) {
                        this._addEntry(clean);
                        this._clearInterim();
                    }
                } else {
                    interim += t;
                }
            }
            if (interim) this._showInterim(interim);
        };

        rec.onerror = (e) => {
            if (e.error === 'no-speech') return;
            IrisApp.showToast('❌ Error de micrófono: ' + e.error);
            this._stop();
        };

        // Reiniciar automáticamente cuando el browser corta (iOS/Android)
        rec.onend = () => {
            if (this._active && this._recognition === rec) {
                try { rec.start(); } catch (_) {
                    setTimeout(() => { if (this._active) this._createAndStart(); }, 500);
                }
            }
        };

        try {
            rec.start();
            this._recognition = rec;
        } catch (e) {
            IrisApp.showToast('❌ Error al iniciar micrófono: ' + e.message);
            this._active = false;
            this._updateUI(false);
        }
    },

    _stop() {
        this._active = false;
        const rec = this._recognition;
        this._recognition = null; // nil antes de abort para que onend no relance
        if (rec) {
            try { rec.abort(); } catch (_) {}
        }
        this._clearInterim();
        this._updateUI(false);
        IrisApp.showToast('⏹ Transcripción detenida');
    },

    // ——————————————————————————————————————
    // CAMBIAR HABLANTE
    // ——————————————————————————————————————
    addSpeaker() {
        this._maxSpeakers++;
        this._renderSpeakerButtons();
    },

    removeSpeaker() {
        if (this._maxSpeakers <= 2) return; // mínimo 2 hablantes
        if (this._currentSpeaker === this._maxSpeakers) {
            const prev = this._maxSpeakers - 1;
            if (this._active) {
                this._stopAndRestartAs(prev);
            } else {
                this._currentSpeaker = prev;
            }
        }
        this._maxSpeakers--;
        this._renderSpeakerButtons();
    },

    nextSpeaker() {
        const next = (this._currentSpeaker % this._maxSpeakers) + 1;
        if (this._active) {
            this._stopAndRestartAs(next);
        } else {
            this._currentSpeaker = next;
            this._renderSpeakerButtons();
        }
    },

    setSpeaker(index) {
        if (this._active && index !== this._currentSpeaker) {
            this._stopAndRestartAs(index);
        } else {
            this._currentSpeaker = index;
            this._renderSpeakerButtons();
            if (this._active) IrisApp.showToast('👤 ' + this._speakerLabel(index));
        }
    },

    // Finaliza el audio pendiente bajo el hablante actual, luego cambia y reanuda
    _stopAndRestartAs(newSpeakerIndex) {
        const rec = this._recognition;
        if (!rec) {
            // No hay instancia activa — solo cambiar
            this._currentSpeaker = newSpeakerIndex;
            this._renderSpeakerButtons();
            return;
        }

        // Evitar que onend relance automáticamente con el hablante viejo
        this._recognition = null;

        rec.onend = () => {
            this._currentSpeaker = newSpeakerIndex;
            this._renderSpeakerButtons();
            this._clearInterim();
            IrisApp.showToast('👤 ' + this._speakerLabel(newSpeakerIndex));
            // Pequeña pausa para que Chrome libere el micrófono antes de re-abrir
            setTimeout(() => {
                if (this._active) this._createAndStart();
            }, 150);
        };

        try { rec.stop(); } catch (_) {
            // Si stop() falla, forzar el cambio directamente
            this._currentSpeaker = newSpeakerIndex;
            this._renderSpeakerButtons();
            this._clearInterim();
            IrisApp.showToast('👤 ' + this._speakerLabel(newSpeakerIndex));
            setTimeout(() => { if (this._active) this._createAndStart(); }, 150);
        }
    },

    // ——————————————————————————————————————
    // LIMPIAR
    // ——————————————————————————————————————
    clear() {
        if (this._active) this._stop();
        this._entries        = [];
        this._currentSpeaker = 1;
        this._renderSpeakerButtons();
        this._renderStream();
        this._restoreSaveButton(true); // disabled=true
    },

    // ——————————————————————————————————————
    // GUARDAR EN DJANGO
    // ——————————————————————————————————————
    async save() {
        if (this._entries.length === 0) {
            IrisApp.showToast('ℹ️ Nada que guardar aún');
            return;
        }
        if (this._active) this._stop();

        const sessionName = document.getElementById('gt-session-name')?.value.trim() || '';
        const payload = {
            session_name: sessionName,
            entries: this._entries.map(e => ({
                speaker_index: e.speakerIndex,
                speaker_label: e.speakerLabel,
                text:          e.text,
            })),
        };

        const saveBtn  = document.getElementById('gt-btn-save');
        const saveText = document.getElementById('gt-save-text');
        if (saveBtn)  saveBtn.disabled = true;
        if (saveText) saveText.textContent = 'Guardando...';

        try {
            await IrisAPI.createGroupSession(payload);
            IrisApp.showToast('✅ Sesión grupal guardada');
            this.clear();
            this.loadHistory();
        } catch (err) {
            IrisApp.showToast('❌ Error al guardar: ' + err.message);
            // Restaurar botón para que el usuario pueda reintentar
            if (saveBtn)  saveBtn.disabled = false;
            if (saveText) saveText.textContent = 'Guardar Sesión Grupal';
        }
    },

    // ——————————————————————————————————————
    // INTERNOS — entradas y burbujas
    // ——————————————————————————————————————
    _addEntry(text) {
        const entry = {
            speakerIndex: this._currentSpeaker,
            speakerLabel: this._speakerLabel(this._currentSpeaker),
            text,
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        };
        this._entries.push(entry);
        this._appendBubble(entry);

        const saveBtn = document.getElementById('gt-btn-save');
        if (saveBtn) saveBtn.disabled = false;
        const saveText = document.getElementById('gt-save-text');
        if (saveText) saveText.textContent = 'Guardar Sesión Grupal';
    },

    _appendBubble(entry) {
        const empty = document.getElementById('gt-empty');
        if (empty) empty.remove();

        const stream = document.getElementById('gt-stream');
        if (!stream) return;

        const style  = this._styleFor(entry.speakerIndex);
        const bubble = document.createElement('article');
        bubble.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
        bubble.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:24px;height:24px;border-radius:0.5rem;background:${style.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span class="material-symbols-outlined" style="font-size:14px;color:white;font-variation-settings:'FILL' 1;">${style.icon}</span>
            </div>
            <span style="font-size:0.75rem;font-weight:700;color:${style.color};">${this._escapeHtml(entry.speakerLabel)}</span>
            <span style="font-size:0.625rem;color:var(--c-outline);font-weight:500;">${entry.time}</span>
          </div>
          <div style="background:${style.bg};border:1px solid ${style.color}20;padding:0.75rem 1rem;border-radius:1rem;border-top-left-radius:0.25rem;margin-left:30px;">
            <p style="font-size:0.9375rem;color:var(--c-on-surface);line-height:1.6;">${this._escapeHtml(entry.text)}</p>
          </div>`;
        stream.appendChild(bubble);
        bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
    },

    // ——————————————————————————————————————
    // INTERNOS — texto interim (mientras habla)
    // ——————————————————————————————————————
    _showInterim(text) {
        const wrap   = document.getElementById('gt-interim-wrap');
        const label  = document.getElementById('gt-interim-speaker');
        const textEl = document.getElementById('gt-interim-text');
        if (!wrap) return;

        const style = this._styleFor(this._currentSpeaker);
        wrap.style.display        = 'block';
        wrap.style.borderLeftColor = style.color;
        if (label)  { label.textContent = this._speakerLabel(this._currentSpeaker); label.style.color = style.color; }
        if (textEl) textEl.textContent = text;
    },

    _clearInterim() {
        const wrap = document.getElementById('gt-interim-wrap');
        if (wrap) wrap.style.display = 'none';
    },

    // ——————————————————————————————————————
    // INTERNOS — render completo del stream
    // ——————————————————————————————————————
    _renderStream() {
        const stream = document.getElementById('gt-stream');
        if (!stream) return;
        stream.innerHTML = '';

        if (this._entries.length === 0) {
            stream.innerHTML = `
              <div id="gt-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;color:var(--c-outline);text-align:center;">
                <span class="material-symbols-outlined" style="font-size:48px;opacity:.35;">record_voice_over</span>
                <p style="margin-top:0.75rem;font-size:0.875rem;">Presiona <strong>Iniciar</strong> y habla.<br>Usa <strong>Cambiar hablante</strong> cuando tome la palabra otra persona.</p>
              </div>`;
            return;
        }
        this._entries.forEach(e => this._appendBubble(e));
    },

    // ——————————————————————————————————————
    // INTERNOS — botones de speaker
    // ——————————————————————————————————————
    _renderSpeakerButtons() {
        const container = document.getElementById('gt-speaker-btns');
        if (!container) return;
        container.innerHTML = '';
        container.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;';

        for (let i = 1; i <= this._maxSpeakers; i++) {
            const style  = this._styleFor(i);
            const active = i === this._currentSpeaker;
            const btn    = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = [
                'display:flex;align-items:center;gap:6px;',
                'padding:6px 14px;border-radius:999px;cursor:pointer;',
                'font-size:0.8125rem;font-weight:700;transition:all 120ms;',
                `border:2px solid ${active ? style.color : 'var(--c-outline-var)'};`,
                `background:${active ? style.bg : 'transparent'};`,
                `color:${active ? style.color : 'var(--c-outline)'};`,
                active ? 'box-shadow:0 0 0 3px ' + style.color + '22;' : '',
            ].join('');
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;${active ? 'font-variation-settings:\'FILL\' 1;' : ''}">${style.icon}</span> S${i}`;
            btn.onclick = () => this.setSpeaker(i);
            container.appendChild(btn);
        }

        // Separador visual
        const sep = document.createElement('div');
        sep.style.cssText = 'width:1px;height:28px;background:var(--c-outline-var);margin:0 2px;flex-shrink:0;';
        container.appendChild(sep);

        // Botón quitar (−)
        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.title = 'Quitar hablante';
        btnRemove.disabled = this._maxSpeakers <= 2;
        btnRemove.style.cssText = 'width:32px;height:32px;border-radius:999px;border:2px solid var(--c-outline-var);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnRemove.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;color:var(--c-outline);">remove</span>';
        btnRemove.onclick = () => this.removeSpeaker();
        container.appendChild(btnRemove);

        // Botón agregar (+)
        const btnAdd = document.createElement('button');
        btnAdd.type = 'button';
        btnAdd.title = 'Agregar hablante';
        btnAdd.style.cssText = 'width:32px;height:32px;border-radius:999px;border:2px solid var(--c-secondary);background:var(--c-sec-cont);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnAdd.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;color:var(--c-secondary);">add</span>';
        btnAdd.onclick = () => this.addSpeaker();
        container.appendChild(btnAdd);
    },

    // ——————————————————————————————————————
    // INTERNOS — UI de estado (running / stopped)
    // ——————————————————————————————————————
    _updateUI(running) {
        const dot     = document.getElementById('gt-live-dot');
        const label   = document.getElementById('gt-status-label');
        const badge   = document.getElementById('gt-live-badge');
        const btnText = document.getElementById('gt-btn-text');
        const btn     = document.getElementById('gt-btn-start');

        if (dot) {
            dot.style.background = running ? '#006a6a' : 'var(--c-outline-var)';
            dot.style.animation  = running ? 'ds-pulse 1.5s infinite' : 'none';
        }
        if (label)   label.textContent   = running ? 'Capturando Audio' : 'Inactivo';
        if (badge)   badge.style.display = running ? '' : 'none';
        if (btnText) btnText.textContent = running ? 'Detener' : 'Iniciar';
        if (btn) {
            btn.className = running
                ? 'ds-btn ds-btn--outline ds-btn--full'
                : 'ds-btn ds-btn--primary ds-btn--full';
            // reemplazar el ícono según estado
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = running ? 'stop' : 'mic';
        }
    },

    _restoreSaveButton(disabled = false) {
        const saveBtn  = document.getElementById('gt-btn-save');
        const saveText = document.getElementById('gt-save-text');
        if (saveBtn)  saveBtn.disabled = disabled;
        if (saveText) saveText.textContent = 'Guardar Sesión Grupal';
    },

    // ——————————————————————————————————————
    // HISTORIAL DE SESIONES
    // ——————————————————————————————————————
    async loadHistory() {
        const list    = document.getElementById('gt-history-list');
        const empty   = document.getElementById('gt-history-empty');
        const loading = document.getElementById('gt-history-loading');
        if (!list) return;

        if (loading) loading.style.display = 'block';
        if (empty)   empty.style.display   = 'none';
        list.innerHTML = '';

        let sessions = [];
        try {
            const raw = await IrisAPI.getGroupSessions();
            sessions  = raw?.results ?? (Array.isArray(raw) ? raw : []);
        } catch (_) {
            sessions = [];
        }

        if (loading) loading.style.display = 'none';

        if (sessions.length === 0) {
            if (empty) empty.style.display = 'block';
            return;
        }

        list.innerHTML = sessions.map(s => {
            const date     = new Date(s.created_at);
            const dateStr  = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr  = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const entries  = s.entries || [];
            const speakers = [...new Set(entries.map(e => e.speaker_label))];
            const nameBadge = s.session_name
                ? `<span style="font-size:0.6875rem;font-weight:700;padding:2px 8px;background:var(--c-sec-cont);color:var(--c-secondary);border-radius:999px;">${this._escapeHtml(s.session_name)}</span>`
                : '';
            const preview = entries.slice(0, 3).map(e => {
                const style = this._styleFor(e.speaker_index);
                return `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;">
                    <span style="font-size:0.6875rem;font-weight:700;color:${style.color};white-space:nowrap;">${this._escapeHtml(e.speaker_label)}:</span>
                    <span style="font-size:0.8125rem;color:var(--c-on-surf-var);line-height:1.4;">${this._escapeHtml((e.text || '').slice(0, 80))}${(e.text || '').length > 80 ? '…' : ''}</span>
                </div>`;
            }).join('');

            return `<div style="background:var(--c-surface-white);border-radius:var(--r-lg);border:1px solid rgba(0,0,0,.04);overflow:hidden;">
                <div style="padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--c-surface-high);">
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <span class="material-symbols-outlined" style="font-size:18px;color:var(--c-secondary);">group</span>
                        <span style="font-size:0.75rem;color:var(--c-outline);">${timeStr} · ${dateStr}</span>
                        ${nameBadge}
                    </div>
                    <span style="font-size:0.6875rem;color:var(--c-outline);font-weight:600;">${entries.length} intervenciones · ${speakers.length} hablantes</span>
                </div>
                <div style="padding:0.75rem 1rem;">${preview}${entries.length > 3 ? `<p style="font-size:0.75rem;color:var(--c-outline);margin-top:4px;">+ ${entries.length - 3} más…</p>` : ''}</div>
            </div>`;
        }).join('');
    },

    // ——————————————————————————————————————
    // HELPERS
    // ——————————————————————————————————————
    _styleFor(index) {
        return this._speakerStyles[(index - 1) % this._speakerStyles.length];
    },

    _speakerLabel(index) {
        return `Speaker ${index}`;
    },

    _escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    },
};
