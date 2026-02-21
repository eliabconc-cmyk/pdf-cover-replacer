import fitz
from PIL import Image


def is_valid_pdf(path: str) -> bool:
    try:
        doc = fitz.open(path)
        valid = len(doc) >= 1
        doc.close()
        return valid
    except Exception:
        return False


def is_valid_image(path: str) -> bool:
    try:
        img = Image.open(path)
        img.verify()
        return True
    except Exception:
        return False


def get_first_page_dimensions(pdf_path: str) -> tuple[float, float]:
    doc = fitz.open(pdf_path)
    page = doc[0]
    w, h = page.rect.width, page.rect.height
    doc.close()
    return w, h


def load_cover_from_pdf(cover_path: str) -> fitz.Document:
    doc = fitz.open(cover_path)
    if len(doc) < 1:
        doc.close()
        raise ValueError("O PDF da capa está vazio")
    return doc


def load_cover_from_image(image_path: str, width: float, height: float) -> fitz.Document:
    doc = fitz.open()
    page = doc.new_page(width=width, height=height)
    rect = fitz.Rect(0, 0, width, height)
    page.insert_image(rect, filename=image_path)
    return doc


def replace_first_page(target_path: str, cover_doc: fitz.Document, output_path: str,
                        cover_is_image: bool = False, image_path: str = None) -> None:
    target_doc = fitz.open(target_path)
    if len(target_doc) < 1:
        target_doc.close()
        raise ValueError("O PDF alvo não tem páginas")

    target_w = target_doc[0].rect.width
    target_h = target_doc[0].rect.height

    # Se a capa é imagem e o PDF tem dimensões diferentes, recria a capa
    if cover_is_image and image_path:
        cover_w = cover_doc[0].rect.width
        cover_h = cover_doc[0].rect.height
        if abs(cover_w - target_w) > 1 or abs(cover_h - target_h) > 1:
            cover_doc = load_cover_from_image(image_path, target_w, target_h)

    target_doc.delete_page(0)
    target_doc.insert_pdf(cover_doc, from_page=0, to_page=0, start_at=0)
    target_doc.save(output_path)
    target_doc.close()
