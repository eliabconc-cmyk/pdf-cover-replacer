const state = {
    subjects: [],
    sessionId: null
};

let subjectCounter = 0;

// Elementos globais
const subjectsList = document.getElementById('subjects-list');
const addSubjectBtn = document.getElementById('add-subject-btn');
const processBtn = document.getElementById('process-btn');
const stepProcess = document.getElementById('step-process');
const stepProgress = document.getElementById('step-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const progressPct = document.getElementById('progress-pct');
const subjectsSection = document.getElementById('subjects-section');
const stepResults = document.getElementById('step-results');
const resultsBanner = document.getElementById('results-banner');
const resultsIcon = document.getElementById('results-icon');
const resultsTitle = document.getElementById('results-title');
const resultsSummary = document.getElementById('results-summary');
const resultsBySubject = document.getElementById('results-by-subject');
const downloadAllBtn = document.getElementById('download-all-btn');
const resetBtn = document.getElementById('reset-btn');
const statusText = document.querySelector('.status-text');

// Helpers
function filterFiles(files, extensions) {
    return Array.from(files).filter(function(f) {
        var ext = f.name.split('.').pop().toLowerCase();
        return extensions.includes(ext);
    });
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function setStatus(text) {
    if (statusText) statusText.textContent = text;
}

function updateProcessButton() {
    var hasValidSubject = state.subjects.some(function(s) {
        return s.coverFile && s.pdfFiles.length > 0;
    });
    processBtn.disabled = !hasValidSubject;
}

// ===== Subject Management =====
function addSubject(name) {
    var id = subjectCounter++;
    var subj = {
        id: id,
        name: name || '',
        coverFile: null,
        pdfFiles: []
    };
    state.subjects.push(subj);
    renderSubjectCard(subj);
    updateProcessButton();
    return subj;
}

function removeSubject(id) {
    state.subjects = state.subjects.filter(function(s) { return s.id !== id; });
    var el = document.getElementById('subject-' + id);
    if (el) {
        el.style.animation = 'fadeOut 0.2s var(--ease) forwards';
        setTimeout(function() { el.remove(); }, 200);
    }
    updateProcessButton();
}

function getSubject(id) {
    return state.subjects.find(function(s) { return s.id === id; });
}

function renderSubjectCard(subj) {
    var card = document.createElement('div');
    card.className = 'subject-card';
    card.id = 'subject-' + subj.id;
    card.innerHTML =
        '<div class="subject-header">' +
            '<div class="subject-header-left">' +
                '<div class="subject-icon">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
                        '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' +
                    '</svg>' +
                '</div>' +
                '<input type="text" class="subject-name-input" placeholder="Nome da materia (ex: Matematica)" value="' + (subj.name || '') + '" data-id="' + subj.id + '">' +
            '</div>' +
            '<button class="subject-remove-btn" data-id="' + subj.id + '" title="Remover materia">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
                '</svg>' +
            '</button>' +
        '</div>' +
        '<div class="subject-body">' +
            '<div class="subject-col">' +
                '<div class="subject-col-label">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>' +
                        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                        '<polyline points="21 15 16 10 5 21"/>' +
                    '</svg>' +
                    '<span>Capa</span>' +
                    '<span class="label-hint">PDF, PNG ou JPG</span>' +
                '</div>' +
                '<div class="dropzone dropzone-sm" id="cover-dz-' + subj.id + '">' +
                    '<div class="dropzone-content">' +
                        '<div class="dropzone-icon-wrap dropzone-icon-sm">' +
                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
                                '<polyline points="17 8 12 3 7 8"/>' +
                                '<line x1="12" y1="3" x2="12" y2="15"/>' +
                            '</svg>' +
                        '</div>' +
                        '<span class="dropzone-label">Arraste ou selecione</span>' +
                    '</div>' +
                    '<input type="file" id="cover-input-' + subj.id + '" accept=".pdf,.png,.jpg,.jpeg" hidden>' +
                '</div>' +
                '<div class="file-selected" id="cover-info-' + subj.id + '" style="display:none">' +
                    '<div class="file-selected-inner">' +
                        '<div class="file-selected-icon">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                                '<polyline points="20 6 9 17 4 12"/>' +
                            '</svg>' +
                        '</div>' +
                        '<span class="file-selected-name" id="cover-name-' + subj.id + '"></span>' +
                    '</div>' +
                    '<button class="file-selected-remove" id="cover-remove-' + subj.id + '" title="Remover">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<div class="subject-col">' +
                '<div class="subject-col-label">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>' +
                        '<polyline points="13 2 13 9 20 9"/>' +
                    '</svg>' +
                    '<span>PDFs</span>' +
                    '<span class="label-hint">Multiplos arquivos</span>' +
                '</div>' +
                '<div class="dropzone dropzone-sm" id="pdfs-dz-' + subj.id + '">' +
                    '<div class="dropzone-content">' +
                        '<div class="dropzone-icon-wrap dropzone-icon-sm">' +
                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
                                '<polyline points="17 8 12 3 7 8"/>' +
                                '<line x1="12" y1="3" x2="12" y2="15"/>' +
                            '</svg>' +
                        '</div>' +
                        '<span class="dropzone-label">Arraste ou selecione</span>' +
                    '</div>' +
                    '<input type="file" id="pdfs-input-' + subj.id + '" accept=".pdf" multiple hidden>' +
                '</div>' +
                '<div class="pdf-list-wrap">' +
                    '<ul class="file-list" id="pdfs-list-' + subj.id + '"></ul>' +
                    '<div class="file-count" id="pdfs-count-' + subj.id + '" style="display:none">' +
                        '<span id="pdfs-count-text-' + subj.id + '"></span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    subjectsList.appendChild(card);

    // Wire events
    var nameInput = card.querySelector('.subject-name-input');
    nameInput.addEventListener('input', function() {
        var s = getSubject(subj.id);
        if (s) s.name = this.value;
    });

    card.querySelector('.subject-remove-btn').addEventListener('click', function() {
        removeSubject(subj.id);
    });

    // Cover dropzone
    var coverDz = document.getElementById('cover-dz-' + subj.id);
    var coverInput = document.getElementById('cover-input-' + subj.id);
    var coverInfo = document.getElementById('cover-info-' + subj.id);
    var coverNameEl = document.getElementById('cover-name-' + subj.id);
    var coverRemoveBtn = document.getElementById('cover-remove-' + subj.id);

    setupDropzone(coverDz, coverInput, {
        accept: ['pdf', 'png', 'jpg', 'jpeg'],
        onFiles: function(files) {
            if (files.length === 0) return;
            var s = getSubject(subj.id);
            if (!s) return;
            s.coverFile = files[0];
            coverNameEl.textContent = files[0].name + ' \u00B7 ' + formatSize(files[0].size);
            coverInfo.style.display = '';
            coverDz.style.display = 'none';
            updateProcessButton();
        }
    });

    coverRemoveBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var s = getSubject(subj.id);
        if (s) s.coverFile = null;
        coverInfo.style.display = 'none';
        coverDz.style.display = '';
        updateProcessButton();
    });

    // PDFs dropzone
    var pdfsDz = document.getElementById('pdfs-dz-' + subj.id);
    var pdfsInput = document.getElementById('pdfs-input-' + subj.id);

    setupDropzone(pdfsDz, pdfsInput, {
        accept: ['pdf'],
        onFiles: function(files) {
            if (files.length === 0) return;
            var s = getSubject(subj.id);
            if (!s) return;
            var existingNames = new Set(s.pdfFiles.map(function(f) { return f.name; }));
            files.forEach(function(f) {
                if (!existingNames.has(f.name)) {
                    s.pdfFiles.push(f);
                    existingNames.add(f.name);
                }
            });
            renderSubjectPdfList(subj.id);
            updateProcessButton();
        }
    });
}

