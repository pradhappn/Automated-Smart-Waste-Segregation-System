// Configuration
// switch this to your deployed backend URL when you move off localhost
const API_BASE = `${window.location.origin}/api`;
let socket;
let isSimulating = false;
let selectedMetalLevel = 30;
let selectedMoistureLevel = 50;
let selectedTemperature = 25;

// Authentication state
let authToken = null;
let currentUser = null;

// Persist and restore auth state
function saveAuthToStorage() {
    if (authToken && currentUser) {
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

function clearAuthStorage() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
}

function restoreAuthFromStorage() {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    if (token && userStr) {
        authToken = token;
        try {
            currentUser = JSON.parse(userStr);
        } catch (e) {
            currentUser = null;
        }
    }
}

// helper to include Authorization header when token exists
async function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return fetch(url, options);
}

// login helper
async function loginUser(loginField, password) {
    // Determine if it's an email or username based on presence of @
    const isEmail = loginField.includes('@');
    const body = isEmail 
        ? { email: loginField, password }
        : { username: loginField, password };
    
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

// admin login helper
async function adminLoginUser(email, password) {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return res.json();
}

// update UI based on auth state
function updateUI() {
    const userDisplay = document.getElementById('userDisplay');
    const loginBtn = document.getElementById('loginToggleBtn');
    if (currentUser) {
        userDisplay.textContent = `${currentUser.name} (${currentUser.role})`;
        loginBtn.textContent = 'Logout';
    } else {
        userDisplay.textContent = '';
        loginBtn.textContent = 'Login';
    }
    // admin control visibility
    const initBtn = document.getElementById('initBinsBtn');
    if (initBtn) {
        initBtn.style.display = currentUser && currentUser.role === 'admin' ? 'inline-block' : 'none';
    }
    // user management section visibility
    const userManagementSection = document.getElementById('userManagementSection');
    if (userManagementSection) {
        userManagementSection.style.display = currentUser && currentUser.role === 'admin' ? 'block' : 'none';
    }
}

// show/hide login modal
function showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}
function hideLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

// logout logic
function logout() {
    authToken = null;
    currentUser = null;
    clearAuthStorage();
    updateUI();
    showNotification('Logged out', 'info');
}

// Initialize WebSocket Connection
function initializeSocket() {
    socket = io('http://localhost:3000', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        updateSystemStatus(true);
        loadInitialData();
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateSystemStatus(false);
    });

    socket.on('waste-processed', (data) => {
        addActivityToFeed(data);
        updateBinsDisplay();
        updateStatistics();
    });

    socket.on('waste-simulated', (data) => {
        addActivityToFeed(data);
        updateBinsDisplay();
        updateCurrentSensorReadings(data);
        updateStatistics();
    });

    socket.on('bin-emptied', (data) => {
        addLog('BIN_EMPTIED', `${data.type} bin emptied`);
        updateBinsDisplay();
    });

    socket.on('initial-data', (data) => {
        console.log('Received initial data:', data);
        updateBinsDisplay();
        updateStatistics();
    });
}

// Update System Status
function updateSystemStatus(isOnline) {
    const statusIndicator = document.getElementById('systemStatus');
    const statusText = document.getElementById('statusText');

    if (isOnline) {
        statusIndicator.style.backgroundColor = '#2ecc71';
        statusText.textContent = 'System Online';
    } else {
        statusIndicator.style.backgroundColor = '#e74c3c';
        statusText.textContent = 'System Offline';
    }
}

