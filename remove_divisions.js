const fs = require('fs');

const file = 'src/screens/SportsScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block to remove
const target = `// Reuse divisions from existing code
const DIVISIONS = [
    'All Divisions',
    'Freshmen A Girls',
    'Freshmen B Girls',
    'Cadet Girls',
    'Sophomore Girls',
    'Junior Girls',
    'Senior Girls',
    'Super Girls',
    'Teen Girls',
    'CIT Girls',
    'Freshmen A Boys',
    'Freshmen B Boys',
    'Cadet Boys',
    'Sophomore Boys',
    'Junior Boys',
    'Senior Boys',
    'Super Boys',
    'Teen Boys',
    'CIT Boys',
];`;

content = content.replace(target, '').replace(target.replace(/\n/g, '\r\n'), '');

fs.writeFileSync(file, content);
console.log('Removed DIVISIONS block cleanly.');
