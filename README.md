# Permit to Work System

A web-based permit-to-work management system for issuing, filling in, and printing work permits. Designed for on-site use with a self-hosted Node.js server.

## Features

- **Permit types** — Hot Work, Confined Space, Electrical Isolation, Working at Height, General Work
- **Fill in permits** — authorising personnel complete questions specific to each permit type
- **Preview & print** — generates a professional, print-ready permit layout
- **Blank permits** — print empty forms for manual completion on-site
- **Customisable templates** — add, edit, or remove permit types and their fields via the built-in admin editor
- **Contractor database** — loads approved contractors from an Excel file for dropdown selection
- **Permit print log** — all printed permits are recorded for audit
- **Self-signed HTTPS** — encrypted connection out of the box
- **No database required** — templates and settings are simple JSON files

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later

### Install & Run

```bash
cd permit-system
npm install
npm start
```

Open your browser to **https://localhost:3000**

> Your browser will show a security warning for the self-signed certificate. Click **Advanced → Proceed** (or add an exception) — this is expected for local/on-site use.

### Development Mode (auto-restart on changes)

```bash
npm run dev
```

## Default Admin Password

The admin panel is protected by a password. The default is **`1234`**.

On first start, the password is automatically hashed using bcrypt and stored in `data/settings.json`. To change it, edit `data/settings.json` and set a new `adminPasswordHash` (generate with `bcrypt.hashSync(yourPassword, 10)`).

## Admin Panel

1. Click **Manage Templates** in the sidebar
2. Enter the admin password
3. Add, edit, or delete permit templates
4. Set the path to an Excel file of approved contractors
5. View the permit print log

## Project Structure

```
permit-system/
├── server.js              # Express web server & API
├── server.key             # TLS private key (self-signed)
├── server.cert            # TLS certificate (self-signed)
├── package.json
├── templates/             # Permit template JSON files
│   ├── hot-work.json
│   ├── confined-space.json
│   ├── electrical-isolation.json
│   ├── working-at-height.json
│   └── general-work.json
├── data/
│   └── settings.json      # Server settings (admin password hash, contractors file path)
├── logs/                  # Permit print log (auto-rotated)
│   └── permit-log.jsonl
├── public/                # Frontend SPA (served as static files)
│   ├── index.html         # Single-page app shell
│   ├── img/
│   │   ├── logo.png       # Company logo
│   │   └── favicon.svg    # Browser tab icon
│   ├── css/
│   │   └── style.css      # All styles including print layout
│   └── js/
│       ├── api.js          # API client
│       ├── app.js          # Navigation, home page, admin login
│       ├── permit-form.js  # Dynamic form renderer
│       ├── preview.js      # Print preview & permit HTML builder
│       └── template-editor.js  # Template editor (admin)
└── README.md
```

## Security

- **HTTPS** — server runs on TLS via a self-signed certificate
- **Password hashing** — admin password stored as a bcrypt hash
- **Rate limiting** — login endpoint limited to 5 attempts per 15 minutes
- **CSP headers** — Content Security Policy restricts script/style sources to same-origin
- **Input validation** — template IDs are sanitised against path traversal; log fields are length-limited
- **XSS escaping** — all user-controlled data is HTML-escaped in both form and preview rendering
- **Log rotation** — permit logs rotate at 10MB / 30 days with gzip compression
- **Body size limit** — JSON request bodies capped at 500KB

## Permit Numbering

Permit numbers follow the pattern `XX00001` (e.g. `HW00001` for Hot Work, `CS00001` for Confined Space). Numbers are tracked in the browser's `localStorage` and increment each time a permit is printed.

## Print Preview Mode

Toggle **Print Preview Mode** in the preview toolbar to see an on-screen simulation of the actual print layout before sending to the printer.

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/templates` | — | List all templates |
| GET | `/api/templates/:id` | — | Get single template |
| POST | `/api/templates` | Admin | Create new template |
| PUT | `/api/templates/:id` | Admin | Update template |
| DELETE | `/api/templates/:id` | Admin | Delete template |
| POST | `/api/admin/login` | Rate-limited | Admin login |
| POST | `/api/admin/logout` | Admin | Admin logout |
| GET | `/api/settings` | — | Get settings |
| PUT | `/api/settings` | Admin | Update settings |
| GET | `/api/contractors` | — | List approved contractors |
| POST | `/api/permit-log` | — | Log a printed permit |
| GET | `/api/permit-log` | Admin | View permit log |
