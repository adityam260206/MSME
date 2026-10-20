# SpendSense

SpendSense is a modern, responsive personal finance tracking application. It allows you to track your income and expenses, set monthly category budgets, and view analytics and historical trends of your cash flow.

## Features

- **Authentication**: JWT-based secure login and registration.
- **Dashboard**: High-level metrics, pie charts of monthly spending, and recent transaction feeds.
- **Transactions**: Full CRUD for logging your income and expenses with date-filtering and pagination.
- **Budgets**: Set monthly limits per category and track your progress in real-time with visual indicators.
- **Analytics**: 6-month historical trend analysis and savings rate calculation.
- **Reports**: Export your monthly transaction history to CSV format.
- **Security**: Hardened with Helmet.js security headers and Express rate-limiting.

## Tech Stack

### Frontend
- React 18
- Vite
- React Router DOM v6
- React Hook Form
- Recharts (Data visualization)
- date-fns (Date formatting)
- Axios (API Client)

### Backend
- Node.js & Express 5
- MongoDB & Mongoose
- JSON Web Tokens (JWT) & bcryptjs
- express-validator

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or via Atlas)

### Setup

1. **Clone the repository and install dependencies:**
   ```bash
   cd SpendSense
   cd server && npm install
   cd ../client && npm install
   ```

2. **Environment Variables:**
   - In the `server` directory, copy `.env.example` to `.env` and configure your MongoDB URI and JWT Secret.

3. **Running Locally:**
   - **Start the Backend**: `cd server && npm run dev`
   - **Start the Frontend**: `cd client && npm run dev`
   - Access the application at `http://localhost:5173`

## Design System

The frontend utilizes a custom CSS design system using native CSS variables (`client/src/styles/tokens.css`). It prioritizes:
- Glassmorphism & subtle borders
- Animated micro-interactions (fade-ins, slide-ups)
- Staggered list animations
- Full mobile responsiveness using CSS Grid/Flexbox
