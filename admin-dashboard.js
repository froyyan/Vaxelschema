let editingInspectionId = null;
let showUpcomingAbsence = false;
let activeAbsenceTab = "today";
let activeInspectionFilter = "all";
let activeInspectionTypeFilter = "all";
async function initAdminDashboard() {
  const dashboardContent = document.getElementById("dashboardContent");

  if (!dashboardContent) return;

  dashboardContent.innerHTML = `
    <div class="dashboard-widget" data-dashboard-widget="unassigned">
      <div class="dashboard-widget-header">
        <div>
          <h3>Otilldelade pass</h3>
          <p>Snabb översikt över pass utan chaufför.</p>
        </div>
        <span class="dashboard-widget-icon">⚠️</span>
      </div>

      <div class="dashboard-stat-row">
        <div class="dashboard-stat">
          <span>Idag</span>
          <strong id="dashUnassignedToday">-</strong>

          <button onclick="openDashboardUnassignedToday()">
            Visa
          </button>
        </div>

        <div class="dashboard-stat">
          <span>Kommande 7 dagar</span>
          <strong id="dashUnassignedWeek">-</strong>

          <button onclick="openDashboardUnassignedWeek()">
            Visa
          </button>
        </div>
      </div>
    </div>

<div class="dashboard-widget" data-dashboard-widget="inspections">
  <div class="dashboard-widget-header inspection-dashboard-header">
    <div>
      <h3>Besiktningar</h3>
      <p>Fordon eller pass som behöver kontrolleras.</p>
    </div>

    <div class="inspection-search-inline">
      <span>🔍</span>
      <input
        id="inspectionInlineSearch"
        placeholder="Sök regnr..."
        oninput="searchInspectionInline()"
      >
    </div>
  </div>

  <div id="inspectionInlineResult"></div>

<div class="inspection-create-row">
  <button type="button" class="inspection-create-small-btn" onclick="openInspectionCreateModal()">
    + Skapa bokning
  </button>
</div>

  <div class="inspection-week-box">
    <div class="inspection-range-header">
      <h4>Kommande kontroller</h4>

      <div class="inspection-range-row">
        <div>
          <label>Från</label>
          <input type="date" id="inspectionRangeFrom">
        </div>

        <div>
          <label>Till</label>
          <input type="date" id="inspectionRangeTo">
        </div>

        <button type="button" onclick="renderInspectionRangeList()">
          Visa
        </button>
      </div>
    </div>
<div class="inspection-filter-row">
  <button type="button" id="inspectionFilterAll" class="inspection-filter-btn active" onclick="setInspectionFilter('all')">
    Alla
  </button>

  <button type="button" id="inspectionFilterPlanned" class="inspection-filter-btn" onclick="setInspectionFilter('planned')">
    Ej bokad
  </button>
<button type="button" id="inspectionFilterNotDone" class="inspection-filter-btn" onclick="setInspectionFilter('notDone')">
  Deadline
</button>
  
  <button type="button" id="inspectionFilterBooked" class="inspection-filter-btn" onclick="setInspectionFilter('booked')">
    Bokade
  </button>

  <button type="button" id="inspectionFilterDone" class="inspection-filter-btn" onclick="setInspectionFilter('done')">
    Utförda
  </button>

  <button type="button" id="inspectionFilterCancelled" class="inspection-filter-btn" onclick="setInspectionFilter('cancelled')">
    Avbokade
  </button>

  <select id="inspectionTypeFilter" class="inspection-type-filter" onchange="setInspectionTypeFilter(this.value)">
  <option value="all">Visa alla typer</option>
  <option value="färdskriv">Färdskrivare</option>
  <option value="taxameter">Taxameter</option>
  <option value="alkolås">Alkolås</option>
  <option value="lyft">Lyftbesiktning</option>
  <option value="service">Service</option>
  <option value="övrigt">Övrigt</option>
</select>

</div>
    <div id="inspectionWeekList"></div>
  </div>
</div>

<div class="dashboard-widget" data-dashboard-widget="absence">
  <div class="dashboard-widget-header">
    <div>
      <h3>Frånvaro</h3>
      <p>Chaufförer med frånvaro idag och föreslagen ersättare.</p>
    </div>
    <span class="dashboard-widget-icon">👤</span>
  </div>

<div class="absence-tabs">
  <button
    type="button"
    id="absenceTabToday"
    class="absence-tab active"
    onclick="showAbsenceTab('today')"
  >
    Idag
  </button>

  <button
    type="button"
    id="absenceTabUpcoming"
    class="absence-tab light"
    onclick="showAbsenceTab('upcoming')"
  >
    Kommande 7 dagar
  </button>
</div>

<div id="absenceTodayBox"></div>
<div id="upcomingAbsenceBox" style="display:none;"></div>
  `;

await loadDashboardUnassignedStats();
loadDashboardInspectionStats();
initInspectionRange();
await renderAbsenceDashboardTable();

applyDashboardWidgetOrder();
applyDashboardWidgetSettings();
}

async function loadDashboardUnassignedStats() {
  const todayEl = document.getElementById("dashUnassignedToday");
  const weekEl = document.getElementById("dashUnassignedWeek");

  if (!todayEl || !weekEl) return;

  const res = await fetch("/shifts", { credentials: "include" });

  if (res.status === 401) {
    window.location.href = "/login.html";
    return;
  }

  const shifts = await res.json();

  const today = formatLocalDate(new Date());

  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = formatLocalDate(weekEndDate);

  const unassignedToday = shifts.filter(s =>
    s.date === today && !s.driver
  ).length;

  const unassignedWeek = shifts.filter(s =>
    s.date >= today &&
    s.date <= weekEnd &&
    !s.driver
  ).length;

  todayEl.innerText = unassignedToday;
  weekEl.innerText = unassignedWeek;
}

