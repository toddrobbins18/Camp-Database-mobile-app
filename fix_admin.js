const fs = require('fs');
const path = 'e:/DataCamp/datacamp-mobile/src/screens/AdminPanelScreen.tsx';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Add imports
code = code.replace(
    "import { StyledCard } from '../components/StyledCard';",
    "import { StyledCard } from '../components/StyledCard';\nimport { useAdminUsers, useUpdateUserRole, useDeleteUser, useEmailConfigs, useUpdateEmailConfig, useEditHistory } from '../api/admin';"
);

// 2. Remove mock interfaces to avoid conflict if necessary (not really needed if we cast, but let's remove User interface)
code = code.replace(/interface User \{[\s\S]*?\}\n/g, "");

// 3. Inject hooks and remove state
const hookInjectionPoint = "    const [currentTab, setCurrentTab] = useState<'userManagement'";

const injectionCode = `
    const { data: adminUsers = [] } = useAdminUsers();
    const { data: fetchedEmailConfigs = [] } = useEmailConfigs();
    const { data: fetchedHistory = [] } = useEditHistory();

    const updateUserRoleMutation = useUpdateUserRole();
    const deleteUserMutation = useDeleteUser();
    const updateEmailConfigMutation = useUpdateEmailConfig();

    const users = adminUsers as any[];
    const emailConfigs = fetchedEmailConfigs as any[];
    const editHistoryEntries = fetchedHistory as any[];

    const [currentTab, setCurrentTab] = useState<'userManagement'`;

// Replace mock states
code = code.replace(/    \/\/ Mock Users Data\n    const \[users, setUsers\] = useState<User\[\]>\(\[[\s\S]*?\]\);\n/g, "");
code = code.replace(/    \/\/ Email Automation State\n    interface EmailConfig \{[\s\S]*?\}\n\n    const \[emailConfigs, setEmailConfigs\] = useState<EmailConfig\[\]>\(\[[\s\S]*?\]\);\n/g, "");
code = code.replace(/    \/\/ Edit History State\n    interface EditHistoryEntry \{[\s\S]*?\}\n\n    const \[editHistorySearch/g, "    // Edit History State\n    const [editHistorySearch");
code = code.replace(/    const \[editHistoryEntries, setEditHistoryEntries\] = useState<EditHistoryEntry\[\]>\(\[[\s\S]*?\]\);\n/g, "");

code = code.replace(hookInjectionPoint, injectionCode);

// 4. Update handlers to use mutations
// Replace handleRoleSelect
code = code.replace(/    const handleRoleSelect = \(newRole: string\) => \{[\s\S]*?setShowRolePicker\(false\);\n            setSelectedUser\(null\);\n        \}\n    \};/g,
    `    const handleRoleSelect = (newRole: string) => {
        if (selectedUser) {
            updateUserRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
            setShowRolePicker(false);
            setSelectedUser(null);
        }
    };`);

// Replace handleDeleteUser
code = code.replace(/    const handleDeleteUser = \(\) => \{[\s\S]*?setUserToDelete\(null\);\n        \}\n    \};/g,
    `    const handleDeleteUser = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
    };`);

// Replace handleToggleEmailConfig
code = code.replace(/    const handleToggleEmailConfig = \(id: string\) => \{[\s\S]*?\}\)\);\n    \};/g,
    `    const handleToggleEmailConfig = (id: string) => {
        const config = emailConfigs.find(c => c.id === id);
        if (config) {
            updateEmailConfigMutation.mutate({ ...config, enabled: !config.enabled });
        }
    };`);

// Replace handleTagToggle
code = code.replace(/    const handleTagToggle = \(configId: string, tag: string\) => \{[\s\S]*?\}\)\);\n    \};/g,
    `    const handleTagToggle = (configId: string, tag: string) => {
        const config = emailConfigs.find(c => c.id === configId);
        if (config) {
            const selectedTags = config.selectedTags.includes(tag)
                ? config.selectedTags.filter((t: string) => t !== tag)
                : [...config.selectedTags, tag];
            updateEmailConfigMutation.mutate({ ...config, selectedTags });
        }
    };`);

// Replace handleTimingToggle
code = code.replace(/    const handleTimingToggle = \(configId: string, timing: string\) => \{[\s\S]*?\}\)\);\n    \};/g,
    `    const handleTimingToggle = (configId: string, timing: string) => {
        const config = emailConfigs.find(c => c.id === configId);
        if (config) {
            const selectedTimings = config.selectedTimings.includes(timing)
                ? config.selectedTimings.filter((t: string) => t !== timing)
                : [...config.selectedTimings, timing];
            updateEmailConfigMutation.mutate({ ...config, selectedTimings });
        }
    };`);

// Remove handleAddTagSelect references to setUsers
code = code.replace(/    const handleAddTagSelect = \(tag: string\) => \{[\s\S]*?\}\)\);\n            setShowAddTagModal\(false\);\n            setUserForTags\(null\);\n        \}\n    \};/g,
    `    const handleAddTagSelect = (tag: string) => {
        if (userForTags) {
            // Usually this requires a separate API call to add tags for a user.
            // Placeholder for real logic.
            setShowAddTagModal(false);
            setUserForTags(null);
        }
    };`);

// Ensure typing in map functions in UI
code = code.replace(/users\.map\(\(user\)/g, "users.map((user: any)");
code = code.replace(/emailConfigs\.map\(\(config\)/g, "emailConfigs.map((config: any)");
code = code.replace(/editHistoryEntries\.map\(\(entry\)/g, "editHistoryEntries.map((entry: any)");

fs.writeFileSync(path, code);
console.log('Replacements completed.');
