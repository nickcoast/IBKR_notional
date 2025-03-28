import locale

# Set locale for proper currency formatting
locale.setlocale(locale.LC_ALL, '')

def safe_float_conversion(value_str):
    """Safely convert a string to float, handling various formats"""
    if value_str is None:
        return 0.0
    
    # Handle various string formats
    if isinstance(value_str, str):
        # Remove currency symbols and commas
        clean_str = value_str.replace(locale.localeconv()['currency_symbol'], '')
        clean_str = clean_str.replace(',', '')
        try:
            return float(clean_str)
        except ValueError:
            print(f"Could not convert '{value_str}' to float")
            return 0.0
    
    # Already a number
    try:
        return float(value_str)
    except (ValueError, TypeError):
        return 0.0

def format_currency(value, include_symbol=True):
    """Format a value as currency"""
    try:
        if include_symbol:
            return locale.currency(float(value), grouping=True)
        else:
            return locale.format_string("%.2f", float(value), grouping=True)
    except (ValueError, TypeError):
        return "$0.00" if include_symbol else "0.00"