-- MySQL Schema with antigravity_ prefix

CREATE TABLE IF NOT EXISTS antigravity_schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50), -- Công lập, Tư thục
    level VARCHAR(50), -- Tiểu học, THCS, THPT
    district VARCHAR(100) DEFAULT 'Chưa rõ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS antigravity_school_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT,
    school_year VARCHAR(20) NOT NULL,
    total_classes INT DEFAULT 0,
    total_students INT DEFAULT 0,
    total_personnel INT DEFAULT 0,
    total_management INT DEFAULT 0,
    total_staff INT DEFAULT 0,
    total_teachers INT DEFAULT 0,
    is_standard BOOLEAN DEFAULT FALSE,
    student_density FLOAT DEFAULT 0,
    teacher_ratio FLOAT DEFAULT 0,
    -- Grade 1-12
    g1_classes INT DEFAULT 0, g1_students INT DEFAULT 0,
    g2_classes INT DEFAULT 0, g2_students INT DEFAULT 0,
    g3_classes INT DEFAULT 0, g3_students INT DEFAULT 0,
    g4_classes INT DEFAULT 0, g4_students INT DEFAULT 0,
    g5_classes INT DEFAULT 0, g5_students INT DEFAULT 0,
    g6_classes INT DEFAULT 0, g6_students INT DEFAULT 0,
    g7_classes INT DEFAULT 0, g7_students INT DEFAULT 0,
    g8_classes INT DEFAULT 0, g8_students INT DEFAULT 0,
    g9_classes INT DEFAULT 0, g9_students INT DEFAULT 0,
    g10_classes INT DEFAULT 0, g10_students INT DEFAULT 0,
    g11_classes INT DEFAULT 0, g11_students INT DEFAULT 0,
    g12_classes INT DEFAULT 0, g12_students INT DEFAULT 0,
    UNIQUE KEY school_year_idx (school_id, school_year),
    FOREIGN KEY (school_id) REFERENCES antigravity_schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS antigravity_school_facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT,
    school_year VARCHAR(20) NOT NULL,
    total_facilities INT DEFAULT 0,
    classrooms INT DEFAULT 0,
    it_rooms INT DEFAULT 0,
    lang_rooms INT DEFAULT 0,
    art_rooms INT DEFAULT 0,
    music_rooms INT DEFAULT 0,
    gym_rooms INT DEFAULT 0,
    bio_chem_phys_rooms INT DEFAULT 0,
    tech_rooms INT DEFAULT 0,
    UNIQUE KEY school_year_idx (school_id, school_year),
    FOREIGN KEY (school_id) REFERENCES antigravity_schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- GDTX (Continuing Education) stats
CREATE TABLE IF NOT EXISTS antigravity_gdtx_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    sub_category VARCHAR(255),
    unit VARCHAR(50),
    value DOUBLE,
    school_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Khuyet Tat (Special Education) stats
CREATE TABLE IF NOT EXISTS antigravity_khuyettat_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    sub_category VARCHAR(255),
    unit VARCHAR(50),
    value DOUBLE,
    school_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
