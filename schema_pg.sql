-- PostgreSQL Schema with antigravity_ prefix

CREATE TABLE IF NOT EXISTS antigravity_schools (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT, -- Công lập, Tư thục
    level TEXT, -- Tiểu học, THCS, THPT
    district TEXT DEFAULT 'Chưa rõ'
);

CREATE TABLE IF NOT EXISTS antigravity_school_stats (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES antigravity_schools(id),
    school_year TEXT NOT NULL,
    total_classes INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    total_personnel INTEGER DEFAULT 0,
    total_management INTEGER DEFAULT 0,
    total_staff INTEGER DEFAULT 0,
    total_teachers INTEGER DEFAULT 0,
    is_standard BOOLEAN DEFAULT FALSE,
    student_density REAL DEFAULT 0,
    teacher_ratio REAL DEFAULT 0,
    -- Grade 1-12
    g1_classes INTEGER DEFAULT 0, g1_students INTEGER DEFAULT 0,
    g2_classes INTEGER DEFAULT 0, g2_students INTEGER DEFAULT 0,
    g3_classes INTEGER DEFAULT 0, g3_students INTEGER DEFAULT 0,
    g4_classes INTEGER DEFAULT 0, g4_students INTEGER DEFAULT 0,
    g5_classes INTEGER DEFAULT 0, g5_students INTEGER DEFAULT 0,
    g6_classes INTEGER DEFAULT 0, g6_students INTEGER DEFAULT 0,
    g7_classes INTEGER DEFAULT 0, g7_students INTEGER DEFAULT 0,
    g8_classes INTEGER DEFAULT 0, g8_students INTEGER DEFAULT 0,
    g9_classes INTEGER DEFAULT 0, g9_students INTEGER DEFAULT 0,
    g10_classes INTEGER DEFAULT 0, g10_students INTEGER DEFAULT 0,
    g11_classes INTEGER DEFAULT 0, g11_students INTEGER DEFAULT 0,
    g12_classes INTEGER DEFAULT 0, g12_students INTEGER DEFAULT 0,
    UNIQUE(school_id, school_year)
);

CREATE TABLE IF NOT EXISTS antigravity_school_facilities (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES antigravity_schools(id),
    school_year TEXT NOT NULL,
    total_facilities INTEGER DEFAULT 0,
    classrooms INTEGER DEFAULT 0,
    it_rooms INTEGER DEFAULT 0,
    lang_rooms INTEGER DEFAULT 0,
    art_rooms INTEGER DEFAULT 0,
    music_rooms INTEGER DEFAULT 0,
    gym_rooms INTEGER DEFAULT 0,
    bio_chem_phys_rooms INTEGER DEFAULT 0,
    tech_rooms INTEGER DEFAULT 0,
    UNIQUE(school_id, school_year)
);
