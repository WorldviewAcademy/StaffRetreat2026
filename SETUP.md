# Staff Retreat Website Setup Guide

## Overview
This website allows past staff members to register their interest or commitment to attend the staff retreat and view who else is planning to attend. It uses Google Sheets as a free backend and can be hosted on GitHub Pages.

## Google Sheets Setup

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Staff Retreat Attendees" or similar
3. Create the following column headers in row 1:
   - A1: `Timestamp`
   - B1: `Name`
   - C1: `Year`
   - D1: `State`
   - E1: `City`
   - F1: `Status`

### Step 2: Create Google Apps Script

1. In your Google Sheet, click **Extensions** > **Apps Script**
2. Delete any existing code and paste the following:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.timestamp,
      data.name,
      data.year,
      data.state,
      data.city,
      data.status
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();

    // Skip header row
    const attendees = data.slice(1).map(row => ({
      timestamp: row[0],
      name: row[1],
      year: row[2],
      state: row[3],
      city: row[4],
      status: row[5]
    }));

    return ContentService.createTextOutput(JSON.stringify({
      attendees: attendees
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
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

**Note:** The form accepts comma-separated years (e.g., "2018, 2019, 2020") to accommodate staff who served multiple years. The year filter will show staff members who served in any selected year.

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

## Security Notes

- The Google Sheet is read-only through the web app
- Anyone can submit data (by design)
- To prevent spam, you could add Google reCAPTCHA
- To restrict access, change deployment permissions in Apps Script

## Need Help?

Check the browser console (press F12) for error messages. Most issues are related to:
1. Incorrect Google Sheet Web App URL
2. Apps Script permissions
3. GitHub Pages not enabled
