// Google Sheets Configuration
// Replace these with your actual Google Sheets details after setup
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxAiQH19qU5z_kKxgNzoqD9_AazEw3ZJ4e-CoLzYFPbJcxRNoxbXCOZOriU0485F2Djrg/exec';

// State
let allAttendees = [];
let years = new Set();
let isUpdateMode = false;
let map = null;
let markers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkForExistingSubmission();
    loadAttendees();
    setupEventListeners();
    initializeMap();
});

// Event Listeners
function setupEventListeners() {
    const form = document.getElementById('interest-form');
    const yearFilter = document.getElementById('year-filter');
    const refreshBtn = document.getElementById('refresh-btn');
    const submitAsDifferent = document.getElementById('submit-as-different');
    const mapYearFilter = document.getElementById('map-year-filter');
    const editSubmissionBtn = document.getElementById('edit-submission-btn');

    form.addEventListener('submit', handleFormSubmit);
    yearFilter.addEventListener('change', filterAttendees);
    refreshBtn.addEventListener('click', loadAttendees);
    submitAsDifferent.addEventListener('click', clearSavedEmail);
    mapYearFilter.addEventListener('change', updateMapMarkers);
    editSubmissionBtn.addEventListener('click', showForm);
}

// Check for existing submission
function checkForExistingSubmission() {
    const savedEmail = localStorage.getItem('staffRetreatEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        loadUserData(savedEmail);
        hideForm(); // Hide form initially if user has already submitted
    }
}

// Show form for editing
function showForm() {
    document.getElementById('form-container').style.display = 'block';
    document.getElementById('submitted-notice').style.display = 'none';
    document.getElementById('update-mode-notice').style.display = 'block';
    document.getElementById('form-title').textContent = 'Update Your Information';
    document.getElementById('submit-btn').textContent = 'Update Info';
}

// Hide form after submission
function hideForm() {
    document.getElementById('form-container').style.display = 'none';
    document.getElementById('submitted-notice').style.display = 'block';
    document.getElementById('form-title').textContent = 'Your Submission';
}

// Load user's existing data
async function loadUserData(email) {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '?action=lookup&email=' + encodeURIComponent(email));
        const data = await response.json();

        if (data.attendee) {
            // User exists, populate form
            isUpdateMode = true;

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
    document.getElementById('submitted-notice').style.display = 'none';
    document.getElementById('form-container').style.display = 'block';
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
            'Successfully submitted! Refreshing list...';
        showMessage(successMessage, 'success');

        // Save email to localStorage
        localStorage.setItem('staffRetreatEmail', email);

        // Mark as update mode
        isUpdateMode = true;

        // Hide form after successful submission
        setTimeout(() => {
            hideForm();
        }, 2000);

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

        // Update map
        updateMapMarkers();

    } catch (error) {
        console.error('Error loading attendees:', error);
        showMessage('Error loading attendees. Using demo data.', 'error');
        loadDemoData(); // Fallback to demo data
    }
}

