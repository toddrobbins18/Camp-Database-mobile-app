# DataCamp Mobile App

Welcome to the **DataCamp Mobile** project! This is a React Native application built with **Expo**, fully compatible with Android, iOS, and Web.

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
cd datacamp-mobile
```
*(Note: Replace `<repository-url>` with the actual URL if this is hosted on GitHub/GitLab)*

### 3. Install Dependencies

Install all the required packages (dependencies) listed in `package.json`. This command will automatically download everything your team needs.

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

### 5. Troubleshooting Common Issues

*   **Web Build Errors**: If you encounter errors running on web, try clearing the cache:
    ```bash
    npx expo start --web -c
    ```
*   **Dependency Conflicts**: If you pull new changes and the app crashes, try reinstalling dependencies:
    ```bash
    rm -rf node_modules
    npm install
    ```

## 🛠 Tech Stack

*   **Framework**: React Native (Expo SDK 54)
*   **Language**: TypeScript
*   **Navigation**: React Navigation (Drawer & Stack)
*   **Styling**: StyleSheet API (Custom Theme in `src/theme/theme.ts`)
*   **Backend**: Supabase (Integration pending)
*   **Web Support**: React Native Web

## 📁 Project Structure

*   `src/components`: Reusable UI components (buttons, cards).
*   `src/screens`: Individual app screens (Dashboard, Camper, Staff, etc.).
*   `src/navigation`: Navigation configuration (Drawer setup).
*   `src/theme`: Centralized styling constants (Colors, Spacing).

Happy Coding! ⛺️
