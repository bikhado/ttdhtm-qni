import pandas as pd
import json

file_path = r'h:\Work\AI\ioc-giaoduc-draft\Cơ sở giáo dục thường xuyên.xlsx'
try:
    xl = pd.ExcelFile(file_path)
    metadata = {}
    for sheet_name in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet_name, nrows=2)
        metadata[sheet_name] = df.columns.tolist()
    
    print(json.dumps(metadata, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")
