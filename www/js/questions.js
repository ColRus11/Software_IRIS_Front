/**
 * IRIS - Módulo de Preguntas
 * Gestión de preguntas con voz sintética (Épica #2)
 */
const IrisQuestions = {
    sessionQuestions: [],

    /**
     * Inicializar módulo de preguntas
     */
    init() {
        const textarea = document.getElementById('question-text');
        const btnSpeak = document.getElementById('btn-speak');
        const btnSave  = document.getElementById('btn-save');

        if (!textarea || !btnSpeak || !btnSave) return;

        // Notificar al módulo TTS que esta página ya está en el DOM
        // Esto puebla el selector de voces y habilita los botones
        IrisTTS.onQuestionsPageMounted();

        // Habilitar botones en cuanto haya texto — la voz es automática del navegador
        const updateButtons = () => {
            const hasText = textarea.value.trim().length > 0;
            btnSpeak.disabled = !hasText;
            btnSave.disabled  = !hasText;
        };

        textarea.addEventListener('input', updateButtons);

        // Botón Reproducir
        btnSpeak.addEventListener('click', () => this.speakQuestion());

        // Botón Guardar
        btnSave.addEventListener('click', () => this.saveQuestion());

        // Ctrl+Enter para reproducir
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (textarea.value.trim()) this.speakQuestion();
            }
        });
    },

    /**
     * Reproducir la pregunta actual con voz sintética
     */
    async speakQuestion() {
        const textarea = document.getElementById('question-text');
        const text = textarea.value.trim();

        if (!text) {
            IrisApp.showToast('Escribe una pregunta primero');
            return;
        }

        try {
            await IrisTTS.speak(text);
            IrisApp.showToast('✅ Pregunta reproducida');

            // Guardar automáticamente después de reproducir
            await this._saveToBackend(text, true);
        } catch (error) {
            IrisApp.showToast('❌ Error al reproducir: ' + error.message);
        }
    },

    /**
     * Guardar pregunta sin reproducir
     */
    async saveQuestion() {
        const textarea = document.getElementById('question-text');
        const text = textarea.value.trim();

        if (!text) {
            IrisApp.showToast('Escribe una pregunta primero');
            return;
        }

        await this._saveToBackend(text, false);
    },

    /**
     * Guardar pregunta en un archivo local .txt
     * @param {string} text
     * @param {boolean} wasSpoken
     */
    async _saveToBackend(text, wasSpoken) {
        const sessionName = document.getElementById('session-name')?.value.trim() || '';
        const user = IrisAuth.currentUser;

        if (!user) {
            IrisApp.showToast('Debes iniciar sesión');
            return;
        }

        const questionData = {
            firebase_uid: user.uid,
            text: text,
            session_name: sessionName,
            was_spoken: wasSpoken,
        };

        try {
            const saved = await IrisAPI.createQuestion(questionData);

            // Agregar a la lista de sesión actual
            this.sessionQuestions.unshift(saved);
            this._renderSessionQuestions();

            // Limpiar textarea
            document.getElementById('question-text').value = '';
            document.getElementById('btn-speak').disabled = true;
            document.getElementById('btn-save').disabled = true;

            IrisApp.showToast(wasSpoken ? '✅ Pregunta reproducida y guardada' : '💾 Pregunta guardada');
        } catch (error) {
            // Si el backend no está disponible, guardar localmente
            console.warn('Backend no disponible, guardando localmente:', error);
            this._saveLocally(questionData);
            this.sessionQuestions.unshift({
                ...questionData,
                id: Date.now(),
                created_at: new Date().toISOString(),
            });
            this._renderSessionQuestions();

            document.getElementById('question-text').value = '';
            document.getElementById('btn-speak').disabled = true;
            document.getElementById('btn-save').disabled = true;

            IrisApp.showToast(wasSpoken ? '✅ Reproducida (guardada localmente)' : '💾 Guardada localmente');
        }
    },

    /**
     * Guardar localmente cuando el backend no está disponible
     */
    _saveLocally(data) {
        const localQuestions = JSON.parse(localStorage.getItem('iris_local_questions') || '[]');
        localQuestions.unshift({
            ...data,
            id: Date.now(),
            created_at: new Date().toISOString(),
        });
        localStorage.setItem('iris_local_questions', JSON.stringify(localQuestions));
    },

    /**
     * Renderizar preguntas de la sesión actual
     */
    _renderSessionQuestions() {
        const list = document.getElementById('session-questions');
        const empty = document.getElementById('session-empty');

        if (!list) return;

        if (this.sessionQuestions.length === 0) {
            list.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }

        if (empty) empty.style.display = 'none';

        list.innerHTML = this.sessionQuestions.map(q => this._renderQuestionItem(q)).join('');

        // Agregar event listeners para botones de reproducir
        list.querySelectorAll('[data-action="replay"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.currentTarget.dataset.text;
                IrisTTS.speak(text).catch(err => {
                    IrisApp.showToast('❌ Error: ' + err.message);
                });
            });
        });
    },

    /**
     * Renderizar un item de pregunta
     */
    _renderQuestionItem(q) {
        const date = new Date(q.created_at);
        const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
        const spokenBadge = q.was_spoken
            ? '<span style="background:var(--c-sec-cont);color:var(--c-secondary);padding:2px 8px;border-radius:999px;font-size:0.6875rem;font-weight:700;">Reproducida</span>'
            : '';
        const sessionBadge = q.session_name
            ? `<span style="background:var(--c-surface-high);color:var(--c-on-surf-var);padding:2px 8px;border-radius:999px;font-size:0.6875rem;font-weight:600;">${this._escapeHtml(q.session_name)}</span>`
            : '';

        const iconName = q.was_spoken ? 'volume_up' : 'chat_bubble';
        const iconColor = q.was_spoken ? 'var(--c-secondary)' : 'var(--c-outline)';
        return `
            <li style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.75rem;background:var(--c-surface-white);border-radius:var(--r-lg);border:1px solid rgba(0,0,0,.04);">
                <div style="width:36px;height:36px;border-radius:var(--r-md);background:var(--c-surface-high);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <span class="material-symbols-outlined" style="font-size:18px;color:${iconColor};font-variation-settings:'FILL' 1;">${iconName}</span>
                </div>
                <div style="flex:1;min-width:0;">
                    <p style="font-size:0.9375rem;color:var(--c-on-surface);line-height:1.5;word-break:break-word;">${this._escapeHtml(q.text)}</p>
                    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.375rem;align-items:center;">
                        <span style="font-size:0.75rem;color:var(--c-outline);">${timeStr} · ${dateStr}</span>
                        ${spokenBadge}
                        ${sessionBadge}
                    </div>
                </div>
                <button style="background:none;border:1.5px solid var(--c-outline-var);border-radius:var(--r-md);width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;"
                        data-action="replay" data-text="${this._escapeAttr(q.text)}"
                        title="Reproducir de nuevo">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--c-primary);">volume_up</span>
                </button>
            </li>
        `;
    },

    /**
     * Cargar y renderizar historial completo
     */
    async loadHistory() {
        const list = document.getElementById('history-list');
        const empty = document.getElementById('history-empty');
        const loading = document.getElementById('history-loading');
        const user = IrisAuth.currentUser;

        if (!list || !user) return;

        // Mostrar loading
        if (loading) loading.classList.remove('iris-hidden');
        if (empty) empty.style.display = 'none';
        list.innerHTML = '';

        try {
            const response = await IrisAPI.getQuestions(user.uid);
            const questions = response.results || response || [];

            if (loading) loading.classList.add('iris-hidden');

            if (questions.length === 0) {
                // Intentar cargar preguntas locales
                const localQuestions = JSON.parse(localStorage.getItem('iris_local_questions') || '[]');
                if (localQuestions.length > 0) {
                    list.innerHTML = localQuestions.map(q => this._renderQuestionItem(q)).join('');
                    this._attachHistoryListeners(list);
                } else {
                    if (empty) empty.style.display = '';
                }
                return;
            }

            list.innerHTML = questions.map(q => this._renderQuestionItem(q)).join('');
            this._attachHistoryListeners(list);

            if (empty) empty.style.display = 'none';
        } catch (error) {
            if (loading) loading.classList.add('iris-hidden');
            console.warn('Error cargando historial del backend:', error);

            // Fallback a preguntas locales
            const localQuestions = JSON.parse(localStorage.getItem('iris_local_questions') || '[]');
            if (localQuestions.length > 0) {
                list.innerHTML = localQuestions.map(q => this._renderQuestionItem(q)).join('');
                this._attachHistoryListeners(list);
                if (empty) empty.style.display = 'none';
            } else {
                if (empty) empty.style.display = '';
            }
        }
    },

    /**
     * Filtrar historial por búsqueda
     */
    filterHistory(query) {
        const items = document.querySelectorAll('#history-list .iris-history__item');
        const normalizedQuery = query.toLowerCase().trim();

        items.forEach(item => {
            const text = item.querySelector('.iris-history__item-text')?.textContent.toLowerCase() || '';
            item.style.display = text.includes(normalizedQuery) ? '' : 'none';
        });
    },

    /**
     * Agregar event listeners a los items del historial
     */
    _attachHistoryListeners(list) {
        list.querySelectorAll('[data-action="replay"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.currentTarget.dataset.text;
                IrisTTS.speak(text).catch(err => {
                    IrisApp.showToast('❌ Error: ' + err.message);
                });
            });
        });
    },

    /**
     * Escapar HTML para prevenir XSS
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Escapar atributos HTML
     */
    _escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
};
