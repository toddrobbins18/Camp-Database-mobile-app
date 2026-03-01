const fs = require('fs');
const path = 'e:/DataCamp/datacamp-mobile/src/screens/TransportScreen.tsx';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings for replacement
code = code.replace(/\r\n/g, '\n');

// 1. Fix handleDeleteTrip
const oldDelete = `    const handleDeleteTrip = () => {
        if (tripToDelete) {
            setTrips(prev => prev.filter(t => t.id !== tripToDelete));
            setTripToDelete(null);
        }
    };`;
const newDelete = `    const handleDeleteTrip = () => {
        if (tripToDelete) {
            deleteTripMutation.mutate(tripToDelete, {
                onSuccess: () => setTripToDelete(null)
            });
        }
    };`;
code = code.replace(oldDelete.replace(/\r\n/g, '\n'), newDelete);

// 2. Fix handleSaveTrip
const oldSave = `    const handleSaveTrip = () => {
        if (modalState.mode === 'add') {
            setTrips(prev => [tripFormData, ...prev]);
        } else {
            setTrips(prev => prev.map(t => t.id === modalState.tripId ? tripFormData : t));
        }
        setModalState({ ...modalState, visible: false });
    };`;
const newSave = `    const handleSaveTrip = () => {
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
    };`;
code = code.replace(oldSave.replace(/\r\n/g, '\n'), newSave);

fs.writeFileSync(path, code);
console.log("Replacements complete.");
