-- Database Schema for Educational IOC

-- Table: schools
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT, -- Công lập, Tư thục
    level TEXT, -- Tiểu học, THCS, THPT
    district TEXT DEFAULT 'Chưa rõ'
);

-- Table: school_stats
CREATE TABLE IF NOT EXISTS school_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    school_year TEXT NOT NULL, -- Format: YYYY-YYYY (e.g., 2024-2025)
    total_classes INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    total_personnel INTEGER DEFAULT 0,
    total_management INTEGER DEFAULT 0, -- Hiệu trưởng/Hiệu phó
    total_staff INTEGER DEFAULT 0, -- Nhân viên
    total_teachers INTEGER DEFAULT 0,
    is_standard BOOLEAN DEFAULT 0,
    student_density REAL,
    teacher_ratio REAL,
    g1_classes INTEGER DEFAULT 0,
    g1_students INTEGER DEFAULT 0,
    g2_classes INTEGER DEFAULT 0,
    g2_students INTEGER DEFAULT 0,
    g3_classes INTEGER DEFAULT 0,
    g3_students INTEGER DEFAULT 0,
    g4_classes INTEGER DEFAULT 0,
    g4_students INTEGER DEFAULT 0,
    g5_classes INTEGER DEFAULT 0,
    g5_students INTEGER DEFAULT 0,
    g6_classes INTEGER DEFAULT 0,
    g6_students INTEGER DEFAULT 0,
    g7_classes INTEGER DEFAULT 0,
    g7_students INTEGER DEFAULT 0,
    g8_classes INTEGER DEFAULT 0,
    g8_students INTEGER DEFAULT 0,
    g9_classes INTEGER DEFAULT 0,
    g9_students INTEGER DEFAULT 0,
    g10_classes INTEGER DEFAULT 0,
    g10_students INTEGER DEFAULT 0,
    g11_classes INTEGER DEFAULT 0,
    g11_students INTEGER DEFAULT 0,
    g12_classes INTEGER DEFAULT 0,
    g12_students INTEGER DEFAULT 0,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE(school_id, school_year)
);

-- Table: school_facilities
CREATE TABLE IF NOT EXISTS school_facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    school_year TEXT NOT NULL,
    total_facilities INTEGER DEFAULT 0,
    classrooms INTEGER DEFAULT 0,
    it_rooms INTEGER DEFAULT 0,
    lang_rooms INTEGER DEFAULT 0,
    art_rooms INTEGER DEFAULT 0,
    music_rooms INTEGER DEFAULT 0,
    gym_rooms INTEGER DEFAULT 0,
    bio_chem_phys_rooms INTEGER DEFAULT 0, -- Phòng lý hóa sinh
    tech_rooms INTEGER DEFAULT 0, -- Phòng công nghệ
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE(school_id, school_year)
);

-- GDTX (Continuing Education) stats
CREATE TABLE IF NOT EXISTS gdtx_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    sub_category TEXT,
    unit TEXT,
    value REAL,
    school_year TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
