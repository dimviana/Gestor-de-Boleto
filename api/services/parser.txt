# -*- coding: utf-8 -*-
import sys
import fitz  # PyMuPDF
import json
import re

def clean_ocr_mistakes(value):
    if not value: return ''
    return value.replace('O', '0').replace('º', '0') \
                .replace('I', '1').replace('l', '1') \
                .replace('S', '5').replace('B', '8') \
                .replace('Z', '2').replace('G', '6') \
                .replace('§', '5')

def parse_currency(value_str):
    if not value_str: return None
    try:
        value_str = clean_ocr_mistakes(value_str.strip())
        value_str = re.sub(r'R\$\s*|RS\s*|valor\s*', '', value_str, flags=re.IGNORECASE).strip()

        if not re.search(r'\d', value_str): return None

        has_comma = ',' in value_str
        has_dot = '.' in value_str

        if has_comma and has_dot:
            value_str = value_str.replace(".", "").replace(",", ".")
        elif has_comma and not has_dot:
            parts = value_str.split(',')
            if len(parts) == 2 and len(parts[1]) == 2:
                value_str = parts[0].replace(".", "") + '.' + parts[1]
            else:
                value_str = value_str.replace(",", ".")
        elif not has_comma and has_dot:
            last_dot_index = value_str.rfind('.')
            if len(value_str) - last_dot_index - 1 != 2:
                value_str = value_str.replace(".", "")

        num_str = re.sub(r'[^\d.]', '', value_str)
        num = float(num_str)
        return round(num, 2)
    except (ValueError, TypeError):
        return None

def parse_date(value_str):
    if not value_str: return None
    try:
        cleaned_str = clean_ocr_mistakes(value_str)
        match = re.search(r'(\d{2})[/\s.Il]?(\d{2})[/\s.Il]?(\d{4})', cleaned_str)
        if match:
            day, month, year = match.groups()
            day_int, month_int = int(day), int(month)
            if 0 < day_int <= 31 and 0 < month_int <= 12:
                return f"{year}-{str(month_int).zfill(2)}-{str(day_int).zfill(2)}"
        return None
    except (ValueError, TypeError):
        return None

def extract_barcode(text):
    patterns = [
        r'\b(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})\b',
        r'\b(\d{11,12}\s*[-]?\s*\d\s*\d{11,12}\s*[-]?\s*\d\s*\d{11,12}\s*[-]?\s*\d\s*\d{11,12}\s*[-]?\s*\d)\b',
        r'\b(\d{47,48})\b'
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return re.sub(r'[^0-9]', '', match.group(0))
    return None

def find_first_match(text, pattern):
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip() if match and match.group(1) else None

def find_last_match(text, pattern):
    matches = re.findall(pattern, text, re.IGNORECASE)
    return matches[-1].strip() if matches else None

def find_entity(text, pattern):
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if not match or not match.group(1): return None
    value = match.group(1).strip()
    value = re.sub(r'\s*\n\s*', ' / ', value)
    value = re.sub(r'\s{2,}', ' ', value)
    value = re.sub(r'[-_]+', ' ', value).strip()
    return value if value else None

def extract_boleto_info(pdf_path):
    text_content = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text_content += page.get_text("text") + "\n"
    except Exception as e:
        print(json.dumps({"error": f"Failed to open or read PDF with PyMuPDF: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    patterns = {
        'recipient': r'(?:Beneficiário|Cedente)[\s.:\n]*?([\s\S]*?)(?=\b(?:Data (?:do )?Documento|Vencimento|Nosso Número|Agência|CNPJ)\b)',
        'drawee': r'(?:Pagador|Sacado)[\s.:\n]*?([\s\S]*?)(?=\b(?:Instruções|Descrição do Ato|Autenticação Mecânica|FICHA DE COMPENSAÇÃO)\b)',
        'date': r'(\d{2}[/\s.Il]?\d{2}[/\s.Il]?\d{4})',
        'currency': r'(\b[\d,.]+\b)',
        'guideNumberDoc': r'(?:N[ºo\.]?\s?(?:do\s)?Documento(?:[\/]?Guia)?)[\s.:\n]*?(\S+)',
        'guideNumberNosso': r'(?:Nosso\sN[úu]mero)[\s.:\n]*?(\S+)',
        'pixQrCodeText': r'(000201\S{100,})',
    }
    
    recipient = find_entity(text_content, patterns['recipient'])
    drawee = find_entity(text_content, patterns['drawee'])
    pix_qr_code = find_first_match(text_content, patterns['pixQrCodeText'])
    
    due_date_str = find_last_match(text_content, fr'Vencimento[\s\S]*{patterns["date"]}')
    doc_date_str = find_last_match(text_content, fr'Data (?:do )?Documento[\s\S]*{patterns["date"]}')
    
    doc_amount_str = find_last_match(text_content, fr'Valor (?:do )?Documento[\s\S]*{patterns["currency"]}')
    amount_str = find_last_match(text_content, fr'Valor Cobrado[\s\S]*{patterns["currency"]}')
    discount_str = find_last_match(text_content, fr'(?:Desconto\s*/\s*Abatimento)[\s\S]*{patterns["currency"]}')
    interest_str = find_last_match(text_content, fr'(?:Juros\s*/\s*Multa|Outros Acréscimos)[\s\S]*{patterns["currency"]}')

    doc_amount = parse_currency(doc_amount_str)
    amount = parse_currency(amount_str)
    
    if amount is None or amount == 0:
        amount = doc_amount

    guide_number = find_first_match(text_content, patterns['guideNumberDoc'])
    if not guide_number:
        guide_number = find_first_match(text_content, patterns['guideNumberNosso'])

    barcode = extract_barcode(text_content)

    result = {
        "recipient": recipient,
        "drawee": drawee,
        "documentDate": parse_date(doc_date_str),
        "dueDate": parse_date(due_date_str),
        "documentAmount": doc_amount,
        "amount": amount,
        "discount": parse_currency(discount_str),
        "interestAndFines": parse_currency(interest_str),
        "barcode": barcode,
        "guideNumber": guide_number.strip() if guide_number else None,
        "pixQrCodeText": pix_qr_code.strip() if pix_qr_code else None,
    }
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file_path = sys.argv[1]
        extract_boleto_info(pdf_file_path)
    else:
        print(json.dumps({"error": "No PDF file path provided."}, ensure_ascii=False))
        sys.exit(1)
