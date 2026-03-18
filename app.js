let allData = [];
let filteredData = [];
let charts = {};
let currentPage = 1;
const rowsPerPage = 20;

document.addEventListener('DOMContentLoaded', () => {
    // Detect Power BI Clear Mode
    if (document.body.classList.contains('pbi-mode')) {
        Chart.defaults.font.size = 13;
        Chart.defaults.font.weight = 'bold';
        Chart.defaults.color = '#ffffff';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
    }

    try {
        // Tab switching logic
        setupTabs();

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
        
        initDashboard();
        setupFilters();
        setupModal();
        setupPagination();
        
        // Initialize auxiliary dashboards if data exists
        if (EDUCATION_DATA.gdtx) {
            initGdtxDashboard();
        }
        if (EDUCATION_DATA.khuyettat) {
            initKhuyetTatDashboard();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Không thể tải dữ liệu. Vui lòng kiểm tra file data.js');
    }
});

function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            
            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update content visibility
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            // Refresh charts if needed
            if (tabId === 'gdtx-view') {
                initGdtxDashboard();
            } else if (tabId === 'khuyettat-view') {
                initKhuyetTatDashboard();
            } else {
                initDashboard();
            }
        });
    });
}

// Set global Chart.js defaults for consistency
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.labels.color = '#94a3b8';
Chart.defaults.plugins.legend.position = 'bottom';
Chart.defaults.color = '#94a3b8';

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
            labels: topDensity.map(s => s.name.substring(0, 20) + '...'),
            datasets: [{
                label: 'HS/Lớp',
                data: topDensity.map(s => s.student_density),
                backgroundColor: 'rgba(244, 63, 94, 0.6)',
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
                borderWidth: 0
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
                label: '% Trường có',
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
            scales: { x: { max: 100 } }
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
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
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
                data: Object.values(facilitySum),
                backgroundColor: 'rgba(0, 242, 254, 0.6)',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
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
                label: 'Học sinh',
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
    
    // Sort logic: Primary group, then THCS, then THPT
    const sortedData = [...filteredData].sort((a, b) => {
        if (a.level !== b.level) {
            const levelOrder = { 'Tiểu học': 1, 'THCS': 2, 'THPT': 3 };
            return (levelOrder[a.level] || 9) - (levelOrder[b.level] || 9);
        }
        return a.name.localeCompare(b.name);
    });

    const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = sortedData.slice(start, end);

    tbody.innerHTML = pageData.map(s => {
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

    updatePaginationUI(totalPages);
}

function updatePaginationUI(totalPages) {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageDisplay = document.getElementById('current-page-display');
    const totalDisplay = document.getElementById('total-pages-display');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (pageDisplay) pageDisplay.innerText = currentPage;
    if (totalDisplay) totalDisplay.innerText = totalPages;
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

        currentPage = 1;
        initDashboard();
    };

    const yearF = document.getElementById('filter-year');
    if (yearF) yearF.addEventListener('change', triggerFilter);
    if (levelF) levelF.addEventListener('change', triggerFilter);
    if (typeF) typeF.addEventListener('change', triggerFilter);
    if (standardF) standardF.addEventListener('change', triggerFilter);
    if (searchF) searchF.addEventListener('input', triggerFilter);

    // Auto-populate years if they exist in data. If not, use the one from metadata
    if (yearF) {
        const years = [...new Set(allData.map(s => s.school_year).filter(y => y))];
        if (years.length === 0) years.push(EDUCATION_DATA.metadata.year);
        
        const currentVal = yearF.value;
        yearF.innerHTML = '<option value="all">Tất cả năm học</option>' +
            years.sort().reverse().map(y => `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}</option>`).join('');
    }
}

function setupPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
                document.querySelector('.table-section').scrollIntoView({ behavior: 'smooth' });
            }
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            const totalPages = Math.ceil(filteredData.length / rowsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
                document.querySelector('.table-section').scrollIntoView({ behavior: 'smooth' });
            }
        };
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
// --- GDTX Dashboard Logic ---
function initGdtxDashboard() {
    if (!EDUCATION_DATA.gdtx) return;
    renderGdtxStats();
    renderGdtxCharts();
    renderGdtxTable();
}

