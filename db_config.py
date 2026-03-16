import os

# Database Connection Settings (MySQL)
DB_HOST = "10.163.14.45"
DB_NAME = "dtm_qni"
DB_USER = "etl_qni"
DB_PASS = "EtlQni#2021" # To be provided by user
DB_PORT = 3306

# Table Prefixes
TABLE_PREFIX = "antigravity_"

def get_config(password=None):
    return {
        'host': DB_HOST,
        'user': DB_USER,
        'password': password or DB_PASS or os.environ.get("DB_PASSWORD"),
        'database': DB_NAME,
        'port': DB_PORT,
        'charset': 'utf8mb4'
    }
