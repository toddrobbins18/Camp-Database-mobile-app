const fs = require('fs');
const path = 'e:/DataCamp/datacamp-mobile/src/screens/TransportScreen.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove mock arrays
code = code.replace(/const rawDivisions: Division\[\] = \[[\s\S]*?\];/g, "");
code = code.replace(/const rawCampers: Camper\[\] = \[[\s\S]*?\];/g, "");
code = code.replace(/const MOCK_TRIPS: Trip\[\] = \[[\s\S]*?\];/g, "");

// 2. Explicitly type trips
code = code.replace(
    "const trips = React.useMemo(() => rawTrips.map(t => ({",
    "const trips: Trip[] = React.useMemo(() => rawTrips.map(t => ({"
);

// 3. Fix setTypes
code = code.replace(
    "const uniqueTypes = Array.from(new Set(trips.map(t => t.type))).sort();",
    "const uniqueTypes = Array.from(new Set(trips.map(t => t.type))).sort() as string[];"
);
code = code.replace(
    "const uniqueEventTypes = Array.from(new Set(trips.map(t => t.event_type))).sort();",
    "const uniqueEventTypes = Array.from(new Set(trips.map(t => t.event_type))).sort() as string[];"
);
code = code.replace(
    "const uniqueTransportTypes = Array.from(new Set(trips.map(t => t.transportation_type))).sort();",
    "const uniqueTransportTypes = Array.from(new Set(trips.map(t => t.transportation_type))).sort() as string[];"
);
code = code.replace(
    "const uniqueStatuses = Array.from(new Set(trips.map(t => t.status))).sort();",
    "const uniqueStatuses = Array.from(new Set(trips.map(t => t.status))).sort() as string[];"
);

// 4. Fix handleDeleteTrip
code = code.replace(
    `    const handleDeleteTrip = () => {
        if (tripToDelete) {
            setTrips(prev => prev.filter(t => t.id !== tripToDelete));
            setTripToDelete(null);
        }
    };`,
    `    const handleDeleteTrip = () => {
        if (tripToDelete) {
            deleteTripMutation.mutate(tripToDelete, {
                onSuccess: () => setTripToDelete(null)
            });
        }
    };`
);

// 5. Fix handleSaveTrip
code = code.replace(
    `    const handleSaveTrip = () => {
        if (modalState.mode === 'add') {
            setTrips(prev => [tripFormData, ...prev]);
        } else {
            setTrips(prev => prev.map(t => t.id === modalState.tripId ? tripFormData : t));
        }
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
            capacity: parseInt(tripFormData.capacity || "0") || null,
            status: tripFormData.status || 'pending',
        };
        
        if (modalState.mode === 'add') {
            addTripMutation.mutate(payload, {
                onSuccess: () => setModalState({ ...modalState, visible: false })
            });
        } else if (modalState.mode === 'edit' && modalState.tripId) {
            updateTripMutation.mutate({ ...payload, id: modalState.tripId }, {
                onSuccess: () => setModalState({ ...modalState, visible: false })
            });
        }
    };`
);

fs.writeFileSync(path, code);
