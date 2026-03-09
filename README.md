# Inventory Dump Log

A web application for logging destroyed inventory items with QR code scanning and Google Sheets integration.

## Features

- **QR Code Scanning**: Quickly scan product QR codes to log inventory destruction
- **Manual Entry**: Enter product IDs manually if QR codes are unavailable
- **Category Filtering**: Browse items by 26 different categories (United, Maola, Frozen, etc.)
- **Search Functionality**: Find items by name or product ID
- **Google Sheets Integration**: All destruction logs are automatically saved to Google Sheets
- **Automated Email Summaries**: Daily summaries at 6 PM and monthly reports with PDF attachments
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Radix UI for accessible components
- @zxing/library for QR code scanning
- Google Apps Script for backend integration

## Getting Started

### Development

```bash
pnpm install
pnpm dev
```

The app will be available at `http://localhost:5173`

### Production Build

```bash
pnpm build
```

The built files will be in the `dist/public` directory.

## Google Sheets Setup

The app integrates with Google Sheets using the following:
- **Sheet ID**: 1a3blj44GREZyPm9hnTxuOkzL5hJj3at2a6gHBEERdok
- **Google Apps Script Endpoint**: https://script.google.com/macros/s/AKfycbw6dOUyDuyAUfMq98E4hCtAXYN5eiVS3luCAP54wbvDZHDkUShcWQIKN7ZbuS2bH7XntA/exec

## Features

- Fetches inventory data from Google Sheets
- Logs destruction events with timestamps
- Creates monthly sheets for organization
- Sends daily email summaries at 6 PM
- Sends monthly email summaries with PDF attachments

## License

MIT
