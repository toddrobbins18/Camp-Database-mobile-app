const fs = require('fs');
const file = 'E:/DataCamp/datacamp-mobile/src/screens/CamperScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useDivisions
content = content.replace(
    /import \{ useCampers, useAddCamper, useEditCamper, useDeleteCamper \} from '\.\.\/api\/campers';/,
    "import { useCampers, useAddCamper, useEditCamper, useDeleteCamper, useDivisions } from '../api/campers';"
);

// 2. Remove hardcoded DIVISIONS
content = content.replace(
    /\/\/ Division options matching the screenshot\nconst DIVISIONS = \[[^\]]+\];\n*/m,
    ""
);

// 3. Add useDivisions to component setup
content = content.replace(
    /const \{ data: roleData \} = useRole\(\);\n    const isAdmin = roleData\?\.isAdmin \|\| false;/,
    "const { data: roleData } = useRole();\n    const isAdmin = roleData?.isAdmin || false;\n\n    const { data: divisionsData = [] } = useDivisions();"
);

// 4. Update division name mapping in filteredCampers
content = content.replace(
    /if \(selectedDivision !== 'All Divisions' && camper\.division !== selectedDivision\) return false;/,
    "if (selectedDivision !== 'All Divisions' && camper.division_id !== selectedDivision) return false;"
);

content = content.replace(
    /return \(a\.division \|\| ''\)\.localeCompare\(b\.division \|\| ''\);/,
    "return (a.division?.name || '').localeCompare(b.division?.name || '');"
);

// 5. Update selectedCamper display
content = content.replace(
    /{selectedCamper\.division \|\| 'No Division'}/g,
    "{selectedCamper.division?.name || 'No Division'}"
);

// 6. Fix mapping in BottomSheet
content = content.replace(
    /\{DIVISIONS\.map\(\(division\) => \([\s\S]*?\}\)\)\}/,
    `{divisionsData.map((division) => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            selectedDivision === division.id && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedDivision(division.id);
                                            setShowDivisionDropdown(false);
                                        }}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={selectedDivision === division.id ? theme.colors.secondary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedDivision === division.id && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division.name}
                                        </Text>
                                        {selectedDivision === division.id && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}`
);

// 7. Update Add Camper string maps to use divisionsData
content = content.replace(
    /\{DIVISIONS\.map\(\(division\) => \([\s\S]*?\}\)\)\}/g,
    `{divisionsData.map((div) => (
                                    <TouchableOpacity
                                        key={div.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            formData.division === div.id && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setFormData({ ...formData, division: div.id });
                                            setShowAddDivisionDropdown(false);
                                        }}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={formData.division === div.id ? theme.colors.secondary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            formData.division === div.id && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {div.name}
                                        </Text>
                                        {formData.division === div.id && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}`
);

// Same replacement for edit form, but need to be careful with the exact variable name.
// Since there's multiple modals, I will use regex replace for the edit form modal.
// Wait, the edit modal uses `editFormData.division`. The previous script line might have replaced the Add form dropdown but what about the edit one?
// Let's replace the selected Division display text for the forms to show the actual name rather than the UUID string
content = content.replace(
    /\{formData\.division \|\| 'Select division'\}/g,
    "{divisionsData.find(d => d.id === formData.division)?.name || 'Select division'}"
);
content = content.replace(
    /\{editFormData\.division \|\| 'Select division'\}/g,
    "{divisionsData.find(d => d.id === editFormData.division)?.name || 'Select division'}"
);

// Now in the edit child dropdown modal:
content = content.replace(
    /\{DIVISIONS\.map\(\(division\) => \([\s\S]*?\}\)\)\}/g,
    `{divisionsData.map((div) => (
                                    <TouchableOpacity
                                        key={div.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            editFormData.division === div.id && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setEditFormData({ ...editFormData, division: div.id });
                                            setShowEditDivisionDropdown(false);
                                        }}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={editFormData.division === div.id ? theme.colors.secondary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            editFormData.division === div.id && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {div.name}
                                        </Text>
                                        {editFormData.division === div.id && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}`
);

// Map camper item division string rendering (currently camper.division || "N/A") to camper.division?.name || "N/A"
content = content.replace(
    /\{camper\.division \|\| "N\/A"\}/g,
    "{camper.division?.name || \"N/A\"}"
);
content = content.replace(
    /\{camper\.division \|\| ''\}/g,
    "{camper.division?.name || ''}"
);
content = content.replace(
    /\{camper\.division\}/g,
    "{camper.division?.name}"
);

// And update edit formdata population
content = content.replace(
    /division: \(camper as any\)\.division \|\| camper\.division \|\| '',/,
    "division: camper.division_id || (camper as any).division?.id || '',"
);

// Also need to adjust mapping to server in handleUpdateCamper & handleAddCamper
// They push `division: formData.division` to the server logic.
// But the actual API mutation `useAddCamper` expects `division_id`. 
// The mutation currently takes `division` from the object and puts it wherever.
// Wait! Wait! `useAddCamper` insert `newCamper` object directly!
// So if `newCamper` has `.division` as a UUID, it might break if the DB column is `division_id`.
// Let me look at datacamp-mobile api. Camper has `division?: string` and also `division_id?: string`.
// Oh! It just inserts `newCamper`. So if I pass `{...formData, division_id: formData.division}`, it maps correctly.
content = content.replace(
    /division: formData\.division,/g,
    "division_id: formData.division,"
);
content = content.replace(
    /division: editFormData\.division,/g,
    "division_id: editFormData.division,"
);

// Let's write the modified content back
fs.writeFileSync(file, content);
console.log('Done refactoring CamperScreen');
