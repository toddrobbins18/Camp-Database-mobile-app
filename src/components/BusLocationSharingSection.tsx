import React, { useEffect, useState } from 'react';
import { BusLocationSharingPanel } from './BusLocationSharingPanel';
import { useBusLocationTracking } from '../hooks/useBusLocationTracking';
import { useRole } from '../hooks/useRole';
import type { TransportRunRoute } from '../lib/transportRunBoard';

type Props = {
    companyId: string | null;
    season: string | null;
    runDate: string;
    timeOfDay: 'am' | 'pm';
    routes: TransportRunRoute[];
    assignedBus: string | null;
    screenFocused: boolean;
};

export function BusLocationSharingSection(props: Props) {
    const { userId } = useRole();
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

    useEffect(() => {
        if (props.routes.length === 0) {
            setSelectedRouteId(null);
            return;
        }
        if (selectedRouteId != null && props.routes.some((r) => r.id === selectedRouteId)) return;
        setSelectedRouteId(props.routes[0].id);
    }, [props.routes, selectedRouteId]);

    const selectedRoute = props.routes.find((r) => r.id === selectedRouteId) ?? props.routes[0] ?? null;

    const { tracking, permissionDenied } = useBusLocationTracking({
        companyId: props.companyId,
        season: props.season,
        runDate: props.runDate,
        timeOfDay: props.timeOfDay,
        routeId: selectedRoute?.id ?? null,
        busLabel: selectedRoute?.bus ?? null,
        userId: userId ?? null,
        screenFocused: props.screenFocused,
    });

    if (!props.companyId) return null;

    return (
        <BusLocationSharingPanel
            companyId={props.companyId}
            runDate={props.runDate}
            timeOfDay={props.timeOfDay}
            routes={props.routes}
            assignedBus={props.assignedBus}
            tracking={tracking}
            permissionDenied={permissionDenied}
            selectedRouteId={selectedRouteId}
            onRouteChange={setSelectedRouteId}
        />
    );
}
