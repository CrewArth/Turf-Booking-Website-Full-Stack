## Cricket Turf Booking System
A full-stack web application for booking cricket turf slots online. This project provides a seamless booking experience for cricket enthusiasts looking to reserve turf time slots.

## Try it here: https://turf106.vercel.app

## _🏏 Features_
- Beautiful Landing Page: Responsive design with Hero, Gallery, and Contact sections
- Mobile-Optimized: User-friendly interface optimized for mobile devices
- Authentication System: Secure login using Clerk authentication
- Advanced Booking System: Interactive hourly slot booking with availability display
- Payment Integration: Seamless payments through Razorpay
- Ticket Generation: Unique QR-based ticket system for easy verification
- Admin Dashboard: Comprehensive tools for managing slots, turfs, and gallery content

## _🛠️ Tech Stack_
- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Next.js
- Database: MongoDB
- Authentication: Clerk
- Payments: Razorpay

## _📱 Key Implementation Details_
- Server-side rendering for optimal performance.
- RESTful API design with proper error handling.
- Responsive UI with Tailwind CSS
- Secure payment processing
- Date and time management for slot bookings
- Admin features for content and booking management

## 📋 Installation
### Prerequisites
- **Node.js** (v16 or newer)
- **npm** or **yarn**
- **MongoDB** account or local installation
- **Razorpay** developer account
- **Firebase** project with Phone Authentication enabled

### Clone the Repository

```bash
git clone https://github.com/CrewArth/Turf-Booking-Website-Full-Stack.git
cd Turf-Booking-Website-Full-Stack
```

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:
```bash
# MongoDB
MONGODB_URI=your_mongodb_connection_string

#Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Next Auth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build for Production

```bash
npm run build
# or
yarn build
```

### Start Production Server

```bash
npm start
# or
yarn start
```

## 🔐 Admin Setup
After installation:
1. **Create Admin User**: Register using the application's signup process
2. 
2. **Update Database**: Manually update the user role to 'admin' in the MongoDB database
3. **Access Admin Panel**: Navigate to `/admin` route after logging in as admin

## 📱 Key Implementation Details
- Server-side rendering for optimal performance
- RESTful API design with proper error handling
- Responsive UI with Tailwind CSS
- Secure payment processing
- Date and time management for slot bookings
- Admin features for content and booking management

This application demonstrates modern web development practices while providing a practical solution for cricket turf management. Perfect for businesses looking to digitize their sports facility booking process.
