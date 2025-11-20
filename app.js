// Google Sheets Configuration
// Replace these with your actual Google Sheets details after setup
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbytovQMxhxe9O5-zQiA_U2jM1fXH2ZuHtT5YuJWxib82tu5ylHhfrlDoYuvTJhDbsDP1w/exec';

// State
let allAttendees = [];
let years = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAttendees();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    const form = document.getElementById('interest-form');
    const yearFilter = document.getElementById('year-filter');
    const refreshBtn = document.getElementById('refresh-btn');

    form.addEventListener('submit', handleFormSubmit);
    yearFilter.addEventListener('change', filterAttendees);
    refreshBtn.addEventListener('click', loadAttendees);
}

// Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name').value.trim(),
        year: document.getElementById('year').value.trim(),
        location: document.getElementById('location').value.trim(),
        status: document.getElementById('status').value,
        timestamp: new Date().toISOString()
    };

    showMessage('Submitting...', 'success');

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
        showMessage('Successfully registered! Refreshing list...', 'success');

        // Reset form
        document.getElementById('interest-form').reset();

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

        // Extract unique years
        years = new Set(allAttendees.map(a => a.year));
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
        filtered = allAttendees.filter(a => a.year === selectedYear);
    }

    // Separate by status
    const interested = filtered.filter(a => a.status === 'interested');
    const committed = filtered.filter(a => a.status === 'committed');

    // Display
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
                ${escapeHtml(attendee.location)}
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
        { name: 'John Doe', year: '2018', location: 'Denver, CO', status: 'interested' },
        { name: 'Jane Smith', year: '2019', location: 'Austin, TX', status: 'committed' },
        { name: 'Mike Johnson', year: '2018', location: 'Seattle, WA', status: 'committed' },
        { name: 'Sarah Williams', year: '2020', location: 'Portland, OR', status: 'interested' },
        { name: 'Tom Brown', year: '2019', location: 'Boston, MA', status: 'interested' }
    ];

    years = new Set(allAttendees.map(a => a.year));
    populateYearFilter();
    filterAttendees();
}
