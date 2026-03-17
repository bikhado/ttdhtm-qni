import pandas as pd

try:
    xl = pd.ExcelFile('Cơ sở giáo dục thường xuyên.xlsx')
    df = pd.read_excel(xl, 'Ngan Sach', header=None)
    print("COLUMN B:")
    for index, row in df.iterrows():
        val = row[1]
        if pd.notna(val) and isinstance(val, str):
            print(f"Row {index}: {val!r}")
except Exception as e:
    print(e)
