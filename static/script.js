document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const form = document.getElementById('main-form');
    const yInput = document.getElementById('y-input');
    const rInput = document.getElementById('r-input');
    const rButtonGroup = document.getElementById('r-button-group');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const errorMessageDiv = document.getElementById('error-message');
    const clearButton = document.getElementById('clear-button');
    const dotContainer = document.getElementById('dot-container');
    const xAxisTicks = document.getElementById('x-axis-ticks');
    const yAxisTicks = document.getElementById('y-axis-ticks');

    // --- Constants ---
    const svgNamespace = "http://www.w3.org/2000/svg";
    const SVG_R_UNIT = 100;
    const RESULTS_STORAGE_KEY = 'weblab_results_history'; // Key for localStorage

    // --- Core Functions ---

    /**
     * Creates a table row from result data and adds it to the table.
     * @param {object} data The result data from the server.
     */
    function addResultToTable(data) {
        const newRow = resultsTableBody.insertRow(0); // Insert at the top
        const hitResultText = data.hit ? 'Попадание' : 'Промах';
        newRow.className = data.hit ? 'hit-true' : 'hit-false';
        newRow.innerHTML = `
            <td>${parseFloat(data.x).toFixed(2)}</td>
            <td>${parseFloat(data.y).toFixed(2)}</td>
            <td>${parseFloat(data.r).toFixed(2)}</td>
            <td>${hitResultText}</td>
            <td>${data.currentTime}</td>
            <td>${parseFloat(data.executionTime).toFixed(4)}</td>
        `;
    }

    /**
     * Saves the results array to localStorage.
     * @param {Array<object>} results The array of result objects.
     */
    function saveResultsToStorage(results) {
        localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
    }

    /**
     * Loads results from localStorage.
     * @returns {Array<object>} The array of result objects or an empty array.
     */
    function loadResultsFromStorage() {
        const savedResults = localStorage.getItem(RESULTS_STORAGE_KEY);
        return savedResults ? JSON.parse(savedResults) : [];
    }

    /**
     * Handles the fetch request, updates UI, and saves the result.
     * @param {FormData} formData The data to be sent.
     */
    async function submitRequest(formData) {
        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                body: new URLSearchParams(formData)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! Status: ${response.status}`);
            }

            // 1. Add result to the visual table
            addResultToTable(data);

            // 2. Save the new result to storage
            let results = loadResultsFromStorage();
            results.unshift(data); // Add new result to the beginning
            saveResultsToStorage(results);

            // 3. Draw the point on the graph
            drawPoint(data.x, data.y, data.r, data.hit);

            // 4. Update URL to prevent resubmission warning
            const urlParams = new URLSearchParams(formData);
            const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            history.replaceState({ path: newUrl }, '', newUrl);

        } catch (error) {
            console.error('Fetch error:', error);
            errorMessageDiv.textContent = `Ошибка: ${error.message}`;
        }
    }

    /**
     * Initializes the page: loads saved results and handles URL parameters.
     */
    function initializePage() {
        // Load and display results from previous sessions
        const results = loadResultsFromStorage();
        for (let i = results.length - 1; i >= 0; i--) {
            addResultToTable(results[i]);
        }
        // Handle direct URL parameters if any
        const urlParams = new URLSearchParams(window.location.search);
        const x = urlParams.get('x');
        const y = urlParams.get('y');
        const r = urlParams.get('r');

        if (x && y && r) {
            const xRadio = form.querySelector(`input[name="x"][value="${x}"]`);
            if (xRadio) xRadio.checked = true;
            yInput.value = y;
            const rButton = rButtonGroup.querySelector(`.r-button[data-value="${r}"]`);
            if (rButton) rButton.click();
        } else {
            const defaultRButton = document.querySelector('.r-button[data-value="2"]');
            if (defaultRButton) defaultRButton.click();
        }
    }

    // --- Event Listeners ---

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessageDiv.textContent = '';
        const selectedX = form.querySelector('input[name="x"]:checked');
        const yValueRaw = yInput.value.trim().replace(',', '.');
        const yValue = parseFloat(yValueRaw);
        const rValue = rInput.value;

        if (!selectedX || yValueRaw === '' || isNaN(yValue) || yValue <= -3 || yValue >= 5 || !rValue) {
            if (!selectedX) errorMessageDiv.textContent = 'Пожалуйста, выберите значение X.';
            else if (yValueRaw === '' || isNaN(yValue) || yValue <= -3 || yValue >= 5) errorMessageDiv.textContent = 'Y должен быть числом в интервале (-3 ... 5).';
            else if (!rValue) errorMessageDiv.textContent = 'Пожалуйста, выберите значение R.';
            return;
        }

        const formData = new FormData(form);
        formData.set('y', yValue.toString());
        submitRequest(formData);
    });

    rButtonGroup.addEventListener('click', (event) => {
        if (event.target.classList.contains('r-button')) {
            const rValue = event.target.dataset.value;
            rInput.value = rValue;
            document.querySelectorAll('.r-button').forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');
            updateGraphLabels(parseFloat(rValue));
        }
    });

    clearButton.addEventListener('click', () => {
        resultsTableBody.innerHTML = ''; // Clear visual table
        dotContainer.innerHTML = ''; // Clear dot on graph
        localStorage.removeItem(RESULTS_STORAGE_KEY); // Clear saved data
        history.replaceState(null, '', window.location.pathname); // Clear URL params
    });

    // --- Drawing Functions (unchanged) ---
    function updateGraphLabels(r) { /* ... same as before ... */ }
    function drawPoint(x, y, r, hit) { /* ... same as before ... */ }

    // Copy the full content of these functions from your previous working script.js
    // For brevity, they are omitted here, but they are required.

    function updateGraphLabels(r) {
        if (!r || isNaN(r)) return;
        const labels = { "R": r, "R/2": r / 2, "-R/2": -r / 2, "-R": -r };
        xAxisTicks.innerHTML = '';
        yAxisTicks.innerHTML = '';
        for (const [key, value] of Object.entries(labels)) {
            const svgX = (value / r) * SVG_R_UNIT;
            const textX = document.createElementNS(svgNamespace, 'text');
            textX.setAttribute('x', svgX);
            textX.setAttribute('y', 15);
            textX.textContent = key;
            xAxisTicks.appendChild(textX);
            const tickX = document.createElementNS(svgNamespace, 'line');
            tickX.setAttribute('class', 'tick-line');
            tickX.setAttribute('x1', svgX);
            tickX.setAttribute('y1', -5);
            tickX.setAttribute('x2', svgX);
            tickX.setAttribute('y2', 5);
            xAxisTicks.appendChild(tickX);
            const svgY = (-value / r) * SVG_R_UNIT;
            const textY = document.createElementNS(svgNamespace, 'text');
            textY.setAttribute('x', -10);
            textY.setAttribute('y', svgY + 3);
            textY.textContent = key;
            yAxisTicks.appendChild(textY);
            const tickY = document.createElementNS(svgNamespace, 'line');
            tickY.setAttribute('class', 'tick-line');
            tickY.setAttribute('x1', -5);
            tickY.setAttribute('y1', svgY);
            tickY.setAttribute('x2', 5);
            tickY.setAttribute('y2', svgY);
            yAxisTicks.appendChild(tickY);
        }
    }

    function drawPoint(x, y, r, hit) {
        dotContainer.innerHTML = '';
        if (r <= 0) return;
        const svgX = (x / r) * SVG_R_UNIT;
        const svgY = (-y / r) * SVG_R_UNIT;
        const dot = document.createElementNS(svgNamespace, 'circle');
        dot.setAttribute('id', 'result-dot');
        dot.setAttribute('cx', svgX);
        dot.setAttribute('cy', svgY);
        dot.setAttribute('r', 4);
        dot.style.fill = hit ? '#198754' : '#dc3545';
        dot.style.stroke = '#fff';
        dot.style.strokeWidth = '1.5';
        dotContainer.appendChild(dot);
    }

    // --- Initial Page Load ---
    initializePage();
});