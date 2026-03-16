const fs = require('fs');
const content = fs.readFileSync('h:/Work/AI/ioc-giaoduc-draft/data.js', 'utf8');
const EDUCATION_DATA = eval(content.replace('const EDUCATION_DATA =', ''));
const levels = {};
EDUCATION_DATA.schools.forEach(s => {
    levels[s.level] = (levels[s.level] || 0) + 1;
});
console.log(JSON.stringify(levels, null, 2));
