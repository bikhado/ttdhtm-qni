/**
 * Trung tâm Giám sát Giáo dục - MySQL Dynamic logic
 */

let allData = [];
let filteredData = [];
const charts = {};
let currentPage = 1;
const rowsPerPage = 20;

document.addEventListener('DOMContentLoaded', async () => {
    // Detect Power BI Clear Mode
    if (document.body.classList.contains('pbi-mode')) {
        Chart.defaults.font.size = 13;
        Chart.defaults.font.weight = 'bold';
        Chart.defaults.color = '#ffffff';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
    }

    try {
        setupTabs();
        await loadDataFromAPI();
        initDashboard();
        setupFilters();
        setupModal();
        setupPagination();
        
        // Initial GDTX load if on that tab or for cache
        await loadGdtxData();
    } catch (error) {
        console.error('Initial load failed:', error);
        alert('Không thể kết nối tới server API hoặc database.');
    }
});

async function loadDataFromAPI() {
    const response = await fetch('http://localhost:5000/api/data?db_type=mysql');
    const result = await response.json();

    if (result.error) throw new Error(result.error);

    allData = result.schools;

    // Default to latest year
    const years = [...new Set(allData.map(s => s.school_year).filter(y => y))].sort().reverse();
    if (years.length > 0) {
        const latestYear = years[0];
        const yearF = document.getElementById('filter-year');
        if (yearF) yearF.value = latestYear;
        filteredData = allData.filter(s => s.school_year === latestYear);
    } else {
        filteredData = [...allData];
    }
}
function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'gdtx-view') {
                loadGdtxData();
            } else {
                initDashboard();
            }
        });
    });
}

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

    // Additional stats
    let totalEntrance = 0;
    if (level === 'all') {
        totalEntrance = filteredData.reduce((sum, s) => sum + (s.g1_students || 0) + (s.g6_students || 0) + (s.g10_students || 0), 0);
    } else {
        totalEntrance = filteredData.reduce((sum, s) => sum + (s[entranceGradeKey] || 0), 0);
    }
    
    const totalClasses = filteredData.reduce((sum, s) => sum + (s.classes || 0), 0);
    const avgDensity = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;
    const totalFacilities = filteredData.reduce((sum, s) => sum + (s.total_facilities || 0), 0);

    setText('stat-total-schools', totalSchools.toLocaleString());
    setText('stat-total-students', totalStudents.toLocaleString());
    setText('stat-total-teachers', totalTeachers.toLocaleString());
    setText('stat-percent-standard', totalSchools > 0 ? Math.round((standardSchools / totalSchools) * 100) + '%' : '0%');
    
    // Update card label and value
    const entranceCardLabel = document.querySelector('#stat-total-g1').parentElement.querySelector('p');
    if (entranceCardLabel) entranceCardLabel.innerText = entranceLabel;
    setText('stat-total-g1', totalEntrance.toLocaleString());
    
    setText('stat-total-classes', totalClasses.toLocaleString());
    setText('stat-avg-density', avgDensity);
    setText('stat-total-facilities', totalFacilities.toLocaleString());
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function renderCharts() {
    renderGradeChart();
    renderPersonnelChart();
    renderTypeChart();
    renderFacilityDetailChart();
    renderDensityChart();
    renderFacilityChart();
}

