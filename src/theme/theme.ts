export const theme = {
    colors: {
        primary: '#0a1e42',    // Deep Navy (Sidebar)
        secondary: '#2563eb',  // Bright Blue (Buttons, Active links)
        background: '#f4f6f8', // Light Gray (App Background)
        surface: '#ffffff',    // White (Cards)
        text: '#1f2937',       // Dark Gray (Primary Text)
        textSecondary: '#6b7280', // Medium Gray (Secondary Text)
        border: '#e5e7eb',     // Light Border
        success: '#22c55e',    // Green (Active Status)
        warning: '#f59e0b',    // Orange/Yellow (Warnings, Weather Sun)
        danger: '#ef4444',     // Red (Errors, Delete)
        icon: '#9ca3af',       // Passive Icon
        accent: '#fa8c16',     // Orange - Highlights/Weather

        // Specific UI colors from screenshot
        sidebarActiveBg: '#1e3a8a', // A slightly lighter navy for active menu items
        weatherBg: '#eff6ff',       // Light Blue bg for weather widget
        menuCardBg: '#fef3c7',      // Light Orange bg for menu header (example in screenshot) - actually standard white cards
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
    },
    typography: {
        h1: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
        h2: { fontSize: 24, fontWeight: '600', color: '#1f2937' },
        h3: { fontSize: 20, fontWeight: '600', color: '#1f2937' },
        body: { fontSize: 16, color: '#1f2937' },
        bodySmall: { fontSize: 14, color: '#6b7280' },
        caption: { fontSize: 12, color: '#9ca3af' },
    },
    shadows: {
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
        },
    },
} as const;
