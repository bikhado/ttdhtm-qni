import sqlite3
import json
import os
from datetime import datetime

def export_to_json(db_path='education.db', output_file='education_data.json'):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Fetch metadata
    # For now, we take the latest year from school_stats
    cursor.execute("SELECT DISTINCT school_year FROM school_stats ORDER BY school_year DESC LIMIT 1")
    latest_year = cursor.fetchone()
    year = latest_year['school_year'] if latest_year else "Unknown"

    # Fetch schools joined with stats and facilities for the selected year
    query = """
    SELECT 
        s.name, s.type, s.district, s.level,
        t.total_classes as classes, t.total_students as students, 
        t.total_personnel as personnel, t.total_teachers as teachers,
        t.total_management as management, t.total_staff as staff,
        t.is_standard, t.student_density, t.teacher_ratio,
        t.g1_students, t.g2_students, t.g3_students, t.g4_students, t.g5_students,
        t.g6_students, t.g7_students, t.g8_students, t.g9_students,
        t.g10_students, t.g11_students, t.g12_students,
        f.total_facilities, f.classrooms, f.it_rooms, f.lang_rooms, f.art_rooms, f.music_rooms, f.gym_rooms,
        f.bio_chem_phys_rooms, f.tech_rooms
    FROM schools s
    JOIN school_stats t ON s.id = t.school_id
    LEFT JOIN school_facilities f ON s.id = f.school_id AND t.school_year = f.school_year
    WHERE t.school_year = ?
    """
    cursor.execute(query, (year,))
    rows = cursor.fetchall()
    
    schools = []
    for row in rows:
        school_dict = dict(row)
        # Convert boolean
        school_dict['is_standard'] = bool(school_dict['is_standard'])
        schools.append(school_dict)

    data = {
        "metadata": {
            "title": "Dữ liệu Giáo dục Tiểu học (Chi tiết)",
            "year": year,
            "total_schools": len(schools),
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "schools": schools
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Also update data.js
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(f"const EDUCATION_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};")

    print(f"Successfully exported {len(schools)} schools to {output_file} and data.js")
    conn.close()

if __name__ == "__main__":
    export_to_json()
