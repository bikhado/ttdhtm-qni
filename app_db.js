/**
 * Trung tâm Giám sát Giáo dục - MySQL Dynamic logic
 */

let allData = [];
let filteredData = [];
const charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Detect Power BI Clear Mode
    if (document.body.classList.contains('pbi-mode')) {
        Chart.defaults.font.size = 13;
        Chart.defaults.font.weight = 'bold';
        Chart.defaults.color = '#ffffff';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
    }

    try {
        await loadDataFromAPI();
        initDashboard();
        setupFilters();
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

function initDashboard() {
    updateStats();
    renderCharts();
    renderTable();
}

function updateStats() {
    const totalSchools = filteredData.length;
    const totalStudents = filteredData.reduce((sum, s) => sum + (s.students || 0), 0);
    const totalTeachers = filteredData.reduce((sum, s) => sum + (s.teachers || 0), 0);
    const standardSchools = filteredData.filter(s => s.is_standard).length;

    // Additional stats
    const totalG1 = filteredData.reduce((sum, s) => sum + (s.g1_students || 0), 0);
    const totalClasses = filteredData.reduce((sum, s) => sum + (s.classes || 0), 0);
    const avgDensity = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;
    const totalFacilities = filteredData.reduce((sum, s) => sum + (s.total_facilities || 0), 0);

    setText('stat-total-schools', totalSchools.toLocaleString());
    setText('stat-total-students', totalStudents.toLocaleString());
    setText('stat-total-teachers', totalTeachers.toLocaleString());
    setText('stat-percent-standard', totalSchools > 0 ? Math.round((standardSchools / totalSchools) * 100) + '%' : '0%');
    setText('stat-total-g1', totalG1.toLocaleString());
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
    const tbody = document.getElementById('school-table-body');
    tbody.innerHTML = filteredData.slice(0, 50).map(s => `
        <tr>
            <td>
                <div class="school-name">${s.name}</div>
                <div class="school-level-badge">${s.level}</div>
            </td>
            <td><span class="badge ${s.type === 'Công lập' ? 'badge-success' : 'badge-warning'}">${s.type}</span></td>
            <td>${s.is_standard ? '✅' : '❌'}</td>
            <td>${s.classes}</td>
            <td>${s.students}</td>
            <td><strong>${s.g1_students || s.g6_students || s.g10_students || 0}</strong></td>
            <td>${s.teacher_ratio}</td>
            <td><strong>${s.student_density}</strong></td>
        </tr>
    `).join('');
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

        initDashboard();
    };

    if (yearF) yearF.onchange = triggerFilter;
    if (levelF) levelF.onchange = triggerFilter;
    if (typeF) typeF.onchange = triggerFilter;
    if (standardF) standardF.onchange = triggerFilter;
    if (searchF) searchF.oninput = triggerFilter;

    // Additional filters for rebranding (placeholders for now)
    const ethnicF = document.getElementById('filter-ethnic');
    const genderF = document.getElementById('filter-gender');
    if (ethnicF) ethnicF.onchange = triggerFilter;
    if (genderF) genderF.onchange = triggerFilter;

    // Dynamically populate year filter if possible
    updateYearDropdown(yearF);
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