// Load Initial Data
async function loadInitialData() {
    if (!authToken) return; // Only load if authenticated
    try {
        const response = await authFetch(`${API_BASE}/bins`);
        if (!response.ok) throw new Error('Failed to load bins');
        const result = await response.json();
        console.log('Bins API response', result);
        // API returns { success, count, data: [...] }
        const bins = Array.isArray(result.data) ? result.data : result;
        updateBinsDisplay(bins);
        updateStatistics();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Sensor Input Event Listeners
document.getElementById('metalLevel').addEventListener('input', (e) => {
    selectedMetalLevel = parseInt(e.target.value);
    document.getElementById('metalValue').textContent = selectedMetalLevel + '%';
});

document.getElementById('moistureLevel').addEventListener('input', (e) => {
    selectedMoistureLevel = parseInt(e.target.value);
    document.getElementById('moistureValue').textContent = selectedMoistureLevel + '%';
});

document.getElementById('temperature').addEventListener('input', (e) => {
    selectedTemperature = parseFloat(e.target.value);
    document.getElementById('tempValue').textContent = selectedTemperature + '°C';
});

// Process Waste Button
document.getElementById('processBtn').addEventListener('click', async () => {
    if (!authToken) {
        showNotification('Please login to process waste', 'warning');
        return;
    }
    try {
        const response = await authFetch(`${API_BASE}/waste/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metalLevel: selectedMetalLevel,
                moistureLevel: selectedMoistureLevel,
                temperature: selectedTemperature,
                weight: 0.5
            })
        });

        if (!response.ok) throw new Error('Failed to process waste');
        const result = await response.json();

        // Update current sensor readings
        document.getElementById('currentMetal').textContent = selectedMetalLevel + '%';
        document.getElementById('currentMoisture').textContent = selectedMoistureLevel + '%';
        document.getElementById('currentTemp').textContent = selectedTemperature + '°C';
        document.getElementById('lastProcessing').textContent = new Date().toLocaleTimeString();

        // Add activity
        addActivityToFeed({
            classification: result.classification,
            confidence: result.servo_direction ? 95 : 70,
            timestamp: new Date().toISOString(),
            metalLevel: selectedMetalLevel,
            moistureLevel: selectedMoistureLevel
        });

        // Show success message
        showNotification(`Waste classified as: ${result.classification.toUpperCase()}`, 'success');
        updateBinsDisplay();
        updateStatistics();
    } catch (error) {
        console.error('Error processing waste:', error);
        showNotification('Error processing waste', 'error');
    }
});

// Simulation Controls
document.getElementById('simulateBtn').addEventListener('click', () => {
    isSimulating = true;
    document.getElementById('simulateBtn').disabled = true;
    document.getElementById('stopSimulateBtn').disabled = false;
    socket.emit('start-simulation');
    showNotification('Simulation started', 'info');
});

document.getElementById('stopSimulateBtn').addEventListener('click', () => {
    isSimulating = false;
    document.getElementById('simulateBtn').disabled = false;
    document.getElementById('stopSimulateBtn').disabled = true;
    socket.emit('stop-simulation');
    showNotification('Simulation stopped', 'info');
});

// Empty Bin Buttons
document.getElementById('emptyMetal').addEventListener('click', () => emptyBin('metal'));
document.getElementById('emptyWet').addEventListener('click', () => emptyBin('wet'));
document.getElementById('emptyDry').addEventListener('click', () => emptyBin('dry'));

async function emptyBin(type) {
    if (!authToken) {
        showNotification('Please login to empty a bin', 'warning');
        return;
    }
    try {
        const response = await authFetch(`${API_BASE}/bins/${type}/empty`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to empty bin');

        showNotification(`${type} bin emptied successfully`, 'success');
        updateBinsDisplay();
        updateStatistics();
    } catch (error) {
        console.error('Error emptying bin:', error);
        showNotification('Error emptying bin', 'error');
    }
}

// Update Bins Display
async function updateBinsDisplay(binsData = null) {
    if (!authToken) return;
    try {
        let bins = binsData;
        if (!bins) {
            const res = await authFetch(`${API_BASE}/bins`);
            const result = await res.json();
            bins = Array.isArray(result.data) ? result.data : result;
        }

        // bins may be an array; convert to object keyed by type
        if (Array.isArray(bins)) {
            const map = {};
            bins.forEach(b => {
                map[b.type] = b;
            });
            bins = map;
        }

        // Ensure defaults exist for each bin type
        const defaultBin = { currentLevel: 0, itemCount: 0 };
        const metalBin = bins.metal || defaultBin;
        const wetBin = bins.wet || defaultBin;
        const dryBin = bins.dry || defaultBin;

        // Update Metal Bin
        const metalFill = document.getElementById('metalFill');
        metalFill.style.height = metalBin.currentLevel + '%';
        metalFill.textContent = metalBin.currentLevel + '%';
        document.getElementById('metalCapacity').textContent = metalBin.currentLevel + '/100%';
        document.getElementById('metalItems').textContent = metalBin.itemCount;
        updateBinStatus('metal', metalBin.currentLevel);

        // Update Wet Bin
        const wetFill = document.getElementById('wetFill');
        wetFill.style.height = wetBin.currentLevel + '%';
        wetFill.textContent = wetBin.currentLevel + '%';
        document.getElementById('wetCapacity').textContent = wetBin.currentLevel + '/100%';
        document.getElementById('wetItems').textContent = wetBin.itemCount;
        updateBinStatus('wet', wetBin.currentLevel);

        // Update Dry Bin
        const dryFill = document.getElementById('dryFill');
        dryFill.style.height = dryBin.currentLevel + '%';
        dryFill.textContent = dryBin.currentLevel + '%';
        document.getElementById('dryCapacity').textContent = dryBin.currentLevel + '/100%';
        document.getElementById('dryItems').textContent = dryBin.itemCount;
        updateBinStatus('dry', dryBin.currentLevel);
    } catch (error) {
        console.error('Error updating bins display:', error);
    }
}

function updateBinStatus(type, level) {
    const statusElement = document.getElementById(`${type}Status`);
    if (level >= 90) {
        statusElement.textContent = 'Critical';
        statusElement.className = 'status-critical';
    } else if (level >= 70) {
        statusElement.textContent = 'Warning';
        statusElement.className = 'status-warning';
    } else {
        statusElement.textContent = 'Operational';
        statusElement.className = 'status-ok';
    }
}

// Update Current Sensor Readings
function updateCurrentSensorReadings(data) {
    document.getElementById('currentMetal').textContent = Math.round(data.metalLevel) + '%';
    document.getElementById('currentMoisture').textContent = Math.round(data.moistureLevel) + '%';
    document.getElementById('currentTemp').textContent = Math.round(data.temperature) + '°C';
    document.getElementById('lastProcessing').textContent = new Date().toLocaleTimeString();
}

// Add Activity to Feed
function addActivityToFeed(wasteItem) {
    const activityFeed = document.getElementById('activityFeed');

    // Remove placeholder if exists
    const placeholder = activityFeed.querySelector('.placeholder');
    if (placeholder) placeholder.remove();

    const activity = document.createElement('div');
    activity.className = `activity-item ${wasteItem.classification}`;
    activity.innerHTML = `
        <div class="activity-timestamp">${new Date(wasteItem.timestamp).toLocaleTimeString()}</div>
        <div class="activity-content">
            ${wasteItem.classification.toUpperCase()} waste detected
        </div>
        <div class="activity-confidence">
            Confidence: ${Math.round(wasteItem.confidence)}%
        </div>
    `;

    activityFeed.insertBefore(activity, activityFeed.firstChild);

    // Keep only last 20 activities
    const activities = activityFeed.querySelectorAll('.activity-item');
    if (activities.length > 20) {
        activities[activities.length - 1].remove();
    }
}

// Update Statistics
async function updateStatistics() {
    if (!authToken) return; // nothing to do if not logged in
    try {
        const resStats = await authFetch(`${API_BASE}/waste/statistics`);
        const statsResult = await resStats.json();
        console.log('Statistics API response', statsResult);
        const stats = statsResult.data || statsResult;

        const resHistory = await authFetch(`${API_BASE}/waste?limit=100`);
        const historyResult = await resHistory.json();
        console.log('Waste history response', historyResult);
        const wasteHistory = Array.isArray(historyResult.data) ? historyResult.data : historyResult;

        document.getElementById('totalWaste').textContent = stats.overall ? stats.overall.totalWaste : stats.totalWaste;
        document.getElementById('metalCount').textContent = stats.totalByType
            ? (stats.totalByType.find(t => t._id === 'metal')?.count || 0)
            : stats.classification.metal;
        document.getElementById('wetCount').textContent = stats.totalByType
            ? (stats.totalByType.find(t => t._id === 'wet')?.count || 0)
            : stats.classification.wet;
        document.getElementById('dryCount').textContent = stats.totalByType
            ? (stats.totalByType.find(t => t._id === 'dry')?.count || 0)
            : stats.classification.dry;
        document.getElementById('efficiency').textContent = (stats.efficiency || 0) + '%';

        // Calculate average confidence
        if (wasteHistory && wasteHistory.length > 0) {
            const avgConfidence = Math.round(
                wasteHistory.reduce((sum, item) => sum + item.confidence, 0) / wasteHistory.length
            );
            document.getElementById('confidence').textContent = avgConfidence + '%';
        }

        // Update chart
        const classificationData = stats.classification || {
            metal: stats.totalByType?.find(t => t._id === 'metal')?.count || 0,
            wet: stats.totalByType?.find(t => t._id === 'wet')?.count || 0,
            dry: stats.totalByType?.find(t => t._id === 'dry')?.count || 0,
        };
        updateWasteChart(classificationData);
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Update Waste Chart
let wasteChart = null;

function updateWasteChart(data) {
    const ctx = document.getElementById('wasteChart');
    if (!ctx) return;

    const chartData = {
        labels: ['Metal', 'Wet', 'Dry'],
        datasets: [{
            label: 'Waste Items Processed',
            data: [data.metal, data.wet, data.dry],
            backgroundColor: [
                'rgba(149, 165, 166, 0.7)',
                'rgba(52, 152, 219, 0.7)',
                'rgba(244, 164, 96, 0.7)'
            ],
            borderColor: [
                'rgb(149, 165, 166)',
                'rgb(52, 152, 219)',
                'rgb(244, 164, 96)'
            ],
            borderWidth: 2,
            borderRadius: 5,
            hoverBackgroundColor: [
                'rgba(149, 165, 166, 0.9)',
                'rgba(52, 152, 219, 0.9)',
                'rgba(244, 164, 96, 0.9)'
            ]
        }]
    };

    if (!wasteChart) {
        const options = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        };

        // Simple bar chart using native canvas
        drawBarChart(ctx, chartData);
    } else {
        drawBarChart(ctx, chartData);
    }
}

// Simple Bar Chart Drawing Function
function drawBarChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight || 300;

    canvas.width = width;
    canvas.height = height;

    const barWidth = width / (data.datasets[0].data.length * 2);
    const maxValue = Math.max(...data.datasets[0].data, 10);
    const padding = 40;

    // Draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width, height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw bars
    data.datasets[0].data.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 2 * padding);
        const x = padding + (index + 1) * barWidth * 1.5;
        const y = height - padding - barHeight;

        ctx.fillStyle = data.datasets[0].backgroundColor[index];
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw value on top
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth / 2, y - 5);

        // Draw label
        ctx.fillText(data.labels[index], x + barWidth / 2, height - padding + 20);
    });
}

// Add Log Entry
async function addLog(action, details) {
    const logsBody = document.getElementById('logsBody');

    if (logsBody.querySelector('.no-data')) {
        logsBody.innerHTML = '';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${new Date().toLocaleString()}</td>
        <td>${action}</td>
        <td>${details}</td>
        <td><span class="status-ok">OK</span></td>
    `;

    logsBody.insertBefore(row, logsBody.firstChild);

    // Keep only last 50 logs
    const rows = logsBody.querySelectorAll('tr');
    if (rows.length > 50) {
        rows[rows.length - 1].remove();
    }
}

// Load System Logs
async function loadSystemLogs() {
    try {
        const logs = await authFetch(`${API_BASE}/logs?limit=50`).then(r => r.json());
        const logsBody = document.getElementById('logsBody');
        logsBody.innerHTML = '';

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.action}</td>
                <td>${log.details}</td>
                <td><span class="status-ok">OK</span></td>
            `;
            logsBody.appendChild(row);
        });

        if (logs.length === 0) {
            logsBody.innerHTML = '<tr><td colspan="4" class="no-data">No logs available</td></tr>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// Navigation helpers
function switchToSection(sectionId) {
    // default to dashboard if invalid
    if (!sectionId) sectionId = 'dashboard';
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    // remove existing active state
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    // apply new active
    const link = document.querySelector(`.nav-link[href="#${sectionId}"]`);
    if (link) link.classList.add('active');
    targetSection.classList.add('active');

    // update URL hash without scrolling
    history.replaceState(null, '', `#${sectionId}`);

    if (sectionId === 'logs') {
        loadSystemLogs();
    }
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        switchToSection(sectionId);
    });
});

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background-color: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideInDown 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideOutUp {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Waste Segregation System...');
    // restore previous auth state if present
    restoreAuthFromStorage();
    // Update UI accordingly
    updateUI();

    initializeSocket();

    // if logged in, automatically fetch initial data
    if (authToken) {
        loadInitialData();
        updateStatistics();
    }

    // determine initial section from hash or default
    const initialSection = window.location.hash ? window.location.hash.substring(1) : 'dashboard';
    switchToSection(initialSection);

    // Login toggle button
    document.getElementById('loginToggleBtn').addEventListener('click', () => {
        if (currentUser) {
            logout();
        } else {
            showLoginModal();
        }
    });
    document.getElementById('loginCloseBtn').addEventListener('click', hideLoginModal);
    
    // Login Tab Switching
    const userLoginTab = document.getElementById('userLoginTab');
    const adminLoginTab = document.getElementById('adminLoginTab');
    const loginForm = document.getElementById('loginForm');
    const adminLoginForm = document.getElementById('adminLoginForm');

    userLoginTab.addEventListener('click', () => {
        userLoginTab.classList.add('active');
        adminLoginTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        adminLoginForm.classList.add('hidden');
    });

    adminLoginTab.addEventListener('click', () => {
        adminLoginTab.classList.add('active');
        userLoginTab.classList.remove('active');
        adminLoginForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // User Login Form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const result = await loginUser(email, password);
            if (result.success) {
                authToken = result.token;
                currentUser = result.user;
                saveAuthToStorage();
                updateUI();
                hideLoginModal();
                showNotification('Login successful', 'success');
                // reload initial data now that we have auth
                loadInitialData();
                updateStatistics();
            } else {
                showNotification(result.message || 'Login failed', 'error');
            }
        } catch (err) {
            console.error('Login error:', err);
            showNotification('Login failed', 'error');
        }
    });

    // Admin Login Form
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        try {
            const result = await adminLoginUser(email, password);
            if (result.success) {
                authToken = result.token;
                currentUser = result.user;
                saveAuthToStorage();
                updateUI();
                hideLoginModal();
                showNotification('Admin login successful', 'success');
                // reload initial data now that we have auth
                loadInitialData();
                updateStatistics();
            } else {
                showNotification(result.message || 'Admin login failed', 'error');
            }
        } catch (err) {
            console.error('Admin login error:', err);
            showNotification('Admin login failed', 'error');
        }
    });

    // Admin initialize bins
    const initBtn = document.getElementById('initBinsBtn');
    if (initBtn) {
        initBtn.addEventListener('click', async () => {
            try {
                const res = await authFetch(`${API_BASE}/bins/initialize`, { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    showNotification('Bins initialized', 'success');
                    updateBinsDisplay(data);
                    updateStatistics();
                } else {
                    showNotification(data.message || 'Failed to initialize bins', 'error');
                }
            } catch (err) {
                console.error('Init bins error', err);
                showNotification('Request failed', 'error');
            }
        });
    }

    // Create User Form
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('newUsername').value;
            const password = document.getElementById('newPassword').value;
            const role = document.getElementById('userRole').value;
            const messageDiv = document.getElementById('createUserMessage');

            try {
                const res = await authFetch(`${API_BASE}/auth/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role }),
                });
                const data = await res.json();
                if (res.ok) {
                    messageDiv.textContent = `✓ User "${username}" created successfully`;
                    messageDiv.style.color = 'green';
                    createUserForm.reset();
                    setTimeout(() => {
                        messageDiv.textContent = '';
                    }, 5000);
                } else {
                    messageDiv.textContent = `✗ ${data.message}`;
                    messageDiv.style.color = 'red';
                }
            } catch (err) {
                console.error('Create user error', err);
                messageDiv.textContent = '✗ Request failed';
                messageDiv.style.color = 'red';
            }
        });
    }

    // Delete User Form
    const deleteUserForm = document.getElementById('deleteUserForm');
    if (deleteUserForm) {
        deleteUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('deleteUsername').value;
            const messageDiv = document.getElementById('deleteUserMessage');

            try {
                const res = await authFetch(`${API_BASE}/auth/user/${username}`, {
                    method: 'DELETE',
                });
                const data = await res.json();
                if (res.ok) {
                    messageDiv.textContent = `✓ User "${username}" deleted`;
                    messageDiv.style.color = 'green';
                    deleteUserForm.reset();
                    setTimeout(() => {
                        messageDiv.textContent = '';
                    }, 5000);
                } else {
                    messageDiv.textContent = `✗ ${data.message}`;
                    messageDiv.style.color = 'red';
                }
            } catch (err) {
                console.error('Delete user error', err);
                messageDiv.textContent = '✗ Request failed';
                messageDiv.style.color = 'red';
            }
        });
    }

    // Auto-refresh statistics every 5 seconds
    setInterval(() => {
        if (document.getElementById('statistics').classList.contains('active')) {
            updateStatistics();
        }
    }, 5000);
});