function openDashboardUnassignedToday() {
  const today = formatLocalDate(new Date());

  const fromInput = document.getElementById("autoFromDate");
  const toInput = document.getElementById("autoToDate");

  if (fromInput) fromInput.value = today;
  if (toInput) toInput.value = today;

  showUnassignedInRange();
}
function openDashboardUnassignedWeek() {
  const todayDate = new Date();
  const endDate = new Date();

  endDate.setDate(endDate.getDate() + 6);

  const today = formatLocalDate(todayDate);
  const weekEnd = formatLocalDate(endDate);

  const fromInput = document.getElementById("autoFromDate");
  const toInput = document.getElementById("autoToDate");

  if (fromInput) fromInput.value = today;
  if (toInput) toInput.value = weekEnd;

  showUnassignedInRange();
}

function saveInspections(inspections) {
  localStorage.setItem("inspections", JSON.stringify(inspections));
}

function loadDashboardInspectionStats() {
  const todayEl = document.getElementById("dashInspectionsToday");
  const weekEl = document.getElementById("dashInspectionsWeek");

  if (!todayEl || !weekEl) return;

  const inspections = getInspections();

  const today = formatLocalDate(new Date());

  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = formatLocalDate(weekEndDate);

  const openInspections = inspections.filter(inspection =>
    inspection.status !== "done"
  );

  const todayCount = openInspections.filter(inspection =>
    inspection.date === today
  ).length;

  const comingWeek = openInspections.filter(inspection =>
    inspection.date &&
    inspection.date >= today &&
    inspection.date <= weekEnd
  ).length;

  todayEl.innerText = todayCount;
  weekEl.innerText = comingWeek;
}

function initInspectionRange() {
  const fromInput = document.getElementById("inspectionRangeFrom");
  const toInput = document.getElementById("inspectionRangeTo");

  if (!fromInput || !toInput) return;

  const today = new Date();

  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  fromInput.value = formatLocalDate(today);
  toInput.value = formatLocalDate(sevenDaysLater);

  renderInspectionRangeList();
}

function openInspectionCreatePrompt() {
  const title = prompt("Vad ska besiktigas? Ex: Bil 1, ABC123 eller Växelrum");

  if (!title) return;

  const date = prompt("Vilket datum? Skriv i formatet YYYY-MM-DD");

  if (!date) return;

  const inspections = getInspections();

  inspections.push({
    id: crypto.randomUUID(),
    title: title.trim(),
    date,
    status: "open"
  });

  saveInspections(inspections);
  loadDashboardInspectionStats();

  alert("Besiktningen sparades.");
}

/* ===== BESIKTNINGAR ===== */

function saveInspections(inspections) {
  localStorage.setItem("inspections", JSON.stringify(inspections));
}

function openInspectionSearchModal() {
  inspectionSearchInput.value = "";
  inspectionVehicleSearchResult.innerHTML = "";

  inspectionRegNumber.value = "";
  inspectionDate.value = formatLocalDate(new Date());
  inspectionTime.value = "";
  inspectionCategory.value = "Besiktning";
  inspectionInfo.value = "";

  inspectionModal.classList.add("open");
}

function closeInspectionModal() {
  inspectionModal.classList.remove("open");
}

