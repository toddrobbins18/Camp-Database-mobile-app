const fs = require('fs');

function refactorApiSports() {
    const file = 'E:/DataCamp/datacamp-mobile/src/api/sports.ts';
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(
        /children!inner\(\*\)/,
        "children!inner(*, division:divisions(id, name, gender, sort_order))"
    );

    fs.writeFileSync(file, content);
    console.log('Saved src/api/sports.ts');
}

function refactorSportsScreen() {
    const file = 'E:/DataCamp/datacamp-mobile/src/screens/SportsScreen.tsx';
    let content = fs.readFileSync(file, 'utf8');

    // 1. Import useDivisions
    content = content.replace(
        /import \{ useCampers \} from '\.\.\/api\/campers';/,
        "import { useCampers, useDivisions } from '../api/campers';"
    );

    // 2. Remove hardcoded DIVISIONS
    content = content.replace(
        /\/\/ Reuse divisions from existing code\nconst DIVISIONS = \[[^\]]+\];\n*/m,
        ""
    );
    
    // 2b. Add React.useMemo import if not already there
    if (!content.includes('useMemo')) {
        content = content.replace(
            /import React, \{ useState \} from 'react';/,
            "import React, { useState, useMemo } from 'react';"
        );
    }

    // 3. Add useDivisions data
    content = content.replace(
        /const \{ data: enrollmentsData = \[\] \} = useSportsEnrollments\(companyId, season\);/,
        "const { data: enrollmentsData = [] } = useSportsEnrollments(companyId, season);\n    const { data: divisionsData = [] } = useDivisions();"
    );

    // 4. Implement filteredEnrollments logic 
    const filteredLogic = `
    const filteredEnrollments = useMemo(() => {
        let filtered = enrollmentsData;
        
        if (selectedDivision !== 'All Divisions') {
            filtered = filtered.filter(e => e.children?.division_id === selectedDivision);
        }
        if (selectedGender !== 'All Genders') {
            const genderFilter = selectedGender === 'Boys' ? 'boy' : 'girl';
            filtered = filtered.filter(e => e.children?.gender === genderFilter);
        }
        if (selectedSport !== 'All Sports') {
            filtered = filtered.filter(e => e.sport_name === selectedSport);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(e => 
                (e.children?.name && e.children.name.toLowerCase().includes(lowerQuery)) ||
                (e.sport_name && e.sport_name.toLowerCase().includes(lowerQuery)) ||
                (e.instructor && e.instructor.toLowerCase().includes(lowerQuery))
            );
        }
        return filtered;
    }, [enrollmentsData, selectedDivision, selectedGender, selectedSport, searchQuery]);
    `;

    content = content.replace(
        /const addEnrollmentMutation = useAddSportsEnrollment\(\);/,
        filteredLogic + '\n    const addEnrollmentMutation = useAddSportsEnrollment();'
    );

    // 5. Replace mapped arrays with filteredEnrollments
    // Calendar empty check
    content = content.replace(
        /const todaysEnrollments = enrollmentsData\.filter\(e => \{/g,
        "const todaysEnrollments = filteredEnrollments.filter(e => {"
    );

    // List view empty check and map
    content = content.replace(
        /\{enrollmentsData\.length === 0 \? \(/,
        "{filteredEnrollments.length === 0 ? ("
    );
    content = content.replace(
        /enrollmentsData\.map\(enroll => \(/,
        "filteredEnrollments.map(enroll => ("
    );

    // 6. Fix Display Name for Selected Division 
    content = content.replace(
        /<Text style=\{styles\.filterDropdownText\}>\{selectedDivision\}<\/Text>/,
        "<Text style={styles.filterDropdownText}>{selectedDivision === 'All Divisions' ? 'All Divisions' : divisionsData.find(d => d.id === selectedDivision)?.name || 'Select Division'}</Text>"
    );

    // 7. Fix FlatList items for Divisions Modal
    const divisionModalReplace = `
                               <FlatList
                                    data={[{id: 'All Divisions', name: 'All Divisions'}, ...divisionsData]}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                selectedDivision === item.id &&
                                                styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setSelectedDivision(item.id);
                                                setShowDivisionDropdown(false);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    selectedDivision === item.id &&
                                                    styles.filterDropdownItemTextSelected,
                                                ]}
                                            >
                                                {item.name}
                                            </Text>
                                            {selectedDivision === item.id && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.secondary}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    nestedScrollEnabled={true}
                                />
    `;
    content = content.replace(
        /<FlatList\s+data=\{DIVISIONS\}[\s\S]*?nestedScrollEnabled=\{true\}\s*\/>/m,
        divisionModalReplace
    );

    fs.writeFileSync(file, content);
    console.log('Saved src/screens/SportsScreen.tsx');
}

refactorApiSports();
refactorSportsScreen();
