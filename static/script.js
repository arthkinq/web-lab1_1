document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('main-form');
    const yInput = document.getElementById('y-input');
    const rInput = document.getElementById('r-input');
    const rButtonGroup = document.getElementById('r-button-group');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const errorMessageDiv = document.getElementById('error-message');

    // SVG elements
    const svgNamespace = "http://www.w3.org/2000/svg";
    const dotContainer = document.getElementById('dot-container');
    const xAxisTicks = document.getElementById('x-axis-ticks');
    const yAxisTicks = document.getElementById('y-axis-ticks');
    const SVG_R_UNIT = 100;

    /**
     * Handles the fetch request and UI updates.
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
                // Replaced template literal for maximum compatibility.
                throw new Error(data.error || 'HTTP error! Status: ' + response.status);
            }

            // --- Update results table ---
            const newRow = resultsTableBody.insertRow(0);
            const hitResultText = data.hit ? 'Попадание' : 'Промах';
            newRow.className = data.hit ? 'hit-true' : 'hit-false';
            // Исправлено: добавлены обратные кавычки для шаблонной строки
            newRow.innerHTML = `
                <td>${data.x.toFixed(2)}</td>
                <td>${data.y.toFixed(2)}</td>
                <td>${data.r.toFixed(2)}</td>
                <td>${hitResultText}</td>
                <td>${data.currentTime}</td>
                <td>${data.executionTime}</td>
            `;

            // Draw the point on the graph
            drawPoint(data.x, data.y, data.r, data.hit);

            // Update URL to prevent resubmission warning
            const urlParams = new URLSearchParams(formData);
            // Исправлено: добавлены обратные кавычки для шаблонной строки
            const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            history.replaceState({ path: newUrl }, '', newUrl);

        } catch (error) {
            console.error('Fetch error:', error);
            // Исправлено: добавлены обратные кавычки для шаблонной строки
            errorMessageDiv.textContent = `Ошибка: ${error.message}`;
        }
    }

    /**
     * Checks URL for parameters on page load and restores the form state.
     */
    function handlePageLoad() {
        const urlParams = new URLSearchParams(window.location.search);
        const x = urlParams.get('x');
        const y = urlParams.get('y');
        const r = urlParams.get('r');

        if (x && y && r) {
            // Исправлено: добавлены обратные кавычки для шаблонной строки
            const xRadio = form.querySelector(`input[name="x"][value="${x}"]`);
            if (xRadio) xRadio.checked = true;

            yInput.value = y;

            // Исправлено: добавлены обратные кавычки для шаблонной строки
            const rButton = rButtonGroup.querySelector(`.r-button[data-value="${r}"]`);
            if (rButton) rButton.click();

            const formData = new FormData(form);
            // Ensure Y value from URL is set correctly
            formData.set('y', y);
            submitRequest(formData);
        } else {
            const defaultRButton = document.querySelector('.r-button[data-value="2"]');
            if (defaultRButton) defaultRButton.click();
        }
    }

    // --- Event Listeners and other functions ---

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessageDiv.textContent = '';

        const selectedX = form.querySelector('input[name="x"]:checked');
        const yValueRaw = yInput.value.trim().replace(',', '.');
        const yValue = parseFloat(yValueRaw);
        const rValue = rInput.value;

        if (!selectedX) {
            errorMessageDiv.textContent = 'Пожалуйста, выберите значение X.';
            return;
        }
        // Исправлено: добавлены операторы || между условиями
        if (yValueRaw === '' || isNaN(yValue) || yValue <= -3 || yValue >= 5) {
            errorMessageDiv.textContent = 'Y должен быть числом в интервале (-3 ... 5).';
            return;
        }
        if (!rValue) {
            errorMessageDiv.textContent = 'Пожалуйста, выберите значение R.';
            return;
        }

        const formData = new FormData(form);
        // THE FIX: Explicitly convert the number to a string before setting it.
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
        dot.style.fill = hit ? '#28a745' : '#dc3545';
        dot.style.stroke = '#fff';
        dot.style.strokeWidth = '1';
        dotContainer.appendChild(dot);
    }

    // --- Initial setup ---
    handlePageLoad();
});