function searchInspectionVehicles() {
  const query = inspectionSearchInput.value.trim().toLowerCase();
  const result = document.getElementById("inspectionVehicleSearchResult");

  if (!result) return;

  const vehicles = getVehicles();

  const matches = vehicles.filter(vehicle => {
    const reg = (vehicle.regNumber || "").toLowerCase();
    const category = (vehicle.category || "").toLowerCase();
    const info = (vehicle.info || "").toLowerCase();

    if (!query) return true;

    return reg.includes(query) ||
      category.includes(query) ||
      info.includes(query);
  });

  if (matches.length === 0) {
    result.innerHTML = "<p>Inga fordon hittades.</p>";
    return;
  }

  result.innerHTML = `
    <table class="inspection-search-table">
      <thead>
        <tr>
          <th>Regnr</th>
          <th>Kategori</th>
          <th>Info</th>
          <th>Välj</th>
        </tr>
      </thead>

      <tbody>
        ${matches.map(vehicle => `
          <tr>
            <td><b>${vehicle.regNumber || "-"}</b></td>
            <td>${vehicle.category || "-"}</td>
            <td>${vehicle.info || "-"}</td>
            <td>
              <button type="button" onclick="selectInspectionVehicle('${vehicle.id}')">
                Välj
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function selectInspectionVehicle(vehicleId) {
  const vehicle = getVehicles().find(vehicle =>
    vehicle.id === vehicleId
  );

  if (!vehicle) return;

  inspectionRegNumber.value = vehicle.regNumber || "";
  inspectionCategory.value = vehicle.category || "Besiktning";
  inspectionInfo.value = vehicle.info || "";
}

function saveInspection() {
  const regNumber = inspectionRegNumber.value.trim().toUpperCase();
  const date = inspectionDate.value;
  const time = inspectionTime.value;
  const category = inspectionCategory.value.trim();
  const info = inspectionInfo.value.trim();

  if (!regNumber) {
    alert("Välj ett fordon först.");
    return;
  }

  if (!date) {
    alert("Välj datum.");
    return;
  }

  const inspections = getInspections();

  inspections.push({
    id: crypto.randomUUID(),
    regNumber,
    date,
    time,
    category,
    info,
    status: "open",
    reminderName: ""
  });

  saveInspections(inspections);

  loadDashboardInspectionStats();
function initInspectionRange() {
  const fromInput = document.getElementById("inspectionRangeFrom");
  const toInput = document.getElementById("inspectionRangeTo");

  if (!fromInput || !toInput) return;

  const today = new Date();

  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  fromInput.value = formatLocalDate(today);
  toInput.value = formatLocalDate(sevenDaysLater);

  renderInspectionRangeList();
}
  renderInspectionWeekList();

  alert("Besiktningen sparades.");
}

function searchInspectionInline() {
  const input = document.getElementById("inspectionInlineSearch");
  const result = document.getElementById("inspectionInlineResult");

  if (!input || !result) return;

  const query = input.value.trim().toLowerCase();

if (!query) {
  result.innerHTML = "";
  renderInspectionRangeList();
  return;
}

  const vehicles = getVehicles();
  const inspections = getInspections();
  const today = formatLocalDate(new Date());

  const matches = vehicles.filter(vehicle => {
    const reg = (vehicle.regNumber || "").toLowerCase();
    const category = (vehicle.category || "").toLowerCase();
    const info = (vehicle.info || "").toLowerCase();

    return reg.includes(query) ||
      category.includes(query) ||
      info.includes(query);
  });

  if (matches.length === 0) {
    result.innerHTML = `
      <div class="inspection-inline-empty">
        Inget fordon hittades.
      </div>
    `;
    return;
  }

  result.innerHTML = `
    <div class="inspection-result-table">
      <div class="inspection-result-header">
        <span>Regnr</span>
        <span>Datum/tid</span>
        <span>Adress</span>
        <span>Deadline</span>
        <span>Åtgärder</span>
      </div>

      ${matches.map(vehicle => {
        const vehicleInspections = inspections
          .filter(inspection =>
            inspection.vehicleId === vehicle.id ||
            inspection.regNumber === vehicle.regNumber
          )
          .filter(inspection => inspection.status !== "done")
          .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.time || "").localeCompare(b.time || "");
          });

        const nextInspection = vehicleInspections.find(inspection =>
          inspection.date >= today
        );

        const latestInspection = vehicleInspections[vehicleInspections.length - 1];
        const displayInspection = nextInspection || latestInspection;

        const dateTime = displayInspection
          ? `${displayInspection.date || "-"} ${displayInspection.time || ""}`
          : "-";

        const address = displayInspection?.address || vehicle.info || "-";

const deadline = displayInspection
  ? (displayInspection.deadlineDate || displayInspection.nextDate || "-")
  : "-";

        return `
          <div class="inspection-result-row">
            <span><b>${vehicle.regNumber || "-"}</b></span>
            <span>${dateTime}</span>
            <span>${address}</span>
            <span>
  <span class="inspection-deadline-badge">
    ${deadline}
  </span>
</span>
            <span class="inspection-action-buttons">
              ${
                displayInspection
                  ? `
                    <button type="button" onclick="editInspection('${displayInspection.id}')">
                      Ändra
                    </button>

                    <button type="button" class="delete-small-btn" onclick="deleteInspection('${displayInspection.id}')">
                      Radera
                    </button>
                  `
                  : ""
              }

              <button type="button" onclick="openInspectionCreateModal('${vehicle.id}')">
                Skapa
              </button>
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;
  renderInspectionRangeList();
}

function openInlineInspectionForm(vehicleId) {
  const vehicle = getVehicles().find(v => v.id === vehicleId);
  const result = document.getElementById("inspectionInlineResult");

  if (!vehicle || !result) return;

  result.innerHTML = `
    <div class="inspection-inline-form">
      <h4>Ny besiktning – ${vehicle.regNumber}</h4>

      <input id="inlineInspectionRegNumber" value="${vehicle.regNumber}" readonly>
      <input id="inlineInspectionDate" type="date" value="${formatLocalDate(new Date())}">
      <input id="inlineInspectionTime" type="time">
      <input id="inlineInspectionCategory" value="${vehicle.category || "Besiktning"}">
      <input id="inlineInspectionInfo" value="${vehicle.info || ""}">

      <div>
        <button type="button" onclick="saveInlineInspection()">
          Spara
        </button>

        <button type="button" onclick="searchInspectionInline()">
          Avbryt
        </button>
      </div>
    </div>
  `;
}

function saveInlineInspection() {
  const regNumber = inlineInspectionRegNumber.value.trim().toUpperCase();
  const date = inlineInspectionDate.value;
  const time = inlineInspectionTime.value;
  const category = inlineInspectionCategory.value.trim();
  const info = inlineInspectionInfo.value.trim();

  if (!regNumber) {
    alert("Regnummer saknas.");
    return;
  }

  if (!date) {
    alert("Välj datum.");
    return;
  }

  const inspections = getInspections();

  inspections.push({
    id: crypto.randomUUID(),
    regNumber,
    date,
    time,
    category,
    info,
    status: "open",
    reminderName: ""
  });

  saveInspections(inspections);

  loadDashboardInspectionStats();
  renderInspectionWeekList();

  inspectionInlineSearch.value = "";
  inspectionInlineResult.innerHTML = "";

  alert("Besiktningen sparades.");
}
function getInspectionCreateElements() {
  return {
    modal: document.getElementById("inspectionCreateModal"),
    regNumber: document.getElementById("createInspectionRegNumber"),
    address: document.getElementById("createInspectionAddress"),
    type: document.getElementById("createInspectionType"),
    driver: document.getElementById("createInspectionDriver"),
    doneDate: document.getElementById("createInspectionDoneDate"),
    dueDate: document.getElementById("createInspectionDueDate"),
deadlineDate: document.getElementById("createInspectionDeadlineDate"),
    time: document.getElementById("createInspectionTime"),
    status: document.getElementById("createInspectionStatus"),
    info: document.getElementById("createInspectionInfo")
  };
}
let selectedInspectionVehicleId = null;
async function loadInspectionDriverSelect() {
  const el = getInspectionCreateElements();

  if (!el.driver) {
    alert("Hittar inte chaufförslistan i kontrollformuläret.");
    return;
  }

  el.driver.innerHTML = `<option value="">Ingen vald</option>`;

  const res = await api("/users");

  if (res.status === 401) {
    location.href = "/login.html";
    return;
  }

  const users = await res.json();

  const drivers = users
    .filter(user => user.role === "driver")
    .sort((a, b) => a.username.localeCompare(b.username, "sv"));

  drivers.forEach(driver => {
    el.driver.innerHTML += `
      <option value="${driver.username}">
        ${driver.username}
      </option>
    `;
  });
}

async function openInspectionCreateModal(vehicleId = null) {
  const el = getInspectionCreateElements();

  if (!el.modal || !el.type || !el.regNumber) {
    alert("Kontrollformuläret hittas inte i HTML. Kontrollera att inspectionCreateModal finns i admin.html.");
    return;
  }

  selectedInspectionVehicleId = vehicleId;
  editingInspectionId = null;

  await loadInspectionDriverSelect();

  el.regNumber.value = "";
  el.address.value = "";
  el.type.value = "Färdskrivarbesiktning";
  el.driver.value = "";
  el.doneDate.value = "";
  el.dueDate.value = formatLocalDate(new Date());
  el.deadlineDate.value = "";
  el.time.value = "";
  el.status.value = "planned";
  el.info.value = "";

  if (vehicleId) {
    const vehicle = getVehicles().find(vehicle =>
      vehicle.id === vehicleId
    );

    if (vehicle) {
      el.regNumber.value = vehicle.regNumber || "";
      el.address.value = vehicle.info || "";
    }
  }

  el.modal.classList.add("open");
}

async function editInspection(inspectionId) {
  const el = getInspectionCreateElements();

  if (!el.modal || !el.type || !el.regNumber) {
    alert("Kontrollformuläret hittas inte i HTML.");
    return;
  }

  const inspections = getInspections();

  const inspection = inspections.find(item =>
    item.id === inspectionId
  );

  if (!inspection) return;

  await loadInspectionDriverSelect();

  editingInspectionId = inspection.id;
  selectedInspectionVehicleId = inspection.vehicleId || null;

  el.regNumber.value = inspection.regNumber || "";
  el.address.value = inspection.address || "";

  el.type.value = inspection.type || inspection.category || "Färdskrivarbesiktning";
  el.driver.value = inspection.driver || "";

  el.doneDate.value = inspection.doneDate || "";
  el.dueDate.value = inspection.dueDate || inspection.date || formatLocalDate(new Date());
  el.deadlineDate.value = inspection.deadlineDate || inspection.nextDate || "";

  el.time.value = inspection.time || "";
  el.status.value = inspection.status || "planned";
  el.info.value = inspection.info || "";

  el.modal.classList.add("open");
}

function closeInspectionCreateModal() {
  const el = getInspectionCreateElements();

  if (el.modal) {
    el.modal.classList.remove("open");
  }
}

function saveInspectionFromModal() {
  const el = getInspectionCreateElements();

  if (!el.regNumber || !el.type) {
    alert("Kontrollformuläret hittas inte.");
    return;
  }

  const regNumber = el.regNumber.value.trim().toUpperCase();
  const address = el.address.value.trim();

  const type = el.type.value;
  const driver = el.driver.value;

const doneDate = el.doneDate.value;
const dueDate = el.dueDate.value;
const deadlineDate = el.deadlineDate.value;

const time = el.time.value;
const status = el.status.value;
const info = el.info.value.trim();

  if (!regNumber) {
    alert("Regnummer saknas. Välj ett fordon via sökningen först.");
    return;
  }

  if (!dueDate && status !== "done") {
    alert("Välj datum för 'Ska göras'.");
    return;
  }

  let inspections = getInspections();

  let savedInspection;

  if (editingInspectionId) {
    inspections = inspections.map(inspection => {
      if (inspection.id !== editingInspectionId) return inspection;

      savedInspection = {
        ...inspection,
        vehicleId: selectedInspectionVehicleId || inspection.vehicleId || null,
        regNumber,
        address,
        type,
        category: type,
        driver,
doneDate,
dueDate,
nextDate: deadlineDate,
deadlineDate,
date: dueDate,
        time,
        status,
        info
      };

      return savedInspection;
    });
  } else {
    savedInspection = {
      id: crypto.randomUUID(),
      vehicleId: selectedInspectionVehicleId,
      regNumber,
      address,
      type,
      category: type,
      driver,
doneDate,
dueDate,
nextDate: deadlineDate,
deadlineDate,
date: dueDate,
      time,
      status,
      info,
      createdAt: new Date().toISOString()
    };

    inspections.push(savedInspection);
  }

  if (normalizeInspectionStatus(status) === "done") {
    if (!savedInspection.doneDate) {
      savedInspection.doneDate = formatLocalDate(new Date());
    }

    inspections = inspections.map(inspection =>
      inspection.id === savedInspection.id ? savedInspection : inspection
    );
  }

  saveInspections(inspections);
  syncInspectionToVehicle(savedInspection);

  if (normalizeInspectionStatus(savedInspection.status) === "done") {
    createNextInspectionDeadlineIfNeeded(savedInspection);
  }

  editingInspectionId = null;
  selectedInspectionVehicleId = null;

  closeInspectionCreateModal();

loadDashboardInspectionStats();
renderInspectionRangeList();
searchInspectionInline();

  alert("Kontrollen sparades.");
}
function deleteInspection(inspectionId) {
  if (!confirm("Radera den bokade besiktningen?")) return;

  const inspections = getInspections().filter(inspection =>
    inspection.id !== inspectionId
  );

  saveInspections(inspections);

  // 🔥 Tar även bort från fordonet
  removeInspectionFromVehicle(inspectionId);

loadDashboardInspectionStats();
renderInspectionRangeList();
searchInspectionInline();

  alert("Besiktningen raderades.");
}

function renderInspectionWeekList() {
  const list = document.getElementById("inspectionWeekList");

  if (!list) return;

  const inspections = getInspections();

  const today = formatLocalDate(new Date());

  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = formatLocalDate(weekEndDate);

  const weekInspections = inspections
    .filter(inspection =>
      inspection.status !== "done" &&
      inspection.date &&
      inspection.date >= today &&
      inspection.date <= weekEnd
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });

  if (weekInspections.length === 0) {
    list.innerHTML = `<p class="dashboard-small-empty">Inga besiktningar denna vecka.</p>`;
    return;
  }

  list.innerHTML = `
    <table class="inspection-week-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Tid</th>
          <th>Kategori</th>
          <th>Regnr</th>
          <th>Info</th>
        </tr>
      </thead>
      <tbody>
        ${weekInspections.map(inspection => `
          <tr class="${getInspectionDateClass(inspection.date)}">
            <td>${inspection.date || "-"}</td>
            <td>${inspection.time || "-"}</td>
            <td>${inspection.category || "-"}</td>
            <td><b>${inspection.regNumber || "-"}</b></td>
            <td>${inspection.info || inspection.address || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function setInspectionFilter(filter) {
  activeInspectionFilter = filter;

  document.querySelectorAll(".inspection-filter-btn").forEach(button => {
    button.classList.remove("active");
  });

const buttonMap = {
  all: "inspectionFilterAll",
  planned: "inspectionFilterPlanned",
  booked: "inspectionFilterBooked",
  notDone: "inspectionFilterNotDone",
  done: "inspectionFilterDone",
  cancelled: "inspectionFilterCancelled"
};

  const activeButton = document.getElementById(buttonMap[filter]);

  if (activeButton) {
    activeButton.classList.add("active");
  }

  renderInspectionRangeList();
}

function setInspectionTypeFilter(type) {
  activeInspectionTypeFilter = type;
  renderInspectionRangeList();
}

function renderInspectionRangeList() {
  const fromInput = document.getElementById("inspectionRangeFrom");
  const toInput = document.getElementById("inspectionRangeTo");
  const list = document.getElementById("inspectionWeekList");

  if (!fromInput || !toInput || !list) return;

  const from = fromInput.value;
  const to = toInput.value;
  const searchInput = document.getElementById("inspectionInlineSearch");
const searchQuery = (searchInput?.value || "").trim().toLowerCase();

  if (!from || !to) {
    list.innerHTML = `<p class="dashboard-small-empty">Välj från och till datum.</p>`;
    return;
  }

  if (from > to) {
    list.innerHTML = `<p class="dashboard-small-empty">Från-datum kan inte vara efter till-datum.</p>`;
    return;
  }

  const inspections = getInspections();

  const activeInspections = inspections
    .filter(inspection => {
      
      const normalizedStatus = normalizeInspectionStatus(inspection.status);

      if (activeInspectionFilter === "all") return true;

      if (activeInspectionFilter === "notDone") {
        return normalizedStatus !== "done";
      }

      return normalizedStatus === activeInspectionFilter;
    })
    .filter(inspection => {
      
      if (activeInspectionTypeFilter === "all") return true;

      const typeText = getInspectionTypeText(inspection).toLowerCase();

      return typeText.includes(activeInspectionTypeFilter);
    })
    .filter(inspection => {
  if (!searchQuery) return true;

  const regNumber = (inspection.regNumber || "").toLowerCase();
  const type = (inspection.type || "").toLowerCase();
  const category = (inspection.category || "").toLowerCase();
  const address = (inspection.address || "").toLowerCase();
  const info = (inspection.info || "").toLowerCase();

  return (
    regNumber.includes(searchQuery) ||
    type.includes(searchQuery) ||
    category.includes(searchQuery) ||
    address.includes(searchQuery) ||
    info.includes(searchQuery)
  );
})
    .filter(inspection => {
      
      const bookedDate = inspection.date || "";
      return bookedDate >= from && bookedDate <= to;
    })
    .sort((a, b) => {
      const aDate = a.date || "";
      const bDate = b.date || "";

      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return (a.time || "").localeCompare(b.time || "");
    });

  if (activeInspections.length === 0) {
    list.innerHTML = `
      <p class="dashboard-small-empty">
        Inga kontroller hittades i valt datumspann.
      </p>
    `;
    return;
  }

  list.innerHTML = renderInspectionStatusTable(
    activeInspections,
    "Inga kontroller hittades i valt datumspann."
  );
}
function renderInspectionStatusTable(inspections, emptyText) {
  if (!inspections || inspections.length === 0) {
    return `<p class="dashboard-small-empty">${emptyText}</p>`;
  }

  return `
    <table class="inspection-week-table">
<thead>
  <tr>
    <th>Ska göras</th>
    <th>Tid</th>
    <th>Adress</th>
    <th>Besiktning</th>
    <th>Regnr</th>
    <th>Status</th>
    <th>Info</th>
    <th>Deadline</th>
    <th>Åtgärd</th>
  </tr>
</thead>

      <tbody>
        ${inspections.map(inspection => {
          const dueDate = inspection.dueDate || inspection.date || "";

          return `
<tr class="${getInspectionDateClass(dueDate)}">
  <td><b>${dueDate || "-"}</b></td>
  <td>${inspection.time || "-"}</td>
  <td>${inspection.address || "-"}</td>
  <td>${getInspectionTypeText(inspection)}</td>
  <td><b>${inspection.regNumber || "-"}</b></td>

              <td>
                <select
                  class="inspection-status-select"
                  onchange="updateInspectionStatusFromDashboard('${inspection.id}', this.value)"
                >
                  <option value="planned" ${normalizeInspectionStatus(inspection.status) === "planned" ? "selected" : ""}>Ej bokad</option>
                  <option value="booked" ${normalizeInspectionStatus(inspection.status) === "booked" ? "selected" : ""}>Bokad</option>
                  <option value="done" ${normalizeInspectionStatus(inspection.status) === "done" ? "selected" : ""}>Utförd</option>
                  <option value="cancelled" ${normalizeInspectionStatus(inspection.status) === "cancelled" ? "selected" : ""}>Avbokad</option>
                </select>
              </td>

<td>${inspection.info || "-"}</td>

<td>
  <span class="inspection-deadline-badge">
    ${inspection.deadlineDate || inspection.nextDate || "-"}
  </span>
</td>

<td>
  <button type="button" onclick="editInspection('${inspection.id}')">
    Ändra
  </button>
</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function updateInspectionStatusFromDashboard(inspectionId, newStatus) {
  let inspections = getInspections();

  let updatedInspection = null;

  inspections = inspections.map(inspection => {
    if (inspection.id !== inspectionId) return inspection;

    updatedInspection = {
      ...inspection,
      status: newStatus
    };

    if (newStatus === "done" && !updatedInspection.doneDate) {
      updatedInspection.doneDate = formatLocalDate(new Date());
    }

    return updatedInspection;
  });

  saveInspections(inspections);

  if (updatedInspection) {
    syncInspectionToVehicle(updatedInspection);

    if (newStatus === "done") {
      createNextInspectionDeadlineIfNeeded(updatedInspection);
    }
  }

  loadDashboardInspectionStats();
  renderInspectionRangeList();
  searchInspectionInline();
}

function getInspectionTypeText(inspection) {
  if (!inspection) return "-";

  if (inspection.type) return inspection.type;

  if (inspection.category) return inspection.category;

  if (inspection.title) return inspection.title;

  return "Besiktning";
}

function getInspectionDeadlineYears(type) {
  const value = String(type || "").trim().toLowerCase();

  if (value.includes("taxameter")) return 1;
  if (value.includes("alkolås")) return 1;
  if (value.includes("lyft")) return 1;
  if (value.includes("färdskriv")) return 2;

  // Besiktning, Service, Övrigt osv får ingen automatisk tid än
  return null;
}

function addYearsToDate(dateStr, years) {
  if (!dateStr || !years) return "";

  const date = new Date(dateStr + "T00:00:00");

  if (isNaN(date.getTime())) return "";

  date.setFullYear(date.getFullYear() + years);

  return formatLocalDate(date);
}

function createNextInspectionDeadlineIfNeeded(doneInspection) {
  console.log("START createNextInspectionDeadlineIfNeeded", doneInspection);

  if (!doneInspection) {
    alert("Ingen utförd kontroll skickades in.");
    return;
  }

  const inspections = getInspections();

  const alreadyCreated = inspections.some(inspection =>
    inspection.previousInspectionId === doneInspection.id
  );

  if (alreadyCreated) {
    alert("Nästa deadline finns redan för denna kontroll.");
    return;
  }

  const vehicles = getVehicles();

  const vehicle = vehicles.find(vehicle =>
    vehicle.id === doneInspection.vehicleId ||
    vehicle.regNumber === doneInspection.regNumber
  );

  if (!vehicle) {
    alert("Hittar inte fordonet för regnr: " + doneInspection.regNumber);
    return;
  }

  console.log("Hittade fordon:", vehicle);

  const type = doneInspection.type || doneInspection.category || "";
  const recurringKey = getRecurringKeyFromInspectionType(type);

  if (!recurringKey) {
    alert("Hittar ingen återkommande typ för: " + type);
    return;
  }

  const settings = getVehicleRecurringSettings(vehicle);
  const interval = settings[recurringKey];

  console.log("Typ:", type);
  console.log("Recurring key:", recurringKey);
  console.log("Settings:", settings);
  console.log("Interval:", interval);

  if (!interval) {
    alert("Ingen automatisk deadline är vald för: " + type);
    return;
  }

  const performedDate =
    doneInspection.doneDate ||
    doneInspection.dueDate ||
    doneInspection.date ||
    formatLocalDate(new Date());

  const nextDeadline = addRecurringIntervalToDate(performedDate, interval);

  if (!nextDeadline) {
    alert("Kunde inte räkna ut nästa deadline.");
    return;
  }

  const nextInspection = {
    id: crypto.randomUUID(),
    previousInspectionId: doneInspection.id,

    vehicleId: vehicle.id,
    regNumber: vehicle.regNumber || "",

    address: "",
    type,
    category: type,
    driver: "",

    doneDate: "",
    dueDate: nextDeadline,
    nextDate: nextDeadline,
    deadlineDate: nextDeadline,

    date: nextDeadline,
    time: "",

    status: "planned",
    info: "Automatiskt skapad nästa deadline",

    createdAt: new Date().toISOString()
  };

  inspections.push(nextInspection);
  saveInspections(inspections);

  syncInspectionToVehicle(nextInspection);

  alert("Ny deadline skapades: " + nextDeadline);
}

function syncInspectionToVehicle(savedInspection) {
  const vehicles = getVehicles();

  const updatedVehicles = vehicles.map(vehicle => {
    const sameVehicle =
      vehicle.id === savedInspection.vehicleId ||
      vehicle.regNumber === savedInspection.regNumber;

    if (!sameVehicle) return vehicle;

    const inspections = vehicle.inspections || [];

    const alreadyExists = inspections.some(item =>
      item.id === savedInspection.id
    );

    let updatedInspections;

    if (alreadyExists) {
      updatedInspections = inspections.map(item =>
        item.id === savedInspection.id ? savedInspection : item
      );
    } else {
      updatedInspections = [...inspections, savedInspection];
    }

    return {
      ...vehicle,
      inspections: updatedInspections
    };
  });

  saveVehicles(updatedVehicles);
  loadVehicleQuickSelect();
  loadVehicleSelect();
}
function removeInspectionFromVehicle(inspectionId) {
  const vehicles = getVehicles();

  const updatedVehicles = vehicles.map(vehicle => {
    const inspections = vehicle.inspections || [];

    return {
      ...vehicle,
      inspections: inspections.filter(item =>
        item.id !== inspectionId
      )
    };
  });

  saveVehicles(updatedVehicles);
  loadVehicleQuickSelect();
  loadVehicleSelect();
}

function getInspectionDateClass(dateStr) {
  if (!dateStr) return "";

  const today = formatLocalDate(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatLocalDate(tomorrowDate);

  if (dateStr < today) return "inspection-date-overdue";
  if (dateStr === today) return "inspection-date-today";
  if (dateStr === tomorrow) return "inspection-date-tomorrow";

  return "";
}
async function renderAbsenceDashboardTable() {
  const todayBox = document.getElementById("absenceTodayBox");
  const upcomingBox = document.getElementById("upcomingAbsenceBox");

  if (!todayBox || !upcomingBox) return;

  const today = formatLocalDate(new Date());

  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = formatLocalDate(weekEndDate);

  const usersRes = await api("/users");
  const shiftsRes = await api("/shifts");

  if (usersRes.status === 401 || shiftsRes.status === 401) {
    location.href = "/login.html";
    return;
  }

  const users = await usersRes.json();
  const shifts = await shiftsRes.json();

  const drivers = users.filter(user => user.role === "driver");

  const absenceStatuses = [
    "Sjuk",
    "Semester",
    "Vård av barn",
    "Föräldraledig",
    "Övrigt"
  ];

  const todayAbsenceShifts = shifts
    .filter(shift =>
      shift.date === today &&
      shift.driver &&
      absenceStatuses.includes(shift.status)
    )
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const upcomingAbsenceShifts = shifts
    .filter(shift =>
      shift.date > today &&
      shift.date <= weekEnd &&
      shift.driver &&
      absenceStatuses.includes(shift.status)
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });

  todayBox.innerHTML = renderAbsenceTableHtml(
    todayAbsenceShifts,
    drivers,
    shifts,
    "Ingen frånvaro registrerad idag."
  );

  upcomingBox.innerHTML = `
    <h4>Kommande 7 dagar</h4>
    ${renderAbsenceTableHtml(
      upcomingAbsenceShifts,
      drivers,
      shifts,
      "Ingen kommande frånvaro registrerad."
    )}
  `;
  showAbsenceTab(activeAbsenceTab);
}

function showAbsenceTab(tab) {
  activeAbsenceTab = tab;

  const todayBox = document.getElementById("absenceTodayBox");
  const upcomingBox = document.getElementById("upcomingAbsenceBox");

  const todayBtn = document.getElementById("absenceTabToday");
  const upcomingBtn = document.getElementById("absenceTabUpcoming");

  if (!todayBox || !upcomingBox || !todayBtn || !upcomingBtn) return;

  todayBox.style.display = tab === "today" ? "block" : "none";
  upcomingBox.style.display = tab === "upcoming" ? "block" : "none";

  todayBtn.classList.toggle("active", tab === "today");
  upcomingBtn.classList.toggle("active", tab === "upcoming");
}

function renderAbsenceTableHtml(absenceShifts, drivers, allShifts, emptyText) {
  if (absenceShifts.length === 0) {
    return `
      <p class="dashboard-small-empty">
        ${emptyText}
      </p>
    `;
  }

  return `
    <table class="absence-dashboard-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Chaufför</th>
          <th>Status</th>
          <th>Pass</th>
          <th>Tid</th>
          <th>Ersättare</th>
          <th>Snabbval</th>
        </tr>
      </thead>

      <tbody>
        ${absenceShifts.map(shift => {
          const substitute = shift.substitute || "";

          const suggestion = !substitute
            ? findBestReplacementForShift(shift, drivers, allShifts)
            : null;

          return `
            <tr>
              <td>${shift.date || "-"}</td>
              <td><b>${shift.driver || "-"}</b></td>
              <td>${shift.status || "Frånvaro"}</td>
              <td>${shift.shift || "-"}</td>
              <td>${shift.time || "-"}</td>
              <td>
                ${
                  substitute
                    ? `<b>${substitute}</b>`
                    : suggestion
                      ? `
                        <span class="absence-no-replacement">Ej vald</span>
                        <br>
                        <small>Förslag: ${suggestion.username} (${suggestion.score}p)</small>
                      `
                      : `<span class="absence-no-replacement">Ej vald</span>`
                }
              </td>
              <td>
  <button
    type="button"
    class="absence-small-btn"
    onclick="toggleAvailableDrivers('${shift.id}')"
  >
    Visa tillgängliga
  </button>
</td>
            </tr>

            <tr id="available-drivers-${shift.id}" class="available-drivers-row" style="display:none;">
              <td colspan="7">
                <div class="available-drivers-box">
                  Laddar...
                </div>
              </td>
            </tr>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function toggleUpcomingAbsence() {
  showUpcomingAbsence = !showUpcomingAbsence;

  const box = document.getElementById("upcomingAbsenceBox");
  const btn = document.getElementById("toggleUpcomingAbsenceBtn");

  if (!box || !btn) return;

  box.style.display = showUpcomingAbsence ? "block" : "none";
  btn.innerText = showUpcomingAbsence
    ? "Dölj kommande 7 dagar"
    : "Visa kommande 7 dagar";
}

function findBestReplacementForShift(absenceShift, drivers, allShifts) {
  const absentDriverName = (absenceShift.driver || "").trim().toLowerCase();

  const absenceStatuses = [
    "Sjuk",
    "Semester",
    "Vård av barn",
    "Föräldraledig",
    "Övrigt"
  ];

  const replacementOptions = [];

  drivers.forEach(driver => {
    const driverName = (driver.username || "").trim().toLowerCase();

    if (!driverName) return;

    // Föreslå aldrig samma chaufför som är frånvarande
    if (driverName === absentDriverName) return;

    // Föreslå inte någon som själv är frånvarande samma dag
    const driverIsAbsentSameDay = allShifts.some(shift =>
      shift.date === absenceShift.date &&
      (shift.driver || "").trim().toLowerCase() === driverName &&
      absenceStatuses.includes(shift.status || "")
    );

    if (driverIsAbsentSameDay) return;

    const check = driverCanTakeShift(driver, absenceShift, allShifts);

    if (!check.ok) return;

    const scoring = scoreDriverForShift(driver, absenceShift, allShifts);

    replacementOptions.push({
      username: driver.username,
      score: Math.round(scoring.score)
    });
  });

  replacementOptions.sort((a, b) => a.score - b.score);

  return replacementOptions[0] || null;
}

async function toggleAvailableDrivers(shiftId) {
  const row = document.getElementById(`available-drivers-${shiftId}`);

  if (!row) return;

  const isOpen = row.style.display !== "none";

  if (isOpen) {
    row.style.display = "none";
    return;
  }

  row.style.display = "table-row";

  const box = row.querySelector(".available-drivers-box");
  if (box) box.innerHTML = "Laddar tillgängliga chaufförer...";

  const usersRes = await api("/users");
  const shiftsRes = await api("/shifts");

  if (!usersRes.ok || !shiftsRes.ok) {
    if (box) box.innerHTML = "Kunde inte ladda chaufförer.";
    return;
  }

  const users = await usersRes.json();
  const shifts = await shiftsRes.json();

  const shift = shifts.find(s => String(s.id) === String(shiftId));

  if (!shift) {
    if (box) box.innerHTML = "Kunde inte hitta passet.";
    return;
  }

  const drivers = users.filter(user => user.role === "driver");

  const candidates = getDriverCandidatesForShift(
    shift,
    drivers,
    shifts
  );

  renderAvailableDriversBox(shift, candidates, box);
}

function renderAvailableDriversBox(shift, candidates, box) {
  if (!box) return;

  const topThree = candidates.topThree || [];
  const restOk = candidates.restOk || [];
  const blocked = candidates.blocked || [];

  box.innerHTML = `
    <div class="available-section">
      <h5>Top 3 förslag</h5>
      ${renderCandidateList(shift, topThree, true)}
    </div>

    <div class="available-section">
      <h5>Övriga tillgängliga</h5>
      ${renderCandidateList(shift, restOk, true)}
    </div>

    <div class="available-section blocked">
      <h5>Blockerade</h5>
      ${renderCandidateList(shift, blocked, false)}
    </div>
  `;
}



function renderCandidateList(shift, candidates, canAssign) {
  if (!candidates || candidates.length === 0) {
    return `<p class="dashboard-small-empty">Inga chaufförer.</p>`;
  }

  return `
    <div class="candidate-list">
      ${candidates.map(candidate => {
        const driver = candidate.driver;
        const phone = driver.phone || "";

        return `
          <div class="candidate-row">
            <div>
              <b>${driver.username}</b>
              ${candidate.score !== Infinity ? `<small>Poäng: ${Math.round(candidate.score)}</small>` : ""}
              ${
                candidate.details?.length
                  ? `<small>${candidate.details.join(", ")}</small>`
                  : ""
              }
            </div>

            <div class="candidate-actions">
              ${
                phone
                  ? `<a class="candidate-call-btn" href="tel:${phone}">Ring</a>`
                  : ""
              }

              ${
                canAssign
                  ? `
                    <button
                      type="button"
                      class="absence-small-btn"
                      onclick="setShiftSubstitute('${shift.id}', '${driver.username}')"
                    >
                      Sätt som ersättare
                    </button>
                  `
                  : ""
              }
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function setShiftSubstitute(shiftId, username) {
  const res = await api(`/shifts/${shiftId}`, {
    method: "PUT",
    body: JSON.stringify({
      substitute: username
    })
  });

  if (res.status === 401) {
    location.href = "/login.html";
    return;
  }

  if (!res.ok) {
    alert("Kunde inte sätta ersättare.");
    return;
  }

  await renderAbsenceDashboardTable();
}