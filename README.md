# Inventory Dump Log

A web application for scanning QR codes and logging inventory destructions to Google Sheets with automatic timestamps.

## Features

- **QR Code Scanning**: Scan QR codes or manually enter Product IDs
- **Destruction Logging**: Log inventory dumps with quantity, employee name, and reason
- **Google Sheets Integration**: Automatically saves all entries to Google Sheets
- **Dump History**: Track all destruction entries with timestamps
- **981 Inventory Items**: Real-time data from Google Sheet

## Setup

### Prerequisites
- Node.js 22.13.0
- pnpm package manager
- Google Apps Script deployment URL

### Installation

```bash
cd /home/ubuntu/inventory-destruction-logger
pnpm install
pnpm dev --port 3003
```

The app will be available at `http://localhost:3003`

## Google Apps Script Integration

The app uses a Google Apps Script API to:
- Fetch inventory items from the Product Inventory sheet
- Log destruction entries to monthly sheets
- Send daily and monthly email summaries

**Deployment URL**: https://script.google.com/macros/s/AKfycbzJQgz9cSiEszPrys-EyMX8offgJDk18tDNeorwjbDGhdViirn8jo_sXJnztwED6eaT/exec

## Project Structure

```
client/
  src/
    pages/Home.tsx          - Main app component
    components/             - Reusable UI components
    index.css              - Global styles
  public/                  - Static files
package.json              - Dependencies
```

## Recovery Instructions

If the app needs to be recovered:

1. **Check git history**:
   ```bash
   cd /home/ubuntu/inventory-destruction-logger
   git log --oneline
   ```

2. **Restore from a commit**:
   ```bash
   git reset --hard <commit-hash>
   ```

3. **Reinstall dependencies**:
   ```bash
   pnpm install
   ```

4. **Start the dev server**:
   ```bash
   pnpm dev --port 3003
   ```

## Git Commits

- `2e523743` - Initial commit: Inventory Dump Log with 981 items from Google Sheet

## Support

For issues or questions, contact the development team.
