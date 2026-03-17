from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import sqlite3
import json
import pandas as pd
import io
from import_excel import ExcelImporter
import db_config
from export_data import export_to_json 

app = Flask(__name__)
CORS(app)

# Helper to get importer instance based on choice
def get_importer(db_type='sqlite', password=None):
    if db_type == 'mysql':
        return ExcelImporter(db_type='mysql', password=password)
    return ExcelImporter(db_type='sqlite')

@app.route('/api/preview', methods=['POST'])
def preview_import():
    data = request.json
    filename = data.get('filename')
    level_override = data.get('level')
    file_path = os.path.join(os.getcwd(), filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    
    importer = ExcelImporter()
    
    if level_override == 'GDTX':
        mapping, headers = importer.get_mapping_status_gdtx(file_path)
    else:
        mapping, headers = importer.get_mapping_status(file_path, level_override)
    
    return jsonify({
        'level': level_override or importer.detect_level(file_path),
        'mapping': mapping,
        'headers': headers[:20] if headers else []
    })

@app.route('/api/import', methods=['POST'])
def run_import():
    data = request.json
    filename = data.get('filename')
    year = data.get('year', '2024-2025')
    level = data.get('level')
    db_type = data.get('db_type', 'sqlite')
    password = data.get('password')
    
    file_path = os.path.join(os.getcwd(), filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
        
    try:
        importer = get_importer(db_type, password)
        count = importer.run_import(file_path, year, level)
        
        # Also trigger export if using sqlite (to update data.js)
        if db_type == 'sqlite':
            export_to_json()
            
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data', methods=['GET'])
def get_data():
    db_type = request.args.get('db_type', 'sqlite')
    if db_type == 'sqlite':
        with open('education_data.json', 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
            
    # MySQL full data fetching 
    try:
        import mysql.connector
        config = db_config.get_config()
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor(dictionary=True)
        
        p = db_config.TABLE_PREFIX
        query = f"""
            SELECT 
                s.*, 
                st.school_year,
                st.total_classes as classes, st.total_students as students,
                st.total_teachers as teachers, st.total_personnel as personnel,
                st.total_management as management, st.total_staff as staff,
                st.is_standard, st.student_density, st.teacher_ratio,
                st.g1_students, st.g2_students, st.g3_students, st.g4_students, st.g5_students,
                st.g6_students, st.g7_students, st.g8_students, st.g9_students, st.g10_students,
                st.g11_students, st.g12_students,
                f.total_facilities, f.classrooms, f.it_rooms, f.lang_rooms,
                f.art_rooms, f.music_rooms, f.gym_rooms, f.bio_chem_phys_rooms, f.tech_rooms
            FROM {p}schools s
            LEFT JOIN {p}school_stats st ON s.id = st.school_id
            LEFT JOIN {p}school_facilities f ON s.id = f.school_id AND st.school_year = f.school_year
        """
        cursor.execute(query)
        schools = cursor.fetchall()
        
        return jsonify({
            'schools': schools, 
            'metadata': {
                'year': '2024-2025', 
                'last_updated': 'Real-time MySQL'
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download-template', methods=['POST'])
def download_template():
    data = request.json
    filename = data.get('filename')
    file_path = os.path.join(os.getcwd(), filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
        
    importer = ExcelImporter()
    mapping, _ = importer.get_mapping_status(file_path)
    
    # Create a simple DataFrame with the missing columns as headers
    missing_cols = [m['column'] for m in mapping if m['status'] == 'MISSING']
    
    # If no missing columns, give them the full required list for that level
    if not missing_cols:
        missing_cols = [m['column'] for m in mapping]

    df_template = pd.DataFrame(columns=missing_cols)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_template.to_excel(writer, index=False, sheet_name='Sheet1')
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='correction_template.xlsx'
    )

@app.route('/api/gdtx', methods=['GET'])
def get_gdtx_data():
    db_type = request.args.get('db_type', 'sqlite')
    year = request.args.get('year', '2024-2025')
    
    try:
        if db_type == 'mysql':
            import mysql.connector
            config = db_config.get_config()
            conn = mysql.connector.connect(**config)
            prefix = db_config.TABLE_PREFIX
        else:
            conn = sqlite3.connect('education.db')
            prefix = ""
            
        cursor = conn.cursor(dictionary=True) if db_type == 'mysql' else conn.cursor()
        query = f"SELECT category, sub_category, unit, value FROM {prefix}gdtx_stats WHERE school_year = %s" if db_type == 'mysql' else f"SELECT category, sub_category, unit, value FROM gdtx_stats WHERE school_year = ?"
        cursor.execute(query, (year,))
        rows = cursor.fetchall()
        
        # Convert sqlite rows to dicts if needed
        if db_type == 'sqlite':
            results = []
            for r in rows:
                results.append({'category': r[0], 'sub_category': r[1], 'unit': r[2], 'value': r[3]})
            rows = results
            
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/import-gdtx', methods=['POST'])
def run_import_gdtx():
    data = request.json
    filename = data.get('filename')
    year = data.get('year', '2024-2025')
    db_type = data.get('db_type', 'sqlite')
    password = data.get('password')
    
    file_path = os.path.join(os.getcwd(), filename)
    try:
        success = importer.import_gdtx(file_path, year)
        
        if success:
            if db_type == 'sqlite':
                export_to_json()
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Lỗi trong quá trình đọc hoặc ghi dữ liệu GDTX.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
