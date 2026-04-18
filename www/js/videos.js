/**
 * IRIS - Módulo de Videos
 * Gestión de videos con subtítulos automáticos (SCRUM-38)
 */
const IrisVideos = {
    videos: [],
    currentVideo: null,

    /**
     * Inicializar módulo de videos
     */
    init() {
        // Upload form
        const uploadForm = document.getElementById('video-upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.uploadVideo();
            });
        }

        // File input label
        const fileInput = document.getElementById('video-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const fileName = e.target.files[0]?.name || 'Seleccionar archivo';
                const label = document.getElementById('video-file-label');
                if (label) label.textContent = fileName;

                // Validar tamaño
                const file = e.target.files[0];
                if (file && file.size > 500 * 1024 * 1024) {
                    IrisApp.showToast('⚠️ El archivo es muy grande (máx 500 MB)');
                    fileInput.value = '';
                    label.textContent = 'Seleccionar archivo';
                }
            });
        }
    },

    /**
     * Subir un video — SCRUM-39
     */
    async uploadVideo() {
        const fileInput = document.getElementById('video-file-input');
        const titleInput = document.getElementById('video-title');
        const langSelect = document.getElementById('video-language');
        const uploadBtn = document.getElementById('video-upload-btn');

        const file = fileInput?.files[0];
        const title = titleInput?.value.trim();

        if (!file) {
            IrisApp.showToast('Selecciona un archivo de video');
            return;
        }
        if (!title) {
            IrisApp.showToast('Escribe un título para el video');
            return;
        }

        // Deshabilitar botón
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="material-icons">hourglass_empty</i> Subiendo...';
        }

        try {
            const video = await IrisAPI.uploadVideo(file, title, langSelect?.value || 'es');
            this.videos.unshift(video);
            this._renderVideoList();

            // Limpiar form
            fileInput.value = '';
            titleInput.value = '';
            document.getElementById('video-file-label').textContent = 'Seleccionar archivo';

            IrisApp.showToast('✅ Video subido exitosamente');
        } catch (error) {
            IrisApp.showToast('❌ Error al subir: ' + error.message);
        } finally {
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="material-icons">cloud_upload</i> Subir Video';
            }
        }
    },

    /**
     * Cargar lista de videos del docente
     */
    async loadVideos() {
        const list = document.getElementById('video-list');
        const empty = document.getElementById('video-empty');
        const loading = document.getElementById('video-loading');
        const user = IrisAuth.currentUser;

        if (!list || !user) return;

        if (loading) loading.classList.remove('iris-hidden');
        if (empty) empty.style.display = 'none';
        list.innerHTML = '';

        try {
            const response = await IrisAPI.getVideos(user.uid);
            this.videos = response.results || response || [];

            if (loading) loading.classList.add('iris-hidden');

            this._renderVideoList();
        } catch (error) {
            if (loading) loading.classList.add('iris-hidden');
            if (empty) {
                empty.style.display = '';
                empty.querySelector('span').textContent = 'Error al cargar videos';
            }
        }
    },

    /**
     * Generar subtítulos para un video — SCRUM-41
     */
    async generateSubtitles(videoId) {
        const btn = document.querySelector(`[data-generate="${videoId}"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="material-icons iris-spin">sync</i> Procesando...';
        }

        IrisApp.showToast('⏳ Generando subtítulos... esto puede tardar unos segundos');

        try {
            const result = await IrisAPI.generateSubtitles(videoId);
            IrisApp.showToast(`✅ ${result.count} subtítulos generados`);

            // Actualizar estado del video en la lista
            const video = this.videos.find(v => v.id === videoId);
            if (video) {
                video.status = 'completed';
                video.subtitles_count = result.count;
            }
            this._renderVideoList();
        } catch (error) {
            IrisApp.showToast('❌ Error: ' + error.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="material-icons">subtitles</i> Generar';
            }
        }
    },

    /**
     * Ver subtítulos de un video — SCRUM-43
     */
    async viewSubtitles(videoId) {
        const detail = document.getElementById('video-detail');
        const listSection = document.getElementById('video-list-section');

        if (!detail) return;

        try {
            const video = await IrisAPI.getVideo(videoId);
            this.currentVideo = video;

            // Mostrar panel de detalle
            if (listSection) listSection.classList.add('iris-hidden');
            detail.classList.remove('iris-hidden');

            this._renderVideoDetail(video);
        } catch (error) {
            IrisApp.showToast('❌ Error al cargar video: ' + error.message);
        }
    },

    /**
     * Volver a la lista desde el detalle
     */
    backToList() {
        const detail = document.getElementById('video-detail');
        const listSection = document.getElementById('video-list-section');

        if (detail) detail.classList.add('iris-hidden');
        if (listSection) listSection.classList.remove('iris-hidden');

        this.currentVideo = null;
    },

    /**
     * Editar un subtítulo — SCRUM-43
     */
    async editSubtitle(subtitleId) {
        const textEl = document.querySelector(`[data-sub-text="${subtitleId}"]`);
        if (!textEl) return;

        const currentText = textEl.textContent;
        const newText = prompt('Editar subtítulo:', currentText);

        if (newText === null || newText.trim() === '' || newText === currentText) return;

        try {
            await IrisAPI.editSubtitle(subtitleId, newText.trim());
            textEl.textContent = newText.trim();
            textEl.classList.add('edited');
            IrisApp.showToast('✅ Subtítulo editado');
        } catch (error) {
            IrisApp.showToast('❌ Error: ' + error.message);
        }
    },

    /**
     * Descargar archivo SRT — SCRUM-45
     */
    async downloadSRT(videoId) {
        try {
            const response = await fetch(`${IRIS_CONFIG.API_URL}/videos/${videoId}/download_srt/`, {
                headers: IrisAPI.getHeaders(),
            });
            if (!response.ok) throw new Error('Error al descargar');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `subtitulos_${videoId}.srt`;
            a.click();
            URL.revokeObjectURL(url);

            IrisApp.showToast('📥 Archivo SRT descargado');
        } catch (error) {
            IrisApp.showToast('❌ Error: ' + error.message);
        }
    },

    /**
     * Publicar video — SCRUM-45
     */
    async publishVideo(videoId) {
        try {
            await IrisAPI.publishVideo(videoId);
            const video = this.videos.find(v => v.id === videoId);
            if (video) video.status = 'published';
            this._renderVideoList();
            IrisApp.showToast('🎉 Video publicado');
        } catch (error) {
            IrisApp.showToast('❌ Error: ' + error.message);
        }
    },

    // ────── Render helpers ──────

    _renderVideoList() {
        const list = document.getElementById('video-list');
        const empty = document.getElementById('video-empty');

        if (!list) return;

        if (this.videos.length === 0) {
            list.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }

        if (empty) empty.style.display = 'none';

        list.innerHTML = this.videos.map(v => this._renderVideoCard(v)).join('');

        // Attach listeners
        list.querySelectorAll('[data-generate]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.generateSubtitles(parseInt(e.currentTarget.dataset.generate));
            });
        });
        list.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewSubtitles(parseInt(e.currentTarget.dataset.view));
            });
        });
        list.querySelectorAll('[data-download]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.downloadSRT(parseInt(e.currentTarget.dataset.download));
            });
        });
        list.querySelectorAll('[data-publish]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.publishVideo(parseInt(e.currentTarget.dataset.publish));
            });
        });
    },

    _renderVideoCard(v) {
        const date = new Date(v.created_at);
        const dateStr = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

        const statusMap = {
            'uploaded': { icon: 'cloud_done', label: 'Subido', color: 'var(--iris-primary)' },
            'processing': { icon: 'sync', label: 'Procesando...', color: 'orange' },
            'completed': { icon: 'check_circle', label: 'Subtítulos listos', color: 'var(--iris-success, #4caf50)' },
            'published': { icon: 'public', label: 'Publicado', color: 'var(--iris-accent)' },
            'error': { icon: 'error', label: 'Error', color: 'var(--iris-error)' },
        };
        const st = statusMap[v.status] || statusMap['uploaded'];

        let actions = '';
        if (v.status === 'uploaded') {
            actions = `<button class="iris-btn iris-btn--accent iris-btn--small" data-generate="${v.id}">
                <i class="material-icons">subtitles</i> Generar Subtítulos
            </button>`;
        } else if (v.status === 'completed' || v.status === 'published') {
            actions = `
                <button class="iris-btn iris-btn--primary iris-btn--small" data-view="${v.id}">
                    <i class="material-icons">visibility</i> Ver
                </button>
                <button class="iris-btn iris-btn--outline iris-btn--small" data-download="${v.id}">
                    <i class="material-icons">download</i> SRT
                </button>
                ${v.status === 'completed' ? `<button class="iris-btn iris-btn--outline iris-btn--small" data-publish="${v.id}" style="color:var(--iris-accent);border-color:var(--iris-accent)">
                    <i class="material-icons">public</i> Publicar
                </button>` : ''}
            `;
        }

        return `
            <div class="iris-video-card">
                <div class="iris-video-card__header">
                    <div class="iris-video-card__icon">
                        <i class="material-icons">videocam</i>
                    </div>
                    <div class="iris-video-card__info">
                        <div class="iris-video-card__title">${this._escapeHtml(v.title)}</div>
                        <div class="iris-video-card__meta">
                            <span>${dateStr}</span>
                            ${v.subtitles_count ? `<span>· ${v.subtitles_count} subtítulos</span>` : ''}
                        </div>
                    </div>
                    <span class="iris-video-card__status" style="color:${st.color}">
                        <i class="material-icons" style="font-size:16px">${st.icon}</i>
                        ${st.label}
                    </span>
                </div>
                <div class="iris-video-card__actions">${actions}</div>
            </div>
        `;
    },

    _renderVideoDetail(video) {
        const detail = document.getElementById('video-detail');
        if (!detail) return;

        const subtitles = video.subtitles || [];

        detail.innerHTML = `
            <button id="btn-back-videos" class="iris-btn iris-btn--outline iris-btn--small" style="margin-bottom:12px">
                <i class="material-icons">arrow_back</i> Volver
            </button>
            <h2 style="margin:0 0 4px;font-size:1.2rem">${this._escapeHtml(video.title)}</h2>
            <p style="color:var(--iris-text-secondary);margin:0 0 16px;font-size:0.85rem">
                ${subtitles.length} subtítulos · ${video.language.toUpperCase()}
            </p>

            <div class="iris-subtitles-list">
                ${subtitles.map(s => `
                    <div class="iris-subtitle-item ${s.is_edited ? 'edited' : ''}">
                        <div class="iris-subtitle-item__time">
                            ${this._formatTime(s.start_time)} → ${this._formatTime(s.end_time)}
                        </div>
                        <div class="iris-subtitle-item__text" data-sub-text="${s.id}">
                            ${this._escapeHtml(s.text)}
                        </div>
                        <button class="iris-btn iris-btn--outline iris-btn--small iris-subtitle-item__edit"
                                data-edit-sub="${s.id}" title="Editar">
                            <i class="material-icons">edit</i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // Back button
        detail.querySelector('#btn-back-videos')?.addEventListener('click', () => this.backToList());

        // Edit buttons
        detail.querySelectorAll('[data-edit-sub]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editSubtitle(parseInt(e.currentTarget.dataset.editSub));
            });
        });
    },

    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};
