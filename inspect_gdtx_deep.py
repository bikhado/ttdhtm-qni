import pandas as pd

file_path = r'h:\Work\AI\ioc-giaoduc-draft\Cơ sở giáo dục thường xuyên.xlsx'
xl = pd.ExcelFile(file_path)
with open(r'h:\Work\AI\ioc-giaoduc-draft\gdtx_extended.txt', 'w', encoding='utf-8') as f:
    for sh in xl.sheet_names:
        f.write(f"\n--- {sh} (Rows 20-200) ---\n")
        df = pd.read_excel(xl, sheet_name=sh, header=None, skiprows=20, nrows=180)
        f.write(df.to_string(index=False))
