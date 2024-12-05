import PyPDF2
from docx import Document


def docx(filename):
    doc = Document(filename)
    fullText = []
    for para in doc.paragraphs:
        fullText.append(para.text)
    return '\n'.join(fullText)


def pdf(filename):
    with open(filename, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        t = ''
        i = 0
        for page_num in pdf_reader.pages:
            page = pdf_reader.pages[i]
            t += page.extract_text()
            i += 1
    return t



def txt(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        t = f.read()
    return t


def handle_file(filename):
    if filename.endswith('.docx'):
        return docx(filename)
    elif filename.endswith('.pdf'):
        print("pdf")
        return pdf(filename)
    elif filename.endswith('.txt'):
        return txt(filename)
    else:
        return "File not supported"
