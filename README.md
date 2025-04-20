# DartCounter2

This is a web-based Dart scoring application built with React, TypeScript, Node.js, Express, and Prisma.

## Features

*   X01 Game Mode (301, 501, etc.)
*   Player management
*   Real-time scoring
*   Bust detection
*   Checkout validation (Straight, Double-Out, Triple-Out)
*   Undo functionality
*   Persistent player statistics
*   Settings configuration

## Tech Stack

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend:** Node.js, Express, TypeScript
*   **Database:** Prisma, SQLite

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/HobbyMogli/dartcounter2.git
    cd dartcounter2
    ```
2.  Install frontend dependencies:
    ```bash
    npm install
    # or
    # yarn install
    ```
3.  Install backend dependencies:
    ```bash
    cd server
    npm install
    # or
    # yarn install
    cd ..
    ```
4.  Set up the database:
    ```bash
    npx prisma migrate dev --name init
    ```

### Running the Application

1.  Start the backend server:
    ```bash
    cd server
    npm run dev
    ```
2.  In a separate terminal, start the frontend development server:
    ```bash
    npm run dev
    ```

The application should now be running at `http://localhost:5173`.
