let allData = [];
let filteredData = [];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    // Detect Power BI Clear Mode
    if (document.body.classList.contains('pbi-mode')) {
        Chart.defaults.font.size = 13;
        Chart.defaults.font.weight = 'bold';
        Chart.defaults.color = '#ffffff';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
    }

    try {
        // Use the global EDUCATION_DATA from data.js
        if (typeof EDUCATION_DATA === 'undefined') {
            throw new Error('EDUCATION_DATA is not defined. Make sure data.js is loaded.');
        }
        
        allData = EDUCATION_DATA.schools.map(s => ({
            ...s,
            type: (!s.type || String(s.type).toLowerCase() === 'nan') ? 'Công lập' : s.type,
            district: (!s.district || String(s.district).toLowerCase() === 'nan') ? 'Toàn tỉnh' : s.district
        }));
        filteredData = [...allData];
        
        // Update header - rebranding to "Trung tâm Giám sát Giáo dục"
        // Note: Year display is now handled by the filter-year select
        
        initDashboard();
        setupFilters();
        setupModal();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Không thể tải dữ liệu. Vui lòng kiểm tra file data.js');
    }
});

function initDashboard() {
    updateStats();
    renderCharts();
    renderTable();
}

function updateStats() {
    const level = document.getElementById('filter-level')?.value || 'all';
    let entranceGradeKey = 'g1_students';
    let entranceLabel = 'Học sinh Lớp 1';
    
    if (level === 'THCS') {
        entranceGradeKey = 'g6_students';
        entranceLabel = 'Học sinh Lớp 6';
    } else if (level === 'THPT') {
        entranceGradeKey = 'g10_students';
        entranceLabel = 'Học sinh Lớp 10';
    } else if (level === 'all') {
        entranceLabel = 'Học sinh Đầu cấp';
    }

    const totalSchools = filteredData.length;
    const totalStudents = filteredData.reduce((sum, s) => sum + (s.students || 0), 0);
    const totalTeachers = filteredData.reduce((sum, s) => sum + (s.teachers || 0), 0);
    const standardSchools = filteredData.filter(s => s.is_standard).length;
    
    let totalEntrance = 0;
    if (level === 'all') {
        totalEntrance = filteredData.reduce((sum, s) => sum + (s.g1_students || 0) + (s.g6_students || 0) + (s.g10_students || 0), 0);
    } else {
        totalEntrance = filteredData.reduce((sum, s) => sum + (s[entranceGradeKey] || 0), 0);
    }

    const totalClasses = filteredData.reduce((sum, s) => sum + (s.classes || 0), 0);
    const avgDensity = totalClasses > 0 ? (totalStudents / totalClasses).toFixed(1) : 0;
    const totalFacilities = filteredData.reduce((sum, s) => sum + (s.total_facilities || 0), 0);
    
    document.getElementById('stat-total-schools').innerText = totalSchools.toLocaleString();
    document.getElementById('stat-total-students').innerText = totalStudents.toLocaleString();
    document.getElementById('stat-total-teachers').innerText = totalTeachers.toLocaleString();
    document.getElementById('stat-percent-standard').innerText = 
        totalSchools > 0 ? Math.round((standardSchools / totalSchools) * 100) + '%' : '0%';
    
    // Update card label and value
    const entranceCardLabel = document.querySelector('#stat-total-g1').parentElement.querySelector('p');
    if (entranceCardLabel) entranceCardLabel.innerText = entranceLabel;
    document.getElementById('stat-total-g1').innerText = totalEntrance.toLocaleString();
    
    document.getElementById('stat-total-classes').innerText = totalClasses.toLocaleString();
    document.getElementById('stat-avg-density').innerText = avgDensity;
    document.getElementById('stat-total-facilities').innerText = totalFacilities.toLocaleString();
}

