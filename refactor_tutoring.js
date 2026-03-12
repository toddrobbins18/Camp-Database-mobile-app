const fs = require('fs');

function refactorTutoringApi() {
    const file = 'E:/DataCamp/datacamp-mobile/src/api/rainy_day_tutoring.ts';
    let content = fs.readFileSync(file, 'utf8');

    // Add children and division relation to select
    content = content.replace(
        /\.select\('\*'\)/,
        ".select('*, children(id, first_name, last_name, gender, division_id)')"
    );

    fs.writeFileSync(file, content);
    console.log('Saved src/api/rainy_day_tutoring.ts');
}

function refactorTutoringScreen() {
    const file = 'E:/DataCamp/datacamp-mobile/src/screens/TutoringTherapyScreen.tsx';
    let content = fs.readFileSync(file, 'utf8');

    // 1. Import useDivisions
    if (!content.includes('useDivisions')) {
        content = content.replace(
            /(import \{.*\} from 'react-native';)/,
            "$1\nimport { useDivisions } from '../api/campers';"
        );
    }

    // 2. Add useMemo
    if (!content.includes('useMemo')) {
        content = content.replace(
            /import React, \{ useState \} from 'react';/,
            "import React, { useState, useMemo } from 'react';"
        );
    }

    // 3. Remove hardcoded DIVISIONS
    content = content.replace(
        /const DIVISIONS = \[[^\]]+\];\n*/m,
        ""
    );

    // 4. Instantiate divisionsData
    content = content.replace(
        /const \{ data: enrollments = \[\], isLoading: enrollmentsLoading \} = useTutoringTherapy\('2026'\);/,
        "const { data: enrollments = [], isLoading: enrollmentsLoading } = useTutoringTherapy('2026');\n    const { data: divisionsData = [] } = useDivisions();"
    );

    // 5. Build filteredEnrollments
    const filteredLogic = `
    const filteredEnrollments = useMemo(() => {
        let filtered = enrollments;

        if (selectedDivision !== 'All Divisions') {
            filtered = filtered.filter(e => e.children?.division_id === selectedDivision);
        }
        if (selectedGender !== 'All Genders') {
            const genderValue = selectedGender === 'Boys' ? 'boy' : 'girl';
            filtered = filtered.filter(e => e.children?.gender === genderValue);
        }
        if (selectedService !== 'All Services') {
            filtered = filtered.filter(e => e.service_type === selectedService);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(e => {
                const childName = \`\${e.children?.first_name || ''} \${e.children?.last_name || ''}\`.toLowerCase();
                return childName.includes(lowerQuery) || 
                       (e.service_type && e.service_type.toLowerCase().includes(lowerQuery)) ||
                       (e.instructor && e.instructor.toLowerCase().includes(lowerQuery));
            });
        }
        return filtered;
    }, [enrollments, selectedDivision, selectedGender, selectedService, searchQuery]);
    `;

    content = content.replace(
        /const addEntryMutation = useAddTutoringEntry\(\);/,
        "const addEntryMutation = useAddTutoringEntry();\n" + filteredLogic
    );

    // 6. Replace Map iteration
    content = content.replace(
        /enrollments\.length === 0/g,
        "filteredEnrollments.length === 0"
    );
    content = content.replace(
        /enrollments\.map\(\(entry: any\) => \(/g,
        "filteredEnrollments.map((entry: any) => ("
    );

    // 7. Render child name in content area
    content = content.replace(
        /<Text style=\{\{ fontWeight: '600', color: theme\.colors\.text \}\}>\{entry\.service_type\}<\/Text>/,
        "<Text style={{ fontWeight: '600', color: theme.colors.text }}>{entry.children ? `${entry.children.first_name} ${entry.children.last_name}` : 'Unknown Camper'} - {entry.service_type}</Text>"
    );

    // 8. Fix dropdown display name
    content = content.replace(
        /<Text style=\{\[styles\.dropdownText, !selectedDivision && styles\.placeholder\]\}>\s*\{selectedDivision \|\| 'Select Division'\}\s*<\/Text>/,
        `<Text style={[styles.dropdownText, !selectedDivision && styles.placeholder]}>
                                {selectedDivision === 'All Divisions' ? 'All Divisions' : divisionsData.find((d: any) => d.id === selectedDivision)?.name || 'Select Division'}
                            </Text>`
    );

    // 9. Fix renderBottomSheetDropdown for Divisions
    const renderDivisionReplace = `renderBottomSheetDropdown(
                showDivisionDropdown,
                () => setShowDivisionDropdown(false),
                ['All Divisions', ...divisionsData.map((d: any) => d.id)],
                selectedDivision,
                setSelectedDivision,
                'Select Division',
                (item) => item === 'All Divisions' ? 'All Divisions' : divisionsData.find((d:any) => d.id === item)?.name
            )`;
    content = content.replace(
        /renderBottomSheetDropdown\([\s\S]*?showDivisionDropdown,[\s\S]*?\(\) => setShowDivisionDropdown\(false\),[\s\S]*?DIVISIONS,[\s\S]*?selectedDivision,[\s\S]*?setSelectedDivision,[\s\S]*?'Select Division'[\s\S]*?\)/m,
        renderDivisionReplace
    );

    // We also need to patch renderBottomSheetDropdown to take a formatter optionally
    // Find: const renderBottomSheetDropdown = (
    // visible: boolean, onClose: () => void, data: string[], selected: string, onSelect: (item: string) => void, title?: string
    // ) => {
    content = content.replace(
        /renderBottomSheetDropdown = \([\s\S]*?title\?: string\n\s*\) => \{/m,
        `renderBottomSheetDropdown = (
        visible: boolean,
        onClose: () => void,
        data: string[],
        selected: string,
        onSelect: (item: string) => void,
        title?: string,
        formatter?: (item: string) => string
    ) => {`
    );

    // And replace item rendering
    content = content.replace(
        /<Text\s+style=\{\[\s*styles\.bottomSheetItemText,\s*selected === item && styles\.bottomSheetItemTextSelected,\s*\]\}\s*>\s*\{item\}\s*<\/Text>/m,
        `<Text
                                        style={[
                                            styles.bottomSheetItemText,
                                            selected === item && styles.bottomSheetItemTextSelected,
                                        ]}
                                    >
                                        {formatter ? formatter(item) : item}
                                    </Text>`
    );

    fs.writeFileSync(file, content);
    console.log('Saved src/screens/TutoringTherapyScreen.tsx');
}

refactorTutoringApi();
refactorTutoringScreen();
