import os
import uuid
import shutil
import zipfile
import io
import time
import threading
import re

from flask import Flask, request, jsonify, send_file, render_template
from werkzeug.utils import secure_filename

from cover_replacer import (
    load_cover_from_pdf, load_cover_from_image,
    replace_first_page, get_first_page_dimensions,
    is_valid_pdf, is_valid_image
)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024 * 1024  # 1 GB

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_COVER_EXT = {'.pdf', '.png', '.jpg', '.jpeg'}
UUID_RE = re.compile(r'^[a-f0-9\-]{36}$')

_last_cleanup = 0


def cleanup_old_sessions(max_age=3600):
    if not os.path.exists(UPLOAD_DIR):
        return
    now = time.time()
    for entry in os.scandir(UPLOAD_DIR):
        if entry.is_dir() and (now - entry.stat().st_mtime) > max_age:
            shutil.rmtree(entry.path, ignore_errors=True)


@app.before_request
def maybe_cleanup():
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup > 300:
        _last_cleanup = now
        threading.Thread(target=cleanup_old_sessions, daemon=True).start()


@app.route('/')
def index():
    return render_template('index.html')


def _safe_dirname(name):
    safe = re.sub(r'[<>:"/\\|?*]', '_', name.strip())
    return safe[:100] or 'materia'


@app.route('/api/process', methods=['POST'])
def process():
    import json

    raw_subjects = request.form.get('subjects')
    if not raw_subjects:
        return jsonify({"error": "Nenhuma materia enviada"}), 400

    try:
        subject_list = json.loads(raw_subjects)
    except (json.JSONDecodeError, TypeError):
        return jsonify({"error": "Dados de materias invalidos"}), 400

    if not subject_list or not isinstance(subject_list, list):
        return jsonify({"error": "Envie ao menos uma materia"}), 400

    session_id = str(uuid.uuid4())
    session_dir = os.path.join(UPLOAD_DIR, session_id)
    output_dir = os.path.join(session_dir, 'output')
    os.makedirs(session_dir)
    os.makedirs(output_dir)

    try:
        results = {
            "session_id": session_id,
            "subjects": []
        }

        for idx, subj in enumerate(subject_list):
            subj_name = subj.get('name', f'Materia {idx + 1}').strip()
            if not subj_name:
                subj_name = f'Materia {idx + 1}'

            safe_subj_name = _safe_dirname(subj_name)
            subj_output_dir = os.path.join(output_dir, safe_subj_name)
            os.makedirs(subj_output_dir, exist_ok=True)

            cover_key = f'cover_{idx}'
            pdfs_key = f'pdfs_{idx}'

            if cover_key not in request.files:
                results["subjects"].append({
                    "name": subj_name,
                    "error": "Capa nao enviada",
                    "succeeded": 0, "failed": 0, "files": [], "errors": []
                })
                continue

            cover_file = request.files[cover_key]
            if not cover_file.filename:
                results["subjects"].append({
                    "name": subj_name,
                    "error": "Capa nao enviada",
                    "succeeded": 0, "failed": 0, "files": [], "errors": []
                })
                continue

            cover_ext = os.path.splitext(cover_file.filename)[1].lower()
            if cover_ext not in ALLOWED_COVER_EXT:
                results["subjects"].append({
                    "name": subj_name,
                    "error": "A capa deve ser PDF, PNG ou JPG",
                    "succeeded": 0, "failed": 0, "files": [], "errors": []
                })
                continue

            cover_filename = secure_filename(f"cover_{idx}_{cover_file.filename}")
            cover_path = os.path.join(session_dir, cover_filename)
            cover_file.save(cover_path)

            cover_is_image = cover_ext in {'.png', '.jpg', '.jpeg'}
            if cover_is_image:
                if not is_valid_image(cover_path):
                    results["subjects"].append({
                        "name": subj_name,
                        "error": "A imagem da capa esta corrompida ou e invalida",
                        "succeeded": 0, "failed": 0, "files": [], "errors": []
                    })
                    continue
            else:
                if not is_valid_pdf(cover_path):
                    results["subjects"].append({
                        "name": subj_name,
                        "error": "O PDF da capa esta corrompido ou e invalido",
                        "succeeded": 0, "failed": 0, "files": [], "errors": []
                    })
                    continue

            pdf_files = request.files.getlist(pdfs_key)
            saved_pdfs = []
            subj_input_dir = os.path.join(session_dir, f'input_{idx}')
            os.makedirs(subj_input_dir, exist_ok=True)

            for pdf_file in pdf_files:
                if not pdf_file.filename:
                    continue
                fname = secure_filename(pdf_file.filename)
                if not fname.lower().endswith('.pdf'):
                    continue
                pdf_path = os.path.join(subj_input_dir, fname)
                pdf_file.save(pdf_path)
                saved_pdfs.append((fname, pdf_path))

            if not saved_pdfs:
                results["subjects"].append({
                    "name": subj_name,
                    "error": "Nenhum PDF valido enviado para esta materia",
                    "succeeded": 0, "failed": 0, "files": [], "errors": []
                })
                continue

            if cover_is_image:
                first_pdf_path = saved_pdfs[0][1]
                w, h = get_first_page_dimensions(first_pdf_path)
                cover_doc = load_cover_from_image(cover_path, w, h)
            else:
                cover_doc = load_cover_from_pdf(cover_path)

            subj_result = {
                "name": subj_name,
                "dir_name": safe_subj_name,
                "succeeded": 0,
                "failed": 0,
                "files": [],
                "errors": []
            }

            for fname, pdf_path in saved_pdfs:
                try:
                    out_path = os.path.join(subj_output_dir, fname)
                    replace_first_page(pdf_path, cover_doc, out_path,
                                       cover_is_image=cover_is_image, image_path=cover_path)
                    subj_result["succeeded"] += 1
                    subj_result["files"].append(fname)
                except Exception as e:
                    subj_result["failed"] += 1
                    subj_result["errors"].append({"filename": fname, "error": str(e)})

            cover_doc.close()
            results["subjects"].append(subj_result)

        return jsonify(results)

    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        return jsonify({"error": f"Erro no processamento: {str(e)}"}), 500


