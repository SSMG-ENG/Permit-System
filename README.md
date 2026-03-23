# Permit to Work System

A web-based permit-to-work management system for issuing, filling in, and printing work permits.

## Features

- **Select a permit type** from the home screen (Hot Work, Confined Space, Electrical Isolation, Working at Height, Excavation)
- **Fill in the permit** — the authorising person answers questions specific to the selected permit type
- **Preview & print** — generates a professional, print-ready permit layout
- **Print blank permits** — print an empty permit form for manual completion
- **Customisable templates** — add, edit, or remove permit types and their questions/fields via the built-in template editor
- **No database required** — templates are stored as simple JSON files that are easy to back up and version-control

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later

### Install & Run

```bash
cd permit-system
npm install
npm start
```

Open your browser to **http://localhost:3000**

### Development Mode (auto-restart on changes)

```bash
npm run dev
```

## Project Structure

```
permit-system/
├── server.js              # Express web server & API
├── package.json
├── templates/             # Permit template JSON files (customisable)
│   ├── hot-work.json
│   ├── confined-space.json
│   ├── electrical-isolation.json
│   ├── working-at-height.json
│   └── excavation.json
├── public/                # Frontend (served as static files)
│   ├── index.html         # Single-page app shell
│   ├── css/
│   │   └── style.css      # Styles including print layout
│   └── js/
│       ├── api.js          # API client
│       ├── app.js          # Navigation & home page
│       ├── permit-form.js  # Dynamic form renderer
│       ├── preview.js      # Print preview renderer
│       └── template-editor.js  # Admin template editor
└── README.md
```

# ...existing code...
