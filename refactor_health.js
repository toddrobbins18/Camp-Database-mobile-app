const fs = require('fs');

function refactorHealthScreen() {
    const file = 'E:/DataCamp/datacamp-mobile/src/screens/HealthScreen.tsx';
    let content = fs.readFileSync(file, 'utf8');

    // 1. Import useDivisions
    if (!content.includes('useDivisions')) {
        content = content.replace(
            /(import \{.*\} from '\.\.\/api\/campers';)/,
            "import { useCampers, useDivisions } from '../api/campers';"
        );
    }

    // 2. Add useMemo
    if (!content.includes('useMemo')) {
        content = content.replace(
            /import React, \{ useState \} from 'react';/,
            "import React, { useState, useMemo } from 'react';"
        );
    }

    // 3. Setup useDivisions hook
    content = content.replace(
        /const \{ data: campersData = \[\] \} = useCampers\(companyId, '2026'\);/,
        "const { data: campersData = [] } = useCampers(companyId, '2026');\n    const { data: divisionsData = [] } = useDivisions();"
    );

    // 4. Remove hardcoded array
    content = content.replace(
        /const divisions = \[\s*'All Divisions',[\s\S]*?'CIT Boys',\s*\];/m,
        ""
    );

    // 5. Update filteredChildren to USE selectedDivision!
    const filteredLogic = `
    const filteredChildren = useMemo(() => {
        return campersData.filter((child: any) => {
            const matchesSearch = \`\${child.first_name} \${child.last_name}\`.toLowerCase().includes(searchChildrenQuery.toLowerCase()) ||
                (child.division?.name || child.group_name || '').toLowerCase().includes(searchChildrenQuery.toLowerCase());
            
            const matchesDivision = selectedDivision === 'All Divisions' || child.division_id === selectedDivision;
            
            return matchesSearch && matchesDivision;
        }).map((child: any) => ({
            id: child.id,
            name: \`\${child.first_name} \${child.last_name}\`,
            division: child.division?.name || child.group_name || 'N/A'
        }));
    }, [campersData, searchChildrenQuery, selectedDivision]);
    `;

    content = content.replace(
        /const filteredChildren = campersData\.filter\([\s\S]*?division: child\.group_name \|\| 'N\/A'\s*\}\)\);/m,
        filteredLogic
    );

    // 6. Fix dropdown display name
    content = content.replace(
        /<Text style=\{styles\.dropdownText\}>\{selectedDivision\}<\/Text>/,
        `<Text style={styles.dropdownText}>{selectedDivision === 'All Divisions' ? 'All Divisions' : divisionsData.find(d => d.id === selectedDivision)?.name || 'Select Division'}</Text>`
    );

    // 7. Fix picker modal if it exists (divisions map)
    // Replace mapped divisions with divisionsData
    content = content.replace(
        /divisions\.map\(\(div\)/g,
        "[{id: 'All Divisions', name: 'All Divisions'}, ...divisionsData].map((div: any)"
    );
    // Replace division picker touchable selection
    content = content.replace(
        /onPress=\{\(\) => \{\s*setSelectedDivision\(div\);\s*setShowDivisionPicker\(false\);\s*\}\}/g,
        "onPress={() => { setSelectedDivision(div.id || div); setShowDivisionPicker(false); }}"
    );
    // Replace display text inside division picker
    content = content.replace(
        /div === selectedDivision \? styles\.divisionItemTextSelected : null/g,
        "(div.id || div) === selectedDivision ? styles.divisionItemTextSelected : null"
    );
    content = content.replace(
        /<Text style=\{.*?divisionItemText.*?\}[\s\S]*?>\s*\{div\}\s*<\/Text>/m,
        `<Text style={[
                                            styles.divisionItemText,
                                            (div.id || div) === selectedDivision ? styles.divisionItemTextSelected : null
                                        ]}>
                                            {div.name || div}
                                        </Text>`
    );
    content = content.replace(
        /\{div === selectedDivision &&/g,
        "{(div.id || div) === selectedDivision &&"
    );

    fs.writeFileSync(file, content);
    console.log('Saved src/screens/HealthScreen.tsx');
}

refactorHealthScreen();