function renderSubjectPdfList(subjId) {
    var s = getSubject(subjId);
    if (!s) return;
    var listEl = document.getElementById('pdfs-list-' + subjId);
    var countEl = document.getElementById('pdfs-count-' + subjId);
    var countText = document.getElementById('pdfs-count-text-' + subjId);

    listEl.innerHTML = '';
    s.pdfFiles.forEach(function(f, i) {
        var li = document.createElement('li');
        li.innerHTML =
            '<span class="file-name">' + f.name + ' \u00B7 ' + formatSize(f.size) + '</span>' +
            '<button class="btn-remove" title="Remover">&times;</button>';
        li.querySelector('.btn-remove').addEventListener('click', function() {
            s.pdfFiles.splice(i, 1);
            renderSubjectPdfList(subjId);
            updateProcessButton();
        });
        listEl.appendChild(li);
    });

    if (s.pdfFiles.length > 0) {
        countEl.style.display = '';
        var totalSize = s.pdfFiles.reduce(function(sum, f) { return sum + f.size; }, 0);
        countText.textContent = s.pdfFiles.length + ' arquivo' + (s.pdfFiles.length > 1 ? 's' : '') + ' \u00B7 ' + formatSize(totalSize);
    } else {
        countEl.style.display = 'none';
    }
}