// Populate Year Filter Dropdown
function populateYearFilter() {
    const yearFilter = document.getElementById('year-filter');
    const mapYearFilter = document.getElementById('map-year-filter');
    const currentSelection = yearFilter.value;
    const currentMapSelection = mapYearFilter.value;

    // Clear existing options except "All Years"
    yearFilter.innerHTML = '<option value="all">All Years</option>';
    mapYearFilter.innerHTML = '<option value="all">All Years</option>';

    // Add year options sorted descending
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    sortedYears.forEach(year => {
        const option1 = document.createElement('option');
        option1.value = year;
        option1.textContent = year;
        yearFilter.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = year;
        option2.textContent = year;
        mapYearFilter.appendChild(option2);
    });

    // Restore selection if it still exists
    if (sortedYears.includes(currentSelection)) {
        yearFilter.value = currentSelection;
    }
    if (sortedYears.includes(currentMapSelection)) {
        mapYearFilter.value = currentMapSelection;
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

    // Separate by status (exclude not-going)
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
// Note: Demo data includes emails for local testing, but real API doesn't expose them
function loadDemoData() {
    allAttendees = [
        { name: 'John Doe', year: '2018, 2019', city: 'Denver', state: 'CO', status: 'interested' },
        { name: 'Jane Smith', year: '2019', city: 'Austin', state: 'TX', status: 'committed' },
        { name: 'Mike Johnson', year: '2018, 2020', city: 'Seattle', state: 'WA', status: 'committed' },
        { name: 'Sarah Williams', year: '2020', city: 'Portland', state: 'OR', status: 'not-going' },
        { name: 'Tom Brown', year: '2019, 2021', city: 'Boston', state: 'MA', status: 'interested' }
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
    updateMapMarkers();
}

// Initialize Map
function initializeMap() {
    // Define bounds for USA and Canada
    const bounds = [
        [15, -170], // Southwest coordinates (includes Hawaii and Alaska)
        [75, -50]   // Northeast coordinates (includes northern Canada)
    ];

    map = L.map('map', {
        center: [45, -100],
        zoom: 4,
        minZoom: 3,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0 // Makes it hard to drag outside bounds
    });

    // CartoDB Dark Matter style - modern and sleek
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        minZoom: 3
    }).addTo(map);
}

// Geocode city and state to coordinates
function geocodeLocation(city, state) {
    // Simple lookup table for US state capitals and major cities + Canadian provinces
    const locations = {
        // US States (using state centers/capitals for approximation)
        'AL': { lat: 32.806671, lng: -86.791130 },
        'AK': { lat: 61.370716, lng: -152.404419 },
        'AZ': { lat: 33.729759, lng: -111.431221 },
        'AR': { lat: 34.969704, lng: -92.373123 },
        'CA': { lat: 36.116203, lng: -119.681564 },
        'CO': { lat: 39.059811, lng: -105.311104 },
        'CT': { lat: 41.597782, lng: -72.755371 },
        'DE': { lat: 39.318523, lng: -75.507141 },
        'FL': { lat: 27.766279, lng: -81.686783 },
        'GA': { lat: 33.040619, lng: -83.643074 },
        'HI': { lat: 21.094318, lng: -157.498337 },
        'ID': { lat: 44.240459, lng: -114.478828 },
        'IL': { lat: 40.349457, lng: -88.986137 },
        'IN': { lat: 39.849426, lng: -86.258278 },
        'IA': { lat: 42.011539, lng: -93.210526 },
        'KS': { lat: 38.526600, lng: -96.726486 },
        'KY': { lat: 37.668140, lng: -84.670067 },
        'LA': { lat: 31.169546, lng: -91.867805 },
        'ME': { lat: 44.693947, lng: -69.381927 },
        'MD': { lat: 39.063946, lng: -76.802101 },
        'MA': { lat: 42.230171, lng: -71.530106 },
        'MI': { lat: 43.326618, lng: -84.536095 },
        'MN': { lat: 45.694454, lng: -93.900192 },
        'MS': { lat: 32.741646, lng: -89.678696 },
        'MO': { lat: 38.456085, lng: -92.288368 },
        'MT': { lat: 46.921925, lng: -110.454353 },
        'NE': { lat: 41.125370, lng: -98.268082 },
        'NV': { lat: 38.313515, lng: -117.055374 },
        'NH': { lat: 43.452492, lng: -71.563896 },
        'NJ': { lat: 40.298904, lng: -74.521011 },
        'NM': { lat: 34.840515, lng: -106.248482 },
        'NY': { lat: 42.165726, lng: -74.948051 },
        'NC': { lat: 35.630066, lng: -79.806419 },
        'ND': { lat: 47.528912, lng: -99.784012 },
        'OH': { lat: 40.388783, lng: -82.764915 },
        'OK': { lat: 35.565342, lng: -96.928917 },
        'OR': { lat: 44.572021, lng: -122.070938 },
        'PA': { lat: 40.590752, lng: -77.209755 },
        'RI': { lat: 41.680893, lng: -71.511780 },
        'SC': { lat: 33.856892, lng: -80.945007 },
        'SD': { lat: 44.299782, lng: -99.438828 },
        'TN': { lat: 35.747845, lng: -86.692345 },
        'TX': { lat: 31.054487, lng: -97.563461 },
        'UT': { lat: 40.150032, lng: -111.862434 },
        'VT': { lat: 44.045876, lng: -72.710686 },
        'VA': { lat: 37.769337, lng: -78.169968 },
        'WA': { lat: 47.400902, lng: -121.490494 },
        'DC': { lat: 38.897438, lng: -77.026817 },
        'WV': { lat: 38.491226, lng: -80.954453 },
        'WI': { lat: 44.268543, lng: -89.616508 },
        'WY': { lat: 42.755966, lng: -107.302490 },
        // Canadian Provinces
        'AB': { lat: 53.933327, lng: -116.576504 },
        'BC': { lat: 53.726669, lng: -127.647621 },
        'MB': { lat: 53.760859, lng: -98.813873 },
        'NB': { lat: 46.498390, lng: -66.159668 },
        'NL': { lat: 53.135509, lng: -57.660435 },
        'NS': { lat: 44.682003, lng: -63.744311 },
        'NT': { lat: 64.825553, lng: -124.845985 },
        'NU': { lat: 70.299760, lng: -83.107628 },
        'ON': { lat: 51.253775, lng: -85.323214 },
        'PE': { lat: 46.510712, lng: -63.416814 },
        'QC': { lat: 52.939916, lng: -73.549118 },
        'SK': { lat: 52.939916, lng: -106.450867 },
        'YT': { lat: 64.282327, lng: -135.000000 }
    };

    const coords = locations[state.toUpperCase()];
    if (coords) {
        // Add small random offset so pins don't stack perfectly
        return {
            lat: coords.lat + (Math.random() - 0.5) * 0.5,
            lng: coords.lng + (Math.random() - 0.5) * 0.5
        };
    }
    return null;
}

// Update Map Markers
function updateMapMarkers() {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const selectedYear = document.getElementById('map-year-filter').value;

    // Filter attendees by year
    let filtered = allAttendees;
    if (selectedYear !== 'all') {
        filtered = allAttendees.filter(a => {
            if (!a.year) return false;
            const years = a.year.split(',').map(y => y.trim());
            return years.includes(selectedYear);
        });
    }

    // Only show interested and committed (not "not-going")
    filtered = filtered.filter(a => a.status === 'interested' || a.status === 'committed');

    // Add markers for each attendee
    filtered.forEach(attendee => {
        const coords = geocodeLocation(attendee.city, attendee.state);
        if (coords) {
            const color = attendee.status === 'committed' ? '#006F44' : '#004A87';

            const marker = L.circleMarker([coords.lat, coords.lng], {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            // Tooltip on hover
            marker.bindTooltip(`<strong>${attendee.name}</strong><br>Year(s): ${attendee.year}`, {
                direction: 'top',
                offset: [0, -10],
                opacity: 0.9
            });

            // Popup on click
            marker.bindPopup(`
                <strong>${attendee.name}</strong><br>
                ${attendee.city}, ${attendee.state}<br>
                Year(s): ${attendee.year}<br>
                Status: ${attendee.status === 'committed' ? 'Committed' : 'Interested'}
            `);

            markers.push(marker);
        }
    });
}
