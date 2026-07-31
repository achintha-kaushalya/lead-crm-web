# Lead CRM Web App

A professional CRM web portal for managing leads, linked to Google Sheets as the real-time database.

## Features
- 🔐 Simple login with email + password
- 📋 Live embedded Google Sheet (Master Leads, Summary, Members tabs)
- ➕ Add New Lead panel
- 🔍 Search Number panel
- 📞 Call Log panel (with local storage)
- 📊 Today's call stats in sidebar

## Credentials (Phase 1)
- Email: `decima@gmail.com`
- Password: `Decima@123`

## How to Deploy on Vercel
1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and sign up/login.
3. Click **"Add New Project"** → Import your GitHub repository.
4. Vercel will auto-detect this as a static site. Click **Deploy**.
5. Your live URL will be: `https://your-project-name.vercel.app`

## Project Structure
```
lead-crm-web/
├── index.html          ← Login page
├── dashboard.html      ← Main dashboard
├── vercel.json         ← Vercel config
├── styles/
│   ├── login.css
│   └── dashboard.css
└── scripts/
    ├── auth.js
    └── dashboard.js
```

## Future Phases
- Phase 2: Live CRUD via Google Apps Script Web App API (Add Lead / Search will be fully functional)
- Phase 3: Role-based login (Google OAuth per team member)
- Phase 4: Facebook Lead Ads webhook integration
