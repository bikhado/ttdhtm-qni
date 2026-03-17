import mysql.connector
import db_config
import sys

try:
    config = db_config.get_config()
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    
    table_name = f"{db_config.TABLE_PREFIX}gdtx_stats"
    print(f"Checking table: {table_name}")
    
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"Total rows in {table_name}: {count}")
    
    if count > 0:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
        rows = cursor.fetchall()
        for r in rows:
            print(r)
            
    conn.close()
except Exception as e:
    print("DB check Error:", e)

from import_excel import ExcelImporter
import os

print("\nRunning test import directly to see errors:")
importer = ExcelImporter(db_type='mysql')
success = importer.import_gdtx('Cơ sở giáo dục thường xuyên.xlsx', '2024-2025')
print("Import returned:", success)
