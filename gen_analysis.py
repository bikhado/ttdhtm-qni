import pandas as pd
import sys

file_path = r'h:\Work\AI\ioc-giaoduc-draft\Cơ sở giáo dục thường xuyên.xlsx'
output_file = r'h:\Work\AI\ioc-giaoduc-draft\gdtx_analysis.txt'

try:
    xl = pd.ExcelFile(file_path)
    with open(output_file, 'w', encoding='utf-8') as f:
        for sh in xl.sheet_names:
            f.write(f"\n========================================\n")
            f.write(f"SHEET: {sh}\n")
            f.write(f"========================================\n")
            df = pd.read_excel(xl, sheet_name=sh, header=None, nrows=20)
            f.write(df.to_string(index=False))
            f.write("\n\n")
    print(f"Analysis saved to {output_file}")
except Exception as e:
    print(f"Error: {e}")
