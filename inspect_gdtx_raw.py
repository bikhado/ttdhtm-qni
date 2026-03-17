import pandas as pd

file_path = r'h:\Work\AI\ioc-giaoduc-draft\Cơ sở giáo dục thường xuyên.xlsx'
xl = pd.ExcelFile(file_path)
for sh in xl.sheet_names:
    print(f"\n--- Sheet: {sh} ---")
    df = pd.read_excel(xl, sheet_name=sh, header=None, nrows=15)
    print(df.to_string(index=False))
