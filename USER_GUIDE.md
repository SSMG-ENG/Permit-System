# Permit System — User Guide

This guide explains how to use the Permit System web application for issuing, filling in, and printing work permits.

## Accessing the System

1. Open your web browser and go to **http://localhost:3000** (or your server's address).
2. The home page displays available permit types (e.g., Hot Work, Confined Space, Electrical Isolation, Working at Height, Excavation).

## Filling in a Permit

1. Click **Fill In Permit** on the desired permit type.
2. Complete all required fields in each section (general info, precautions, PPE, etc.).
3. When finished, click **Preview & Print** to see the formatted permit.
4. Print the permit. The worker can complete any handwritten sections on paper.

## Printing a Blank Permit

1. On the home page, click **Print Blank** for any permit type.
2. A print-ready blank permit will open.
3. Print it for manual completion.

## Managing Permit Templates

1. Click **Manage Templates** in the navigation bar.
2. Edit an existing template or create a new one.
3. Add or remove sections, fields, and handwritten areas as needed.
4. Supported field types: Text, Text Area, Date, Time, Checkbox, Dropdown.
5. Click **Save** — changes are applied immediately.

## Customising Company Branding

- To change the company name or logo, update:
  - `public/js/preview.js` (printed permits)
  - `public/index.html` (navbar brand)
  - `public/img/logo.png` (logo image)

## Troubleshooting

- If the app does not load, ensure the server is running (`npm start` in the project folder).
- For template errors, check the JSON format in the `templates/` folder or use the built-in template editor.

For further help, contact your system administrator or refer to the main README for technical details.