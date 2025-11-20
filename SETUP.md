# Staff Retreat Website Setup Guide

## Overview
This website allows past staff members to register their interest or commitment to attend the staff retreat and view who else is planning to attend. It uses Google Sheets as a free backend and can be hosted on GitHub Pages.

## Google Sheets Setup

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Staff Retreat Attendees" or similar
3. Create the following column headers in row 1:
   - A1: `Timestamp`
   - B1: `Email`
   - C1: `Name`
   - D1: `Year`
   - E1: `State`
   - F1: `City`
   - G1: `Status`

### Step 2: Create Google Apps Script

1. In your Google Sheet, click **Extensions** > **Apps Script**
2. Delete any existing code and paste the following:

```javascript
// Validation functions
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeString(str, maxLength) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

function isValidYear(year) {
  // Allow comma-separated years like "2018, 2019, 2020"
  const years = year.split(',').map(y => y.trim());
  return years.every(y => /^\d{4}$/.test(y) && parseInt(y) >= 1996 && parseInt(y) <= 2026);
}

function isValidState(state) {
  const validStates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','DC','WV','WI','WY','AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
  return validStates.includes(state.toUpperCase());
}

// Rate limiting using PropertiesService
function checkRateLimit(email) {
  const props = PropertiesService.getScriptProperties();
  const key = 'ratelimit_' + email;
  const now = Date.now();
  const lastSubmission = props.getProperty(key);

  // Allow one submission per email every 30 seconds
  if (lastSubmission && (now - parseInt(lastSubmission)) < 30000) {
    return false;
  }

  props.setProperty(key, now.toString());
  return true;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Input validation
    if (!data.email || !isValidEmail(data.email)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Invalid email address'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!data.name || data.name.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Name is required'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!data.year || !isValidYear(data.year)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Invalid year format'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!data.state || !isValidState(data.state)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Invalid state/province'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!data.city || data.city.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'City is required'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!['interested', 'committed', 'not-going'].includes(data.status)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Invalid status'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Rate limiting
    if (!checkRateLimit(data.email)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Please wait before submitting again'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Sanitize inputs
    const sanitizedData = {
      email: sanitizeString(data.email, 100).toLowerCase(),
      name: sanitizeString(data.name, 100),
      year: sanitizeString(data.year, 50),
      state: sanitizeString(data.state, 10).toUpperCase(),
      city: sanitizeString(data.city, 100),
      status: data.status,
      timestamp: new Date().toISOString()
    };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const allData = sheet.getDataRange().getValues();
    let existingRowIndex = -1;

    // Check if email already exists
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][1] === sanitizedData.email) {
        existingRowIndex = i + 1;
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Update existing row
      sheet.getRange(existingRowIndex, 1, 1, 7).setValues([[
        sanitizedData.timestamp,
        sanitizedData.email,
        sanitizedData.name,
        sanitizedData.year,
        sanitizedData.state,
        sanitizedData.city,
        sanitizedData.status
      ]]);
    } else {
      // Append new row
      sheet.appendRow([
        sanitizedData.timestamp,
        sanitizedData.email,
        sanitizedData.name,
        sanitizedData.year,
        sanitizedData.state,
        sanitizedData.city,
        sanitizedData.status
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'An error occurred. Please try again.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const params = e.parameter;

    // Handle email lookup (only returns data for matching email - keeps email private)
    if (params.action === 'lookup' && params.email) {
      if (!isValidEmail(params.email)) {
        return ContentService.createTextOutput(JSON.stringify({
          attendee: null
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const data = sheet.getDataRange().getValues();
      const sanitizedEmail = params.email.trim().toLowerCase();

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === sanitizedEmail) {
          return ContentService.createTextOutput(JSON.stringify({
            attendee: {
              email: data[i][1],
              name: data[i][2],
              year: data[i][3],
              state: data[i][4],
              city: data[i][5],
              status: data[i][6]
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        attendee: null
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: return all attendees WITHOUT emails (security improvement)
    const data = sheet.getDataRange().getValues();

    const attendees = data.slice(1).map(row => ({
      name: row[2],
      year: row[3],
      state: row[4],
      city: row[5],
      status: row[6]
    }));

    return ContentService.createTextOutput(JSON.stringify({
      attendees: attendees
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      attendees: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Save** (disk icon)
4. Click **Deploy** > **New deployment**
5. Click the gear icon next to "Select type" and choose **Web app**
6. Configure deployment:
   - Description: "Staff Retreat API"
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**
8. Review permissions and click **Authorize access**
9. Choose your Google account and allow access
10. **Copy the Web app URL** - you'll need this!

### Step 3: Configure the Website

1. Open `app.js` in your project
2. Find this line near the top:
   ```javascript
   const GOOGLE_SHEET_URL = 'YOUR_GOOGLE_SHEET_WEB_APP_URL';
   ```
3. Replace `'YOUR_GOOGLE_SHEET_WEB_APP_URL'` with the URL you copied from the Apps Script deployment (keep the quotes)
4. Save the file

**Important Notes:**
- The form accepts comma-separated years (e.g., "2018, 2019, 2020") to accommodate staff who served multiple years. The year filter will show staff members who served in any selected year.
- Users can update their information by returning to the site - their email is saved in browser localStorage and their data will be pre-filled.
- The system automatically updates existing entries when someone submits with the same email address.
- Three status options are available: "Not Going", "Interested", and "Committed".

**Security Features:**
- ✅ Email addresses are NOT exposed in the public API (only visible to you in the Google Sheet)
- ✅ Rate limiting: One submission per email every 30 seconds
- ✅ Input validation: Email format, year format, state codes, name/city length
- ✅ Input sanitization: All data is trimmed and length-limited
- ✅ Error messages don't expose internal details
- ✅ XSS protection: HTML escaping on frontend display

## GitHub Pages Setup

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon (top right) and select **New repository**
3. Name it `staff-retreat` or similar
4. Make it **Public**
5. Click **Create repository**

### Step 2: Upload Your Files

Using Git command line:
```bash
cd /Users/nathanhulet/All\ Files/WVA/Projects/staffretreat
git init
git add index.html styles.css app.js
git commit -m "Initial commit: Staff retreat website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/staff-retreat.git
git push -u origin main
```

Or upload manually through GitHub website:
1. In your new repository, click **uploading an existing file**
2. Drag and drop: `index.html`, `styles.css`, and `app.js`
3. Click **Commit changes**

### Step 3: Enable GitHub Pages

1. In your repository, go to **Settings**
2. Click **Pages** in the left sidebar
3. Under "Source", select **main** branch
4. Click **Save**
5. Wait a minute, then refresh - you'll see your site URL: `https://YOUR_USERNAME.github.io/staff-retreat/`

