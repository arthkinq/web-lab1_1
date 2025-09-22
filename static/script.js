document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('triangle-form');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const errorMessageDiv = document.getElementById('error-message');

    form.addEventListener('submit', async (event) => {
        // Prevent the default form submission which reloads the page
        event.preventDefault();

        // Clear previous error messages
        errorMessageDiv.textContent = '';

        // Get values from the input fields
        const x = document.getElementById('x-input').value;
        const y = document.getElementById('y-input').value;
        const r = document.getElementById('r-input').value;

        // Basic client-side validation
        if (x === '' || y === '' || r === '') {
            errorMessageDiv.textContent = 'All fields are required.';
            return;
        }

        // Construct the query string
        const queryParams = new URLSearchParams({ x, y, r });

        try {
            // Send the request to the server using the Fetch API
            const response = await fetch(`/calculate?${queryParams}`);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                errorMessageDiv.textContent = `Server error: ${data.error}`;
                return;
            }

            // Create a new row and cells for the results table
            const newRow = resultsTableBody.insertRow(0); // Insert at the top

            const cellX = newRow.insertCell(0);
            const cellY = newRow.insertCell(1);
            const cellR = newRow.insertCell(2);
            const cellResult = newRow.insertCell(3);
            const cellTime = newRow.insertCell(4);

            // Populate the cells with data from the server response
            cellX.textContent = data.x.toFixed(2);
            cellY.textContent = data.y.toFixed(2);
            cellR.textContent = data.r.toFixed(2);
            cellResult.textContent = data.result;
            cellTime.textContent = data.time;

            // Optional: Clear the form fields after successful submission
            form.reset();

        } catch (error) {
            console.error('Fetch error:', error);
            errorMessageDiv.textContent = 'Failed to communicate with the server. Please try again.';
        }
    });
});