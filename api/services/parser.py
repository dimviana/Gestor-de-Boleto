# -*- coding: utf-8 -*-
import sys
import fitz  # PyMuPDF
import json
import re
from datetime import datetime

# Helper to find a value after a label, searching until the next label is found
def find_value_after_label(text, label_regex, stop_words_regex):
    try:
        label_match = re.search(label_regex, text, re.IGNORECASE)
        if not label_match:
            return None
        
        start_pos = label_match.end()
        text_after_label = text[start_pos:]
        
        stop_match = re.search(stop_words_regex, text_after_label, re.IGNORECASE)
        end_pos = stop_match.start() if stop_match else len(text_after_label)
        
        value = text_after_label[:end_pos].strip()
        # Clean up common extraction issues
        value = re.sub(r'\s*\n\s*', ' / ', value)
        value = re.sub(r'\s{2,}', ' ', value)
        value = re.sub(r'[-_]+', ' ', value).strip()
        return value if value else None
    except Exception:
        return None

def parse_currency(value_str):
    if not value_str:
        return None
    try:
        # Normalize the string: remove currency symbols, spaces, and use dot as decimal separator
        cleaned_str = value_str.strip().replace("R$", "").replace(".", "").replace(",", ".").strip()
        return float(cleaned_str)
    except (ValueError, TypeError):
        return None

def parse_date(value_str):
    if not value_str:
        return None
    try:
        # Match DD/MM/YYYY
        match = re.search(r'(\d{2})/(\d{2})/(\d{4})', value_str)
        if match:
            day, month, year = match.groups()
            return f"{year}-{month}-{day}"
        return None
    except (ValueError, TypeError):
        return None

def extract_barcode(text):
    # Regex for 48-digit payment slips (convenios)
    pattern_48_digits_with_spaces = r'\b\d{11,12}\s*[-]?\s*\d\s*\d{11,12}\s*[-]?\s*\d\s*\d{11,12}\s*[-]?\s*\d\s*\d{11,12}\s*[-]?\s*\d\b'
    # Regex for standard 47-digit bank slips
    pattern_47_digits_with_spaces = r'\b\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14}\b'
    # Regex for the digitable line of the provided example
    pattern_example_specific = r'\b(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})\b'
    
    for pattern in [pattern_example_specific, pattern_47_digits_with_spaces, pattern_48_digits_with_spaces]:
        match = re.search(pattern, text)
        if match:
            return re.sub(r'[^0-9]', '', match.group(0))

    # Fallback for a long sequence of numbers
    match = re.search(r'\b(\d{47,48})\b', re.sub(r'[\s.]', '', text))
    if match:
        return match.group(1)
        
    return None

def extract_boleto_info(pdf_path):
    text_content = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text_content += page.get_text("text")
    except Exception as e:
        print(json.dumps({"error": f"Failed to open or read PDF with PyMuPDF: {str(e)}"}))
        sys.exit(1)

    # --- Data Extraction using Regex ---
    recipient = find_value_after_label(text_content, r'Cedente', r'Data (do )?Documento|Vencimento|Agência / Código do Cedente')
    drawee = find_value_after_label(text_content, r'Sacado', r'Instruções|Descrição do Ato|Autenticação Mecânica')
    
    due_date_str = (re.search(r'Vencimento\s*(\d{2}/\d{2}/\d{4})', text_content, re.IGNORECASE) or [None, None])[1]
    doc_date_str = (re.search(r'Data do Documento\s*(\d{2}/\d{2}/\d{4})', text_content, re.IGNORECASE) or [None, None])[1]
    
    doc_amount_str = (re.search(r'Valor do Documento\s*R\$\s*([\d,.]+)', text_content, re.IGNORECASE) or [None, None])[1]
    amount_str = (re.search(r'Valor Cobrado\s*R\$\s*([\d,.]+)', text_content, re.IGNORECASE) or [None, None])[1]

    doc_amount = parse_currency(doc_amount_str)
    amount = parse_currency(amount_str)
    
    if amount is None or amount == 0:
        amount = doc_amount

    # Guide Number logic
    guide_number_match = re.search(r'(?:Nº\s*Documento/Guia|Nº\s*Documento)\s*(\S+)', text_content, re.IGNORECASE)
    guide_number = guide_number_match.group(1) if guide_number_match else None
    if not guide_number:
        guide_number_match = re.search(r'Nosso\s*Número\s*(\S+)', text_content, re.IGNORECASE)
        guide_number = guide_number_match.group(1) if guide_number_match else None

    pix_qr_code = (re.search(r'(000201[a-zA-Z0-9./*]{100,})', text_content) or [None, None])[1]
    barcode = extract_barcode(text_content)

    result = {
        "recipient": recipient,
        "drawee": drawee,
        "documentDate": parse_date(doc_date_str),
        "dueDate": parse_date(due_date_str),
        "documentAmount": doc_amount,
        "amount": amount,
        "discount": parse_currency((re.search(r'(?:Desconto / Abatimento)\s*R\$\s*([\d,.]+)', text_content, re.IGNORECASE) or [None, None])[1]),
        "interestAndFines": parse_currency((re.search(r'(?:Juros / Multa)\s*R\$\s*([\d,.]+)', text_content, re.IGNORECASE) or [None, None])[1]),
        "barcode": barcode,
        "guideNumber": guide_number.strip() if guide_number else None,
        "pixQrCodeText": pix_qr_code.strip() if pix_qr_code else None
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file_path = sys.argv[1]
        extract_boleto_info(pdf_file_path)
    else:
        print(json.dumps({"error": "No PDF file path provided."}))
        sys.exit(1)