function renderGdtxStats() {
    const year = document.getElementById('filter-year-gdtx')?.value || 'all';
    const gdtx = EDUCATION_DATA.gdtx.filter(d => year === 'all' || d.school_year === year || !d.school_year);
    const container = document.getElementById('gdtx-stats-cards');
    if (!container) return;

    // Helper to find metric
    const getMetric = (cat, sub) => {
        const found = gdtx.find(d => 
            String(d.category).trim().toLowerCase() === cat.trim().toLowerCase() && 
            String(d.sub_category).trim().toLowerCase() === sub.trim().toLowerCase()
        );
        return found ? found.value : 0;
    };

    const stats = [
        { icon: '🏛️', label: 'Tổng số trung tâm', val: getMetric('Trung tâm GDTX', 'Tổng số').toLocaleString() },
        { icon: '👨‍🎓', label: 'Tổng số học viên', val: getMetric('Học viên', 'Tổng số').toLocaleString() },
        { icon: '👩‍🏫', label: 'Tổng số nhân sự', val: getMetric('Nhân sự', 'Tổng số').toLocaleString() },
        { icon: '💰', label: 'Tổng ngân sách (Tr.đ)', val: getMetric('Ngân sách', 'Tổng chi').toLocaleString() }
    ];

    container.innerHTML = stats.map(s => `
        <div class="stat-card">
            <div class="icon">${s.icon}</div>
            <div class="info">
                <h3>${s.val}</h3>
                <p>${s.label}</p>
            </div>
        </div>
    `).join('');
}