function renderGradeChart() {
    const grades = {};
    for (let i = 1; i <= 12; i++) {
        grades[`Lớp ${i}`] = filteredData.reduce((sum, s) => sum + (s[`g${i}_students`] || 0), 0);
    }
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

function renderPersonnelChart() {
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
}

function renderFacilityDetailChart() {
    const facilitySum = {
        'Phòng học': filteredData.reduce((sum, s) => sum + (s.classrooms || 0), 0),
        'Tin học': filteredData.reduce((sum, s) => sum + (s.it_rooms || 0), 0),
        'Ngoại ngữ': filteredData.reduce((sum, s) => sum + (s.lang_rooms || 0), 0),
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
}

function renderDensityChart() {
    const top10 = [...filteredData]
        .sort((a, b) => (b.student_density || 0) - (a.student_density || 0))
        .slice(0, 10);

    if (charts.density) charts.density.destroy();
    charts.density = new Chart(document.getElementById('densityChart'), {
        type: 'bar',
        data: {
            labels: top10.map(s => s.name.substring(0, 20) + '...'),
            datasets: [{
                label: 'HS/Lớp',
                data: top10.map(s => s.student_density),
                backgroundColor: 'rgba(244, 63, 94, 0.6)',
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

function renderTypeChart() {
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
}

function renderFacilityChart() {
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
    
    // Update header label
    if (thead) {
        const ths = thead.querySelectorAll('th');
        if (ths.length > 5) ths[5].innerText = entranceColLabel;
    }

    if (!tbody) return;

    // Sort: Primary -> THCS -> THPT, then by name
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
    const yearF = document.getElementById('filter-year');
    const levelF = document.getElementById('filter-level');
    const typeF = document.getElementById('filter-type');
    const standardF = document.getElementById('filter-standard');
    const searchF = document.getElementById('school-search');

    const triggerFilter = () => {
        const year = yearF.value;
        const level = levelF.value;
        const type = typeF.value;
        const standard = standardF.value;
        const search = searchF.value.toLowerCase();

        filteredData = allData.filter(s => {
            const matchYear = year === 'all' || s.school_year === year;
            const matchLevel = level === 'all' || s.level === level;
            const matchType = type === 'all' || s.type === type;
            const matchStandard = standard === 'all' || String(s.is_standard) === standard;
            const matchSearch = s.name.toLowerCase().includes(search);
            return matchYear && matchLevel && matchType && matchStandard && matchSearch;
        });

        currentPage = 1;
        initDashboard();
    };

    if (yearF) yearF.onchange = triggerFilter;
    if (levelF) levelF.onchange = triggerFilter;
    if (typeF) typeF.onchange = triggerFilter;
    if (standardF) standardF.onchange = triggerFilter;
    if (searchF) searchF.oninput = triggerFilter;

    // Dynamically populate year filter if possible
    updateYearDropdown(yearF);
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

function updateYearDropdown(yearF) {
    if (!yearF) return;
    const years = [...new Set(allData.map(s => s.school_year).filter(y => y))].sort().reverse();
    if (years.length > 0) {
        const currentVal = yearF.value;
        yearF.innerHTML = '<option value="all">Tất cả năm học</option>' +
            years.map(y => `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}</option>`).join('');
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

    if (!btn || !modal) return;

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
    if (!fileInput || !fileInput.files.length) return alert("Vui lòng chọn file trước!");

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
        document.body.removeChild(a);
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
    const selectedLevel = document.getElementById('import-level')?.value;

    if (statusDiv) statusDiv.style.display = 'none';
    
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

        if (levelBadge) levelBadge.innerText = result.level;
        if (previewDiv) previewDiv.style.display = 'block';
        if (mappingBody) {
            mappingBody.innerHTML = result.mapping.map(m => `
                <tr>
                    <td style="padding: 0.5rem;">${m.column}</td>
                    <td style="text-align: center; padding: 0.5rem;" class="${m.status === 'OK' ? 'status-ok' : 'status-missing'}">
                        ${m.status === 'OK' ? '✅ Khớp' : '❌ Thiếu'}
                    </td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error("Preview error:", error);
        alert("Không thể kết nối tới server API. Đảm bảo api_server.py đang chạy.");
    }
}

async function handleImport() {
    const fileInput = document.getElementById('file-upload');
    const year = document.getElementById('import-year')?.value;
    const level = document.getElementById('import-level')?.value;
    const dbType = document.getElementById('db-type')?.value;
    const password = document.getElementById('db-password')?.value;
    const statusDiv = document.getElementById('import-status');
    
    if (!fileInput || !fileInput.files.length) return alert("Vui lòng chọn file!");

    if (statusDiv) {
        statusDiv.className = '';
        statusDiv.style.display = 'block';
        statusDiv.innerText = "⏳ Đang xử lý dữ liệu (" + level + ")...";
    }

    try {
        const endpoint = level === 'GDTX' ? 'http://localhost:5000/api/import-gdtx' : 'http://localhost:5000/api/import';
        const response = await fetch(endpoint, {
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
            if (statusDiv) {
                statusDiv.className = 'success';
                let msg = `✅ Thành công! Đã nhập dữ liệu vào hệ thống.<br>Vui lòng F5 để cập nhật Dashbroad.`;
                if (result.count) msg = `✅ Thành công! Đã nhập <strong>${result.count}</strong> trường vào hệ thống.<br>Vui lòng F5 để cập nhật Dashbroad.`;
                statusDiv.innerHTML = msg;
            }
        } else {
            if (statusDiv) {
                statusDiv.className = 'error';
                statusDiv.innerText = "❌ Lỗi: " + result.error;
            }
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.className = 'error';
            statusDiv.innerText = "❌ Lỗi kết nối server API.";
        }
    }
}
// --- GDTX Logic (MySQL) ---
let gdtxData = [];

async function loadGdtxData() {
    try {
        const year = document.getElementById('filter-year-gdtx')?.value || '2024-2025';
        const response = await fetch(`http://localhost:5000/api/gdtx?db_type=mysql&year=${year}`);
        gdtxData = await response.json();
        
        if (gdtxData.error) throw new Error(gdtxData.error);
        
        renderGdtxStats();
        renderGdtxCharts();
        renderGdtxTable();
    } catch (err) {
        console.error("GDTX Load Error:", err);
    }
}

function renderGdtxStats() {
    const container = document.getElementById('gdtx-stats-cards');
    if (!container) return;
    const getVal = (sub) => gdtxData.find(d => d.sub_category === sub)?.value || 0;

    const stats = [
        { icon: '🏛️', label: 'Tổng số trung tâm', val: getVal('Tổng số').toLocaleString() },
        { icon: '👨‍🎓', label: 'Tổng số học viên', val: getVal('Tổng số').toLocaleString() },
        { icon: '👩‍🏫', label: 'Tổng số nhân sự', val: getVal('Tổng số').toLocaleString() },
        { icon: '💰', label: 'Tổng ngân sách (Tr.đ)', val: getVal('Tổng chi').toLocaleString() }
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
    const getVal = (sub) => gdtxData.find(d => d.sub_category === sub)?.value || 0;

    // Grade Chart
    if (charts.gdtxGrade) charts.gdtxGrade.destroy();
    charts.gdtxGrade = new Chart(document.getElementById('gdtxGradeChart'), {
        type: 'bar',
        data: {
            labels: ['Lớp 10', 'Lớp 11', 'Lớp 12'],
            datasets: [{
                label: 'Học viên',
                data: [getVal('Lớp 10'), getVal('Lớp 11'), getVal('Lớp 12')],
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

    // Personnel
    if (charts.gdtxStaff) charts.gdtxStaff.destroy();
    charts.gdtxStaff = new Chart(document.getElementById('gdtxPersonnelChart'), {
        type: 'doughnut',
        data: {
            labels: ['Quản lý', 'Giáo viên', 'Nhân viên'],
            datasets: [{
                data: [getVal('Cán bộ quản lý'), getVal('Giáo viên'), getVal('Nhân viên')],
                backgroundColor: ['#f43f5e', '#4facfe', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Budget
    if (charts.gdtxBudget) charts.gdtxBudget.destroy();
    charts.gdtxBudget = new Chart(document.getElementById('gdtxBudgetChart'), {
        type: 'pie',
        data: {
            labels: ['Thanh toán cá nhân', 'Chi thường xuyên'],
            datasets: [{
                data: [getVal('Chi thanh toán cá nhân'), getVal('Chi thường xuyên')],
                backgroundColor: ['#fbbf24', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: { responsive: true }
    });
}

function renderGdtxTable() {
    const tbody = document.querySelector('#gdtx-table tbody');
    if (!tbody) return;
    tbody.innerHTML = gdtxData.map(d => `
        <tr>
            <td><strong>${d.category}</strong></td>
            <td>${d.sub_category}</td>
            <td>${d.unit}</td>
            <td><strong>${d.value.toLocaleString()}</strong></td>
        </tr>
    `).join('');
}
