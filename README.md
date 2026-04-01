# 🎉 UniEvent Connect

A comprehensive university event management platform that enables students to discover, register for, and engage in campus events while providing event organizers with robust management and moderation tools.

**Repository:** https://github.com/priyansh0602/UniEvent-connect

---

## ✨ Features

### 👨‍🎓 For Students
- **Browse Events** - Discover campus events filtered by date, category, and university
- **Easy Registration** - Register with custom event-specific forms
- **My Tickets Dashboard** - View all registrations and event details
- **Community Chat** - Join event communities with a pseudonymous identity for privacy
- **Profile Management** - Customize display name, avatar, and personal details
- **Real-time Updates** - Get instant notifications of event changes

### 👨‍💼 For Event Admins
- **Event Creation** - Create events with custom registration forms
- **Event Management** - Edit events, set deadlines, upload posters
- **Form Builder** - Design dynamic registration forms (text, dropdowns, checkboxes, etc.)
- **Registration Tracking** - View all student registrations and form responses
- **Community Moderation** - Mute users, delete messages, lock chat when needed
- **Student Profiles** - View registration details during moderation
- **Real-time Sync** - Instant updates across all dashboards

---

## 🛠️ Technology Stack

**Frontend:**
- React 18+ with Vite
- Tailwind CSS for styling
- Lucide React for icons
- React Router for navigation

**Backend:**
- Supabase (PostgreSQL database)
- Supabase Auth (Email/Password authentication)
- Supabase Real-time (WebSocket-based live chat)
- Supabase Storage (avatars & event posters)

**Development:**
- Node.js & npm
- ESLint for code quality
- PostCSS for CSS processing

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- A Supabase account (free at [supabase.com](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/priyansh0602/UniEvent-connect.git
   cd UniEvent-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── Landing.jsx          # Home page
│   ├── DemoSelect.jsx       # Role selection (student/admin)
│   ├── Login.jsx            # Login page
│   ├── Signup.jsx           # Registration page
│   ├── StudentDashboard.jsx # Student event browsing
│   └── AdminDashboard.jsx   # Admin event management
├── components/
│   ├── SettingsModal.jsx    # User profile settings
│   ├── CommunityModal.jsx   # Event chat interface
│   ├── FormBuilder.jsx      # Custom form designer
│   ├── DynamicForm.jsx      # Form renderer
│   ├── SubmissionsTable.jsx # Registration viewer
│   └── ProtectedRoute.jsx   # Auth guard
├── supabaseClient.js        # Supabase initialization
├── utils/
│   └── friendlyError.js     # Error handling utilities
└── App.jsx                  # Main app component
```

---

## 🔐 Security Features

- **Environment Variables** - Supabase keys stored in `.env.local` (never committed)
- **Role-Based Access** - Different UI and permissions for students vs. admins
- **Profile Completion** - Required before accessing chat features
- **Moderation Tools** - Admin controls for community safety
- **Privacy-First** - Students see only display names in chats; admins have full access

---

## 📚 Database Schema

### Core Tables
- **profiles** - User information (display_name, full_name, phone, degree, avatar_url)
- **universities** - University details and verification status
- **events** - Event details, posters, registration forms, chat settings
- **registrations** - Student registrations with custom form responses
- **event_chats** - Community chat messages with timestamps
- **muted_users** - Chat moderation records

---

## 🎯 User Flows

### Student Flow
1. Sign up → Choose university
2. Browse events → Filter by date/category
3. Click event → View details & registration form
4. **[Required]** Complete profile in settings
5. Submit registration form → Get ticket
6. Join event community chat (anonymously)

### Admin Flow
1. Sign up as admin → Complete profile
2. Create event → Upload poster & details
3. Build custom registration form
4. Monitor registrations in real-time
5. Moderate community chat → Mute/delete/lock as needed
6. View student profiles during moderation

---

## 🔄 Real-Time Features

- **Live Chat** - Supabase Channels for instant messaging
- **Event Sync** - Real-time updates to event lists
- **Registration Updates** - Instant visibility of new registrations
- **Moderation Actions** - Mute/delete messages instantly visible to all users

---

## 📦 Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 🐛 Known Issues & Fixes (v1.1)

- ✅ Fixed chat reloading across multiple users
- ✅ Improved real-time stability with stable subscriptions
- ✅ Profile completion warning now displays in Settings modal

---

## 🚧 Future Roadmap

- Push notifications for event updates
- Event recommendations based on interests
- Analytics dashboard for admins
- Payment integration for ticketed events
- Mobile app (React Native)
- Search and advanced filtering
- Event calendar view
- Email reminders

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team

- **Priya** - Full Stack Developer

---

## 💬 Support

For issues, questions, or feedback:
- Open an issue on [GitHub Issues](https://github.com/priyansh0602/UniEvent-connect/issues)
- Email: [your-email@example.com]

---

## 🙏 Acknowledgments

- Supabase for backend infrastructure
- React & Vite communities
- Tailwind CSS for styling
- Lucide React for beautiful icons

---

Made with ❤️ for campus communities
