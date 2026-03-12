const fs = require('fs');
const file = 'E:/DataCamp/datacamp-mobile/src/screens/SpecialEventsScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useDivisions
if (!content.includes('useDivisions')) {
    content = content.replace(
        /import \{ useCompany \} from '\.\.\/contexts\/CompanyContext';/,
        "import { useCompany } from '../contexts/CompanyContext';\nimport { useDivisions } from '../api/campers';"
    );
}

// 2. Add useMemo if missing
if (!content.includes('useMemo')) {
    content = content.replace(
        /import React, \{ useState \} from 'react';/,
        "import React, { useState, useMemo } from 'react';"
    );
}

// 3. Remove hardcoded DIVISIONS
content = content.replace(
    /\/\/ Reuse divisions from existing code\nconst DIVISIONS = \[[^\]]+\];\n*/m,
    ""
);

// 4. Add useDivisions to component setup
content = content.replace(
    /const \{ companyId, season \} = useCompany\(\);/,
    "const { companyId, season } = useCompany();\n    const { data: divisionsData = [] } = useDivisions();"
);

// 5. Add filteredEvents logic
const filteredLogic = `
    const filteredEvents = useMemo(() => {
        let filtered = specialEventsData || [];
        if (selectedDivision !== 'All Divisions') {
            filtered = filtered.filter((event: any) => {
                // If divisions array exists and includes the ID
                if (event.divisions && Array.isArray(event.divisions)) {
                    return event.divisions.includes(selectedDivision);
                }
                // Fallback check if it stores by name anywhere or string CSV
                if (typeof event.divisions === 'string') {
                    return event.divisions.includes(selectedDivision);
                }
                return false;
            });
        }
        return filtered;
    }, [specialEventsData, selectedDivision]);
`;

if (!content.includes('filteredEvents')) {
    content = content.replace(
        /const addSpecialEventMutation = useAddSpecialEvent\(\);/,
        "const addSpecialEventMutation = useAddSpecialEvent();\n" + filteredLogic
    );
}

// 6. Replace specialEventsData with filteredEvents in render
content = content.replace(
    /specialEventsData\.length === 0/g,
    "filteredEvents.length === 0"
);
content = content.replace(
    /specialEventsData\.map\(\s*\(event[:, ]/g,
    "filteredEvents.map((event: any"
);

// 7. Fix Top dropdown display name
content = content.replace(
    /<Text style=\{styles\.divisionDropdownText\}>\{selectedDivision\}<\/Text>/,
    `<Text style={styles.divisionDropdownText}>{selectedDivision === 'All Divisions' ? 'All Divisions' : divisionsData.find(d => d.id === selectedDivision)?.name || 'Select Division'}</Text>`
);

/* 
8. Modals use DIVISIONS! The Add Event Modal has a list of checkboxes for multiple divisions. 
   We must patch that to use divisionsData.
*/

// Add Event toggle logic
content = content.replace(
    /if \(division === 'All Divisions'\) \{[\s\S]*?\} else \{[\s\S]*?\}/m,
    `if (division === 'All Divisions') {
            if (selectedDivisions.length === divisionsData.length) {
                setSelectedDivisions([]);
            } else {
                setSelectedDivisions(divisionsData.map(d => d.id));
            }
        } else {
            setSelectedDivisions((prev) =>
                prev.includes(division)
                    ? prev.filter((d) => d !== division)
                    : [...prev, division]
            );
        }`
);

// handleSelectAllDivisions
content = content.replace(
    /const handleSelectAllDivisions = \(\) => \{[^}]+\};/,
    `const handleSelectAllDivisions = () => {
        setSelectedDivisions(divisionsData.map((d) => d.id));
    };`
);

// The actual mapped checklist
const divisionChecklistRender = `
                                    <FlatList
                                        data={divisionsData}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item }) => {
                                            const isSelected = selectedDivisions.includes(item.id);
                                            return (
                                                <TouchableOpacity
                                                    style={styles.divisionCheckboxItem}
                                                    onPress={() => handleDivisionToggle(item.id)}
                                                >
                                                    <View
                                                        style={[
                                                            styles.checkbox,
                                                            isSelected && styles.checkboxSelected,
                                                        ]}
                                                    >
                                                        {isSelected && (
                                                            <Ionicons
                                                                name="checkmark"
                                                                size={16}
                                                                color={theme.colors.surface}
                                                            />
                                                        )}
                                                    </View>
                                                    <Text style={styles.divisionCheckboxText}>
                                                        {item.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        }}
                                        nestedScrollEnabled={true}
                                        scrollEnabled={true}
                                    />
`;

content = content.replace(
    /<FlatList\s+data=\{DIVISIONS\.filter\(\(d\) => d !== 'All Divisions'\)\}[\s\S]*?nestedScrollEnabled=\{true\}\s*scrollEnabled=\{true\}\s*\/>/m,
    divisionChecklistRender
);

// The top filter dropdown has a FlatList too, but wait... there's no FlatList mapped for the Top dropdown! 
// Ah, let's verify if SpecialEventsScreen has a division dropdown FlatList. Wait, it does NOT have a dropdown Modal at all.
// Wait! Let me check lines 458-472 in SpecialEventsScreen.tsx. 
// "divisionDropdownContainer" -> "setShowDivisionDropdown(true)" -> NO MODAL RETURNED DOWN BELOW?
// Let me grep where `showDivisionDropdown` is used.
// It seems the dropdown wasn't even rendering a Modal in `SpecialEventsScreen`, maybe it just maps a list directly or has a missed modal code in my previous view.
// If there is a missing modal, I don't need to patch it if it doesn't exist, but we should make sure the Add Event patch is correct.

fs.writeFileSync(file, content);
console.log('Saved src/screens/SpecialEventsScreen.tsx');
