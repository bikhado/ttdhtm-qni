import pandas as pd
import os

files = [
    'Cơ sở giáo dục Trung học cơ sở.xlsx',
    'Cơ sở giáo dục Trung học phổ thông.xlsx'
]

for f in files:
    path = os.path.join(r'h:\Work\AI\ioc-giaoduc-draft', f)
    print(f"\n--- FILE: {f} ---")
    if not os.path.exists(path):
        print("File not found")
        continue
    try:
        df = pd.read_excel(path, sheet_name=0, header=None, nrows=15)
        
        # Find header row (usually contains 'Đơn vị' or 'STT')
        header_start = 0
        for i in range(15):
            row_vals = [str(x) for x in df.iloc[i].values]
            if any('Đơn vị' in v or 'STT' in v for v in row_vals):
                header_start = i
                break
        
        print(f"Detected header start at row: {header_start}")
        h0 = df.iloc[header_start].ffill()
        h1 = df.iloc[header_start + 1]
        headers = [f"{h0[i]} - {h1[i]}" if pd.notna(h1[i]) and h1[i] != h0[i] else f"{h0[i]}" for i in range(len(h0))]
        for i, h in enumerate(headers):
            print(f"{i}: {h}")
            
    except Exception as e:
        print(f"Error: {e}")
