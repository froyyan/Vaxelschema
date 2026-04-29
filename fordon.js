let selectedVehiclePageId = null;
let activeVehicleBookedFilter = "all";
let activeVehicleBookedTypeFilter = "all";

window.addEventListener("load", () => {
  renderVehiclesSidebar();

  const params = new URLSearchParams(window.location.search);
  const vehicleId = params.get("vehicleId");

  if (vehicleId) {
    selectVehiclePage(vehicleId);
  }
});

function getVehicles() {
  return JSON.parse(localStorage.getItem("vehicles") || "[]");
}

function renderVehiclesSidebar() {
  const list = document.getElementById("vehiclesSidebarList");
  const input = document.getElementById("vehiclesSearchInput");

  if (!list) return;

  const query = (input?.value || "").trim().toLowerCase();

  const vehicles = getVehicles()
    .filter(vehicle => {
      const reg = (vehicle.regNumber || "").toLowerCase();
      const category = (vehicle.category || "").toLowerCase();
      const info = (vehicle.info || "").toLowerCase();

      if (!query) return true;

      return reg.includes(query) ||
        category.includes(query) ||
        info.includes(query);
    })
    .sort((a, b) =>
      (a.regNumber || "").localeCompare(b.regNumber || "", "sv")
    );

  if (vehicles.length === 0) {
    list.innerHTML = `<p class="dashboard-small-empty">Inga fordon hittades.</p>`;
    return;
  }

list.innerHTML = vehicles.map(vehicle => {
  const isActive = vehicle.active !== false;
  const warnings = getVehicleDeadlineWarnings(vehicle);
  const warningTooltip = getVehicleDeadlineWarningTooltip(vehicle);

  return `
    <button
      type="button"
      class="vehicle-sidebar-item ${vehicle.id === selectedVehiclePageId ? "active" : ""} ${!isActive ? "is-inactive" : ""}"
      onclick="selectVehiclePage('${vehicle.id}')"
    >
      <div class="vehicle-sidebar-topline">
        <strong>${vehicle.regNumber || "-"}</strong>

        <div class="vehicle-sidebar-badges">
          <span class="vehicle-active-badge ${isActive ? "is-active" : "is-inactive"}">
            ${isActive ? "Aktiv" : "Inaktiv"}
          </span>

          ${
            warnings.length > 0
              ? `
                <span
                  class="vehicle-warning-badge"
                  title="${warningTooltip}"
                >
                  ⚠ ${warnings.length}
                </span>
              `
              : ""
          }
        </div>
      </div>

      <span>${vehicle.category || "-"}</span>
      <small>${vehicle.info || "-"}</small>
    </button>
  `;
}).join("");
}

function selectVehiclePage(vehicleId) {
  selectedVehiclePageId = vehicleId;

  const vehicle = getVehicles().find(vehicle => vehicle.id === vehicleId);
  if (!vehicle) return;

  const emptyBox = document.querySelector(".fordon-right");
  const profileBox = document.getElementById("vehiclePageProfile");

  if (emptyBox) emptyBox.style.display = "none";
  if (profileBox) profileBox.style.display = "block";

document.getElementById("vehiclePageInfoRegNumber").innerText = vehicle.regNumber || "-";
document.getElementById("vehiclePageCategory").innerText = vehicle.category || "-";
document.getElementById("vehiclePagePhone").innerText = vehicle.phone || "-";
document.getElementById("vehiclePageInfoBox").innerText = vehicle.info || "-";

document.getElementById("vehiclePageActiveStatus").innerText =
  vehicle.active === false ? "Inaktiv" : "Aktiv";

  renderVehiclesSidebar();
  renderVehicleDeadlineCards(vehicle);
  renderVehicleBookedList(vehicle);
  renderVehicleHistoryList(vehicle);
  loadVehicleRecurringSettings(vehicle);
  showVehiclePageTab("deadlines");
}