function renderGdtxCharts() {
    const year = document.getElementById('filter-year-gdtx')?.value || 'all';
    const gdtx = EDUCATION_DATA.gdtx.filter(d => year === 'all' || d.school_year === year || !d.school_year);
    
    const getMetric = (cat, sub) => gdtx.find(d => 
        String(d.category).trim() === cat && 
        String(d.sub_category).trim() === sub
    )?.value || 0;

    const getVal = (sub) => gdtx.find(d => String(d.sub_category).trim() === sub)?.value || 0;

    // 1. Grade Chart
    const gradeData = {
        'Lớp 10': getMetric('Học viên', 'Lớp 10'),
        'Lớp 11': getMetric('Học viên', 'Lớp 11'),
        'Lớp 12': getMetric('Học viên', 'Lớp 12')
    };

    if (charts.gdtxGrade) charts.gdtxGrade.destroy();
    charts.gdtxGrade = new Chart(document.getElementById('gdtxGradeChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(gradeData),
            datasets: [{
                label: 'Học viên',
                data: Object.values(gradeData),
                backgroundColor: 'rgba(79, 172, 254, 0.7)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    // 2. Personnel Chart
    const staffData = {
        'Quản lý': getMetric('Nhân sự', 'Cán bộ quản lý'),
        'Giáo viên': getMetric('Nhân sự', 'Giáo viên'),
        'Nhân viên': getMetric('Nhân sự', 'Nhân viên')
    };

    if (charts.gdtxStaff) charts.gdtxStaff.destroy();
    charts.gdtxStaff = new Chart(document.getElementById('gdtxPersonnelChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(staffData),
            datasets: [{
                data: Object.values(staffData),
                backgroundColor: ['#f43f5e', '#4facfe', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 3. Budget Chart
    const budgetData = {
        'Chi thường xuyên': getMetric('Ngân sách', 'Chi thường xuyên'),
        'Chi thanh toán cá nhân': getMetric('Ngân sách', 'Chi thanh toán cá nhân')
    };

    if (charts.gdtxBudget) charts.gdtxBudget.destroy();
    charts.gdtxBudget = new Chart(document.getElementById('gdtxBudgetChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(budgetData),
            datasets: [{
                data: Object.values(budgetData),
                backgroundColor: ['#4facfe', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderGdtxTable() {
    const year = document.getElementById('filter-year-gdtx')?.value || 'all';
    const gdtx = EDUCATION_DATA.gdtx.filter(d => year === 'all' || d.school_year === year || !d.school_year);
    const tbody = document.querySelector('#gdtx-table tbody');
    if (!tbody) return;

    tbody.innerHTML = gdtx.map(d => `
        <tr>
            <td><strong>${d.category}</strong></td>
            <td>${d.sub_category}</td>
            <td>${d.unit}</td>
            <td><strong>${d.value.toLocaleString()}</strong></td>
        </tr>
    `).join('');
}

// --- Khuyet Tat Logic ---
function initKhuyetTatDashboard() {
    if (!EDUCATION_DATA.khuyettat) return;
    renderKhuyetTatStats();
    renderKhuyetTatCharts();
    renderKhuyetTatTable();
}

function renderKhuyetTatStats() {
    const year = document.getElementById('filter-year-khuyettat')?.value || 'all';
    const kt = EDUCATION_DATA.khuyettat.filter(d => year === 'all' || d.school_year === year || !d.school_year);
    const container = document.getElementById('khuyettat-stats-cards');
    if (!container) return;

    const getMetric = (cat, sub) => kt.find(d => 
        String(d.category).trim() === cat && 
        String(d.sub_category).trim() === sub
    )?.value || 0;

    const stats = [
        { icon: '🏫', label: 'Cơ sở Công lập', val: getMetric('Cơ sở', 'Công lập').toLocaleString() },
        { icon: '🏫', label: 'Cơ sở Ngoài công lập', val: getMetric('Cơ sở', 'Ngoài công lập').toLocaleString() },
        { icon: '👨‍🎓', label: 'HS Chuyên biệt', val: getMetric('Học sinh', 'Chuyên biệt').toLocaleString() },
        { icon: '🤝', label: 'HS Hòa nhập', val: getMetric('Học viên Hòa nhập', 'Tổng số') || getMetric('Học sinh', 'Hòa nhập') }
    ];
    // Fallback for Hoa nhap if labels differ
    if (stats[3].val === 0) stats[3].val = (kt.find(d => d.sub_category === 'Hòa nhập')?.value || 0);

    container.innerHTML = stats.map(s => `
        <div class="stat-card">
            <div class="icon">${s.icon}</div>
            <div class="info">
                <h3>${typeof s.val === 'number' ? s.val.toLocaleString() : s.val}</h3>
                <p>${s.label}</p>
            </div>
        </div>
    `).join('');
}

function renderKhuyetTatCharts() {
    const year = document.getElementById('filter-year-khuyettat')?.value || 'all';
    const kt = EDUCATION_DATA.khuyettat.filter(d => year === 'all' || d.school_year === year || !d.school_year);
    
    const getMetric = (cat, sub) => kt.find(d => 
        String(d.category).trim() === cat && 
        String(d.sub_category).trim() === sub
    )?.value || 0;

    const getVal = (sub) => kt.find(d => String(d.sub_category).trim() === sub)?.value || 0;

    // Disability Type Chart
    if (charts.ktType) charts.ktType.destroy();
    charts.ktType = new Chart(document.getElementById('khuyettatTypeChart'), {
        type: 'bar',
        data: {
            labels: ['Vận động', 'Nghe, nói', 'Nhìn', 'Thần kinh', 'Trí tuệ', 'Khác'],
            datasets: [{
                label: 'Số lượng',
                data: [
                    getMetric('Dạng tật', 'Vận động'), 
                    getMetric('Dạng tật', 'Nghe, nói'), 
                    getMetric('Dạng tật', 'Nhìn'), 
                    getMetric('Dạng tật', 'Thần kinh, tâm thần'), 
                    getMetric('Dạng tật', 'Trí tuệ'), 
                    getMetric('Dạng tật', 'Khác')
                ],
                backgroundColor: 'rgba(244, 63, 94, 0.7)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y'
        }
    });

    // Student Status Chart
    if (charts.ktStudent) charts.ktStudent.destroy();
    charts.ktStudent = new Chart(document.getElementById('khuyettatStudentChart'), {
        type: 'pie',
        data: {
            labels: ['Chuyên biệt', 'Hòa nhập'],
            datasets: [{
                data: [getVal('Chuyên biệt'), getVal('Hòa nhập')],
                backgroundColor: ['#4facfe', '#10b981'],
                borderWidth: 0
            }]
        },
        options: { responsive: true }
    });

    // Staff Chart
    if (charts.ktStaff) charts.ktStaff.destroy();
    charts.ktStaff = new Chart(document.getElementById('khuyettatStaffChart'), {
        type: 'doughnut',
        data: {
            labels: ['Quản lý', 'Giáo viên', 'Nhân viên'],
            datasets: [{
                data: [getVal('Quản lý'), getVal('Giáo viên'), getVal('Nhân viên')],
                backgroundColor: ['#f43f5e', '#4facfe', '#fbbf24'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderKhuyetTatTable() {
    const year = document.getElementById('filter-year-khuyettat')?.value || 'all';
    const kt = EDUCATION_DATA.khuyettat.filter(d => year === 'all' || d.school_year === year || !d.school_year);
    const tbody = document.querySelector('#khuyettat-table tbody');
    if (!tbody) return;

    tbody.innerHTML = kt.map(d => `
        <tr>
            <td><strong>${d.category}</strong></td>
            <td>${d.sub_category}</td>
            <td>${d.unit}</td>
            <td><strong>${d.value.toLocaleString()}</strong></td>
        </tr>
    `).join('');
}