## Testing

1. Visit your GitHub Pages URL
2. You should see demo data initially
3. Try submitting the form - after 2 seconds it will refresh and load data from your Google Sheet
4. Test the year filter
5. Check your Google Sheet to confirm data was saved

## Troubleshooting

### Form submissions not saving
- Check that your Google Apps Script is deployed as "Anyone" can access
- Verify the GOOGLE_SHEET_URL in app.js is correct
- Check the browser console (F12) for errors

### Data not loading
- Open your Google Sheet Web App URL directly in a browser - you should see JSON data
- Check if there are any CORS errors in the browser console
- Make sure the Apps Script doGet function is working

### GitHub Pages not updating
- Changes can take a few minutes to appear
- Try clearing your browser cache
- Check GitHub Actions tab for build errors

## Customization

### Change Colors
Edit `styles.css` - the main gradient colors are defined at the top:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Add More Fields
1. Add column headers in your Google Sheet
2. Update the Apps Script to include the new fields
3. Add form inputs in `index.html`
4. Update the form submission in `app.js`

### Remove Demo Data
In `app.js`, you can remove or modify the `loadDemoData()` function once your Google Sheet is working.

## Maintenance

- **Updating data**: Just edit directly in the Google Sheet
- **Removing duplicates**: Delete rows in the Google Sheet
- **Backing up**: File > Download in Google Sheets

## Security & Privacy

### What's Protected:
- ✅ **Email addresses are private** - Not exposed in public API, only you can see them in your Google Sheet
- ✅ **Rate limiting** - Prevents spam (30-second cooldown per email)
- ✅ **Input validation** - All data is validated and sanitized before saving
- ✅ **XSS protection** - HTML escaping prevents script injection
- ✅ **HTTPS enforced** - All communication is encrypted
- ✅ **Google Sheet access** - Only your account can directly access the sheet

### What's Public (By Design):
- Names, years served, city, state, and status are visible to anyone visiting the site
- This is intentional for a staff retreat where people want to see who's attending

### Deployment Security:
- The Google Sheet itself is private to your account
- The Apps Script runs as you and can only modify this specific spreadsheet
- "Anyone" access means anyone can use the API endpoints (read attendee list, submit forms)
- They CANNOT access your Google Drive, email, or other personal data

### Additional Protection (Optional):
- Add Google reCAPTCHA to prevent bots
- Change deployment to "Anyone with the link" instead of "Anyone" (requires users to know the URL)
- Set up email notifications when new entries are added

## Need Help?

Check the browser console (press F12) for error messages. Most issues are related to:
1. Incorrect Google Sheet Web App URL
2. Apps Script permissions
3. GitHub Pages not enabled