function showVehiclePageTab(tab) {
  document.querySelectorAll(".vehicle-page-tab").forEach(button => {
    button.classList.remove("active");
  });

  document.querySelectorAll(".vehicle-page-tab-content").forEach(content => {
    content.style.display = "none";
  });

  const tabMap = {
    info: {
      buttonIndex: 0,
      contentId: "vehiclePageInfoTab"
    },
    deadlines: {
      buttonIndex: 1,
      contentId: "vehiclePageDeadlinesTab"
    },
    booked: {
      buttonIndex: 2,
      contentId: "vehiclePageBookedTab"
    },
    history: {
      buttonIndex: 3,
      contentId: "vehiclePageHistoryTab"
    }
  };

  const selected = tabMap[tab];

  if (!selected) return;

  const buttons = document.querySelectorAll(".vehicle-page-tab");
  if (buttons[selected.buttonIndex]) {
    buttons[selected.buttonIndex].classList.add("active");
  }

  const content = document.getElementById(selected.contentId);
  if (content) {
    content.style.display = "block";
  }

  if (tab === "booked") {
    renderCurrentVehicleBookedList();
  }
}

function renderVehicleDeadlineCards(vehicle) {
  const box = document.getElementById("vehicleDeadlineCards");
  if (!box) return;

  const inspections = vehicle.inspections || [];

  const deadlineInspections = inspections
    .filter(inspection => normalizeInspectionStatus(inspection.status) !== "done")
    .filter(inspection => inspection.deadlineDate || inspection.nextDate)
    .sort((a, b) => {
      const aDeadline = a.deadlineDate || a.nextDate || "";
      const bDeadline = b.deadlineDate || b.nextDate || "";
      return aDeadline.localeCompare(bDeadline);
    });

  if (deadlineInspections.length === 0) {
    box.innerHTML = `
      <div class="vehicle-empty-card">
        <h4>Inga deadlines</h4>
        <p>Det finns inga sparade deadline-besiktningar på detta fordon.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = deadlineInspections.map(inspection => {
    const deadline = inspection.deadlineDate || inspection.nextDate || "";
    const dueDate = inspection.dueDate || inspection.date || "";
    const type = inspection.type || inspection.category || "Besiktning";
    const status = normalizeInspectionStatus(inspection.status);

    const statusClass = getDeadlineStatusClass(deadline);
    const statusText = getDeadlineStatusText(deadline);

    const bookedText = dueDate
      ? `${dueDate}${inspection.time ? " kl. " + inspection.time : ""}`
      : "Ingen bokning";

    return `
      <div class="vehicle-deadline-card ${statusClass}">
        <div class="vehicle-deadline-card-header">
          <div>
            <h4>${type}</h4>
            <p>
  ${inspection.address || "Ingen adress bokad"}
</p>
          </div>

          <span class="vehicle-deadline-badge ${statusClass}">
            ${statusText}
          </span>
        </div>

        <div class="vehicle-deadline-main-date">
          <span>Deadline</span>
          <strong>${deadline || "-"}</strong>
        </div>

        <div class="vehicle-deadline-info-grid">
          <div>
            <span>Ska göras</span>
            <strong>${dueDate || "-"}</strong>
          </div>

<div>
  <span>Status</span>
  <strong>${getInspectionStatusText(status)}</strong>

  ${
    status === "booked"
      ? `<small class="vehicle-status-address">${inspection.address || "Ingen adress angiven"}</small>`
      : ""
  }
</div>

          <div>
            <span>Bokning</span>
            <strong>${bookedText}</strong>
          </div>

        </div>

        ${
          inspection.info
            ? `<div class="vehicle-deadline-note">${inspection.info}</div>`
            : ""
        }

<div class="vehicle-deadline-actions">
  ${
    dueDate
      ? `
        <button type="button" onclick="openVehiclePageInspectionEdit('${inspection.id}')">
          Ändra bokning
        </button>
      `
      : `
        <button type="button" onclick="openVehiclePageBookingForm('${inspection.id}')">
          Skapa bokning
        </button>
      `
  }

  <button
    type="button"
    class="vehicle-delete-inspection-btn"
    onclick="deleteVehiclePageInspection('${inspection.id}')"
  >
    Radera
  </button>
</div>
        <div
  id="vehicleDeadlineEditBox-${inspection.id}"
  class="vehicle-deadline-edit-box"
  style="display:none;"
></div>
      </div>
    `;
  }).join("");
}

function renderVehicleBookedList(vehicle) {
  const box = document.getElementById("vehicleBookedList");
  if (!box) return;

  initVehicleBookedDateRange();

  const from = document.getElementById("vehicleBookedFrom")?.value || "";
  const to = document.getElementById("vehicleBookedTo")?.value || "";

  const inspections = (vehicle.inspections || [])
    .filter(inspection => {
      const status = normalizeInspectionStatus(inspection.status);

      if (activeVehicleBookedFilter === "all") return true;

      if (activeVehicleBookedFilter === "notDone") {
        return status !== "done";
      }

      return status === activeVehicleBookedFilter;
    })
    .filter(inspection => {
      if (activeVehicleBookedTypeFilter === "all") return true;

      const typeText = (inspection.type || inspection.category || "").toLowerCase();

      return typeText.includes(activeVehicleBookedTypeFilter);
    })
    .filter(inspection => {
      if (!from || !to) return true;

      const date =
        inspection.dueDate ||
        inspection.date ||
        inspection.deadlineDate ||
        inspection.nextDate ||
        "";

      return date >= from && date <= to;
    })
    .sort((a, b) => {
      const aDate = a.dueDate || a.date || a.deadlineDate || a.nextDate || "";
      const bDate = b.dueDate || b.date || b.deadlineDate || b.nextDate || "";

      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return (a.time || "").localeCompare(b.time || "");
    });

  if (inspections.length === 0) {
    box.innerHTML = `
      <div class="vehicle-empty-card">
        <h4>Inga kontroller hittades</h4>
        <p>Det finns inga kontroller som matchar valt filter.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <table class="vehicle-booked-table">
      <thead>
        <tr>
          <th>Ska göras</th>
          <th>Tid</th>
          <th>Adress</th>
          <th>Besiktning</th>
          <th>Deadline</th>
          <th>Status</th>
          <th>Info</th>
          <th>Åtgärd</th>
        </tr>
      </thead>

      <tbody>
        ${inspections.map(inspection => {
          const dueDate = inspection.dueDate || inspection.date || "-";
          const deadline = inspection.deadlineDate || inspection.nextDate || "-";
          const type = inspection.type || inspection.category || "Besiktning";
          const status = normalizeInspectionStatus(inspection.status);

          return `
            <tr class="${getInspectionDateClassForVehiclePage(dueDate)}">
              <td><b>${dueDate}</b></td>
              <td>${inspection.time || "-"}</td>
              <td>${inspection.address || "-"}</td>
              <td>${type}</td>
              <td>
                <span class="inspection-deadline-badge">
                  ${deadline}
                </span>
              </td>
              <td>${getInspectionStatusText(status)}</td>
              <td>${inspection.info || "-"}</td>
<td>
  <div class="vehicle-table-actions">
    <button type="button" onclick="showVehiclePageTab('deadlines'); openVehiclePageInspectionEdit('${inspection.id}')">
      Ändra
    </button>

    <button
      type="button"
      class="vehicle-delete-inspection-btn"
      onclick="deleteVehiclePageInspection('${inspection.id}')"
    >
      Radera
    </button>
  </div>
</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderVehicleHistoryList(vehicle) {
  const box = document.getElementById("vehicleHistoryList");
  if (!box) return;

  const inspections = (vehicle.inspections || [])
    .filter(inspection => normalizeInspectionStatus(inspection.status) === "done")
    .sort((a, b) => {
      const aDate = a.doneDate || a.dueDate || a.date || "";
      const bDate = b.doneDate || b.dueDate || b.date || "";
      return bDate.localeCompare(aDate);
    });

  if (inspections.length === 0) {
    box.innerHTML = `
      <div class="vehicle-empty-card">
        <h4>Ingen historik</h4>
        <p>Det finns inga utförda kontroller på detta fordon ännu.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <table class="vehicle-history-table">
      <thead>
        <tr>
          <th>Utförd</th>
          <th>Typ</th>
          <th>Adress</th>
          <th>Tid</th>
          <th>Deadline</th>
          <th>Info</th>
          <th>Nästa deadline</th>
        </tr>
      </thead>

      <tbody>
        ${inspections.map(inspection => {
          const nextInspection = findNextInspectionFromPreviousId(inspection.id);

          return `
            <tr>
              <td><b>${inspection.doneDate || inspection.dueDate || inspection.date || "-"}</b></td>
              <td>${inspection.type || inspection.category || "Besiktning"}</td>
              <td>${inspection.address || "-"}</td>
              <td>${inspection.time || "-"}</td>
              <td>${inspection.deadlineDate || inspection.nextDate || "-"}</td>
              <td>${inspection.info || "-"}</td>
              <td>
                ${
                  nextInspection
                    ? `<span class="inspection-deadline-badge">${nextInspection.deadlineDate || nextInspection.nextDate || "-"}</span>`
                    : "-"
                }
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderSimpleVehicleInspectionTable(inspections) {
  return `
    <table class="vehicle-inspection-table">
      <thead>
        <tr>
          <th>Ska göras</th>
          <th>Tid</th>
          <th>Adress</th>
          <th>Besiktning</th>
          <th>Deadline</th>
          <th>Status</th>
          <th>Åtgärd</th>
        </tr>
      </thead>

      <tbody>
        ${inspections.map(inspection => `
          <tr>
            <td>${inspection.date || inspection.dueDate || "-"}</td>
            <td>${inspection.time || "-"}</td>
            <td>${inspection.address || "-"}</td>
            <td>${inspection.type || inspection.category || "-"}</td>
            <td>${inspection.deadlineDate || inspection.nextDate || "-"}</td>
            <td>${getInspectionStatusText(inspection.status)}</td>
            <td>
              <button type="button" onclick="editInspection('${inspection.id}')">
                Ändra
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getDeadlineStatusClass(deadline) {
  if (!deadline) return "";

  const today = formatLocalDate(new Date());

  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const seven = formatLocalDate(sevenDays);
  const thirty = formatLocalDate(thirtyDays);

  if (deadline < today) return "is-overdue";
  if (deadline <= seven) return "is-soon";
  if (deadline <= thirty) return "is-warning";

  return "is-ok";
}

function getDeadlineStatusText(deadline) {
  if (!deadline) return "-";

  const today = formatLocalDate(new Date());

  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const seven = formatLocalDate(sevenDays);
  const thirty = formatLocalDate(thirtyDays);

  if (deadline < today) return "Passerad";
  if (deadline <= seven) return "Inom 7 dagar";
  if (deadline <= thirty) return "Inom 30 dagar";

  return "Mer än 30 dagar";
}

function openSelectedVehicleModalFromPage() {
  if (!selectedVehiclePageId) return;

  openVehicleModal();

  setTimeout(() => {
    editVehicle(selectedVehiclePageId);
  }, 0);
}

function openCreateVehicleFromPage() {
  openCreateVehicleModal();
}

function deleteSelectedVehicleFromPage() {
  if (!selectedVehicleId) {
    alert("Välj ett fordon först.");
    return;
  }

  if (!confirm("Vill du verkligen ta bort fordonet?")) return;

  let vehicles = getVehicles();

  vehicles = vehicles.filter(v => v.id !== selectedVehicleId);

  saveVehicles(vehicles);

  selectedVehicleId = null;

  renderVehicleList();
  clearVehiclePage();

  alert("Fordonet togs bort.");
}

function openAddDeadlineForm() {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  const box = document.getElementById("addDeadlineFormBox");
  if (!box) return;

  box.style.display = "block";

  box.innerHTML = `
    <div class="vehicle-inline-form">
      <h4>Lägg till kontroll / deadline</h4>

      <div class="vehicle-form-grid">
        <div>
          <label>Typ</label>
          <select id="newDeadlineType">
            <option value="Färdskrivarbesiktning">Färdskrivarbesiktning</option>
            <option value="Taxameterbesiktning">Taxameterbesiktning</option>
            <option value="Alkolås">Alkolås</option>
            <option value="Lyftbesiktning">Lyftbesiktning</option>
            <option value="Service">Service</option>
            <option value="Övrigt">Övrigt</option>
          </select>
        </div>

        <div>
          <label>Deadline</label>
          <input id="newDeadlineDate" type="date">
        </div>

        <div>
          <label>Ska göras</label>
          <input id="newDeadlineDueDate" type="date">
        </div>

        <div>
          <label>Tid</label>
          <input id="newDeadlineTime" type="time">
        </div>

        <div>
          <label>Status</label>
          <select id="newDeadlineStatus">
            <option value="planned">Ej bokad</option>
            <option value="booked">Bokad</option>
          </select>
        </div>

        <div>
          <label>Adress / info</label>
          <input id="newDeadlineAddress" placeholder="Ex: Kalmar Bilprovning">
        </div>

        <div>
          <label>Kommentar</label>
          <input id="newDeadlineInfo" placeholder="Ex: årlig kontroll">
        </div>
      </div>

      <div class="vehicle-inline-form-actions">
        <button type="button" onclick="saveDeadlineFromVehiclePage()">
          Spara kontroll
        </button>

        <button type="button" onclick="closeAddDeadlineForm()">
          Avbryt
        </button>
      </div>
    </div>
  `;

  const today = formatLocalDate(new Date());

  const deadlineInput = document.getElementById("newDeadlineDate");
  const dueDateInput = document.getElementById("newDeadlineDueDate");

  if (deadlineInput) deadlineInput.value = today;
  if (dueDateInput) dueDateInput.value = "";
}

function closeAddDeadlineForm() {
  const box = document.getElementById("addDeadlineFormBox");
  if (!box) return;

  box.style.display = "none";
  box.innerHTML = "";
}

function saveDeadlineFromVehiclePage() {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  const vehicles = getVehicles();
  const vehicle = vehicles.find(v => v.id === selectedVehiclePageId);

  if (!vehicle) {
    alert("Kunde inte hitta fordonet.");
    return;
  }

  const type = document.getElementById("newDeadlineType").value;
  const deadlineDate = document.getElementById("newDeadlineDate").value;
  const dueDate = document.getElementById("newDeadlineDueDate").value;
  const time = document.getElementById("newDeadlineTime").value;
  const status = document.getElementById("newDeadlineStatus").value;
  const address = document.getElementById("newDeadlineAddress").value.trim();
  const info = document.getElementById("newDeadlineInfo").value.trim();

  if (!deadlineDate) {
    alert("Välj deadline.");
    return;
  }

  const newInspection = {
    id: crypto.randomUUID(),
    vehicleId: vehicle.id,
    regNumber: vehicle.regNumber || "",
    type,
    category: type,
    deadlineDate,
    nextDate: deadlineDate,
    dueDate,
    date: dueDate,
    time,
    status,
    address,
    info,
    doneDate: "",
    driver: "",
    createdAt: new Date().toISOString()
  };

  const updatedVehicles = vehicles.map(v => {
    if (v.id !== selectedVehiclePageId) return v;

    return {
      ...v,
      inspections: [
        ...(v.inspections || []),
        newInspection
      ]
    };
  });

  saveVehicles(updatedVehicles);

  const inspections = getInspections();
  inspections.push(newInspection);
  saveInspections(inspections);

  closeAddDeadlineForm();

  selectVehiclePage(selectedVehiclePageId);
}

let editingVehiclePageInspectionId = null;

function openVehiclePageBookingForm(inspectionId) {
  openVehiclePageInspectionEdit(inspectionId);
}

function openVehiclePageInspectionEdit(inspectionId) {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  editingVehiclePageInspectionId = inspectionId;

  const vehicle = getVehicles().find(v => v.id === selectedVehiclePageId);
  if (!vehicle) return;

  const inspection = (vehicle.inspections || []).find(item => item.id === inspectionId);
  if (!inspection) return;

  renderVehicleDeadlineCards(vehicle);

  const formBox = document.getElementById(`vehicleDeadlineEditBox-${inspectionId}`);
  if (!formBox) return;

  formBox.style.display = "block";

  formBox.innerHTML = `
    <div class="vehicle-deadline-edit-form">
      <h5>Ändra bokning</h5>

      <div class="vehicle-form-grid">
        <div>
          <label>Ska göras</label>
          <input id="editDeadlineDueDate-${inspectionId}" type="date" value="${inspection.dueDate || inspection.date || ""}">
        </div>

        <div>
          <label>Tid</label>
          <input id="editDeadlineTime-${inspectionId}" type="time" value="${inspection.time || ""}">
        </div>

        <div>
          <label>Adress</label>
          <input id="editDeadlineAddress-${inspectionId}" value="${inspection.address || ""}" placeholder="Ex: Opus Smedby">
        </div>

        <div>
          <label>Status</label>
          <select id="editDeadlineStatus-${inspectionId}">
            <option value="planned" ${normalizeInspectionStatus(inspection.status) === "planned" ? "selected" : ""}>Ej bokad</option>
            <option value="booked" ${normalizeInspectionStatus(inspection.status) === "booked" ? "selected" : ""}>Bokad</option>
            <option value="done" ${normalizeInspectionStatus(inspection.status) === "done" ? "selected" : ""}>Utförd</option>
            <option value="cancelled" ${normalizeInspectionStatus(inspection.status) === "cancelled" ? "selected" : ""}>Avbokad</option>
          </select>
        </div>

        <div>
          <label>Kommentar</label>
          <input id="editDeadlineInfo-${inspectionId}" value="${inspection.info || ""}" placeholder="Kommentar">
        </div>
      </div>

      <div class="vehicle-inline-form-actions">
        <button type="button" onclick="saveVehiclePageInspectionEdit('${inspectionId}')">
          Spara bokning
        </button>

        <button type="button" onclick="cancelVehiclePageInspectionEdit()">
          Avbryt
        </button>
      </div>
    </div>
  `;
}

function cancelVehiclePageInspectionEdit() {
  editingVehiclePageInspectionId = null;

  if (!selectedVehiclePageId) return;

  const vehicle = getVehicles().find(v => v.id === selectedVehiclePageId);
  if (!vehicle) return;

  renderVehicleDeadlineCards(vehicle);
}

function saveVehiclePageInspectionEdit(inspectionId) {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  const dueDate = document.getElementById(`editDeadlineDueDate-${inspectionId}`)?.value || "";
  const time = document.getElementById(`editDeadlineTime-${inspectionId}`)?.value || "";
  const address = document.getElementById(`editDeadlineAddress-${inspectionId}`)?.value.trim() || "";
  const status = document.getElementById(`editDeadlineStatus-${inspectionId}`)?.value || "planned";
  const info = document.getElementById(`editDeadlineInfo-${inspectionId}`)?.value.trim() || "";

  let updatedInspection = null;

  let vehicles = getVehicles();

  vehicles = vehicles.map(vehicle => {
    if (vehicle.id !== selectedVehiclePageId) return vehicle;

    const updatedInspections = (vehicle.inspections || []).map(inspection => {
      if (inspection.id !== inspectionId) return inspection;

      updatedInspection = {
        ...inspection,
        dueDate,
        date: dueDate,
        time,
        address,
        status,
        info
      };

      if (status === "done" && !updatedInspection.doneDate) {
        updatedInspection.doneDate = formatLocalDate(new Date());
      }

      return updatedInspection;
    });

    return {
      ...vehicle,
      inspections: updatedInspections
    };
  });

  saveVehicles(vehicles);

if (updatedInspection) {
  syncVehiclePageInspectionToGlobalList(updatedInspection);

  if (normalizeInspectionStatus(updatedInspection.status) === "done") {
    createNextVehicleDeadlineIfNeeded(updatedInspection);
  }
}

  editingVehiclePageInspectionId = null;

  selectVehiclePage(selectedVehiclePageId);
  renderCurrentVehicleBookedList();
}

function syncVehiclePageInspectionToGlobalList(updatedInspection) {
  let inspections = getInspections();

  const exists = inspections.some(item => item.id === updatedInspection.id);

  if (exists) {
    inspections = inspections.map(item =>
      item.id === updatedInspection.id ? updatedInspection : item
    );
  } else {
    inspections.push(updatedInspection);
  }

  saveInspections(inspections);
}

function initVehicleBookedDateRange() {
  const fromInput = document.getElementById("vehicleBookedFrom");
  const toInput = document.getElementById("vehicleBookedTo");

  if (!fromInput || !toInput) return;

  if (fromInput.value && toInput.value) return;

  const today = new Date();

  const oneYearAhead = new Date();
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

  fromInput.value = formatLocalDate(today);
  toInput.value = formatLocalDate(oneYearAhead);
}

function renderCurrentVehicleBookedList() {
  if (!selectedVehiclePageId) return;

  const vehicle = getVehicles().find(v => v.id === selectedVehiclePageId);
  if (!vehicle) return;

  renderVehicleBookedList(vehicle);
}

function setVehicleBookedFilter(filter) {
  activeVehicleBookedFilter = filter;

  document.querySelectorAll(".vehicle-booked-filter-btn").forEach(button => {
    button.classList.remove("active");
  });

  const buttonMap = {
    all: "vehicleBookedFilterAll",
    planned: "vehicleBookedFilterPlanned",
    notDone: "vehicleBookedFilterNotDone",
    booked: "vehicleBookedFilterBooked",
    done: "vehicleBookedFilterDone",
    cancelled: "vehicleBookedFilterCancelled"
  };

  const activeButton = document.getElementById(buttonMap[filter]);

  if (activeButton) {
    activeButton.classList.add("active");
  }

  renderCurrentVehicleBookedList();
}

function setVehicleBookedTypeFilter(type) {
  activeVehicleBookedTypeFilter = type;
  renderCurrentVehicleBookedList();
}

function getInspectionDateClassForVehiclePage(dateStr) {
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

function openVehicleEditFromPage() {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  const vehicle = getVehicles().find(v => v.id === selectedVehiclePageId);

  if (!vehicle) {
    alert("Kunde inte hitta fordonet.");
    return;
  }

  document.getElementById("vehiclePageEditReg").value = vehicle.regNumber || "";
  document.getElementById("vehiclePageEditCategory").value = vehicle.category || "";
  document.getElementById("vehiclePageEditPhone").value = vehicle.phone || "";
  document.getElementById("vehiclePageEditInfo").value = vehicle.info || "";

  document.getElementById("vehiclePageEditActive").value =
  vehicle.active === false ? "inactive" : "active";

  toggleVehicleEditBox(true);
}

function toggleVehicleEditBox(show) {
  const box = document.getElementById("vehiclePageEditBox");
  if (!box) return;

  box.style.display = show ? "block" : "none";
}

function saveVehicleFromPage() {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  let vehicles = getVehicles();

const updated = {
  regNumber: document.getElementById("vehiclePageEditReg").value.trim().toUpperCase(),
  category: document.getElementById("vehiclePageEditCategory").value.trim(),
  phone: document.getElementById("vehiclePageEditPhone").value.trim(),
  info: document.getElementById("vehiclePageEditInfo").value.trim(),
  active: document.getElementById("vehiclePageEditActive").value === "active"
};

  vehicles = vehicles.map(vehicle => {
    if (vehicle.id !== selectedVehiclePageId) return vehicle;

    return {
      ...vehicle,
      ...updated
    };
  });

  saveVehicles(vehicles);

  toggleVehicleEditBox(false);
  selectVehiclePage(selectedVehiclePageId);
}

function getVehicleDeadlineWarnings(vehicle) {
  const inspections = vehicle.inspections || [];

  const today = formatLocalDate(new Date());

  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + 14);
  const warningLimit = formatLocalDate(warningDate);

  return inspections
    .filter(inspection => normalizeInspectionStatus(inspection.status) !== "done")
    .filter(inspection => inspection.deadlineDate || inspection.nextDate)
    .filter(inspection => {
      const deadline = inspection.deadlineDate || inspection.nextDate;
      return deadline >= today && deadline <= warningLimit;
    })
    .sort((a, b) => {
      const aDeadline = a.deadlineDate || a.nextDate || "";
      const bDeadline = b.deadlineDate || b.nextDate || "";
      return aDeadline.localeCompare(bDeadline);
    });
}

function getVehicleDeadlineWarningTooltip(vehicle) {
  const warnings = getVehicleDeadlineWarnings(vehicle);

  if (warnings.length === 0) return "";

  return warnings.map(inspection => {
    const type = inspection.type || inspection.category || "Besiktning";
    const deadline = inspection.deadlineDate || inspection.nextDate || "-";

    const status = normalizeInspectionStatus(inspection.status);
    const bookingText = status === "booked" ? "Bokad" : "Ej bokad";

    return `${type} — deadline ${deadline} — ${bookingText}`;
  }).join("\n");
}
function deleteVehiclePageInspection(inspectionId) {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  const vehicle = getVehicles().find(v => v.id === selectedVehiclePageId);

  if (!vehicle) {
    alert("Kunde inte hitta fordonet.");
    return;
  }

  const inspection = (vehicle.inspections || []).find(item =>
    item.id === inspectionId
  );

  if (!inspection) {
    alert("Kunde inte hitta kontrollen.");
    return;
  }

  const type = inspection.type || inspection.category || "kontrollen";
  const deadline = inspection.deadlineDate || inspection.nextDate || "-";

  const confirmed = confirm(
    `Vill du radera ${type}?\n\nDeadline: ${deadline}\n\nDetta tar bort kontrollen från både fordonet och dashboarden.`
  );

  if (!confirmed) return;

  // 1. Ta bort från fordonets inspections
  let vehicles = getVehicles();

  vehicles = vehicles.map(vehicle => {
    if (vehicle.id !== selectedVehiclePageId) return vehicle;

    return {
      ...vehicle,
      inspections: (vehicle.inspections || []).filter(item =>
        item.id !== inspectionId
      )
    };
  });

  saveVehicles(vehicles);

  // 2. Ta bort från global inspections-lista som dashboarden använder
  const inspections = getInspections().filter(item =>
    item.id !== inspectionId
  );

  saveInspections(inspections);

  // 3. Stäng eventuell editruta
  editingVehiclePageInspectionId = null;

  // 4. Rendera om hela fordonet
  selectVehiclePage(selectedVehiclePageId);
}




function loadVehicleRecurringSettings(vehicle) {
  if (!vehicle) return;

  const settings = getVehicleRecurringSettings(vehicle);

  const taxameter = document.getElementById("recurringTaxameter");
  const alkolas = document.getElementById("recurringAlkolas");
  const fardskrivare = document.getElementById("recurringFardskrivare");
  const lyft = document.getElementById("recurringLyft");
  const service = document.getElementById("recurringService");

  if (taxameter) taxameter.value = settings.taxameter || "";
  if (alkolas) alkolas.value = settings.alkolas || "";
  if (fardskrivare) fardskrivare.value = settings.fardskrivare || "";
  if (lyft) lyft.value = settings.lyft || "";
  if (service) service.value = settings.service || "";
}

function saveVehicleRecurringSettings() {
  if (!selectedVehiclePageId) {
    alert("Välj ett fordon först.");
    return;
  }

  let vehicles = getVehicles();

  vehicles = vehicles.map(vehicle => {
    if (vehicle.id !== selectedVehiclePageId) return vehicle;

    return {
      ...vehicle,
      recurringDeadlines: {
        taxameter: document.getElementById("recurringTaxameter")?.value || "",
        alkolas: document.getElementById("recurringAlkolas")?.value || "",
        fardskrivare: document.getElementById("recurringFardskrivare")?.value || "",
        lyft: document.getElementById("recurringLyft")?.value || "",
        service: document.getElementById("recurringService")?.value || ""
      }
    };
  });

  saveVehicles(vehicles);

  alert("Återkommande deadlines sparades.");

  selectVehiclePage(selectedVehiclePageId);
}





function createNextVehicleDeadlineIfNeeded(doneInspection) {
  if (!selectedVehiclePageId || !doneInspection) return;

  const vehicles = getVehicles();
  const vehicle = vehicles.find(v => v.id === selectedVehiclePageId);
  if (!vehicle) return;

  const type = doneInspection.type || doneInspection.category || "";
  const key = getRecurringKeyFromInspectionType(type);
  if (!key) return;

  const settings = getVehicleRecurringSettings(vehicle);
  const interval = settings[key];
  if (!interval) return;

  const doneDate =
    doneInspection.doneDate ||
    doneInspection.dueDate ||
    doneInspection.date ||
    formatLocalDate(new Date());

  const nextDeadlineDate = addRecurringIntervalToDate(doneDate, interval);
  if (!nextDeadlineDate) return;

  const alreadyExists = getInspections().some(item =>
    item.previousInspectionId === doneInspection.id
  );

  if (alreadyExists) return;

  const nextInspection = {
    id: crypto.randomUUID(),
    previousInspectionId: doneInspection.id,

    vehicleId: vehicle.id,
    regNumber: vehicle.regNumber || "",

    type,
    category: type,

    deadlineDate: nextDeadlineDate,
    nextDate: nextDeadlineDate,

    dueDate: nextDeadlineDate,
    date: nextDeadlineDate,
    time: "",

    address: "",
    info: "Automatiskt skapad nästa deadline",

    status: "planned",
    doneDate: "",

    createdAt: new Date().toISOString()
  };

  const updatedVehicles = vehicles.map(v => {
    if (v.id !== vehicle.id) return v;

    return {
      ...v,
      inspections: [...(v.inspections || []), nextInspection]
    };
  });

  saveVehicles(updatedVehicles);

  const inspections = getInspections();
  inspections.push(nextInspection);
  saveInspections(inspections);
}
function findNextInspectionFromPreviousId(previousInspectionId) {
  if (!previousInspectionId) return null;

  return getInspections().find(inspection =>
    inspection.previousInspectionId === previousInspectionId
  ) || null;
}