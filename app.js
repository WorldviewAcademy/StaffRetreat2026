// Google Sheets Configuration
// Replace these with your actual Google Sheets details after setup
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbytovQMxhxe9O5-zQiA_U2jM1fXH2ZuHtT5YuJWxib82tu5ylHhfrlDoYuvTJhDbsDP1w/exec';

// State
let allAttendees = [];
let years = new Set();
let isUpdateMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkForExistingSubmission();
    loadAttendees();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    const form = document.getElementById('interest-form');
    const yearFilter = document.getElementById('year-filter');
    const refreshBtn = document.getElementById('refresh-btn');
    const submitAsDifferent = document.getElementById('submit-as-different');

    form.addEventListener('submit', handleFormSubmit);
    yearFilter.addEventListener('change', filterAttendees);
    refreshBtn.addEventListener('click', loadAttendees);
    submitAsDifferent.addEventListener('click', clearSavedEmail);
}

// Check for existing submission
function checkForExistingSubmission() {
    const savedEmail = localStorage.getItem('staffRetreatEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        loadUserData(savedEmail);
    }
}

// Load user's existing data
async function loadUserData(email) {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '?action=lookup&email=' + encodeURIComponent(email));
        const data = await response.json();

        if (data.attendee) {
            // User exists, populate form
            isUpdateMode = true;
            document.getElementById('form-title').textContent = 'Update Your Information';
            document.getElementById('update-mode-notice').style.display = 'block';
            document.getElementById('submit-btn').textContent = 'Update Info';

            // Pre-fill form
            document.getElementById('name').value = data.attendee.name || '';
            document.getElementById('year').value = data.attendee.year || '';
            document.getElementById('state').value = data.attendee.state || '';
            document.getElementById('city').value = data.attendee.city || '';
            document.getElementById('status').value = data.attendee.status || '';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        // Silently fail - user can still submit
    }
}

// Clear saved email and reset form
function clearSavedEmail(e) {
    e.preventDefault();
    localStorage.removeItem('staffRetreatEmail');
    isUpdateMode = false;
    document.getElementById('form-title').textContent = 'Register Your Interest';
    document.getElementById('update-mode-notice').style.display = 'none';
    document.getElementById('submit-btn').textContent = 'Submit';
    document.getElementById('interest-form').reset();
}

// Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const formData = {
        email: email,
        name: document.getElementById('name').value.trim(),
        year: document.getElementById('year').value.trim(),
        state: document.getElementById('state').value,
        city: document.getElementById('city').value.trim(),
        status: document.getElementById('status').value,
        timestamp: new Date().toISOString()
    };

    showMessage(isUpdateMode ? 'Updating...' : 'Submitting...', 'success');

    try {
        // Submit to Google Sheets
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // With no-cors, we can't read the response, so we assume success
        const successMessage = isUpdateMode ?
            'Successfully updated! Refreshing list...' :
            'Successfully registered! Refreshing list...';
        showMessage(successMessage, 'success');

        // Save email to localStorage
        localStorage.setItem('staffRetreatEmail', email);

        // Switch to update mode if not already
        if (!isUpdateMode) {
            isUpdateMode = true;
            document.getElementById('form-title').textContent = 'Update Your Information';
            document.getElementById('update-mode-notice').style.display = 'block';
            document.getElementById('submit-btn').textContent = 'Update Info';
        }

        // Reload attendees after a short delay
        setTimeout(() => {
            loadAttendees();
        }, 2000);

    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('Error submitting form. Please try again.', 'error');
    }
}

// Load Attendees from Google Sheets
async function loadAttendees() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '?action=read');
        const data = await response.json();

        allAttendees = data.attendees || [];

        // Extract unique years (handling comma-separated years)
        years = new Set();
        allAttendees.forEach(a => {
            if (a.year) {
                // Split by comma and add each year
                a.year.split(',').forEach(year => {
                    const trimmedYear = year.trim();
                    if (trimmedYear) {
                        years.add(trimmedYear);
                    }
                });
            }
        });
        populateYearFilter();

        // Display attendees
        filterAttendees();

    } catch (error) {
        console.error('Error loading attendees:', error);
        showMessage('Error loading attendees. Using demo data.', 'error');
        loadDemoData(); // Fallback to demo data
    }
}

// Populate Year Filter Dropdown
function populateYearFilter() {
    const yearFilter = document.getElementById('year-filter');
    const currentSelection = yearFilter.value;

    // Clear existing options except "All Years"
    yearFilter.innerHTML = '<option value="all">All Years</option>';

    // Add year options sorted descending
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });

    // Restore selection if it still exists
    if (sortedYears.includes(currentSelection)) {
        yearFilter.value = currentSelection;
    }
}

// Filter and Display Attendees
function filterAttendees() {
    const selectedYear = document.getElementById('year-filter').value;

    let filtered = allAttendees;
    if (selectedYear !== 'all') {
        // Filter attendees who have the selected year in their comma-separated years
        filtered = allAttendees.filter(a => {
            if (!a.year) return false;
            const years = a.year.split(',').map(y => y.trim());
            return years.includes(selectedYear);
        });
    }

    // Separate by status
    const notGoing = filtered.filter(a => a.status === 'not-going');
    const interested = filtered.filter(a => a.status === 'interested');
    const committed = filtered.filter(a => a.status === 'committed');

    // Display
    displayAttendeeList('not-going-list', notGoing);
    displayAttendeeList('interested-list', interested);
    displayAttendeeList('committed-list', committed);
}

// Display Attendee List
function displayAttendeeList(elementId, attendees) {
    const container = document.getElementById(elementId);

    if (attendees.length === 0) {
        container.innerHTML = '<p class="empty">No one yet!</p>';
        return;
    }

    // Sort by name
    attendees.sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = attendees.map(attendee => `
        <div class="attendee-card">
            <div class="name">${escapeHtml(attendee.name)}</div>
            <div class="details">
                <span class="year">${escapeHtml(attendee.year)}</span>
                ${escapeHtml(attendee.city)}, ${escapeHtml(attendee.state)}
            </div>
        </div>
    `).join('');
}

// Show Message
function showMessage(text, type) {
    const messageDiv = document.getElementById('form-message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;

    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Demo Data (for testing without Google Sheets)
function loadDemoData() {
    allAttendees = [
        { email: 'john@example.com', name: 'John Doe', year: '2018, 2019', city: 'Denver', state: 'CO', status: 'interested' },
        { email: 'jane@example.com', name: 'Jane Smith', year: '2019', city: 'Austin', state: 'TX', status: 'committed' },
        { email: 'mike@example.com', name: 'Mike Johnson', year: '2018, 2020', city: 'Seattle', state: 'WA', status: 'committed' },
        { email: 'sarah@example.com', name: 'Sarah Williams', year: '2020', city: 'Portland', state: 'OR', status: 'not-going' },
        { email: 'tom@example.com', name: 'Tom Brown', year: '2019, 2021', city: 'Boston', state: 'MA', status: 'interested' }
    ];

    // Extract unique years (handling comma-separated years)
    years = new Set();
    allAttendees.forEach(a => {
        if (a.year) {
            a.year.split(',').forEach(year => {
                const trimmedYear = year.trim();
                if (trimmedYear) {
                    years.add(trimmedYear);
                }
            });
        }
    });
    populateYearFilter();
    filterAttendees();
}
