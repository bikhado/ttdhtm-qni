import pandas as pd
import sys

try:
    file_path = "Giáo dục khuyết tật.xlsx"
    print(f"Analyzing {file_path}...\n")
    xl = pd.ExcelFile(file_path)
    print("Sheets found:", xl.sheet_names)
    
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(xl, sheet_name=sheet, header=None)
        print(f"Shape: {df.shape}")
        print("First 15 rows, first 10 columns:")
        print(df.iloc[:15, :10] if df.shape[1] >= 10 else df.iloc[:15, :])
        
except Exception as e:
    print(f"Error: {e}")
