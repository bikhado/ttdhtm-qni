import pandas as pd
file_path = "Cơ sở giáo dục thường xuyên.xlsx"

with open("excel_debug.txt", "w", encoding="utf-8") as f:
    f.write("--- TRUONG LOP ---\n")
    try:
        df = pd.read_excel(file_path, sheet_name="Truong lop", header=None, nrows=30)
        f.write(df.to_string())
    except Exception as e:
        f.write(f"Error: {e}")
        
    f.write("\n\n--- HOC SINH ---\n")
    try:
        df = pd.read_excel(file_path, sheet_name="Hoc Sinh", header=None, nrows=30)
        f.write(df.to_string())
    except Exception as e:
        f.write(f"Error: {e}")

    f.write("\n\n--- NHAN SU ---\n")
    try:
        df = pd.read_excel(file_path, sheet_name="Nhan Su", header=None, nrows=30)
        f.write(df.to_string())
    except Exception as e:
        f.write(f"Error: {e}")
        
    f.write("\n\n--- NGAN SACH ---\n")
    try:
        df = pd.read_excel(file_path, sheet_name="Ngan Sach", header=None, nrows=30)
        f.write(df.to_string())
    except Exception as e:
        f.write(f"Error: {e}")
