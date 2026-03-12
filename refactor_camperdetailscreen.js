const fs = require('fs');
const file = 'E:/DataCamp/datacamp-mobile/src/screens/CamperDetailScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useDivisions
content = content.replace(
    /import \{ useStaff \} from '\.\.\/api\/staff';/,
    "import { useStaff } from '../api/staff';\nimport { useDivisions } from '../api/campers';"
);

// 2. Remove hardcoded DIVISIONS
content = content.replace(
    /\/\/ Division options \(excluding "All Divisions"\)\nconst DIVISIONS = \[[^\]]+\];\n*/m,
    ""
);

// 3. Add useDivisions to component setup
content = content.replace(
    /const \{ companyId, season \} = useCompany\(\);/,
    "const { companyId, season } = useCompany();\n    const { data: divisionsData = [] } = useDivisions();"
);

// 4. Form init replace division initialization
content = content.replace(
    /division: camper\.division \|\| '',/,
    "division: camper.division_id || (camper as any).division?.id || '',"
);

// 5. Select display name map
content = content.replace(
    /\{editProfileFormData\.division \|\| 'Select division'\}/g,
    "{divisionsData.find(d => d.id === editProfileFormData.division)?.name || 'Select division'}"
);

// 6. Replace the DIVISIONS mapping loop block
content = content.replace(
    /\{DIVISIONS\.map\(\(division\) => \([\s\S]*?\{\s*\}\s*\)\)\}/m,
    `{divisionsData.map((div) => (
                                    <TouchableOpacity
                                        key={div.id}
                                        style={[
                                            styles.genderDropdownItem,
                                            editProfileFormData.division === div.id && styles.genderDropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setEditProfileFormData({ ...editProfileFormData, division: div.id });
                                            setShowDivisionDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.genderDropdownItemText,
                                            editProfileFormData.division === div.id && styles.genderDropdownItemTextSelected
                                        ]}>
                                            {div.name}
                                        </Text>
                                        {editProfileFormData.division === div.id && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                        )}
                                    </TouchableOpacity>
                                ))}`
);

fs.writeFileSync(file, content);
console.log('Done refactoring CamperDetailScreen');
