const fs = require('fs');
const path = 'e:/DataCamp/datacamp-mobile/src/screens/TransportScreen.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Context & hook imports
code = code.replace(
    "import { SafeAreaView } from 'react-native-safe-area-context';",
    "import { SafeAreaView } from 'react-native-safe-area-context';\nimport { useCompany } from '../context/CompanyContext';\nimport { useTrips, useAddTrip, useUpdateTrip, useDeleteTrip, useManageTripRoster, useTripAttendees } from '../api/transport';\nimport { useCampers, useDivisions } from '../api/campers';"
);

// 2. Add contexts inside TransportScreen component
const hookInjectionPoint = "const [searchQuery, setSearchQuery] = useState('');";
const hookInjectionCode = `
    const { companyId } = useCompany();
    const season = '2026';

    const { data: rawTrips = [], isLoading } = useTrips(companyId, season);
    const { data: rawCampers = [] } = useCampers(companyId, season);
    const { data: rawDivisions = [] } = useDivisions();

    const addTripMutation = useAddTrip();
    const updateTripMutation = useUpdateTrip();
    const deleteTripMutation = useDeleteTrip();
    const manageRosterMutation = useManageTripRoster();

    // Map fetched trips to UI expected Trips
    const trips = React.useMemo(() => rawTrips.map(t => ({
        id: t.id || '',
        name: t.name,
        destination: t.destination || '',
        date: t.date,
        is_multi_day: false,
        departure_time: t.departure_time || '08:00',
        return_time: t.return_time || '15:00',
        attendingCount: t.trip_attendees?.[0]?.count || 0,
        chaperone: t.chaperone || '',
        status: t.status || 'pending',
        type: t.type,
        event_type: t.type,
        transportation_type: 'Bus'
    })), [rawTrips]);

    // Derived unique values for filters
    const uniqueTypes = Array.from(new Set(trips.map(t => t.type))).sort();
    const uniqueEventTypes = Array.from(new Set(trips.map(t => t.event_type))).sort();
    const uniqueTransportTypes = Array.from(new Set(trips.map(t => t.transportation_type))).sort();
    const uniqueStatuses = Array.from(new Set(trips.map(t => t.status))).sort();

    const [searchQuery, setSearchQuery] = useState('');`;

code = code.replace(hookInjectionPoint, hookInjectionCode);

// 3. Remove previously mapped unique values and hardcoded trips state
code = code.replace(
    /\/\/ Trips State[\s\S]*?const \[trips, setTrips\] = useState\(MOCK_TRIPS\);[\s\S]*?\/\/ Derived unique values for filters[\s\S]*?const uniqueStatuses = Array\.from\(new Set\(trips\.map\(t => t\.status\)\)\)\.sort\(\);/,
    ""
);

// 4. Update handleDeleteConfirm
code = code.replace(
    `    const handleDeleteConfirm = () => {
        if (tripToDelete) {
            setTrips(trips.filter(t => t.id !== tripToDelete));
            setTripToDelete(null);
            setDeleteModalVisible(false);
        }
    };`,
    `    const handleDeleteConfirm = () => {
        if (tripToDelete) {
            deleteTripMutation.mutate(tripToDelete, {
                onSuccess: () => {
                    setTripToDelete(null);
                    setDeleteModalVisible(false);
                }
            });
        }
    };`
);

// 5. Replace MOCK arrays usages with raw data
code = code.replace(/MOCK_DIVISIONS/g, "rawDivisions");
code = code.replace(/MOCK_CAMPERS\.filter\(c => c\.divisionId/g, "rawCampers.filter(c => c.division");
code = code.replace(/MOCK_CAMPERS\.filter/g, "rawCampers.filter");
code = code.replace(/MOCK_CAMPERS/g, "rawCampers");
code = code.replace(/c\.divisionId ===/g, "c.division ===");
code = code.replace(/c\.divisionId/g, "c.division");
code = code.replace(/divisionId/g, "division");

// 6. Roster fetching when opened
code = code.replace(
    `    const handleManageRoster = (trip: Trip) => {
        setRosterTrip(trip);
        setRosterModalVisible(true);
    };`,
    `    const { data: attendeesCount = [] } = useTripAttendees(rosterTrip?.id || null);
    
    React.useEffect(() => {
        if (rosterModalVisible && attendeesCount) {
            setSelectedCamperIds(new Set(attendeesCount));
        }
    }, [rosterModalVisible, attendeesCount]);

    const handleManageRoster = (trip: Trip) => {
        setRosterTrip(trip);
        setRosterModalVisible(true);
    };`
);

// 7. Save roster handler
const oldSaveRoster = `                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={() => {
                                        setRosterModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.submitButtonText}>Save Roster</Text>
                                </TouchableOpacity>`;

const newSaveRoster = `                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={() => {
                                        if (rosterTrip) {
                                            manageRosterMutation.mutate({
                                                tripId: rosterTrip.id,
                                                childIds: Array.from(selectedCamperIds),
                                                companyId: companyId!
                                            }, {
                                                onSuccess: () => {
                                                    setRosterModalVisible(false);
                                                }
                                            });
                                        }
                                    }}
                                >
                                    <Text style={styles.submitButtonText}>{manageRosterMutation.isPending ? 'Saving...' : 'Save Roster'}</Text>
                                </TouchableOpacity>`;
code = code.replace(oldSaveRoster, newSaveRoster);

// 8. Update save trip handler
code = code.replace(
    `    const handleSaveTrip = () => {
        console.log("Saving Trip Data: ", tripFormData);
        // Replace with real update down the line
        setModalState({ ...modalState, visible: false });
    };`,
    `    const handleSaveTrip = () => {
        const payload: any = {
            company_id: companyId,
            season,
            name: tripFormData.name,
            type: tripFormData.type,
            destination: tripFormData.destination,
            date: tripFormData.date,
            departure_time: tripFormData.departure_time,
            return_time: tripFormData.return_time,
            chaperone: tripFormData.chaperone || null,
            capacity: parseInt(tripFormData.capacity) || null,
            status: tripFormData.status || 'pending',
        };
        
        if (modalState.mode === 'add') {
            addTripMutation.mutate(payload, {
                onSuccess: () => setModalState({ ...modalState, visible: false })
            });
        } else if (modalState.mode === 'edit' && currentEditingTripId) {
            updateTripMutation.mutate({ ...payload, id: currentEditingTripId }, {
                onSuccess: () => setModalState({ ...modalState, visible: false })
            });
        }
    };`
);

fs.writeFileSync(path, code);
// clean up mock definitions
let cleanCode = fs.readFileSync(path, 'utf8');
cleanCode = cleanCode.replace(/const MOCK_TRIPS: Trip\[\] = \[[\s\S]*?\];/g, "");
cleanCode = cleanCode.replace(/const MOCK_DIVISIONS: Division\[\] = \[[\s\S]*?\];/g, "");
cleanCode = cleanCode.replace(/const MOCK_CAMPERS: Camper\[\] = \[[\s\S]*?\];/g, "");

fs.writeFileSync(path, cleanCode);
