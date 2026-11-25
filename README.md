# Apex Trade Hub

Role & Goal:

Act as a full-stack web developer and build a complete prototype for "Recon Finance," a modern online trading platform. The application should follow modern design standards (dark navy background, metallic gold accents, clean typography) and include a responsive landing page, an admin approval flow, and a user trading dashboard.



Security Requirement:

Ensure all authentication flows adhere to web security standards. Never store or display plain-text passwords. Use secure password hashing (e.g., bcrypt) on the backend and manage session states safely using status flags.



1. Landing Page & Design System

- Theme: Corporate Luxury / Modern Fintech (Colors: Navy `#0B1B3D`, Gold/Amber `#D4AF37`, Off-White/Slate background for content sections).

- Components:

  * Sticky header with logo, navigation links, and "Sign In" / "Register" CTAs.

  * Hero section with high-contrast typography, brand tagline, dual CTAs, and background visual elements.

  * Interactive features grid displaying core platform features using card components and minimalist outline icons.

  * Live financial chart widget (e.g., embedding a read-only TradingView or Lightweight Charts component).



2. User Authentication & Registration Flow

- Sign Up Form: Modal or dedicated page capturing Full Name, Email, Phone Number, Country, and Username.

- Password Handling: Accept password securely; hash it server-side before storing.

- Registration Logic:

  * Upon form submission, create user record with status `PENDING_APPROVAL`.

  * Display a confirmation banner: "Registration successful. Your account is pending administrator approval."

  * Redirect user to the Login page.

- Sign In Logic:

  * Validate email and password.

  * If credentials are correct but status is `PENDING_APPROVAL`, prevent login and display: "Account awaiting administrator approval."

  * If status is `ACTIVE`, grant access and redirect to the User Dashboard.



3. Administrative Panel (/admin)

- Access: Secure admin route accessible via dedicated admin credentials.

- Interface: Responsive admin dashboard listing registered users.

- Data Displayed: User ID, Name, Email, Country, Registration Date, and Current Status (`PENDING_APPROVAL`, `ACTIVE`, `DECLINED`).

- Actions:

  * "Approve" button: Updates user status to `ACTIVE`.

  * "Decline" button: Updates user status to `DECLINED`.



4. User Trading Dashboard

- Layout: Modern 2026-style interface featuring a collapsible sidebar / hamburger menu for mobile.

- Features:

  * Portfolio balance overview (Total Balance, Equity, P&L).

  * Main view with interactive price charts and timeframes.

  * Navigation items for Deposit, Trade History, Analytics, and Account Settings.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://noble-asset-desk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5bc1fe76-6c85-4ed6-ae67-8323f4246594).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
