import pandas as pd
import sqlite3
import os

file_path = "Cơ sở giáo dục thường xuyên.xlsx"
year = "2024-2025"
db_path = "education.db"

print(f"File exists: {os.path.exists(file_path)}")
print("Connecting to DB...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Opening Excel...")
xl = pd.ExcelFile(file_path)
print("Sheets:", xl.sheet_names)

# 1. Truong lop
print("Reading 'Truong lop'...")
df = pd.read_excel(xl, 'Truong lop', header=None)
val = df.iloc[14, 1]
print(f"Total Centers: {val}")

# Insert mock
sql = "INSERT OR REPLACE INTO gdtx_stats (category, sub_category, unit, value, school_year) VALUES (?, ?, ?, ?, ?)"
cursor.execute(sql, ('Trung tâm GDTX', 'Tổng số', 'trung tâm', int(val), year))
conn.commit()
print("Committed.")
conn.close()
