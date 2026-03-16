import pandas as pd
import sys

def inspect_excel(file_path):
    print(f"Inspecting: {file_path}")
    # Only read the first 20 rows to find headers
    df = pd.read_excel(file_path, sheet_name=0, nrows=20, header=None)
    header_start = -1
    for i in range(len(df)):
        row_vals = [str(x) for x in df.iloc[i].values]
        if any('Đơn vị' in v or 'STT' in v for v in row_vals):
            header_start = i
            break
    
    if header_start == -1:
        print("Could not find header start row.")
        return

    h0 = df.iloc[header_start].ffill()
    h1 = df.iloc[header_start + 1]
    headers = [f"{h0[i]} - {h1[i]}" if pd.notna(h1[i]) and h1[i] != h0[i] else str(h0[i]) for i in range(len(h0))]
    print("Facility-related headers found:")
    for h in headers:
        if "Cơ sở vật chất" in h or "phòng" in h.lower():
            print(f"  - {h}")

if __name__ == "__main__":
    inspect_excel(sys.argv[1])
