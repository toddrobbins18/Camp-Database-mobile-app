# DataCamp Mobile App (The Nest)

Welcome to the **DataCamp Mobile** project (internally known as **The Nest**)! This is a comprehensive React Native application built with **Expo**, fully compatible with Android, iOS, and Web. It serves as the central management tool for camp operations, campers, staff, and schedules.

## 🚀 Getting Started

Follow these instructions to set up your development environment and run the project locally.

### 1. Prerequisites

Ensure you have the following installed on your machine:
*   **Node.js** (LTS version recommended): [Download Node.js](https://nodejs.org/)
*   **npm** (comes with Node.js) or **yarn**.
*   **Git**: [Download Git](https://git-scm.com/)

### 2. Clone the Repository

Clone the project to your local machine:
```bash
git clone <repository-url>
cd Camp-Database-mobile-app
```

### 3. Install Dependencies

Install all the required packages (dependencies) listed in `package.json`.
```bash
npm install
```

### 4. Running the App

Start the development server:
```bash
npx expo start
```

This will open a terminal UI where you can choose how to launch the app:
*   Press **`a`** to open on **Android Emulator** (or connected device).
*   Press **`i`** to open on **iOS Simulator** (macOS only).
*   Press **`w`** to open in the **Web Browser**.

## 📱 Features

The application is organized into a main Drawer navigation with the following modules:

### Main Operations
*   **Dashboard**: Overview of daily activities and important alerts.
*   **Camper Management**: Comprehensive camper profiles, details, and lists.
*   **Staff Management**: Manage staff profiles and details.
*   **Master Calendar**: View camp-wide schedules and events.
*   **Messages**: Internal messaging system.
*   **Daily News**: Camp announcements and updates.

### Health & Safety
*   **Nurse / Health**: Medical records, medication schedules, and health logging.
*   **Incident Reports**: Log and track incidents/accidents.

### Activities & Programming
*   **Activities & Field Trips**: Schedule and manage off-camp trips and special activities.
*   **Sports Academy**: Sports schedules, team management (Freshmen, Junior, Senior, etc.).
*   **Sports Calendar**: Dedicated calendar for sports events.
*   **Rainy Day Schedule**: Alternative schedules for inclement weather.
*   **Special Events & Evening Activities**: Programming for special occasions.
*   **Awards**: Track and assign camper awards.

### Logistics & Operations
*   **Menu**: Dining hall menus and meal planning.
*   **Special Meals**: Dietary restrictions and special meal requests.
*   **Transportation**: Bus routes, pick-up/drop-off management.
*   **OD Management**: Officer of the Day schedules and tasks.
*   **Roster Templates**: Tools for generating bunk/activity rosters.
*   **Tutoring & Therapy**: Schedule one-on-one sessions.
*   **Reports**: Generate various operational reports.

### Administration
*   **Admin Panel**: General system settings.
*   **User Approvals**: Manage new user sign-ups and access requests.
*   **Role & Division Permissions**: Configure access control levels.
*   **Evaluation Questions**: Manage staff/camper evaluation forms.

## 🛠 Tech Stack

*   **Framework**: React Native (Expo SDK 54)
*   **Language**: TypeScript
*   **Navigation**: React Navigation (Drawer & Stack)
*   **UI Components**: React Native Elements + Custom Components
*   **Styling**: StyleSheet API (Centralized Theme in `src/theme/theme.ts`)
*   **Backend**: Supabase (Client configured in `src/supabase`)
*   **Icons**: Ionicons (@expo/vector-icons)

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components (buttons, cards, inputs)
├── navigation/     # Navigation setup (AppNavigator.tsx, Drawer config)
├── screens/        # Individual app screens (one file per screen)
├── theme/          # Centralized styling constants (Colors, Spacing)
└── supabase/       # Supabase client configuration and types
```

## ⚠️ Troubleshooting

*   **Web Build Errors**: If you encounter errors running on web, try clearing the cache:
    ```bash
    npx expo start --web -c
    ```
*   **Dependency Conflicts**: If you pull new changes and the app crashes, try reinstalling dependencies:
    ```bash
    rm -rf node_modules
    npm install
    ```
