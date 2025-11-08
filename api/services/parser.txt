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
        # Remove currency symbols and surrounding whitespace
        value_str = re.sub(r'R\$\s*', '', value_str, flags=re.IGNORECASE).strip()

        if not re.search(r'\d', value_str):
            return None

        # Check for Brazilian format (contains a comma)
        if ',' in value_str:
            # Remove thousand separators (dots), then replace comma with dot for float conversion
            # e.g., "1.234,56" -> "1234.56"
            value_str = value_str.replace('.', '').replace(',', '.')
        else:
            # No comma, could be "1234.56" or "1234".
            # If a dot exists, assume it's a decimal separator ONLY if there are two digits after the last one.
            # Otherwise, it's likely a thousands separator, so remove all dots.
            if '.' in value_str:
                last_dot_index = value_str.rfind('.')
                if len(value_str) - last_dot_index - 1 != 2:
                    value_str = value_str.replace('.', '')
        
        # At this point, the string should be in a format like "1234.56" or "1234"
        num_str = re.sub(r'[^\d.]', '', value_str)
        num = float(num_str)
        
        # Final sanity check, values are unlikely to be this high. Catches OCR errors like long numbers.
        if num > 99999999.0:
            return None
            
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
        'currency': r'((?:R\$\s*)?[\d.,]+)',
        'guideNumberDoc': r'(?:N[ºo\.]?\s?(?:do\s)?Documento(?:[\/]?Guia)?)[\s.:\n]*?(\S+)',
        'guideNumberNosso': r'(?:Nosso\sN[úu]mero)[\s.:\n]*?(\S+)',
        'pixQrCodeText': r'(000201\S{100,})',
    }
    
    recipient = find_entity(text_content, patterns['recipient'])
    drawee = find_entity(text_content, patterns['drawee'])
    pix_qr_code = find_first_match(text_content, patterns['pixQrCodeText'])
    
    due_date_str = find_last_match(text_content, fr'Vencimento[^\d\n]*{patterns["date"]}')
    doc_date_str = find_last_match(text_content, fr'Data (?:do )?Documento[^\d\n]*{patterns["date"]}')
    
    # Use non-greedy patterns that avoid capturing other numbers between the label and the value.
    doc_amount_str = find_last_match(text_content, fr'Valor (?:do )?Documento[^\d]*{patterns["currency"]}')
    amount_str = find_last_match(text_content, fr'Valor Cobrado[^\d]*{patterns["currency"]}')
    discount_str = find_last_match(text_content, fr'(?:Desconto\s*/\s*Abatimento)[^\d]*{patterns["currency"]}')
    interest_str = find_last_match(text_content, fr'(?:Juros\s*/\s*Multa|Outros Acréscimos)[^\d]*{patterns["currency"]}')

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
