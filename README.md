# DocBridge - Doctor Appointment Booking System

A modern healthcare appointment booking platform built with React, enabling patients to find doctors, book appointments, and manage their medical records, while giving doctors a comprehensive dashboard to manage their practice.

![MediBook](https://img.shields.io/badge/MediBook-Healthcare%20Platform-blue)
![React](https://img.shields.io/badge/React-19.x-61DAFB)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF)
![Firebase](https://img.shields.io/badge/Firebase-12.x-FFCA28)

## Features

### For Patients
- **🔍 Doctor Search** - Find doctors by specialty, location, or name with advanced filtering
- **📅 Instant Booking** - View real-time availability and book appointments within seconds
- **🔢 Live Queue Tracking** - See current token number, your position in queue, and estimated wait time
- **📋 Appointment Management** - View, reschedule, or cancel appointments from your dashboard
- **🏥 Medical Records** - Upload and manage medical reports, prescriptions, and health documents (stored securely on Cloudinary)
- **⭐ Doctor Reviews** - Rate and review doctors after consultations
- **🔔 Notifications** - Real-time updates when your turn comes

### For Doctors
- **📊 Dashboard** - Comprehensive overview of today's appointments, pending, and completed cases
- **🔢 Live Queue Management** - Real-time queue display showing current patient and upcoming patients
- **⏭️ Queue Controls** - Mark patients complete, skip, or advance to next with automatic queue progression
- **⏰ Slot Management** - Enable/disable specific time slots or entire days
- **📈 Analytics** - View appointment statistics and patient counts
- **✅ Quick Actions** - One-click appointment completion directly from the queue

### For Admins
- **👥 User Management** - Approve/reject doctor registrations
- **📋 Platform Overview** - Monitor platform activity and user counts

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19, React Router 7 |
| Build Tool | Vite 8 |
| Styling | Custom CSS (CSS Variables) |
| State | React Context API |
| Storage | localStorage (offline-first) |
| Cloud Storage | Cloudinary (medical reports) |
| Authentication | Firebase Auth |
| Database | Firebase Firestore (optional) |

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd Doctor-Booking-System2

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary Configuration (for medical reports)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
VITE_CLOUDINARY_API_KEY=your_api_key
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── FileUpload.jsx      # Cloudinary file upload
│   ├── ImageUpload.jsx     # Profile photo upload
│   ├── Navbar.jsx          # Navigation bar
│   ├── NotificationBell.jsx # Notifications
│   ├── ProtectedRoute.jsx  # Auth protection
│   ├── StarRating.jsx      # Review ratings
│   └── SymptomChecker.jsx  # Symptom input
├── context/             # React Context providers
│   ├── AppointmentsContext.jsx # Appointments state
│   └── AuthContext.jsx     # Authentication state
├── data/                # Static data
│   └── doctors.jsx         # Doctor profiles (seed data)
├── firebase/            # Firebase configuration
│   ├── auth.js            # Firebase auth
│   ├── config.js          # Firebase init
│   ├── dataconnect.js     # Firestore operations
│   └── messaging.js       # Push notifications
├── pages/               # Page components
│   ├── Home.jsx             # Landing page
│   ├── Doctors.jsx          # Doctor search & listing
│   ├── BookAppointment.jsx  # Booking flow
│   ├── MyAppointments.jsx   # Patient appointments
│   ├── DoctorDashboard.jsx  # Doctor dashboard & queue
│   ├── MedicalReports.jsx   # Patient health vault
│   ├── Login.jsx            # Authentication
│   ├── Register.jsx         # User registration
│   └── AdminPanel.jsx       # Admin controls
├── utils/               # Utility functions
│   ├── cloudinary.js        # Cloudinary operations
│   ├── slotUtils.js         # Time slot utilities
│   └── localDB.js           # Local storage helpers
├── App.jsx              # Main app router
└── main.jsx             # Entry point
```

## Key Features Explained

### Live Queue System
The queue system allows doctors to manage their patients in real-time:
- **Current Patient Display** - Shows who's being served now
- **Auto-Advance** - Queue automatically moves to next patient when marked complete
- **Real-time Updates** - Patients see their position and estimated wait time
- **Token-based** - Each patient gets a queue number for their time slot

### Medical Records (Health Vault)
- Upload PDFs, JPEGs, or PNGs of medical documents
- Files stored securely on Cloudinary
- View and download reports directly from the dashboard
- Categorize by report type (Lab, Scan, Prescription, etc.)

### Offline-First Architecture
- All data stored in localStorage for instant access
- Works without backend connection
- Polling-based sync for real-time updates
- Falls back gracefully when Firebase is unavailable

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational purposes.

## Screenshots

### Patient Dashboard
- View upcoming and past appointments
- See queue position and wait time
- Upload and manage medical records
- Rate doctors after consultations

### Doctor Dashboard
- Today's appointment overview
- Live queue with current patient
- Slot management for availability
- Quick actions for queue control

---

Built with ❤️ for better healthcare accessibility