function renderCharts() {
    // 1. Density Chart (Top 10)
    const topDensity = [...filteredData]
        .sort((a, b) => b.student_density - a.student_density)
        .slice(0, 10);
    
    if (charts.density) charts.density.destroy();
    charts.density = new Chart(document.getElementById('densityChart'), {
        type: 'bar',
        data: {
            labels: topDensity.map(s => s.name.replace('Trường Tiểu học ', '')),
            datasets: [{
                label: 'Học sinh / Lớp',
                data: topDensity.map(s => s.student_density),
                backgroundColor: 'rgba(79, 172, 254, 0.6)',
                borderColor: '#4facfe',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });

    // 2. Type Chart
    const types = filteredData.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
    }, {});
    
    if (charts.type) charts.type.destroy();
    charts.type = new Chart(document.getElementById('typeChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(types),
            datasets: [{
                data: Object.values(types),
                backgroundColor: ['#4facfe', '#f43f5e'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
            cutout: '70%'
        }
    });

    // 3. Facility Chart
    const total = filteredData.length || 1;
    const facilities = {
        'Tin học': filteredData.filter(s => s.it_rooms > 0).length,
        'Ngoại ngữ': filteredData.filter(s => s.lang_rooms > 0).length,
        'Nghệ thuật': filteredData.filter(s => s.art_rooms > 0).length,
        'Âm nhạc': filteredData.filter(s => s.music_rooms > 0).length,
        'Thể chất': filteredData.filter(s => s.gym_rooms > 0).length,
    };

    if (charts.facility) charts.facility.destroy();
    charts.facility = new Chart(document.getElementById('facilityChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(facilities),
            datasets: [{
                label: 'Tỷ lệ trường có phòng (%)',
                data: Object.values(facilities).map(v => Math.round((v / total) * 100)),
                backgroundColor: 'rgba(0, 242, 254, 0.4)',
                borderColor: '#00f2fe',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { display: false } }
            }
        }
    });

    // 5. Personnel Breakdown Chart
    const personnel = {
        'Lãnh đạo': filteredData.reduce((sum, s) => sum + (s.management || 0), 0),
        'Giáo viên': filteredData.reduce((sum, s) => sum + (s.teachers || 0), 0),
        'Nhân viên': filteredData.reduce((sum, s) => sum + (s.staff || 0), 0),
    };

    if (charts.personnel) charts.personnel.destroy();
    charts.personnel = new Chart(document.getElementById('personnelChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(personnel),
            datasets: [{
                data: Object.values(personnel),
                backgroundColor: ['#f43f5e', '#4facfe', '#10b981'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8' } },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            const val = item.raw;
                            const total = Object.values(personnel).reduce((a, b) => a + b, 0);
                            const perc = Math.round((val / total) * 100);
                            return `${item.label}: ${val.toLocaleString()} (${perc}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });

    // 6. Detailed Facility Chart (Total Numbers)
    const facilitySum = {
        'Phòng học': filteredData.reduce((sum, s) => sum + (s.classrooms || 0), 0),
        'Tin học': filteredData.reduce((sum, s) => sum + (s.it_rooms || 0), 0),
        'Ngoại ngữ': filteredData.reduce((sum, s) => sum + (s.lang_rooms || 0), 0),
        'Nghệ thuật': filteredData.reduce((sum, s) => sum + (s.art_rooms || 0), 0),
        'Âm nhạc': filteredData.reduce((sum, s) => sum + (s.music_rooms || 0), 0),
        'Thể chất': filteredData.reduce((sum, s) => sum + (s.gym_rooms || 0), 0),
    };

    if (charts.facilityDetail) charts.facilityDetail.destroy();
    charts.facilityDetail = new Chart(document.getElementById('facilityDetailChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(facilitySum),
            datasets: [{
                label: 'Số lượng phòng',
                data: Object.values(facilitySum),
                backgroundColor: 'rgba(0, 242, 254, 0.6)',
                borderColor: '#00f2fe',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 4. Grade Distribution Chart (1-12)
    const grades = {};
    for (let i = 1; i <= 12; i++) {
        grades[`Lớp ${i}`] = filteredData.reduce((sum, s) => sum + (s[`g${i}_students`] || 0), 0);
    }
    
    // Filter out grades with 0 students to keep it clean if only one level is selected
    const activeGrades = Object.entries(grades).filter(([_, val]) => val > 0);

    if (charts.grade) charts.grade.destroy();
    charts.grade = new Chart(document.getElementById('gradeDistributionChart'), {
        type: 'bar',
        data: {
            labels: activeGrades.map(g => g[0]),
            datasets: [{
                label: 'Tổng số học sinh',
                data: activeGrades.map(g => g[1]),
                backgroundColor: 'rgba(79, 172, 254, 0.7)',
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderTable() {
    const level = document.getElementById('filter-level')?.value || 'all';
    let entranceGradeKey = 'g1_students';
    let entranceColLabel = 'Lớp 1';
    
    if (level === 'THCS') {
        entranceGradeKey = 'g6_students';
        entranceColLabel = 'Lớp 6';
    } else if (level === 'THPT') {
        entranceGradeKey = 'g10_students';
        entranceColLabel = 'Lớp 10';
    } else if (level === 'all') {
        entranceColLabel = 'Đầu cấp';
    }

    const tbody = document.getElementById('school-table-body');
    const thead = document.querySelector('#school-table thead tr');
    
    if (thead) {
        const ths = thead.querySelectorAll('th');
        if (ths.length > 5) ths[5].innerText = entranceColLabel;
    }

    if (!tbody) return;
    tbody.innerHTML = filteredData.slice(0, 50).map(s => {
        let entranceVal = 0;
        if (level === 'all') {
            entranceVal = (s.g1_students || 0) + (s.g6_students || 0) + (s.g10_students || 0);
        } else {
            entranceVal = s[entranceGradeKey] || 0;
        }

        return `
        <tr>
            <td>
                <div class="school-name">${s.name}</div>
                <div class="school-level-badge">${s.level}</div>
            </td>
            <td><span class="badge ${s.type === 'Công lập' ? 'badge-success' : 'badge-warning'}">${s.type}</span></td>
            <td>${s.is_standard ? '✅' : '❌'}</td>
            <td>${s.classes || 0}</td>
            <td>${(s.students || 0).toLocaleString()}</td>
            <td><strong>${entranceVal.toLocaleString()}</strong></td>
            <td>${s.teacher_ratio || 0}</td>
            <td><strong>${s.student_density || 0}</strong></td>
        </tr>
    `}).join('');
}

function setupFilters() {
    const levelF = document.getElementById('filter-level');
    const typeF = document.getElementById('filter-type');
    const standardF = document.getElementById('filter-standard');
    const searchF = document.getElementById('school-search');

    const triggerFilter = () => {
        const year = yearF ? yearF.value : 'all';
        const level = levelF.value;
        const type = typeF.value;
        const standard = standardF.value;
        const search = searchF.value.toLowerCase();

        filteredData = allData.filter(s => {
            const sYear = s.school_year || EDUCATION_DATA.metadata.year;
            const matchYear = year === 'all' || sYear === year;
            const matchLevel = level === 'all' || s.level === level;
            const matchType = type === 'all' || s.type === type;
            const matchStandard = standard === 'all' || String(s.is_standard) === standard;
            const matchSearch = s.name.toLowerCase().includes(search);
            return matchYear && matchLevel && matchType && matchStandard && matchSearch;
        });

        initDashboard();
    };

    const yearF = document.getElementById('filter-year');
    if (yearF) yearF.addEventListener('change', triggerFilter);
    if (levelF) levelF.addEventListener('change', triggerFilter);
    if (typeF) typeF.addEventListener('change', triggerFilter);
    if (standardF) standardF.addEventListener('change', triggerFilter);
    if (searchF) searchF.addEventListener('input', triggerFilter);

    // Rebranding placeholders
    const ethnicF = document.getElementById('filter-ethnic');
    const genderF = document.getElementById('filter-gender');
    if (ethnicF) ethnicF.addEventListener('change', triggerFilter);
    if (genderF) genderF.addEventListener('change', triggerFilter);

    // Auto-populate years if they exist in data. If not, use the one from metadata
    if (yearF) {
        const years = [...new Set(allData.map(s => s.school_year).filter(y => y))];
        if (years.length === 0) years.push(EDUCATION_DATA.metadata.year);
        
        const currentVal = yearF.value;
        yearF.innerHTML = '<option value="all">Tất cả năm học</option>' +
            years.sort().reverse().map(y => `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}</option>`).join('');
    }
}

function setupModal() {
    const modal = document.getElementById('admin-modal');
    const btn = document.getElementById('admin-btn');
    const span = document.getElementsByClassName('close')[0];
    
    const dbTypeSelect = document.getElementById('db-type');
    const pgPassGroup = document.getElementById('db-password-group');
    const fileInput = document.getElementById('file-upload');
    const fileNameSpan = document.getElementById('file-name');
    const confirmBtn = document.getElementById('btn-confirm-import');

    if (!btn || !modal) return; // Exit if admin elements are not present

    btn.onclick = () => modal.style.display = "block";
    if (span) span.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }

    if (dbTypeSelect) {
        dbTypeSelect.onchange = (e) => {
            if (pgPassGroup) pgPassGroup.style.display = e.target.value === 'mysql' ? 'block' : 'none';
        };
    }

    if (fileInput) {
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                if (fileNameSpan) fileNameSpan.innerText = file.name;
                handleFilePreview(file);
            }
        };
    }

    if (confirmBtn) confirmBtn.onclick = () => handleImport();

    const templateBtn = document.getElementById('btn-download-template');
    if (templateBtn) templateBtn.onclick = () => handleDownloadTemplate();
}

async function handleDownloadTemplate() {
    const fileInput = document.getElementById('file-upload');
    if (!fileInput.files.length) return alert("Vui lòng chọn file trước!");

    try {
        const response = await fetch('http://localhost:5000/api/download-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: fileInput.files[0].name })
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "template_sua_loi.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert("Lỗi khi tải template: " + error);
    }
}

async function handleFilePreview(file) {
    const previewDiv = document.getElementById('mapping-preview');
    const mappingBody = document.getElementById('mapping-body');
    const statusDiv = document.getElementById('import-status');
    const levelBadge = document.getElementById('preview-level');
    const selectedLevel = document.getElementById('import-level').value;

    statusDiv.style.display = 'none';
    
    try {
        const response = await fetch('http://localhost:5000/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filename: file.name,
                level: selectedLevel 
            })
        });
        
        const result = await response.json();
        if (result.error) {
            alert("Lỗi: " + result.error);
            return;
        }

        levelBadge.innerText = result.level;
        previewDiv.style.display = 'block';
        mappingBody.innerHTML = result.mapping.map(m => `
            <tr>
                <td style="padding: 0.5rem;">${m.column}</td>
                <td style="text-align: center; padding: 0.5rem;" class="${m.status === 'OK' ? 'status-ok' : 'status-missing'}">
                    ${m.status === 'OK' ? '✅ Khớp' : '❌ Thiếu'}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error("Preview error:", error);
        alert("Không thể kết nối tới server API. Đảm bảo api_server.py đang chạy.");
    }
}

async function handleImport() {
    const fileInput = document.getElementById('file-upload');
    const year = document.getElementById('import-year').value;
    const level = document.getElementById('import-level').value;
    const dbType = document.getElementById('db-type').value;
    const password = document.getElementById('db-password').value;
    const statusDiv = document.getElementById('import-status');
    
    if (!fileInput.files.length) return alert("Vui lòng chọn file!");

    statusDiv.className = '';
    statusDiv.style.display = 'block';
    statusDiv.innerText = "⏳ Đang xử lý dữ liệu (" + level + ")...";

    try {
        const response = await fetch('http://localhost:5000/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filename: fileInput.files[0].name,
                year: year,
                level: level,
                db_type: dbType,
                password: password
            })
        });
        
        const result = await response.json();
        if (result.success) {
            statusDiv.className = 'success';
            statusDiv.innerHTML = `✅ Thành công! Đã nhập <strong>${result.count}</strong> trường vào hệ thống.<br>Vui lòng F5 để cập nhật Dashbroad.`;
        } else {
            statusDiv.className = 'error';
            statusDiv.innerText = "❌ Lỗi: " + result.error;
        }
    } catch (error) {
        statusDiv.className = 'error';
        statusDiv.innerText = "❌ Lỗi kết nối server API.";
    }
}
