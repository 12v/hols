const STORAGE_KEY = 'holidayPlannerData';

let state = {
    yearResetDate: new Date().getFullYear() + '-01-01',
    holidayAllowance: 25,
    carryOver: 0,
    reducedHoursDay: null,
    dayOffStart: null,
    weekType: 'odd',
    holidays: [],
    blockedDates: []
};

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        state = { ...state, ...JSON.parse(saved) };
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(dateStr) {
    return new Date(dateStr + 'T00:00:00');
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function getWeekNumber(date, startDate) {
    const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((dateUtc - startUtc) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

function isReducedHoursDay(date) {
    if (!state.reducedHoursDay) return false;

    const startDate = state.dayOffStart ? parseDate(state.dayOffStart) : parseDate(state.yearResetDate);

    if (date < startDate) return false;

    const weekNum = getWeekNumber(date, startDate);
    const isOddWeek = weekNum % 2 === 1;
    const matchesWeekType = state.weekType === 'odd' ? isOddWeek : !isOddWeek;

    return date.getDay() === parseInt(state.reducedHoursDay) && matchesWeekType;
}

function calculateDaysTaken() {
    return state.holidays.length;
}

function updateSummary() {
    const taken = calculateDaysTaken();
    const totalAllowance = state.holidayAllowance + state.carryOver;
    const remaining = totalAllowance - taken;

    document.getElementById('totalAllowance').textContent = totalAllowance;
    document.getElementById('daysTaken').textContent = taken;

    const remainingEl = document.getElementById('daysRemaining');
    remainingEl.textContent = remaining;

    if (remaining < 0) {
        remainingEl.classList.add('over-limit');
    } else {
        remainingEl.classList.remove('over-limit');
    }
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

function renderMonth(year, month) {
    const monthEl = document.createElement('div');
    monthEl.className = 'month';

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const headerEl = document.createElement('div');
    headerEl.className = 'month-header';
    headerEl.textContent = `${monthNames[month]} ${year}`;
    monthEl.appendChild(headerEl);

    const dayHeadersEl = document.createElement('div');
    dayHeadersEl.className = 'day-headers';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        dayHeadersEl.appendChild(dayHeader);
    });
    monthEl.appendChild(dayHeadersEl);

    const daysEl = document.createElement('div');
    daysEl.className = 'days';

    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);

    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day empty';
        daysEl.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);

        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.textContent = day;

        const isReduced = isReducedHoursDay(date);
        const isWknd = isWeekend(date);

        if (isWknd) {
            dayEl.classList.add('weekend');
        }

        if (isReduced) {
            dayEl.classList.add('reduced');
        }

        if (!isWknd && !isReduced) {
            if (state.holidays.includes(dateStr)) {
                dayEl.classList.add('holiday');
            }

            if (state.blockedDates.includes(dateStr)) {
                dayEl.classList.add('blocked');
            }

            dayEl.addEventListener('click', (e) => {
                e.preventDefault();
                toggleHoliday(dateStr);
            });

            dayEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleBlocked(dateStr);
            });
        }

        daysEl.appendChild(dayEl);
    }

    monthEl.appendChild(daysEl);
    return monthEl;
}

function toggleHoliday(dateStr) {
    if (state.blockedDates.includes(dateStr)) {
        return;
    }

    const index = state.holidays.indexOf(dateStr);
    if (index > -1) {
        state.holidays.splice(index, 1);
    } else {
        state.holidays.push(dateStr);
    }

    saveState();
    renderCalendar();
    updateSummary();
}

function toggleBlocked(dateStr) {
    const index = state.blockedDates.indexOf(dateStr);
    if (index > -1) {
        state.blockedDates.splice(index, 1);
    } else {
        state.blockedDates.push(dateStr);
        const holidayIndex = state.holidays.indexOf(dateStr);
        if (holidayIndex > -1) {
            state.holidays.splice(holidayIndex, 1);
        }
    }

    saveState();
    renderCalendar();
    updateSummary();
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = '';

    const resetDate = parseDate(state.yearResetDate);
    const startYear = resetDate.getFullYear();
    const startMonth = resetDate.getMonth();

    for (let i = 0; i < 12; i++) {
        const month = (startMonth + i) % 12;
        const year = startYear + Math.floor((startMonth + i) / 12);
        calendarEl.appendChild(renderMonth(year, month));
    }
}

function initializeInputs() {
    const resetDateInput = document.getElementById('resetDate');
    const allowanceInput = document.getElementById('allowance');
    const carryOverInput = document.getElementById('carryOver');
    const reducedDayInput = document.getElementById('reducedDay');
    const dayOffStartInput = document.getElementById('dayOffStart');
    const dayOffStartContainer = document.getElementById('dayOffStartContainer');
    const weekTypeInput = document.getElementById('weekType');
    const weekTypeContainer = document.getElementById('weekTypeContainer');

    resetDateInput.value = state.yearResetDate;
    allowanceInput.value = state.holidayAllowance;
    carryOverInput.value = state.carryOver;
    reducedDayInput.value = state.reducedHoursDay || '';
    dayOffStartInput.value = state.dayOffStart || '';
    weekTypeInput.value = state.weekType;

    function updateDayOffFieldsVisibility() {
        if (reducedDayInput.value) {
            dayOffStartContainer.classList.remove('hidden');
            weekTypeContainer.classList.remove('hidden');
        } else {
            dayOffStartContainer.classList.add('hidden');
            weekTypeContainer.classList.add('hidden');
        }
    }

    updateDayOffFieldsVisibility();

    resetDateInput.addEventListener('change', (e) => {
        state.yearResetDate = e.target.value;
        saveState();
        renderCalendar();
        updateSummary();
    });

    allowanceInput.addEventListener('change', (e) => {
        state.holidayAllowance = parseFloat(e.target.value) || 0;
        saveState();
        updateSummary();
    });

    carryOverInput.addEventListener('change', (e) => {
        state.carryOver = parseFloat(e.target.value) || 0;
        saveState();
        updateSummary();
    });

    reducedDayInput.addEventListener('change', (e) => {
        state.reducedHoursDay = e.target.value || null;
        updateDayOffFieldsVisibility();
        saveState();
        renderCalendar();
        updateSummary();
    });

    dayOffStartInput.addEventListener('change', (e) => {
        state.dayOffStart = e.target.value || null;
        saveState();
        renderCalendar();
        updateSummary();
    });

    weekTypeInput.addEventListener('change', (e) => {
        state.weekType = e.target.value;
        saveState();
        renderCalendar();
        updateSummary();
    });
}

loadState();
initializeInputs();
renderCalendar();
updateSummary();
