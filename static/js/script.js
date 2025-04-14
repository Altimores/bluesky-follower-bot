document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const followForm = document.getElementById('followForm');
    const followButton = document.getElementById('followButton');
    const unfollowButton = document.getElementById('unfollowButton');
    const stopButton = document.getElementById('stopButton');
    const stopButtonProgress = document.getElementById('stopButtonProgress');
    const newOperationButton = document.getElementById('newOperationButton');
    const targetUsernameGroup = document.getElementById('targetUsernameGroup');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressTitle = document.getElementById('progressTitle');
    const progressText = document.getElementById('progressText');
    const progressCounter = document.getElementById('progressCounter');
    const resultsContainer = document.getElementById('results');
    const operationTitle = document.getElementById('operationTitle');
    const operationText = document.getElementById('operationText');
    const processedCount = document.getElementById('processedCount');
    const totalUsers = document.getElementById('totalUsers');
    const resultsDescription = document.getElementById('resultsDescription');
    const userListTitle = document.getElementById('userListTitle');
    const userList = document.getElementById('userList');
    const alertContainer = document.getElementById('alertContainer');
    
    // Poll interval in milliseconds
    const POLL_INTERVAL = 2000;
    
    // Variable to store the polling interval ID
    let statusPollInterval = null;
    
    // Current operation type
    let currentOperation = null;
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Event listeners
    if (followButton) {
        followButton.addEventListener('click', function() {
            startOperation('follow');
        });
    }
    
    if (unfollowButton) {
        unfollowButton.addEventListener('click', function() {
            startOperation('unfollow');
        });
    }
    
    if (stopButton) {
        stopButton.addEventListener('click', function() {
            stopOperation();
        });
    }
    
    if (stopButtonProgress) {
        stopButtonProgress.addEventListener('click', function() {
            stopOperation();
        });
    }
    
    if (newOperationButton) {
        newOperationButton.addEventListener('click', function() {
            resetUI();
        });
    }
    
    // Function to start an operation (follow or unfollow)
    async function startOperation(operationType) {
        // Validate form
        if (!validateForm(operationType)) {
            return;
        }
        
        // Clear previous results
        resetResults();
        
        // Set current operation
        currentOperation = operationType;
        
        // Show progress container and stop button
        progressContainer.classList.remove('d-none');
        stopButton.classList.remove('d-none');
        
        // Update UI based on operation type
        if (operationType === 'follow') {
            progressTitle.textContent = 'Following Users...';
            progressText.textContent = 'Establishing connection to Bluesky...';
        } else {
            progressTitle.textContent = 'Unfollowing Users...';
            progressText.textContent = 'Establishing connection to Bluesky...';
        }
        
        // Disable form elements
        setFormState(false);
        
        // Get form data
        const formData = {
            username: document.getElementById('username').value,
            app_password: document.getElementById('appPassword').value,
            scan_limit: document.getElementById('scanLimit').value,
            follow_limit: document.getElementById('followLimit').value,
            filter_turkish: document.getElementById('filterTurkish').checked
        };
        
        // Add target_username for follow operation
        if (operationType === 'follow') {
            formData.target_username = document.getElementById('targetUsername').value;
        }
        
        try {
            // Get the current base URL dynamically
            const baseUrl = window.location.origin;
            console.log("Using base URL:", baseUrl);
            
            // Determine the endpoint based on operation type
            const endpoint = (operationType === 'follow') ? 
                `${baseUrl}/api/task/follow` : 
                `${baseUrl}/api/task/unfollow`;
            
            // Start the task
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',
                mode: 'cors',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.status === 'started' || data.status === 'info') {
                // Start polling for status updates
                updateProgressText(`${operationType.charAt(0).toUpperCase() + operationType.slice(1)} task started!`);
                startStatusPolling();
            } else {
                // Error starting the task
                stopStatusPolling();
                progressContainer.classList.add('d-none');
                stopButton.classList.add('d-none');
                setFormState(true);
                showAlert('error', data.message || `Failed to start ${operationType} task`);
            }
        } catch (error) {
            console.error('Error:', error);
            stopStatusPolling();
            progressContainer.classList.add('d-none');
            stopButton.classList.add('d-none');
            setFormState(true);
            
            // Detailed error message
            const errorDetails = `Network error: ${error.message || 'Unknown issue'}. 
                Please check your connection and try again. 
                If the problem persists, refresh the page.`;
                
            showAlert('error', errorDetails);
            
            // Log additional debugging info
            console.log('Base URL:', window.location.origin);
            console.log('API endpoint:', `${window.location.origin}/api/task/${operationType}`);
        }
    }
    
    // Function to stop the current operation
    async function stopOperation() {
        try {
            const baseUrl = window.location.origin;
            
            // Send stop signal to the server
            const response = await fetch(`${baseUrl}/api/task/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',
                mode: 'cors'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                updateProgressText('Stop signal sent. Operation will stop after the current step completes...');
                showAlert('success', 'Stop request sent. Operation will finish shortly.');
            } else {
                showAlert('error', data.message || 'Failed to stop operation');
            }
        } catch (error) {
            console.error('Error stopping operation:', error);
            showAlert('error', `Error stopping operation: ${error.message || 'Unknown issue'}`);
        }
    }
    
    // Function to start polling for status updates
    function startStatusPolling() {
        // Clear any existing polling
        stopStatusPolling();
        
        // Start new polling
        statusPollInterval = setInterval(checkTaskStatus, POLL_INTERVAL);
    }
    
    // Function to stop polling
    function stopStatusPolling() {
        if (statusPollInterval) {
            clearInterval(statusPollInterval);
            statusPollInterval = null;
        }
    }
    
    // Function to check task status
    async function checkTaskStatus() {
        try {
            // Get the current base URL dynamically
            const baseUrl = window.location.origin;
            
            const response = await fetch(`${baseUrl}/api/task/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',
                mode: 'cors'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Update progress display
                updateProgress(data);
                
                // Check if task is complete or has an error
                if (data.completed || data.error) {
                    stopStatusPolling();
                    displayResults(data);
                }
            } else {
                // Error getting status
                updateProgressText('Error checking status: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Status check error:', error);
            
            // Log detailed debugging info
            console.log('Status check URL:', `${window.location.origin}/api/task/status`);
            console.log('Error details:', error);
            
            updateProgressText(`Error connecting to server: ${error.message || 'Unknown issue'}. Will retry...`);
        }
    }
    
    // Function to update the progress indicators
    function updateProgress(data) {
        // Update text details
        updateProgressText(data.message || 'Processing...');
        
        // Update progress counter
        if (data.is_running) {
            const operationName = data.operation_type === 'follow' ? 'Following' : 'Unfollowing';
            progressCounter.textContent = `Scanning: ${data.current_index} ${data.scan_limit ? `of ${data.scan_limit}` : ''} | ${operationName}: ${data.processed_count} ${data.follow_limit ? `of ${data.follow_limit} limit` : ''}`;
        } else if (data.completed) {
            const operationName = data.operation_type === 'follow' ? 'Followed' : 'Unfollowed';
            progressCounter.textContent = `Completed: Scanned ${data.scanned_count || data.current_index} users | ${operationName} ${data.processed_count} users`;
        } else if (data.error) {
            progressCounter.textContent = `Error: ${data.error}`;
        }
        
        // Update progress bar
        if (data.scan_limit) {
            // If scan limit is provided, use it for progress calculation
            const percent = Math.min(100, Math.round((data.current_index / data.scan_limit) * 100));
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
        } else if (data.total_users > 0) {
            // Fallback to total users if scan limit is not provided
            const percent = Math.round((data.current_index / data.total_users) * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
        }
    }
    
    // Function to update the progress text
    function updateProgressText(text) {
        if (progressText) {
            progressText.textContent = text;
        }
    }
    
    // Function to display final results
    function displayResults(data) {
        // Hide progress container and stop button
        progressContainer.classList.add('d-none');
        stopButton.classList.add('d-none');
        
        // Enable form elements
        setFormState(true);
        
        if (data.error) {
            // Show error
            showAlert('error', data.error);
            return;
        }
        
        // Show results
        resultsContainer.classList.remove('d-none');
        
        // Set operation-specific text
        if (data.operation_type === 'follow') {
            operationTitle.textContent = 'Follow Operation Complete';
            operationText.textContent = 'followed';
            userListTitle.textContent = 'Newly followed accounts:';
            resultsDescription.textContent = 'Users who were already followed or who follow you back were skipped';
        } else {
            operationTitle.textContent = 'Unfollow Operation Complete';
            operationText.textContent = 'unfollowed';
            userListTitle.textContent = 'Unfollowed accounts:';
            resultsDescription.textContent = 'Users who follow you back were skipped';
        }
        
        // Update counts
        processedCount.textContent = data.processed_count;
        document.getElementById('scannedCount').textContent = data.scanned_count || data.current_index;
        
        // List processed users
        if (data.users && data.users.length > 0) {
            userList.innerHTML = '';
            data.users.forEach(user => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                const displayName = user.displayName ? user.displayName : user.handle;
                li.innerHTML = `<strong>${displayName}</strong> <span class="text-secondary">(@${user.handle})</span>`;
                userList.appendChild(li);
            });
        } else {
            const message = data.operation_type === 'follow' ? 
                'No new users to follow' : 
                'No users to unfollow';
            userList.innerHTML = `<li class="list-group-item">${message}</li>`;
        }
    }
    
    // Function to validate form inputs
    function validateForm(operationType) {
        // Clear any existing alerts
        alertContainer.innerHTML = '';
        
        // Check required fields
        const username = document.getElementById('username').value.trim();
        const appPassword = document.getElementById('appPassword').value.trim();
        let isValid = true;
        
        if (!username) {
            showAlert('error', 'Username is required');
            isValid = false;
        }
        
        if (!appPassword) {
            showAlert('error', 'App password is required');
            isValid = false;
        }
        
        // For follow operation, target username is required
        if (operationType === 'follow') {
            const targetUsername = document.getElementById('targetUsername').value.trim();
            if (!targetUsername) {
                showAlert('error', 'Target username is required for follow operation');
                isValid = false;
            }
        }
        
        // Validate scan limit (number between 1 and 50000)
        const scanLimit = document.getElementById('scanLimit').value;
        if (!scanLimit || isNaN(scanLimit) || scanLimit < 1 || scanLimit > 50000) {
            showAlert('error', 'Scan limit must be a number between 1 and 50000');
            document.getElementById('scanLimit').value = 5000; // Reset to default
            isValid = false;
        }
        
        // Validate follow limit (number between 1 and 10000)
        const followLimit = document.getElementById('followLimit').value;
        if (!followLimit || isNaN(followLimit) || followLimit < 1 || followLimit > 10000) {
            showAlert('error', 'Follow limit must be a number between 1 and 10000');
            document.getElementById('followLimit').value = 1000; // Reset to default
            isValid = false;
        }
        
        return isValid;
    }
    
    // Function to enable/disable form elements
    function setFormState(enabled) {
        // Get all form elements
        const formElements = followForm.querySelectorAll('input, button');
        
        // Enable or disable all elements
        formElements.forEach(element => {
            if (element.id !== 'stopButton') {
                element.disabled = !enabled;
            }
        });
        
        // Show/hide follow/unfollow buttons and show/hide stop button
        if (enabled) {
            followButton.classList.remove('d-none');
            unfollowButton.classList.remove('d-none');
            stopButton.classList.add('d-none');
        } else {
            followButton.classList.add('d-none');
            unfollowButton.classList.add('d-none');
            stopButton.classList.remove('d-none');
        }
    }
    
    // Function to reset the results
    function resetResults() {
        resultsContainer.classList.add('d-none');
        userList.innerHTML = '';
        alertContainer.innerHTML = '';
        
        // Stop any existing polling
        stopStatusPolling();
        
        // Reset progress bar
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        
        // Clear progress text
        progressText.textContent = 'Initializing...';
        progressCounter.textContent = '';
    }
    
    // Function to reset the entire UI
    function resetUI() {
        // Reset results
        resetResults();
        
        // Hide results and progress containers
        resultsContainer.classList.add('d-none');
        progressContainer.classList.add('d-none');
        
        // Show form buttons
        followButton.classList.remove('d-none');
        unfollowButton.classList.remove('d-none');
        stopButton.classList.add('d-none');
        
        // Enable form
        setFormState(true);
        
        // Clear alerts
        alertContainer.innerHTML = '';
    }
    
    // Function to show an alert message
    function showAlert(type, message) {
        const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
        const icon = type === 'error' ? 
            '<i class="fas fa-exclamation-circle me-2"></i>' : 
            '<i class="fas fa-check-circle me-2"></i>';
            
        const alertEl = document.createElement('div');
        alertEl.className = `alert ${alertClass} alert-dismissible fade show`;
        alertEl.role = 'alert';
        alertEl.innerHTML = `
            ${icon}${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alertEl);
        
        // Scroll to the alert
        alertEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
