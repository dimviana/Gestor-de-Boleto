import sys
import json
import re
import fitz  # PyMuPDF
import datetime

def clean_ocr_mistakes(value):
    """Corrects common OCR character misinterpretations in numeric contexts."""
    if not value:
        return ''
    return str(value).replace('O', '0').replace('o', '0').replace('º', '0') \
                      .replace('I', '1').replace('l', '1') \
                      .replace('S', '5').replace('s', '5').replace('§', '5') \
                      .replace('B', '8') \
                      .replace('Z', '2').replace('z', '2') \
                      .replace('G', '6')

def extract_barcode(text):
    """Extracts the 47 or 48-digit barcode from text, trying multiple patterns."""
    # This regex is specific for the formatted barcode line (linha digitável)
    # e.g., 00190.00009 02864.346008 23677.478176 1 12650000006814
    # FIX: Made the digit count per block more flexible to support variations.
    pattern_formatted = r'\b(\d{5}\.\d{5,})\s+(\d{5}\.\d{6,})\s+(\d{5}\.\d{6,})\s+(\d{1,})\s+(\d{14,})\b'
    # Pattern for a solid block of 47 or 48 digits, often without formatting
    pattern_solid = r'\b(\d{47,48})\b'
    
    # Clean the text before matching
    cleaned_text = clean_ocr_mistakes(text)

    match = re.search(pattern_formatted, cleaned_text)
    if match:
        return ''.join(re.sub(r'[^\d]', '', g) for g in match.groups())

    match = re.search(pattern_solid, cleaned_text)
    if match:
        return match.group(1)

    return None

def parse_currency(value_str):
    """Parses a string into a float, handling Brazilian currency format (e.g., "R$ 1.234,56")."""
    if not value_str:
        return None
    
    # Clean string: remove currency symbols, labels, and extra spaces.
    cleaned_str = str(value_str).strip().upper().replace('R$', '').replace('RS', '').strip()
    
    # Standardize decimal and thousand separators
    if ',' in cleaned_str and '.' in cleaned_str:
        # Assumes format like 1.234,56 (dot is thousand, comma is decimal)
        if cleaned_str.rfind('.') < cleaned_str.rfind(','):
             cleaned_str = cleaned_str.replace('.', '').replace(',', '.')
        # Assumes format like 1,234.56 (comma is thousand, dot is decimal)
        else:
            cleaned_str = cleaned_str.replace(',', '')
    elif ',' in cleaned_str:
        # Assumes comma is decimal separator
        cleaned_str = cleaned_str.replace(',', '.')

    try:
        # Extract only digits and the decimal point
        numeric_part = re.sub(r'[^\d.]', '', cleaned_str)
        if not numeric_part:
            return None
        num = float(numeric_part)
        return round(num, 2)
    except (ValueError, TypeError):
        return None

def parse_date(date_str):
    """Parses a DD/MM/YYYY string into YYYY-MM-DD format, tolerating common OCR errors."""
    if not date_str:
        return None
    # Regex tolerates '/', space, 'l', or 'I' as separators
    match = re.search(r'(\d{2})[/\sIl](\d{2})[/\sIl](\d{4})', str(date_str))
    if match:
        day, month, year = match.groups()
        try:
            # Validate date components before creating a date object
            if 1 <= int(month) <= 12 and 1 <= int(day) <= 31 and int(year) > 1900:
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        except ValueError:
            return None
    return None

def extract_field(text, pattern):
    """A helper to extract a single-line value based on a regex pattern."""
    match = re.search(pattern, text, re.I)
    return match.group(1).strip() if match and match.group(1) else None

def extract_multiline_field(text, pattern):
    """Extracts a multi-line field based on a starting keyword and ending keywords."""
    match = re.search(pattern, text, re.I | re.DOTALL)
    if not match or not match.group(1):
        return None
    
    # Clean up the extracted text block
    result = match.group(1).strip()
    result = re.sub(r'\s*\n\s*', ' / ', result) # Replace newlines with slashes for readability
    result = re.sub(r'\s{2,}', ' ', result) # Condense multiple spaces
    result = re.sub(r'[-_]+', ' ', result).strip() # Replace separators
    return result if result else None