// ===== Dropzone setup =====
function setupDropzone(zoneEl, inputEl, opts) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(ev) {
        zoneEl.addEventListener(ev, function(e) { e.preventDefault(); e.stopPropagation(); });
    });
    zoneEl.addEventListener('dragenter', function() { zoneEl.classList.add('dragover'); });
    zoneEl.addEventListener('dragleave', function(e) {
        if (!zoneEl.contains(e.relatedTarget)) zoneEl.classList.remove('dragover');
    });
    zoneEl.addEventListener('drop', function(e) {
        zoneEl.classList.remove('dragover');
        var files = filterFiles(e.dataTransfer.files, opts.accept);
        opts.onFiles(files);
    });
    zoneEl.addEventListener('click', function() { inputEl.click(); });
    inputEl.addEventListener('change', function() {
        opts.onFiles(Array.from(inputEl.files));
        inputEl.value = '';
    });
}

// ===== Add subject button =====
addSubjectBtn.addEventListener('click', function() {
    addSubject('');
    // Scroll to new card
    var cards = subjectsList.querySelectorAll('.subject-card');
    if (cards.length > 0) {
        var last = cards[cards.length - 1];
        last.scrollIntoView({ behavior: 'smooth', block: 'center' });
        last.querySelector('.subject-name-input').focus();
    }
});

// ===== Process =====
processBtn.addEventListener('click', processFiles);

function processFiles() {
    var validSubjects = state.subjects.filter(function(s) {
        return s.coverFile && s.pdfFiles.length > 0;
    });

    if (validSubjects.length === 0) return;

    var formData = new FormData();

    var subjectMeta = validSubjects.map(function(s, idx) {
        return { name: s.name || 'Materia ' + (idx + 1), index: idx };
    });
    formData.append('subjects', JSON.stringify(subjectMeta));

    validSubjects.forEach(function(s, idx) {
        formData.append('cover_' + idx, s.coverFile);
        s.pdfFiles.forEach(function(f) {
            formData.append('pdfs_' + idx, f);
        });
    });

    stepProcess.style.display = 'none';
    subjectsSection.style.display = 'none';
    stepProgress.style.display = '';
    setProgress(0, 'Enviando arquivos...');
    setStatus('Processando...');

    var xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            var pct = Math.round((e.loaded / e.total) * 50);
            setProgress(pct, 'Enviando... ' + Math.round((e.loaded / e.total) * 100) + '%');
        }
    });

    var pulseInterval = null;

    xhr.upload.addEventListener('loadend', function() {
        setProgress(55, 'Processando PDFs...');
        var p = 55;
        pulseInterval = setInterval(function() {
            if (p < 92) { p += 1; setProgress(p, 'Processando PDFs...'); }
        }, 200);
    });

    xhr.addEventListener('load', function() {
        if (pulseInterval) clearInterval(pulseInterval);

        if (xhr.status === 200) {
            setProgress(100, 'Concluido!');
            var result = JSON.parse(xhr.responseText);
            state.sessionId = result.session_id;
            setStatus('Concluido');
            setTimeout(function() { showResults(result); }, 500);
        } else {
            var msg = 'Erro no processamento';
            try { msg = JSON.parse(xhr.responseText).error; } catch (e) {}
            setProgress(0, msg);
            stepProgress.style.display = 'none';
            subjectsSection.style.display = '';
            stepProcess.style.display = '';
            setStatus('Erro');
        }
    });

    xhr.addEventListener('error', function() {
        if (pulseInterval) clearInterval(pulseInterval);
        setProgress(0, 'Erro de rede');
        stepProgress.style.display = 'none';
        subjectsSection.style.display = '';
        stepProcess.style.display = '';
        setStatus('Erro');
    });

    xhr.open('POST', '/api/process');
    xhr.send(formData);
}

function setProgress(pct, text) {
    progressFill.style.width = pct + '%';
    progressText.textContent = text;
    progressPct.textContent = pct + '%';
}

