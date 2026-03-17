import os

# Database Connection Settings (MySQL)
DB_HOST = ""
DB_NAME = ""
DB_USER = ""
DB_PASS = "" # To be provided by user
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
