import pandas as pd
import sqlite3
import os
import re
import db_config

try:
    import mysql.connector
    HAS_MYSQL = True
except ImportError:
    HAS_MYSQL = False

class ExcelImporter:
    def __init__(self, db_type='sqlite', db_path='education.db', pg_conn_str=None, password=None):
        self.db_type = db_type
        self.db_path = db_path
        self.pg_conn_str = pg_conn_str
        self.password = password
        self.conn = None
        self.prefix = db_config.TABLE_PREFIX 

    def connect(self, password=None):
        if self.db_type == 'sqlite':
            self.conn = sqlite3.connect(self.db_path)
        else:
            if not HAS_MYSQL:
                raise Exception("mysql-connector-python not installed")
            passwd = password or self.password
            config = db_config.get_config(passwd)
            self.conn = mysql.connector.connect(**config)
        return self.conn

    def close(self):
        if self.conn:
            self.conn.close()

    def to_int(self, val):
        try:
            if pd.isna(val): return 0
            return int(float(str(val).replace(',', '').replace(' ', '').strip()))
        except: return 0

    def get_mapping_status(self, file_path, level_override=None):
        """Returns which columns are mapped and which are missing."""
        df = pd.read_excel(file_path, sheet_name=0, header=None)
        
        # Detect header row
        header_start = 0
        for i in range(min(15, len(df))):
            row_vals = [str(x) for x in df.iloc[i].values]
            if any('Đơn vị' in v or 'STT' in v for v in row_vals):
                header_start = i
                break
        
        h0 = df.iloc[header_start].ffill()
        h1 = df.iloc[header_start + 1]
        headers = [f"{h0[i]} - {h1[i]}" if pd.notna(h1[i]) and h1[i] != h0[i] else str(h0[i]) for i in range(len(h0))]
        
        # Define required columns for a full feature set
        required = {
            'Thông tin chung': ['Đơn vị', 'Loại hình'],
            'Số lượng': ['Số Lớp & Học sinh - Tổng số lớp', 'Số Lớp & Học sinh - Tổng số học sinh'],
            'Nhân sự': ['Nhân sự - Giáo viên', 'Nhân sự - Tổng số nhân sự', 'Nhân sự - Hiệu trưởng - hiệu phó', 'Nhân sự - Nhân viên'],
            'Cơ sở vật chất': ['Cơ sở vật chất - Tổng số', 'Cơ sở vật chất - Phòng học', 'Cơ sở vật chất - Phòng tin học']
        }
        
        # Add dynamic grades
        level = level_override or self.detect_level(file_path)
        if level == 'Tiểu học':
            required['Khối lớp'] = [f'Số Lớp & Học sinh - Lớp {i}' for i in range(1, 6)]
        elif level == 'THCS':
            required['Khối lớp'] = [f'Số Lớp & Học sinh - Lớp {i}' for i in range(6, 10)]
        elif level == 'THPT':
            required['Khối lớp'] = [f'Số Lớp & Học sinh - Lớp {i}' for i in range(10, 13)]

        mapping_status = []
        for cat, cols in required.items():
            for col in cols:
                # Check for exact or close match (some have double spaces)
                found = col in headers
                if not found:
                    # Try with double spaces if it's a "Học sinh lớp X"
                    if 'Học sinh lớp' in col:
                        alt = col.replace('Học sinh lớp ', 'Học sinh lớp  ')
                        found = alt in headers
                
                mapping_status.append({
                    'category': cat,
                    'column': col,
                    'status': 'OK' if found else 'MISSING'
                })
        
        return mapping_status, headers

    def detect_level(self, file_path):
        fn = file_path.lower()
        if 'tiểu học' in fn: return 'Tiểu học'
        if 'trung học cơ sở' in fn or 'thcs' in fn: return 'THCS'
        if 'trung học phổ thông' in fn or 'thpt' in fn: return 'THPT'
        return 'Khác'

    def run_import(self, file_path, school_year, level_override=None):
        level = level_override or self.detect_level(file_path)
        self.connect(self.password)
        cursor = self.conn.cursor()

        # Initialize schema if this is MySQL or SQLite
        if self.db_type == 'sqlite':
            with open('database_schema.sql', 'r', encoding='utf-8') as f:
                cursor.executescript(f.read())
        elif self.db_type == 'mysql':
            print("Checking/Creating MySQL schema...")
            with open('schema_mysql.sql', 'r', encoding='utf-8') as f:
                schema_sql = f.read()
                # MySQL connector doesn't support executescript easily, 
                # Split by semicolon and execute each
                for statement in schema_sql.split(';'):
                    if statement.strip():
                        cursor.execute(statement)
            self.conn.commit()

        df = pd.read_excel(file_path, sheet_name=0, header=None)
        
        # Detect header row
        header_start = 0
        for i in range(min(15, len(df))):
            row_vals = [str(x) for x in df.iloc[i].values]
            if any('Đơn vị' in v or 'STT' in v for v in row_vals):
                header_start = i
                break
        
        h0 = df.iloc[header_start].ffill()
        h1 = df.iloc[header_start + 1]
        headers = [f"{h0[i]} - {h1[i]}" if pd.notna(h1[i]) and h1[i] != h0[i] else str(h0[i]) for i in range(len(h0))]
        
        data_rows = df.iloc[header_start + 2:].copy()
        data_rows.columns = headers

        imported_count = 0
        for _, row in data_rows.iterrows():
            name = str(row.get('Đơn vị', row.get('Tên đơn vị', ''))).strip()
            if not name or name in ['Toàn ngành', 'Công lập', 'Tư thục', 'nan', 'Tổng cộng']:
                continue

            school_type = str(row.get('Loại hình', 'Công lập')).strip()
            if not school_type or school_type.lower() in ['nan', 'none']: 
                school_type = 'Công lập'
            
            district = str(row.get('Huyện', 'Toàn tỉnh')).strip()
            if not district or district.lower() in ['nan', 'none']:
                district = 'Toàn tỉnh'

            # Upsert School
            if self.db_type == 'sqlite':
                cursor.execute(f"INSERT INTO {self.prefix}schools (name, type, level, district) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET type=excluded.type, level=excluded.level, district=excluded.district", (name, school_type, level, district))
            else:
                cursor.execute(f"INSERT INTO {self.prefix}schools (name, type, level, district) VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE type=VALUES(type), level=VALUES(level), district=VALUES(district)", (name, school_type, level, district))
            
            p_mark = '%s' if self.db_type in ['mysql', 'postgres'] else '?'
            cursor.execute(f"SELECT id FROM {self.prefix}schools WHERE name = {p_mark}", (name,))
            school_id = cursor.fetchone()[0]

            # Extract Stats
            classes = self.to_int(row.get('Số Lớp & Học sinh - Tổng số lớp', 0))
            students = self.to_int(row.get('Số Lớp & Học sinh - Tổng số học sinh', 0))
            teachers = self.to_int(row.get('Nhân sự - Giáo viên', 0))
            density = round(students / classes, 2) if classes > 0 else 0
            ratio = round(teachers / classes, 2) if classes > 0 else 0

            stats_data = {
                'school_id': school_id, 'school_year': school_year,
                'total_classes': classes, 'total_students': students,
                'total_personnel': self.to_int(row.get('Nhân sự - Tổng số nhân sự', 0)),
                'total_management': self.to_int(row.get('Nhân sự - Hiệu trưởng - hiệu phó', 0)),
                'total_staff': self.to_int(row.get('Nhân sự - Nhân viên', 0)),
                'total_teachers': teachers,
                'is_standard': str(row.get('Trường đạt chuẩn', '')).lower().strip() == 'x',
                'student_density': density, 'teacher_ratio': ratio
            }
            
            for g in range(1, 13):
                stats_data[f'g{g}_classes'] = self.to_int(row.get(f'Số Lớp & Học sinh - Lớp {g}', 0))
                sk = f'Số Lớp & Học sinh - Học sinh lớp {g}'
                if sk not in row: sk = f'Số Lớp & Học sinh - Học sinh lớp  {g}'
                stats_data[f'g{g}_students'] = self.to_int(row.get(sk, 0))

            cols = ', '.join(stats_data.keys())
            placeholders = ', '.join(['%s' if self.db_type in ['mysql', 'postgres'] else '?' for _ in stats_data])
            
            if self.db_type == 'sqlite':
                update_cols = ', '.join([f"{k}=EXCLUDED.{k}" for k in stats_data.keys() if k not in ['school_id', 'school_year']])
                cursor.execute(f"INSERT INTO {self.prefix}school_stats ({cols}) VALUES ({placeholders}) ON CONFLICT(school_id, school_year) DO UPDATE SET {update_cols}", list(stats_data.values()))
            else:
                update_cols = ', '.join([f"{k}=VALUES({k})" for k in stats_data.keys() if k not in ['school_id', 'school_year']])
                cursor.execute(f"INSERT INTO {self.prefix}school_stats ({cols}) VALUES ({placeholders}) ON DUPLICATE KEY UPDATE {update_cols}", list(stats_data.values()))

            # 5. Extract Facilities
            facility_data = {
                'school_id': school_id, 'school_year': school_year,
                'total_facilities': self.to_int(row.get('Cơ sở vật chất - Tổng số', 0)),
                'classrooms': self.to_int(row.get('Cơ sở vật chất - Phòng học', 0)),
            }
            
            # Map other facilities with flexible naming
            fac_mapping = {
                'it_rooms': ['Phòng tin học', 'Tin học'],
                'lang_rooms': ['Phòng ngoại ngữ', 'Ngoại ngữ'],
                'art_rooms': ['Phòng giáo dục nghệ thuật', 'Nghệ thuật'],
                'music_rooms': ['Phòng âm nhạc', 'Âm nhạc'],
                'gym_rooms': ['Phòng giáo dục thể chất', 'Thể chất'],
                'bio_chem_phys_rooms': ['Phòng lý hóa sinh', 'Lý hóa sinh'],
                'tech_rooms': ['Phòng công nghệ', 'Công nghệ']
            }
            
            for key, options in fac_mapping.items():
                val = 0
                for opt in options:
                    val = self.to_int(row.get(f'Cơ sở vật chất - {opt}', 0))
                    if val > 0: break
                facility_data[key] = val

            if imported_count < 3:
                print(f"Debug Facility for {name}: {facility_data}")

            if self.db_type == 'sqlite':
                cursor.execute(f"""
                    INSERT INTO {self.prefix}school_facilities ({', '.join(facility_data.keys())}) 
                    VALUES ({', '.join(['?']*len(facility_data))})
                    ON CONFLICT(school_id, school_year) DO UPDATE SET {', '.join([f'{k}=EXCLUDED.{k}' for k in facility_data.keys() if k not in ['school_id', 'school_year']])}
                """, list(facility_data.values()))
            else:
                f_cols = ', '.join(facility_data.keys())
                f_placeholders = ', '.join(['%s']*len(facility_data))
                f_update = ', '.join([f"{k}=VALUES({k})" for k in facility_data.keys() if k not in ['school_id', 'school_year']])
                cursor.execute(f"""
                    INSERT INTO {self.prefix}school_facilities ({f_cols}) 
                    VALUES ({f_placeholders}) 
                    ON DUPLICATE KEY UPDATE {f_update}
                """, list(facility_data.values()))

            imported_count += 1

        self.conn.commit()
        self.close()
        return imported_count

if __name__ == "__main__":
    importer = ExcelImporter()
    importer.run_import('h:/Work/AI/ioc-giaoduc-draft/Cơ sở giáo dục tiểu học trên địa bàn tỉnh.xlsx', '2024-2025')