def main():
    try:
        pdf_data = sys.stdin.buffer.read()
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        
        full_text = ""
        for page in doc:
            # Using sort=True helps to reconstruct the reading order
            full_text += page.get_text("text", sort=True) + "\n"
        
        # --- REGEX PATTERNS DEFINITION ---
        # These are tailored for common Brazilian boleto layouts.
        patterns = {
            # Finds values that are typically on the same line as their labels.
            'dueDate': r'(?:Vencimento)[\s:.]*(\d{2}[/\sIl]\d{2}[/\sIl]\d{4})',
            'documentDate': r'(?:Data\s(?:do\s)?Documento)[\s:.]*(\d{2}[/\sIl]\d{2}[/\sIl]\d{4})',
            # For amounts, we look for the label and then any characters until we find a number.
            'documentAmount': r'(?:\(=\)\s*Valor\sdo\sDocumento|Valor\sdo\sDocumento)[\s\S]*?(\b[\d.,]+\b)',
            'amountCharged': r'(?:\(=\)\s*Valor\sCobrado)[\s\S]*?(\b[\d.,]+\b)',
            'discount': r'(?:\(-\)\s*Desconto\s*\/\s*Abatimento)[\s\S]*?(\b[\d.,]+\b)',
            'interestAndFines': r'(?:\(\+\)\s*Juros\s*\/\s*Multa|\(\+\)\s*Outros\sAcr.scimos)[\s\S]*?(\b[\d.,]+\b)',
            'guideNumberDoc': r'(?:N[ºo\.]?\s?Documento(?:[\/]?Guia)?)[\s.:\n]*?([^\s\n]+)',
            'guideNumberNosso': r'(?:Nosso\sN[úu]mero)[\s.:\n]*?([^\s\n]+)',
            # This pattern looks for the PIX copy-paste string, which always starts with '000201'
            'pixQrCodeText': r'(000201\S{100,})',
            # For multi-line fields, we capture everything between a start and end keyword.
            'recipient': r'(?:Benefici[áa]rio|Cedente)[\s.:\n]*([\s\S]*?)(?=\b(?:Data Process|Data (?:do )?Documento|Vencimento|Nosso Número|Ag.ncia)\b)',
            # FIX: Added "Sacador / Avalista" as a stop word to prevent capturing labels.
            'drawee': r'(?:Pagador|Sacado)[\s.:\n]*([\s\S]*?)(?=\b(?:Sacador\s\/\sAvalista|Instruções|Descrição do Ato|Autenticaç)\b|Mora/Multa)',
        }
        
        # --- DATA EXTRACTION ---
        data = {}

        # Dates
        data['dueDate'] = parse_date(extract_field(full_text, patterns['dueDate']))
        data['documentDate'] = parse_date(extract_field(full_text, patterns['documentDate']))
        
        # Currency values
        data['documentAmount'] = parse_currency(extract_field(full_text, patterns['documentAmount']))
        data['discount'] = parse_currency(extract_field(full_text, patterns['discount']))
        data['interestAndFines'] = parse_currency(extract_field(full_text, patterns['interestAndFines']))
        
        amount_charged = parse_currency(extract_field(full_text, patterns['amountCharged']))
        # The final amount is the 'Valor Cobrado'. If not available or zero, fall back to 'Valor do Documento'.
        data['amount'] = amount_charged if (amount_charged is not None and amount_charged > 0) else data.get('documentAmount')

        # Document Numbers
        guide_number = extract_field(full_text, patterns['guideNumberDoc'])
        if not guide_number:
            guide_number = extract_field(full_text, patterns['guideNumberNosso'])
        data['guideNumber'] = guide_number

        # Multi-line text fields
        data['recipient'] = extract_multiline_field(full_text, patterns['recipient'])
        data['drawee'] = extract_multiline_field(full_text, patterns['drawee'])
        
        # Codes
        data['barcode'] = extract_barcode(full_text)
        data['pixQrCodeText'] = extract_field(full_text, patterns['pixQrCodeText'])

        # Output the final JSON object
        print(json.dumps(data, indent=None))

    except Exception as e:
        # If any error occurs, print it to stderr for logging and exit with an error code.
        print(json.dumps({"error": f"Python script failed: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
