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

## How It Works

### For the Authoriser (Issuing a Permit)
1. Go to the home page and click **Fill In Permit** on the desired permit type
2. Complete all sections — general info, precautions, PPE requirements, etc.
3. Click **Preview & Print** to see the formatted permit
4. Print the permit; the worker completes the handwritten sections on paper

### For Blank Permits
1. Click **Print Blank** on any permit type from the home page
2. The blank permit opens in print-ready format with all fields empty
3. Print it for fully manual completion

### Customising Templates
1. Click **Manage Templates** in the navigation bar
2. Edit an existing template or create a new one
3. Add/remove sections, fields, and handwritten areas
4. Supported field types: Text, Text Area, Date, Time, Checkbox, Dropdown
5. Save — changes take effect immediately

### Template JSON Structure
Templates are stored in `templates/` as JSON files. You can edit them directly if preferred:

```json
{
  "id": "my-permit",
  "name": "My Custom Permit",
  "description": "When to use this permit",
  "colour": "#3498db",
  "sections": [
    {
      "title": "Section Name",
      "type": "authoriser",
      "fields": [
        { "id": "field_id", "label": "Field Label", "type": "text", "required": true }
      ]
    }
  ],
  "handwrittenSections": [
    {
      "title": "Worker Section",
      "description": "Instructions for the worker",
      "fields": [
        { "label": "Name", "lines": 1 },
        { "label": "Signature", "lines": 1 }
      ]
    }
  ]
}
```

## Hosting on Your Company Server

1. Copy the `permit-system` folder to your server
2. Run `npm install` then `npm start`
3. To run on a specific port: `PORT=8080 npm start`
4. For production, consider using [PM2](https://pm2.keymetrics.io/) to keep the app running:
   ```bash
   npm install -g pm2
   pm2 start server.js --name permit-system
   pm2 save
   pm2 startup
   ```

## Company Branding

The company name ("Scottish Shellfish") and logo are configured in:
- `public/js/preview.js` — the `buildPermitHtml` function (printed permits)
- `public/index.html` — the navbar brand
- `public/img/logo.png` — the logo image file