@app.route('/api/download/<session_id>/<subject_dir>/<filename>')
def download_single(session_id, subject_dir, filename):
    if not UUID_RE.match(session_id):
        return jsonify({"error": "Sessao invalida"}), 404

    subject_dir = secure_filename(subject_dir)
    filename = secure_filename(filename)
    filepath = os.path.join(UPLOAD_DIR, session_id, 'output', subject_dir, filename)

    if not os.path.isfile(filepath):
        return jsonify({"error": "Arquivo nao encontrado"}), 404

    return send_file(filepath, as_attachment=True, download_name=filename)


@app.route('/api/download-subject/<session_id>/<subject_dir>')
def download_subject(session_id, subject_dir):
    if not UUID_RE.match(session_id):
        return jsonify({"error": "Sessao invalida"}), 404

    subject_dir = secure_filename(subject_dir)
    subj_output = os.path.join(UPLOAD_DIR, session_id, 'output', subject_dir)
    if not os.path.isdir(subj_output):
        return jsonify({"error": "Materia nao encontrada"}), 404

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fname in os.listdir(subj_output):
            filepath = os.path.join(subj_output, fname)
            if os.path.isfile(filepath):
                zf.write(filepath, fname)

    buffer.seek(0)
    return send_file(buffer, as_attachment=True,
                     download_name=f'{subject_dir}.zip',
                     mimetype='application/zip')


@app.route('/api/download-all/<session_id>')
def download_all(session_id):
    if not UUID_RE.match(session_id):
        return jsonify({"error": "Sessao invalida"}), 404

    output_dir = os.path.join(UPLOAD_DIR, session_id, 'output')
    if not os.path.isdir(output_dir):
        return jsonify({"error": "Sessao nao encontrada"}), 404

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for subj_dir in os.listdir(output_dir):
            subj_path = os.path.join(output_dir, subj_dir)
            if os.path.isdir(subj_path):
                for fname in os.listdir(subj_path):
                    filepath = os.path.join(subj_path, fname)
                    if os.path.isfile(filepath):
                        zf.write(filepath, os.path.join(subj_dir, fname))

    buffer.seek(0)
    return send_file(buffer, as_attachment=True,
                     download_name='pdfs_por_materia.zip',
                     mimetype='application/zip')


@app.route('/api/cleanup/<session_id>', methods=['POST'])
def cleanup(session_id):
    if not UUID_RE.match(session_id):
        return jsonify({"error": "Sessao invalida"}), 404

    session_dir = os.path.join(UPLOAD_DIR, session_id)
    if os.path.isdir(session_dir):
        shutil.rmtree(session_dir, ignore_errors=True)

    return jsonify({"status": "ok"})


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "Arquivo muito grande. Maximo total: 1 GB."}), 413


if __name__ == '__main__':
    app.run(debug=True, port=5000)
