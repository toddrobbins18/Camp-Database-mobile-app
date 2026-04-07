import React from 'react';
import { CalendarWidget, type CalendarWidgetProps } from './CalendarWidget';

const DEFAULT_VIEWS: NonNullable<CalendarWidgetProps['views']> = ['Month', 'Week', 'Day', 'Agenda'];

/**
 * Shared calendar entry point for all app calendars.
 * Keeps one reusable behavior profile (views + zoom + nav) across screens.
 */
export function UnifiedCalendar({
    views = DEFAULT_VIEWS,
    showZoom = true,
    showNavigation = true,
    ...props
}: CalendarWidgetProps) {
    return (
        <CalendarWidget
            {...props}
            views={views}
            showZoom={showZoom}
            showNavigation={showNavigation}
        />
    );
}

export type { CalendarWidgetEvent, CalendarViewMode, CalendarWidgetProps } from './CalendarWidget';