// ===== Results =====
function showResults(result) {
    stepProgress.style.display = 'none';
    stepResults.style.display = '';

    var totalSucceeded = 0;
    var totalFailed = 0;
    result.subjects.forEach(function(s) {
        totalSucceeded += s.succeeded || 0;
        totalFailed += s.failed || 0;
    });

    if (totalFailed === 0) {
        resultsBanner.className = 'results-banner';
        resultsIcon.className = 'results-banner-icon';
        resultsIcon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        resultsTitle.textContent = 'Concluido!';
        resultsSummary.textContent = totalSucceeded + ' PDF' + (totalSucceeded > 1 ? 's' : '') + ' processado' + (totalSucceeded > 1 ? 's' : '') + ' em ' + result.subjects.length + ' materia' + (result.subjects.length > 1 ? 's' : '');
    } else {
        resultsBanner.className = 'results-banner has-errors';
        resultsIcon.className = 'results-banner-icon has-errors';
        resultsIcon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        resultsTitle.textContent = 'Processamento parcial';
        resultsSummary.textContent = totalSucceeded + ' processado' + (totalSucceeded > 1 ? 's' : '') + ', ' + totalFailed + ' com erro';
    }

    // Download all
    if (totalSucceeded > 0) {
        downloadAllBtn.style.display = '';
        downloadAllBtn.onclick = function() {
            downloadFile('/api/download-all/' + result.session_id);
        };
    } else {
        downloadAllBtn.style.display = 'none';
    }

    // Render subjects
    resultsBySubject.innerHTML = '';
    result.subjects.forEach(function(subj) {
        var subjCard = document.createElement('div');
        subjCard.className = 'result-subject-card';

        var headerHtml =
            '<div class="result-subject-header">' +
                '<div class="result-subject-title">' +
                    '<div class="subject-icon subject-icon-sm">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
                            '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' +
                        '</svg>' +
                    '</div>' +
                    '<h3>' + (subj.name || 'Materia') + '</h3>' +
                    '<span class="result-subject-count">' + (subj.succeeded || 0) + ' PDF' + ((subj.succeeded || 0) > 1 ? 's' : '') + '</span>' +
                '</div>';

        if (subj.dir_name && subj.succeeded > 1) {
            headerHtml +=
                '<button class="btn-download-subject" data-session="' + result.session_id + '" data-dir="' + subj.dir_name + '">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
                        '<polyline points="7 10 12 15 17 10"/>' +
                        '<line x1="12" y1="15" x2="12" y2="3"/>' +
                    '</svg>' +
                    '<span>Baixar materia</span>' +
                '</button>';
        }

        headerHtml += '</div>';

        subjCard.innerHTML = headerHtml;

        if (subj.error) {
            var errDiv = document.createElement('div');
            errDiv.className = 'result-subject-error';
            errDiv.textContent = subj.error;
            subjCard.appendChild(errDiv);
        } else {
            var filesList = document.createElement('ul');
            filesList.className = 'results-list';

            (subj.files || []).forEach(function(fname) {
                var li = document.createElement('li');
                li.innerHTML =
                    '<span class="file-name">' + fname + '</span>' +
                    '<button class="btn-dl" data-session="' + result.session_id + '" data-dir="' + subj.dir_name + '" data-file="' + fname + '">Baixar</button>';
                filesList.appendChild(li);
            });

            (subj.errors || []).forEach(function(err) {
                var li = document.createElement('li');
                li.innerHTML =
                    '<span class="file-name">' + err.filename + '</span>' +
                    '<span class="error-tag">' + err.error + '</span>';
                filesList.appendChild(li);
            });

            subjCard.appendChild(filesList);
        }

        resultsBySubject.appendChild(subjCard);
    });

    // Wire download buttons
    resultsBySubject.querySelectorAll('.btn-dl').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var sess = this.getAttribute('data-session');
            var dir = this.getAttribute('data-dir');
            var file = this.getAttribute('data-file');
            downloadFile('/api/download/' + sess + '/' + encodeURIComponent(dir) + '/' + encodeURIComponent(file));
        });
    });

    resultsBySubject.querySelectorAll('.btn-download-subject').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var sess = this.getAttribute('data-session');
            var dir = this.getAttribute('data-dir');
            downloadFile('/api/download-subject/' + sess + '/' + encodeURIComponent(dir));
        });
    });
}

// ===== Reset =====
resetBtn.addEventListener('click', function() {
    if (state.sessionId) {
        fetch('/api/cleanup/' + state.sessionId, { method: 'POST' }).catch(function() {});
    }
    state.subjects = [];
    state.sessionId = null;
    subjectCounter = 0;

    subjectsList.innerHTML = '';
    subjectsSection.style.display = '';
    stepResults.style.display = 'none';
    stepProcess.style.display = '';
    stepProgress.style.display = 'none';
    processBtn.disabled = true;
    resultsBySubject.innerHTML = '';
    setStatus('Pronto');

    // Add first empty subject
    addSubject('');
});

// ===== Download via fetch+blob =====
function downloadFile(url) {
    fetch(url)
        .then(function(res) {
            if (!res.ok) throw new Error('Download falhou');
            var disposition = res.headers.get('Content-Disposition') || '';
            var match = disposition.match(/filename=(.+)/);
            var filename = match ? match[1].replace(/"/g, '') : 'download.pdf';
            return res.blob().then(function(blob) { return { blob: blob, filename: filename }; });
        })
        .then(function(data) {
            var blobUrl = URL.createObjectURL(data.blob);
            var a = document.createElement('a');
            a.href = blobUrl;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        })
        .catch(function() {});
}

// ===== Init: add first subject =====
addSubject('');
