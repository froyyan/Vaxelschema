let selectedUser = null;
let editingTemplateName = null;
let activeVehicleInspectionFilter = "all";
let activeVehicleInspectionTypeFilter = "all";
// ===== UNASSIGNED MODAL STATE =====
let currentUnassignedShifts = [];
let currentModalDrivers = [];
let currentUnassignedFrom = "";
let currentUnassignedTo = "";
let currentAutoFillResultRows = [];
let editingVehicleId = null;

/* ===== FORDON ===== */
function openVehicleModal() {
  vehicleModal.classList.add("open");
}

function openCreateVehicleModal() {
  clearVehicleForm();

  const editBox = document.getElementById("vehicleEditFormBox");
  if (editBox) {
    editBox.style.display = "block";
  }

  vehicleModal.classList.add("open");
}

function closeVehicleModal() {
  vehicleModal.classList.remove("open");
}

function toggleVehicleProfileEdit() {
  const box = document.getElementById("vehicleEditFormBox");

  if (!box) return;

  const isHidden = box.style.display === "none" || box.style.display === "";

  box.style.display = isHidden ? "block" : "none";
}

function clearVehicleForm() {
  editingVehicleId = null;

  vehicleRegNumber.value = "";
  vehicleCategory.value = "";
  vehiclePhone.value = "";
  vehicleInfo.value = "";

  vehicleProfileRegNumber.innerText = "-";
  vehicleProfileCategory.innerText = "-";
  vehicleProfilePhone.innerText = "-";
  vehicleProfileInfo.innerText = "-";

  const inspectionsBox = document.getElementById("vehicleProfileInspections");
  if (inspectionsBox) {
    inspectionsBox.innerHTML = `<p class="dashboard-small-empty">Inget fordon valt.</p>`;
  }

  const editBox = document.getElementById("vehicleEditFormBox");
  if (editBox) {
    editBox.style.display = "block";
  }

  const title = document.getElementById("vehicleModalTitle");
  const subtitle = document.getElementById("vehicleModalSubtitle");

  if (title) title.innerText = "Skapa fordon";
  if (subtitle) subtitle.innerText = "Fyll i uppgifterna och klicka på Spara fordon.";
}
function showVehicleProfile(vehicle) {
  const box = document.getElementById("vehicleProfileBox");

  if (!box || !vehicle) return;

  vehicleProfileRegNumber.innerText = vehicle.regNumber || "-";
  vehicleProfileCategory.innerText = vehicle.category || "-";
  vehicleProfilePhone.innerText = vehicle.phone || "-";
  vehicleProfileInfo.innerText = vehicle.info || "-";

  renderVehicleProfileInspections(vehicle);

  box.style.display = "block";
}

function renderVehicleProfileInspections(vehicle) {
  const box = document.getElementById("vehicleProfileInspections");

  if (!box) return;

  const inspections = vehicle.inspections || [];

  const fromInput = document.getElementById("vehicleInspectionFrom");
  const toInput = document.getElementById("vehicleInspectionTo");

  const from = fromInput?.value || "";
  const to = toInput?.value || "";

  if (inspections.length === 0) {
    box.innerHTML = `<p class="dashboard-small-empty">Inga kontroller sparade på detta fordon.</p>`;
    return;
  }

  const filtered = inspections
    .filter(inspection => {
      const status = normalizeInspectionStatus(inspection.status);

      if (activeVehicleInspectionFilter === "all") return true;

      if (activeVehicleInspectionFilter === "notDone") {
        return status !== "done";
      }

      return status === activeVehicleInspectionFilter;
    })
    .filter(inspection => {
      if (activeVehicleInspectionTypeFilter === "all") return true;

      const typeText = (inspection.type || inspection.category || "").toLowerCase();

      return typeText.includes(activeVehicleInspectionTypeFilter);
    })
    .filter(inspection => {
      if (!from || !to) return true;

      const inspectionDate =
        inspection.date ||
        inspection.dueDate ||
        inspection.deadlineDate ||
        inspection.nextDate ||
        "";

      return inspectionDate >= from && inspectionDate <= to;
    })
    .sort((a, b) => {
      const aDate = a.date || a.dueDate || a.deadlineDate || a.nextDate || "";
      const bDate = b.date || b.dueDate || b.deadlineDate || b.nextDate || "";

      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return (a.time || "").localeCompare(b.time || "");
    });

  if (filtered.length === 0) {
    box.innerHTML = `<p class="dashboard-small-empty">Inga kontroller hittades med valt filter.</p>`;
    return;
  }

  box.innerHTML = `
    <table class="vehicle-inspection-table">
<thead>
  <tr>
    <th>Ska göras</th>
    <th>Tid</th>
    <th>Adress</th>
    <th>Besiktning</th>
    <th>Deadline</th>
    <th>Info</th>
    <th>Status</th>
  </tr>
</thead>

      <tbody>
        ${filtered.map(inspection => {
          const bookedDate = inspection.date || inspection.dueDate || "-";
          const deadline = inspection.deadlineDate || inspection.nextDate || "-";

          return `
            <tr>
<td>${bookedDate}</td>
<td>${inspection.time || "-"}</td>
<td>${inspection.address || "-"}</td>
<td>${inspection.type || inspection.category || "-"}</td>
<td>
  <input
    type="date"
    class="vehicle-deadline-input"
    value="${deadline !== "-" ? deadline : ""}"
    onchange="updateVehicleInspectionDeadline('${inspection.id}', this.value)"
  >
</td>
<td>${inspection.info || "-"}</td>
<td>${getInspectionStatusText(inspection.status)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function updateVehicleInspectionDeadline(inspectionId, newDeadline) {
  let inspections = getInspections();
  let updatedInspection = null;

  inspections = inspections.map(inspection => {
    if (inspection.id !== inspectionId) return inspection;

    updatedInspection = {
      ...inspection,
      deadlineDate: newDeadline,
      nextDate: newDeadline
    };

    return updatedInspection;
  });

  saveInspections(inspections);

  if (updatedInspection) {
    syncInspectionToVehicle(updatedInspection);
  }

  renderVehicleProfileInspectionsFromFilter();

  if (typeof renderInspectionRangeList === "function") {
    renderInspectionRangeList();
  }
}

async function loadInspectionDriverSelect() {
  const select = document.getElementById("createInspectionDriver");

  if (!select) return;

  select.innerHTML = `<option value="">Ingen vald</option>`;

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
    select.innerHTML += `
      <option value="${driver.username}">
        ${driver.username}
      </option>
    `;
  });
}



function renderVehicleInspectionTable(inspections) {
  if (!inspections || inspections.length === 0) {
    return `<p class="dashboard-small-empty">Inga poster.</p>`;
  }

  return `
    <table class="vehicle-inspection-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Tid</th>
          <th>Adress</th>
          <th>Kategori</th>
          <th>Info</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${inspections.map(inspection => `
          <tr>
            <td>${inspection.date || "-"}</td>
            <td>${inspection.time || "-"}</td>
            <td>${inspection.address || "-"}</td>
            <td>${inspection.category || "-"}</td>
            <td>${inspection.info || "-"}</td>
            <td>${inspection.status || "open"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function hideVehicleProfile() {
  const box = document.getElementById("vehicleProfileBox");

  if (!box) return;

  box.style.display = "none";

  vehicleProfileRegNumber.innerText = "-";
  vehicleProfileCategory.innerText = "-";
  vehicleProfilePhone.innerText = "-";
  vehicleProfileInfo.innerText = "-";
  vehicleProfileInspections.innerHTML = "";
}

function saveVehicle() {
  const regNumber = vehicleRegNumber.value.trim().toUpperCase();
  const category = vehicleCategory.value.trim();
  const phone = vehiclePhone.value.trim();
  const info = vehicleInfo.value.trim();

  if (!regNumber) {
    alert("Skriv regnummer.");
    return;
  }

  let vehicles = getVehicles();

  const duplicate = vehicles.find(vehicle =>
    vehicle.regNumber.toLowerCase() === regNumber.toLowerCase() &&
    vehicle.id !== editingVehicleId
  );

  if (duplicate) {
    alert("Det finns redan ett fordon med detta regnummer.");
    return;
  }

const oldVehicle = vehicles.find(vehicle =>
  vehicle.id === editingVehicleId
);

const vehicleData = {
  id: editingVehicleId || crypto.randomUUID(),
  regNumber,
  category,
  phone,
  info,
  inspections: oldVehicle?.inspections || []
};

  if (editingVehicleId) {
    vehicles = vehicles.map(vehicle =>
      vehicle.id === editingVehicleId ? vehicleData : vehicle
    );
  } else {
    vehicles.push(vehicleData);
  }

saveVehicles(vehicles);
loadVehicleQuickSelect();
loadVehicleSelect();

const quickSelect = document.getElementById("vehicleQuickSelect");
if (quickSelect) {
  quickSelect.value = vehicleData.id;
}

editingVehicleId = vehicleData.id;

vehicleProfileRegNumber.innerText = vehicleData.regNumber || "-";
vehicleProfileCategory.innerText = vehicleData.category || "-";
vehicleProfilePhone.innerText = vehicleData.phone || "-";
vehicleProfileInfo.innerText = vehicleData.info || "-";

const editBox = document.getElementById("vehicleEditFormBox");
if (editBox) {
  editBox.style.display = "none";
}

renderVehicleProfileInspections(vehicleData);

alert("Fordonet sparades.");
}

function renderVehicleList() {
  const list = document.getElementById("vehicleList");

  if (!list) return;

  const vehicles = getVehicles();

  if (vehicles.length === 0) {
    list.innerHTML = "<p>Inga fordon sparade.</p>";
    return;
  }

  vehicles.sort((a, b) =>
    (a.regNumber || "").localeCompare(b.regNumber || "", "sv")
  );

  list.innerHTML = `
    <table class="vehicle-table">
      <thead>
        <tr>
          <th>Regnummer</th>
          <th>Kategori</th>
          <th>Telefon</th>
          <th>Info</th>
          <th>Åtgärder</th>
        </tr>
      </thead>
      <tbody>
        ${vehicles.map(vehicle => `
          <tr>
            <td><b>${vehicle.regNumber || "-"}</b></td>
            <td>${vehicle.category || "-"}</td>
            <td>${vehicle.phone || "-"}</td>
            <td>${vehicle.info || "-"}</td>
            <td>
              <button type="button" onclick="editVehicle('${vehicle.id}')">Redigera</button>
              <button type="button" class="delete-small-btn" onclick="deleteVehicle('${vehicle.id}')">Radera</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function editVehicle(vehicleId) {
  const vehicle = getVehicles().find(vehicle =>
    vehicle.id === vehicleId
  );

  if (!vehicle) return;

  editingVehicleId = vehicle.id;

  vehicleRegNumber.value = vehicle.regNumber || "";
  vehicleCategory.value = vehicle.category || "";
  vehiclePhone.value = vehicle.phone || "";
  vehicleInfo.value = vehicle.info || "";

  vehicleProfileRegNumber.innerText = vehicle.regNumber || "-";
  vehicleProfileCategory.innerText = vehicle.category || "-";
  vehicleProfilePhone.innerText = vehicle.phone || "-";
  vehicleProfileInfo.innerText = vehicle.info || "-";

  const title = document.getElementById("vehicleModalTitle");
  const subtitle = document.getElementById("vehicleModalSubtitle");

  if (title) title.innerText = "Fordonsprofil";
  if (subtitle) subtitle.innerText = "Se fordonets uppgifter, deadlines och besiktningshistorik.";

  const editBox = document.getElementById("vehicleEditFormBox");
  if (editBox) {
    editBox.style.display = "none";
  }

  initVehicleInspectionRange();
  renderVehicleProfileInspections(vehicle);
}

function initVehicleInspectionRange() {
  const fromInput = document.getElementById("vehicleInspectionFrom");
  const toInput = document.getElementById("vehicleInspectionTo");

  if (!fromInput || !toInput) return;

  const today = new Date();

  const oneYearAhead = new Date();
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

  fromInput.value = formatLocalDate(today);
  toInput.value = formatLocalDate(oneYearAhead);
}

function setVehicleInspectionFilter(filter) {
  activeVehicleInspectionFilter = filter;

  document.querySelectorAll(".vehicle-inspection-filter-btn").forEach(button => {
    button.classList.remove("active");
  });

  const buttonMap = {
    all: "vehicleInspectionFilterAll",
    notDone: "vehicleInspectionFilterNotDone",
    planned: "vehicleInspectionFilterPlanned",
    booked: "vehicleInspectionFilterBooked",
    done: "vehicleInspectionFilterDone",
    cancelled: "vehicleInspectionFilterCancelled"
  };

  const activeButton = document.getElementById(buttonMap[filter]);

  if (activeButton) {
    activeButton.classList.add("active");
  }

  renderVehicleProfileInspectionsFromFilter();
}

function setVehicleInspectionTypeFilter(type) {
  activeVehicleInspectionTypeFilter = type;
  renderVehicleProfileInspectionsFromFilter();
}


function renderVehicleProfileInspectionsFromFilter() {
  if (!editingVehicleId) return;

  const vehicle = getVehicles().find(vehicle =>
    vehicle.id === editingVehicleId
  );

  if (!vehicle) return;

  renderVehicleProfileInspections(vehicle);
}

function deleteVehicle(vehicleId) {
  if (!confirm("Radera fordonet?")) return;

  const vehicles = getVehicles().filter(vehicle =>
    vehicle.id !== vehicleId
  );

  saveVehicles(vehicles);
  renderVehicleList();
  loadVehicleQuickSelect();
  loadVehicleSelect();
}

function loadVehicleQuickSelect() {
  const select = document.getElementById("vehicleQuickSelect");

  if (!select) return;

  const vehicles = getVehicles().sort((a, b) =>
    (a.regNumber || "").localeCompare(b.regNumber || "", "sv")
  );

  select.innerHTML = `<option value="">Välj regnr</option>`;

  vehicles.forEach(vehicle => {
    select.innerHTML += `
      <option value="${vehicle.id}">
        ${vehicle.regNumber}
      </option>
    `;
  });
}

function openSelectedVehicleProfile() {
  const select = document.getElementById("vehicleQuickSelect");

  if (!select || !select.value) {
    alert("Välj ett fordon först.");
    return;
  }

  location.href = "/fordon.html?vehicleId=" + encodeURIComponent(select.value);
}

function openVehiclesPage() {
  location.href = "/fordon.html";
}
/* ===== PASSMALLAR ===== */
function loadVehicleSelect() {
  const vehicles = getVehicles();

  templateVehicleSelect.innerHTML = `<option value="">Välj fordon</option>`;

  vehicles.forEach(vehicle => {
    templateVehicleSelect.innerHTML += `
      <option value="${vehicle.regNumber}">
        ${vehicle.regNumber}
      </option>
    `;
  });
}

function updateTemplateVehiclePhone() {
  const vehicles = getVehicles();

  const selectedVehicle = vehicles.find(vehicle =>
    vehicle.regNumber === templateVehicleSelect.value
  );

  templateVehiclePhone.value = selectedVehicle?.phone || "";

  if (selectedVehicle?.regNumber) {
    templateRegNumber.value = selectedVehicle.regNumber;
  }
}

function getTemplates() {
  return JSON.parse(localStorage.getItem("shiftTemplates") || "[]");
}

function saveTemplates(templates) {
  localStorage.setItem("shiftTemplates", JSON.stringify(templates));
}

function loadTemplates() {
  const templates = getTemplates();
  templateSelect.innerHTML = "";

  if (templates.length === 0) {
    templateSelect.innerHTML = `<option value="">Inga passmallar</option>`;
    return;
  }

  templates.forEach(t => {
    templateSelect.innerHTML += `<option value="${t.name}">${t.name}</option>`;
  });
}

function clearTemplateForm() {
  templateName.value = "";

  templateVehicleSelect.value = "";
  templateVehiclePhone.value = "";

  templateCity.value = "";
  // Checkboxar
  document.querySelectorAll(".template-day-check").forEach(cb => {
    cb.checked = false;
  });
  // Tid 1
  document.querySelectorAll(".template-day-time").forEach(input => {
    input.value = "";
  });
  // Rast 1
  document.querySelectorAll(".template-day-break").forEach(input => {
    input.value = "0";
  });
  // Tid 2
  document.querySelectorAll(".template-day-time2").forEach(input => {
    input.value = "";
    input.style.display = "none";
  });
  // Rast 2
  document.querySelectorAll(".template-day-break2").forEach(input => {
    input.value = "0";
    input.style.display = "none";
  });
}

function openCreateTemplate() {
  editingTemplateName = null;
  templateModalTitle.innerText = "Skapa passmall";
  clearTemplateForm();
  templateModal.classList.add("open");
}

function openEditTemplate() {
  const name = templateSelect.value;
  if (!name) return;

  const template = getTemplates().find(t => t.name === name);
  if (!template) return;

  editingTemplateName = name;
  templateModalTitle.innerText = "Redigera passmall";

templateName.value = template.name || "";

templateVehicleSelect.value = template.vehicle || "";
templateVehiclePhone.value = template.vehiclePhone || "";

templateCity.value = template.city || "";

  document.querySelectorAll(".template-day-check").forEach(cb => {
    cb.checked = !!template.days?.[cb.value]?.active;
  });

document.querySelectorAll(".template-day-break").forEach(input => {
  input.value = template.days?.[input.dataset.day]?.breakMinutes || 0;
});
  document.querySelectorAll(".template-day-time2").forEach(input => {
  const savedValue = template.days?.[input.dataset.day]?.time2 || "";

  input.value = savedValue;
  input.style.display = savedValue ? "inline-block" : "none";
});
document.querySelectorAll(".template-day-break2").forEach(input => {
  const day = input.dataset.day;

  const savedTime2 = template.days?.[day]?.time2 || "";
  const savedBreak2 = template.days?.[day]?.breakMinutes2 || 0;

  input.value = savedBreak2;
  input.style.display = savedTime2 ? "inline-block" : "none";
});

  templateModal.classList.add("open");
}

function saveTemplate() {
  const name = templateName.value.trim();
  if (!name) return alert("Skriv passnamn.");

  const days = {};
  document.querySelectorAll(".template-day-check").forEach(cb => {
    const day = cb.value;
const timeInput = document.querySelector(`.template-day-time[data-day="${day}"]`);
const time2Input = document.querySelector(`.template-day-time2[data-day="${day}"]`);

const breakInput = document.querySelector(`.template-day-break[data-day="${day}"]`);
const break2Input = document.querySelector(`.template-day-break2[data-day="${day}"]`);

days[day] = {
  active: cb.checked,
  time: timeInput.value.trim(),
  breakMinutes: Number(breakInput?.value || 0),
  time2: time2Input?.value.trim() || "",
  breakMinutes2: Number(break2Input?.value || 0)
};
  });

const newTemplate = {
  name,
vehicle: templateVehicleSelect.value,
  vehiclePhone: templateVehiclePhone.value.trim(),
  city: templateCity.value.trim(),
  days
};

  let templates = getTemplates();

  const duplicate = templates.find(t =>
    t.name.toLowerCase() === name.toLowerCase() &&
    t.name !== editingTemplateName
  );

  if (duplicate) return alert("Det finns redan en passmall med detta namn.");

  if (editingTemplateName) {
    templates = templates.map(t => t.name === editingTemplateName ? newTemplate : t);
  } else {
    templates.push(newTemplate);
  }

  saveTemplates(templates);
  loadTemplates();
  templateSelect.value = name;
  closeTemplateModal();
  alert("Passmallen sparades.");
}

function deleteTemplate() {
  const name = templateSelect.value;
  if (!name) return;
  if (!confirm("Radera passmall " + name + "?")) return;

  saveTemplates(getTemplates().filter(t => t.name !== name));
  loadTemplates();
}

function closeTemplateModal() {
  templateModal.classList.remove("open");
}
function toggleTemplateTime2(day) {
  const timeInput = document.querySelector(`.template-day-time2[data-day="${day}"]`);
  const breakInput = document.querySelector(`.template-day-break2[data-day="${day}"]`);

  if (!timeInput) return;

  const isHidden = timeInput.style.display === "none" || timeInput.style.display === "";

  timeInput.style.display = isHidden ? "inline-block" : "none";

  if (breakInput) {
    breakInput.style.display = isHidden ? "inline-block" : "none";
  }

  if (!isHidden) {
    timeInput.value = "";
    if (breakInput) breakInput.value = "0";
  }
}

/* ===== USERS ===== */
async function loadUsers() {
  const res = await api("/users");

  if (res.status === 401) {
    location.href = "/login.html";
    return;
  }

  const users = await res.json();
  users.sort((a, b) => 
  a.username.localeCompare(b.username, "sv")
);

  userSelect.innerHTML = "";
  monthDriver.innerHTML = "";

  users.forEach(u => {
    userSelect.innerHTML += `<option value="${u.username}">${u.username}</option>`;
    if (u.role === "driver") {
      monthDriver.innerHTML += `<option value="${u.username}">${u.username}</option>`;
    }
  });
}

function openModal() {
  userModal.style.display = "flex";
}

function closeModal() {
  userModal.style.display = "none";
}

async function saveNewUser() {
  const newUser = {
    username: newUsername.value.trim(),
    password: newPassword.value,
    phone: newPhone.value.trim(),
    email: newEmail.value.trim(),
    role: "driver",
    address: "",
    city: "",
    personnummer: "",
    info: "",
    rules: {
      workDays: [],
      allowedShifts: "",
      maxHours: "",
      rest: false,
      weeklyRest: false,
      noConflict: false,
      license: false,
      blockAbsence: false,
      allowOverMaxHours: false,
      overMaxHoursPercent: "",
      cityWeight: "",
      workloadWeight: "",
      employmentWeight: "",
      preferenceWeight: "",
      shiftWeight: "",
      preferRegularDriver: false,
      preferNearbyDriver: false,
      absences: [],
      info: ""
    }
  };

  const res = await api("/users", {
    method: "POST",
    body: JSON.stringify(newUser)
  });

  if (res.status === 401) {
    location.href = "/login.html";
    return;
  }

  if (!res.ok) {
    alert("Kunde inte skapa användaren.");
    return;
  }

  closeModal();
  await loadUsers();
  alert("Användaren skapades.");
}

/* ===== REDIGERA ANVÄNDARE ===== */
function openTab(event, tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");

  updateRulesUserInfoVisibility(tabId);
}

function updateRulesUserInfoVisibility(tabId) {
  rulesUserInfo.style.display = tabId === "tabRegler" ? "block" : "none";
}

function updateRulesUserInfo(user) {
  rulesUserName.innerText = user.username ? "Användare: " + user.username : "Användare: -";

  if (user.phone) {
    rulesUserPhone.innerText = "Tel: " + user.phone;
    rulesUserPhone.href = "tel:" + user.phone.replace(/\s/g, "");
    rulesUserPhone.style.display = "block";
  } else {
    rulesUserPhone.style.display = "none";
  }

  if (user.email) {
    rulesUserEmail.innerText = "E-post: " + user.email;
    rulesUserEmail.href = "mailto:" + user.email;
    rulesUserEmail.style.display = "block";
  } else {
    rulesUserEmail.style.display = "none";
  }
}

function resetTabs() {
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

  document.getElementById("tabGrundinfo").classList.add("active");
  document.querySelector("#editModal .tab-btn").classList.add("active");
  updateRulesUserInfoVisibility("tabGrundinfo");
}

function toggleOverMaxHours() {
  overMaxHoursBox.style.display = ruleAllowOverMaxHours.checked ? "block" : "none";

  if (!ruleAllowOverMaxHours.checked) {
    ruleOverMaxHoursPercent.value = "";
  }
}
function toggleWorkTimeRow(day) {
  const checkbox = document.querySelector(`.workday[value="${day}"]`);
  const row = document.getElementById(`worktime-${day}`);

  if (!checkbox || !row) return;

  row.style.display = checkbox.checked ? "flex" : "none";

  if (checkbox.checked) {
    const from = document.querySelector(`.worktime-from[data-day="${day}"]`);
    const to = document.querySelector(`.worktime-to[data-day="${day}"]`);

    if (from && !from.value) from.value = "00:00";
    if (to && !to.value) to.value = "23:59";
  }
}


async function openEditUser() {
  const username = userSelect.value;
  if (!username) return;

  const res = await api(`/users/${username}`);

  if (res.status === 401) {
    location.href = "/login.html";
    return;
  }

  const user = await res.json();
  const rules = user.rules || {};
  if (!rules.absences) rules.absences = [];

  user.rules = rules;
  selectedUser = user;

  editUsername.value = user.username || "";
  editPassword.value = user.password || "";
  editPhone.value = user.phone || "";
  editEmail.value = user.email || "";
  editAddress.value = user.address || "";
  editCity.value = user.city || "";
  editPersonnummer.value = user.personnummer || "";
  editInfo.value = user.info || "";

  editAllowedShifts.value = rules.allowedShifts || "";
  editMaxHours.value = rules.maxHours || "";

  ruleRest.checked = !!rules.rest;
  ruleWeeklyRest.checked = !!rules.weeklyRest;
  ruleNoConflict.checked = !!rules.noConflict;
  ruleLicense.checked = !!rules.license;
  ruleAllowOverMaxHours.checked = !!rules.allowOverMaxHours;
  ruleOverMaxHoursPercent.value = rules.overMaxHoursPercent || "";
    ruleHomeCity.innerText = user.city || "-";
  ruleCityWeight.value = rules.cityWeight || "";
  ruleWorkloadWeight.value = rules.workloadWeight || "";

  rulePreferRegularDriver.checked = !!rules.preferRegularDriver;
  rulePreferNearbyDriver.checked = !!rules.preferNearbyDriver;

  ruleInfo.value = rules.info || "";

document.querySelectorAll(".workday").forEach(cb => {
  const day = Number(cb.value);
  cb.checked = rules.workDays?.includes(day) || false;

  const fromInput = document.querySelector(`.worktime-from[data-day="${day}"]`);
  const toInput = document.querySelector(`.worktime-to[data-day="${day}"]`);

  const savedTime = rules.workTimes?.[day];

  if (fromInput) fromInput.value = savedTime?.from || "00:00";
  if (toInput) toInput.value = savedTime?.to || "23:59";

  toggleWorkTimeRow(day);
});

  renderAbsences();
  toggleOverMaxHours();
  updateRulesUserInfo(user);
  resetTabs();
  editModal.classList.add("open");
}

async function saveUser() {
  if (!selectedUser) return;

  const oldUsername = selectedUser.username;

  const workDays = Array.from(document.querySelectorAll(".workday"))
    .filter(cb => cb.checked)
    .map(cb => Number(cb.value));

    const workTimes = {};

document.querySelectorAll(".workday").forEach(cb => {
  const day = Number(cb.value);

  if (!cb.checked) return;

  const fromInput = document.querySelector(`.worktime-from[data-day="${day}"]`);
  const toInput = document.querySelector(`.worktime-to[data-day="${day}"]`);

  workTimes[day] = {
    from: fromInput?.value || "00:00",
    to: toInput?.value || "23:59"
  };
});

  const updatedUser = {
    ...selectedUser,
    username: editUsername.value.trim(),
    password: editPassword.value,
    phone: editPhone.value.trim(),
    email: editEmail.value.trim(),
    address: editAddress.value.trim(),
    city: editCity.value.trim(),
    personnummer: editPersonnummer.value.trim(),
    info: editInfo.value,
    rules: {
      ...(selectedUser.rules || {}),
      workDays,
      workTimes,
      allowedShifts: editAllowedShifts.value.trim(),
      maxHours: editMaxHours.value.trim(),
      rest: ruleRest.checked,
      weeklyRest: ruleWeeklyRest.checked,
      noConflict: ruleNoConflict.checked,
      license: ruleLicense.checked,
      allowOverMaxHours: ruleAllowOverMaxHours.checked,
      overMaxHoursPercent: ruleAllowOverMaxHours.checked ? ruleOverMaxHoursPercent.value : "",
      cityWeight: ruleCityWeight.value.trim(),
      workloadWeight: ruleWorkloadWeight.value,
      preferRegularDriver: rulePreferRegularDriver.checked,
      preferNearbyDriver: rulePreferNearbyDriver.checked,
      absences: selectedUser.rules?.absences || [],
      info: ruleInfo.value
    }
  };

  const res = await api(`/users/${oldUsername}`, {
    method: "PUT",
    body: JSON.stringify(updatedUser)
  });

  if (res.status === 401) {
    location.href = "/login.html";
    return;
  }

  if (!res.ok) {
    alert("Kunde inte spara användaren.");
    return;
  }

  selectedUser = updatedUser;
  updateRulesUserInfo(updatedUser);
  await loadUsers();
  userSelect.value = updatedUser.username;

  alert("Användaren sparades.");
}

function closeEdit() {
  editModal.classList.remove("open");
}

/* ===== AVVIKELSER ===== */
function renderAbsences() {
  const list = document.getElementById("absenceList");

  if (!list) {
    alert("Hittar inte absenceList");
    return;
  }

  list.innerHTML = "";

  const absences = selectedUser?.rules?.absences || [];

  if (absences.length === 0) {
    list.innerHTML = "<p>Inga avvikelser sparade.</p>";
    return;
  }

  absences.forEach((a, index) => {
    const row = document.createElement("div");
    row.className = "absence-row";

row.innerHTML = `
  <div class="absence-main">
    <b>${a.type || "Avvikelse"}</b>
    <span>${a.from || "-"} → ${a.to || "-"}</span>
    <span>${a.blockAbsence ? "Fallback " + (a.blockPercent || 0) + "%" : "Blockerad"}</span>
  </div>

  ${a.note ? `<div class="absence-note">${a.note}</div>` : ""}

  <button class="delete-small-btn" onclick="deleteAbsence(${index})">Ta bort</button>
`;

    list.appendChild(row);
  });
}

function addAbsence() {
  if (!selectedUser) return;

  const from = absenceFrom.value;
  const to = absenceTo.value;
  const type = absenceType.value;
  const note = absenceNote.value;

  const blockAbsenceEl = document.getElementById("absenceBlockAbsence");
  const blockPercentEl = document.getElementById("absenceBlockPercent");

  const blockAbsence = blockAbsenceEl ? blockAbsenceEl.checked : false;
  const blockPercent = blockAbsence && blockPercentEl
    ? Number(blockPercentEl.value || 0)
    : 0;

  if (!from || !to) return alert("Välj från och till datum.");
  if (from > to) return alert("Från datum kan inte vara efter till datum.");

  if (blockPercent < 0 || blockPercent > 100) {
    return alert("Procent måste vara mellan 0 och 100.");
  }

  if (!selectedUser.rules) selectedUser.rules = {};
  if (!selectedUser.rules.absences) selectedUser.rules.absences = [];

  selectedUser.rules.absences.push({
    from,
    to,
    type,
    note,
    blockAbsence,
    blockPercent
  });
  console.log("AVVIKELSE TILLAGD", selectedUser.rules.absences);

  absenceNote.value = "";

  if (blockAbsenceEl) blockAbsenceEl.checked = false;
  if (blockPercentEl) blockPercentEl.value = "0";

  toggleAbsenceBlockPercent();
  renderAbsences();
}

function toggleAbsenceBlockPercent() {
  const checkbox = document.getElementById("absenceBlockAbsence");
  const box = document.getElementById("absenceBlockPercentBox");
  const percent = document.getElementById("absenceBlockPercent");

  if (!checkbox || !box || !percent) return;

  box.style.display = checkbox.checked ? "block" : "none";

  if (!checkbox.checked) {
    percent.value = "0";
  }
}

function deleteAbsence(index) {
  if (!selectedUser?.rules?.absences) return;
  if (!confirm("Ta bort avvikelsen?")) return;

  selectedUser.rules.absences.splice(index, 1);
  renderAbsences();
}



/* ===== KRAV / TEST ===== */

function isSwedishHoliday(dateStr) {
  const holidays = [
    "2026-01-01",
    "2026-01-06",
    "2026-04-03",
    "2026-04-06",
    "2026-05-01",
    "2026-05-14",
    "2026-06-19",
    "2026-06-20",
    "2026-12-24",
    "2026-12-25",
    "2026-12-26",
    "2026-12-31"
  ];

  return holidays.includes(dateStr);
}

function getWorkDaysInMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);

  let workDays = 0;
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    const dateStr = date.toLocaleDateString("sv-SE");

    if (day !== 0 && day !== 6 && !isSwedishHoliday(dateStr)) {
      workDays++;
    }

    date.setDate(date.getDate() + 1);
  }

  return workDays;
}

function driverHasWeekendWork(driver, allShifts) {
  return allShifts.some(s => {
    if ((s.driver || "").toLowerCase() !== driver.username.toLowerCase()) return false;
    if (!s.date) return false;

    const day = new Date(s.date).getDay();
    return day === 0 || day === 6;
  });
}

function getTotalWorkedMinutes(driver, allShifts) {
  let total = 0;

  allShifts.forEach(s => {
    if ((s.driver || "").toLowerCase() !== driver.username.toLowerCase()) return;

    const range = parseTimeRange(s.time);
    if (!range) return;

    total += range.end - range.start;
  });

  return total;
}

function isWeekendDate(dateStr) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

function getWeekendKey(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();

  // Gäller bara lördag och söndag
  if (day !== 0 && day !== 6) return null;

  // Om söndag: backa till lördagen samma helg
  if (day === 0) {
    date.setDate(date.getDate() - 1);
  }

  // Både lördag och söndag får samma helg-nyckel
  return date.toLocaleDateString("sv-SE");
}

function getPreviousWeekendKey(weekendKey) {
  const date = new Date(weekendKey);
  date.setDate(date.getDate() - 7);
  return date.toLocaleDateString("sv-SE");
}

function getNextWeekendKey(weekendKey) {
  const date = new Date(weekendKey);
  date.setDate(date.getDate() + 7);
  return date.toLocaleDateString("sv-SE");
}

function hasEveryOtherWeekendConflict(driver, shift, allShifts) {
  if (!shift.date) return false;

  // Regeln gäller bara helgpass
  if (!isWeekendDate(shift.date)) return false;

  const currentWeekend = getWeekendKey(shift.date);
  if (!currentWeekend) return false;

  const previousWeekend = getPreviousWeekendKey(currentWeekend);
  const nextWeekend = getNextWeekendKey(currentWeekend);

  return allShifts.some(s => {
    if ((s.driver || "").toLowerCase() !== driver.username.toLowerCase()) return false;
    if (!s.date || !isWeekendDate(s.date)) return false;

    const otherWeekend = getWeekendKey(s.date);

    // Jobbat någon dag helgen före eller helgen efter = stopp
    return otherWeekend === previousWeekend || otherWeekend === nextWeekend;
  });
}

function getTotalWorkedMinutesForMonth(driver, allShifts, month) {
  let total = 0;

  allShifts.forEach(s => {
    if ((s.driver || "").toLowerCase() !== driver.username.toLowerCase()) return;
    if (!s.date || !s.date.startsWith(month)) return;

    const range = parseTimeRange(s.time);
    if (!range) return;

    total += range.end - range.start;
  });

  return total;
}

function hasMaxHoursConflict(driver, shift, allShifts) {
  if (!shift.date) return false;

  const month = shift.date.slice(0, 7);

  const finalMaxMinutes = getDriverMonthlyMaxMinutes(driver, month, allShifts);
  const totalBeforeMinutes = getTotalWorkedMinutesForMonth(driver, allShifts, month);

  const newRange = parseTimeRange(shift.time);
  if (!newRange) return false;

  const newShiftMinutes = newRange.end - newRange.start;
  const afterMinutes = totalBeforeMinutes + newShiftMinutes;

  console.log("MAX HOURS CHECK", {
    driver: driver.username,
    month,
    finalMaxHours: finalMaxMinutes / 60,
    currentHours: totalBeforeMinutes / 60,
    newShiftHours: newShiftMinutes / 60,
    afterHours: afterMinutes / 60,
    conflict: afterMinutes > finalMaxMinutes
  });

  return afterMinutes > finalMaxMinutes;
}

function getDriverMonthlyMaxMinutes(driver, month, allShifts) {
  const rules = driver.rules || {};

  // 1. Räkna lag-max (baserat på arbetsdagar)
  const workDays = getWorkDaysInMonth(month);

  const hasWeekend = driverHasWeekendWork(driver, allShifts);
  const dailyHours = hasWeekend ? 7.65 : 8;

  let legalMaxMinutes = workDays * dailyHours * 60;

  // 2. Tillåt övertid om satt
  if (rules.allowOverMaxHours) {
    const overPercent = Number(rules.overMaxHoursPercent || 0);
    legalMaxMinutes = legalMaxMinutes * (1 + overPercent / 100);
  }

  const limits = [];

  // 3. Lägg alltid in lag-max
  limits.push(legalMaxMinutes);

  // 4. Personligt max timmar
  const personalMaxHours = Number(rules.maxHours || 0);
  if (personalMaxHours > 0) {
    limits.push(personalMaxHours * 60);
  }

  // 5. Arbetstid %
  const workloadPercent = Number(rules.workloadWeight || 0);
  if (workloadPercent > 0) {
    limits.push(legalMaxMinutes * (workloadPercent / 100));
  }

  // 6. Välj lägsta
  return Math.min(...limits);
}

function parseAllowedShifts(text) {
  return (text || "")
    .split(",")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseAllowedCities(text) {
  return (text || "")
    .split(",")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseTimeRange(timeText) {
  if (!timeText) return null;

  const clean = timeText.replace(/\s/g, "");
  const parts = clean.split(/-|–|—/);

  if (parts.length !== 2) return null;

  const start = timeToMinutes(parts[0]);
  const end = timeToMinutes(parts[1]);

  if (start === null || end === null) return null;
  if (end <= start) return null;

  return { start, end };
}

function timeToMinutes(time) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function hasAutoFillConflict(testShift, allShifts) {
  if (!testShift.driver) return false;

  const range = parseTimeRange(testShift.time);
  if (!range) return false;

  return allShifts.some(s => {
    if (!s || s.id === testShift.id) return false;
    if (s.date !== testShift.date) return false;
    if ((s.driver || "").toLowerCase() !== testShift.driver.toLowerCase()) return false;

    const otherRange = parseTimeRange(s.time);
    if (!otherRange) return false;

    return rangesOverlap(range, otherRange);
  });
}

function hasAbsenceOnDate(driver, dateStr) {
  const absences = driver.rules?.absences || [];
  return absences.some(a => dateStr >= a.from && dateStr <= a.to);
}
function getAbsenceForDate(driver, dateStr) {
  const absences = driver.rules?.absences || [];

  return absences.find(a =>
    dateStr >= a.from &&
    dateStr <= a.to
  );
}



function driverCanTakeShift(driver, shift, allShifts) {
  const reasons = [];
  const rules = driver.rules || {};
  const shiftDate = shift.date || "";
  const day = new Date(shiftDate).getDay();

const workDays = rules.workDays || [];

if (workDays.length === 0 || !workDays.includes(day)) {
  reasons.push("Jobbar inte denna veckodag");
}

const workTime = rules.workTimes?.[day];

if (workTime) {
  const shiftRange = parseTimeRange(shift.time);
  const allowedStart = timeToMinutes(workTime.from || "00:00");
  const allowedEnd = timeToMinutes(workTime.to || "23:59");

  if (shiftRange && allowedStart !== null && allowedEnd !== null) {
    if (shiftRange.start < allowedStart || shiftRange.end > allowedEnd) {
      reasons.push(`Utanför tillgänglig tid (${workTime.from}-${workTime.to})`);
    }
  }
}

const absence = getAbsenceForDate(driver, shiftDate);

if (absence) {
  const blockPercent = Number(absence.blockPercent || 0);

  if (!absence.blockAbsence || blockPercent <= 0) {
    reasons.push("Har avvikelse: " + (absence.type || "Frånvaro"));
  }
}

  const allowedShifts = parseAllowedShifts(rules.allowedShifts);
  const shiftName = (shift.shift || "").trim().toLowerCase();

  if (allowedShifts.length > 0 && !allowedShifts.includes(shiftName)) {
    reasons.push("Passet är inte tillåtet för chauffören");
  }

const allowedCities = parseAllowedCities(rules.cityWeight);
const shiftCity = (shift.city || "").trim().toLowerCase();

if (allowedCities.length > 0 && shiftCity && !allowedCities.includes(shiftCity)) {
  reasons.push("Får inte köra denna ort");
}

if (hasAutoFillConflict({ ...shift, driver: driver.username }, allShifts)) {
  reasons.push("Schemakrock med annat pass samma dag");
}

  // 👇 HÄR ska din nya kod vara
  if (rules.rest && hasDailyRestConflict(driver, shift, allShifts)) {
    reasons.push("Bryter mot dygnsvila (11h)");
  }
  if (rules.weeklyRest && hasWeeklyRestConflict(driver, shift, allShifts)) {
  reasons.push("Bryter mot veckovila (36h inom rullande 7 dagar)");
}

if (hasMaxHoursConflict(driver, shift, allShifts)) {
  reasons.push("Överskrider max arbetstid");
}

if (hasEveryOtherWeekendConflict(driver, shift, allShifts)) {
  reasons.push("Får inte arbeta två helger i rad");
}
  return {
    ok: reasons.length === 0,
    reasons
  };
}

function scoreDriverForShift(driver, shift, allShifts) {
  let score = 0;
  const details = [];

  // 0. Ordinarie förare
const preferRegular = driver.rules?.preferRegularDriver;
const allowedShiftsForRegular = parseAllowedShifts(driver.rules?.allowedShifts);
const currentShiftName = (shift.shift || "").trim().toLowerCase();

if (preferRegular && allowedShiftsForRegular.includes(currentShiftName)) {
  const regularBonus = -50;

  score += regularBonus;
  details.push(`Ordinarie förare: ${regularBonus}`);
}

  // 1. Avvikelse fallback
  const absence = getAbsenceForDate(driver, shift.date);

  if (absence && absence.blockAbsence) {
    const percent = Number(absence.blockPercent || 0);

    if (percent > 0) {
      const penalty = 10000 - percent * 100;

      score += penalty;
      details.push(`Avvikelse fallback: +${penalty}`);
    }
  }

  // 2. Ort-prioritering
  const preferNearby = driver.rules?.preferNearbyDriver;
  const driverCity = (driver.city || "").trim().toLowerCase();
  const shiftCity = (shift.city || "").trim().toLowerCase();

  if (preferNearby && driverCity && shiftCity && driverCity !== shiftCity) {
    const cityPenalty = 100;

    score += cityPenalty;
    details.push(`Annan ort: +${cityPenalty}`);
  }

  // 3. Arbetstidsfördelning
if (shift.date) {
  const month = shift.date.slice(0, 7);
  const workedMinutes = getTotalWorkedMinutesForMonth(driver, allShifts, month);
  const workedHours = workedMinutes / 60;

  const workloadPenalty = workedHours;

  score += workloadPenalty;
  details.push(`Arbetade timmar: +${workloadPenalty.toFixed(1)}`);
}

  return {
    score,
    details
  };
}

function getMonthlySummary(drivers, simulatedShifts, from, to) {
  let html = `<div class="test-result-shift"><b>Sammanfattning</b><br>`;

  const month = from.slice(0, 7);

  drivers.forEach(driver => {
    const minutes = getTotalWorkedMinutesForMonth(driver, simulatedShifts, month);
    const hours = (minutes / 60).toFixed(1);

    const maxMinutes = getDriverMonthlyMaxMinutes(driver, month, simulatedShifts);
    const maxHours = (maxMinutes / 60).toFixed(1);

    html += `${driver.username}: ${hours}h / ${maxHours}h<br>`;
  });

  html += `</div>`;

  return html;
}

async function testRules() {
  const from = testFromDate.value;
  const to = testToDate.value;

  if (!from || !to) return alert("Välj från datum och till datum.");
  if (from > to) return alert("Från datum kan inte vara efter till datum.");

  const shiftsRes = await api("/shifts");
  const usersRes = await api("/users");

  if (shiftsRes.status === 401 || usersRes.status === 401) {
    location.href = "/login.html";
    return;
  }

  const shifts = await shiftsRes.json();
  const users = await usersRes.json();
  const drivers = users.filter(u => u.role === "driver");

  const unassigned = shifts
    .filter(shift => {
      const shiftDate = shift.date || "";
      const driver = (shift.driver || "").trim().toLowerCase();

      return shiftDate >= from && shiftDate <= to &&
        (driver === "" || driver === "otilldelad" || driver === "unassigned");
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });

testResult.innerHTML = "";

if (unassigned.length === 0) {
  testResult.innerHTML = "<p>Inga otilldelade pass hittades i valt datumspann.</p>";
  testModal.classList.add("open");
  return;
}

const simulatedShifts = shifts.map(s => ({ ...s }));

  unassigned.forEach(shift => {
    const wrapper = document.createElement("div");
    wrapper.className = "test-result-shift";

let html = `
  <h4>Pass: ${shift.shift || "-"} | ${shift.date || "-"} | ${shift.time || "Tid saknas"}</h4>
  <div><b>Fordon:</b> ${shift.vehicle || "-"}</div>
  <div><b>Ort:</b> ${shift.city || "-"}</div>
`;

let chosenDriver = null;
let chosenCheck = null;
let bestScore = Infinity;

drivers.forEach(driver => {
  const check = driverCanTakeShift(driver, shift, simulatedShifts);

  if (check.ok) {
    const scoring = scoreDriverForShift(driver, shift, simulatedShifts);

    if (scoring.score < bestScore) {
      bestScore = scoring.score;
      chosenDriver = driver;
      chosenCheck = {
        ...check,
        score: scoring.score,
        details: scoring.details
      };
    }

    html += `
      <div class="test-driver-row">
        <span class="test-ok">✅ ${driver.username}</span> – OK
        ${scoring.details.length ? `<br>${scoring.details.map(d => "• " + d).join("<br>")}` : ""}
      </div>
    `;
  } else {
    html += `
      <div class="test-driver-row">
        <span class="test-bad">❌ ${driver.username}</span><br>
        ${check.reasons.map(r => "• " + r).join("<br>")}
      </div>
    `;
  }
});

    if (chosenDriver) {
      simulatedShifts.push({
        ...shift,
        driver: chosenDriver.username,
        autoFilled: true
      });

html += `
  <div class="test-driver-row">
    <b>Val i simulering:</b> ${chosenDriver.username}<br>
    <b>Poäng:</b> ${chosenCheck?.score ?? 0}
    ${chosenCheck?.details?.length ? "<br>" + chosenCheck.details.map(d => "• " + d).join("<br>") : ""}
  </div>
`;
    } else {
  html += `
    <div class="test-driver-row">
      <b>Val i simulering:</b> Ingen förare hittades
    </div>
  `;
}

    wrapper.innerHTML = html;
    testResult.appendChild(wrapper);
  });
const summaryBox = document.createElement("div");
summaryBox.innerHTML = getMonthlySummary(drivers, simulatedShifts, from, to);
testResult.prepend(summaryBox);

testModal.classList.add("open");
}

function closeTestModal() {
  testModal.classList.remove("open");

  // 🔥 reset innehåll
  testResult.innerHTML = "";

  // 🔥 reset scroll
  testResult.scrollTop = 0;
}
/* ===== AUTO-FYLL OMLOPP ===== */

async function autoFillTemplates() {
  console.log("AUTO-FYLL OMLOPP STARTAR");

  const from = autoFromDate.value;
  const to = autoToDate.value;

  if (!from || !to) return alert("Välj från datum och till datum.");
  if (from > to) return alert("Från datum kan inte vara efter till datum.");

  const templates = getTemplates();

  if (templates.length === 0) {
    return alert("Det finns inga passmallar.");
  }

let created = 0;
let skippedDuplicates = 0;

const existingRes = await api("/shifts");
const existingShifts = await existingRes.json();

const dates = getDatesBetween(from, to);

  for (const dateStr of dates) {
    const day = new Date(dateStr + "T00:00:00").getDay();

    console.log("DATUM:", dateStr, "DAG:", day);

    if (day === 0 || day === 6) {
      console.log("Hoppar över helg");
      continue;
    }

    for (const template of templates) {
      console.log("MALL:", template.name, template.days);

      const templateDay = template.days?.[day];

      console.log("MALLDAG:", templateDay);

if (!templateDay || !templateDay.active) continue;

const times = [
  {
    time: templateDay.time,
    breakMinutes: Number(templateDay.breakMinutes || 0)
  },
  {
    time: templateDay.time2,
    breakMinutes: Number(templateDay.breakMinutes2 || 0)
  }
].filter(item => item.time);

for (const item of times) {
  const time = item.time;
  const alreadyExists = existingShifts.some(s =>
    s.date === dateStr &&
    s.shift === template.name &&
    s.time === time
  );

  if (alreadyExists) {
    skippedDuplicates++;
    continue;
  }

const newShift = {
  date: dateStr,
  shift: template.name,
  time: time,
  breakMinutes: item.breakMinutes,
  vehicle: template.vehicle || "",
    vehiclePhone: template.vehiclePhone || "",
    regNumber: template.regNumber || "",
    city: template.city || "",
    driver: "",
    status: "Närvarande",
    fromTemplate: true,
    templateName: template.name
  };

  const res = await api("/shifts", {
    method: "POST",
    body: JSON.stringify(newShift)
  });

  if (res.ok) {
    created++;
    existingShifts.push(newShift);
  }
}
    }
  }

  alert(created + " pass skapades. " + skippedDuplicates + " dubbletter hoppades över.");
}
function getDatesBetween(from, to) {
  const dates = [];

  const current = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    dates.push(`${year}-${month}-${day}`);

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/* ===== AUTO-FYLL ===== */
async function autoFillUnassignedShifts() {
  const from = autoFromDate.value;
  const to = autoToDate.value;

  if (!from || !to) return alert("Välj från datum och till datum.");
  if (from > to) return alert("Från datum kan inte vara efter till datum.");

  const shiftsRes = await api("/shifts");
  const usersRes = await api("/users");

  if (shiftsRes.status === 401 || usersRes.status === 401) {
    location.href = "/login.html";
    return;
  }

  const shifts = await shiftsRes.json();
  const users = await usersRes.json();
  const drivers = users.filter(u => u.role === "driver");

  const unassigned = shifts
    .filter(shift => {
      const shiftDate = shift.date || "";
      const currentDriver = (shift.driver || "").trim().toLowerCase();

      return shiftDate >= from && shiftDate <= to &&
        (currentDriver === "" || currentDriver === "otilldelad" || currentDriver === "unassigned");
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });

  if (unassigned.length === 0) {
    alert("Inga otilldelade pass hittades i valt datumspann.");
    return;
  }

  const simulatedShifts = shifts.map(s => ({ ...s }));

  let filled = 0;
  let skipped = 0;

for (const shift of unassigned) {
  let chosenDriver = null;
  let bestScore = Infinity;

  for (const driver of drivers) {
    const check = driverCanTakeShift(driver, shift, simulatedShifts);

    if (!check.ok) continue;

    const scoring = scoreDriverForShift(driver, shift, simulatedShifts);

    if (scoring.score < bestScore) {
      bestScore = scoring.score;
      chosenDriver = driver;
    }
  }

  if (!chosenDriver) {
    skipped++;
    continue;
  }

    const updateRes = await api(`/shifts/${shift.id}`, {
      method: "PUT",
      body: JSON.stringify({
        driver: chosenDriver.username,
        autoFilled: true
      })
    });

    if (updateRes.ok) {
      simulatedShifts.push({
        ...shift,
        driver: chosenDriver.username,
        autoFilled: true
      });

      filled++;
    } else {
      skipped++;
    }
  }

  alert(`Auto-fyll klart. ${filled} pass fylldes. ${skipped} pass hoppades över.`);
}
function isUnassignedDriverValue(value) {
  const driver = (value || "").trim().toLowerCase();

  return driver === "" ||
    driver === "otilldelad" ||
    driver === "unassigned";
}
async function showUnassignedInRange() {
  const from = autoFromDate.value;
  const to = autoToDate.value;

  if (!from || !to) return alert("Välj från och till datum.");
  if (from > to) return alert("Från datum kan inte vara efter till datum.");

  currentUnassignedFrom = from;
  currentUnassignedTo = to;

  const shiftsRes = await api("/shifts");
  const usersRes = await api("/users");

  if (shiftsRes.status === 401 || usersRes.status === 401) {
    location.href = "/login.html";
    return;
  }

  const shifts = await shiftsRes.json();
  const users = await usersRes.json();

  currentModalDrivers = users.filter(u => u.role === "driver");

  currentUnassignedShifts = shifts
    .filter(s => {
      const date = s.date || "";

      return date >= from &&
        date <= to &&
        isUnassignedDriverValue(s.driver);
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });

  renderUnassignedModal();

  unassignedModal.classList.add("open");
}
function renderUnassignedModal() {
  unassignedTitle.innerText = "Otilldelade pass";
  unassignedSubtitle.innerText =
    `${currentUnassignedFrom} till ${currentUnassignedTo} — ${currentUnassignedShifts.length} pass`;

  unassignedResult.innerHTML = "";

  if (currentUnassignedShifts.length === 0) {
    unassignedResult.innerHTML = `
      <div class="unassigned-empty">
        Inga otilldelade pass hittades i valt datumspann.
      </div>
    `;
    return;
  }

  const table = document.createElement("table");
  table.className = "unassigned-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Datum</th>
        <th>Pass</th>
        <th>Tid</th>
        <th>Fordon</th>
        <th>Ort</th>
        <th>Chaufför</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  currentUnassignedShifts.forEach(shift => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${shift.date || "-"}</td>
      <td>${shift.shift || "-"}</td>
      <td>${shift.time || "Tid saknas"}</td>
      <td>${shift.vehicle || "-"}</td>
      <td>${shift.city || "-"}</td>

<td colspan="2">
  <div class="manual-assign-row">
    ${buildManualCandidateSelectHtml(shift)}

    <button type="button" onclick="assignDriverManuallyFromModal('${shift.id}')">
      Tilldela
    </button>
  </div>
</td>
    `;
    tbody.appendChild(row);
  });

  unassignedResult.appendChild(table);
}
async function assignDriverManuallyFromModal(shiftId) {
  const select = document.getElementById(`manual-driver-${shiftId}`);

  if (!select) {
    alert("Hittar inte rullistan.");
    return;
  }

  const selectedDriver = select.value;

  if (!selectedDriver || selectedDriver === "__unassigned__") {
    alert("Välj en chaufför först.");
    return;
  }

  const res = await api(`/shifts/${shiftId}`, {
    method: "PUT",
    body: JSON.stringify({
      driver: selectedDriver
    })
  });

  if (res.status === 401) {
    location.href = "/login.html";
    return;
  }

  if (!res.ok) {
    alert("Kunde inte tilldela chauffören.");
    return;
  }

  // 🔥 Uppdatera UI direkt
  const shift = currentUnassignedShifts.find(s => s.id === shiftId);
  if (shift) {
    shift.driver = selectedDriver;
  }

  renderUnassignedModal();
}
function buildManualCandidateSelectHtml(shift) {
  const candidateData = getDriverCandidatesForShift(
    shift,
    currentModalDrivers,
    currentUnassignedShifts
  );

  const row = {
    shift,
    driver: null,
    candidates: candidateData
  };

  return buildCandidateSelectHtml(row).replace(
    `id="candidate-select-${shift.id}"`,
    `id="manual-driver-${shift.id}"`
  );
}
function getDriverCandidatesForShift(shift, drivers, simulatedShifts) {
  const candidates = drivers.map(driver => {
    const check = driverCanTakeShift(driver, shift, simulatedShifts);

    if (!check.ok) {
      return {
        driver,
        ok: false,
        score: Infinity,
        details: check.reasons
      };
    }

    const scoring = scoreDriverForShift(driver, shift, simulatedShifts);

    return {
      driver,
      ok: true,
      score: scoring.score,
      details: scoring.details
    };
  });

  const okCandidates = candidates
    .filter(c => c.ok)
    .sort((a, b) => a.score - b.score);

  const blockedCandidates = candidates
    .filter(c => !c.ok)
    .sort((a, b) => a.driver.username.localeCompare(b.driver.username, "sv-SE"));

  const topThree = okCandidates.slice(0, 3);

  const restOk = okCandidates
    .slice(3)
    .sort((a, b) => a.driver.username.localeCompare(b.driver.username, "sv-SE"));

  return {
    all: candidates,
    topThree,
    restOk,
    blocked: blockedCandidates
  };
}
async function autoFillUnassignedFromModal() {
  if (currentUnassignedShifts.length === 0) {
    alert("Det finns inga otilldelade pass att auto-fylla.");
    return;
  }

  const shiftsRes = await api("/shifts");
  const usersRes = await api("/users");

  if (shiftsRes.status === 401 || usersRes.status === 401) {
    location.href = "/login.html";
    return;
  }

  const allShifts = await shiftsRes.json();
  const users = await usersRes.json();
  const drivers = users.filter(u => u.role === "driver");

  const simulatedShifts = allShifts.map(s => ({ ...s }));

  let filled = 0;
  let skipped = 0;
  const resultRows = [];

  for (const shift of currentUnassignedShifts) {
  const candidateData = getDriverCandidatesForShift(shift, drivers, simulatedShifts);

  candidateData.restOk = (candidateData.restOk || []).sort((a, b) =>
    a.driver.username.localeCompare(b.driver.username, "sv")
  );

  candidateData.blocked = (candidateData.blocked || []).sort((a, b) =>
    a.driver.username.localeCompare(b.driver.username, "sv")
  );

  const bestCandidate = candidateData.topThree?.[0];

  if (!bestCandidate) {
    skipped++;

    resultRows.push({
      status: "skipped",
      shift,
      driver: null,
      score: null,
      details: ["Ingen godkänd chaufför hittades"],
      candidates: candidateData
    });

    continue;
  }

  const updateRes = await api(`/shifts/${shift.id}`, {
    method: "PUT",
    body: JSON.stringify({
      driver: bestCandidate.driver.username,
      autoFilled: true
    })
  });

  if (updateRes.ok) {
    simulatedShifts.push({
      ...shift,
      driver: bestCandidate.driver.username,
      autoFilled: true
    });

    resultRows.push({
      status: "filled",
      shift,
      driver: bestCandidate.driver.username,
      score: bestCandidate.score,
      details: [
        "Valdes automatiskt som Top 1",
        `Poäng: ${bestCandidate.score}`,
        ...bestCandidate.details
      ],
      candidates: candidateData
    });

    filled++;
  } else {
    skipped++;

    resultRows.push({
      status: "skipped",
      shift,
      driver: bestCandidate.driver.username,
      score: bestCandidate.score,
      details: ["Kunde inte spara till servern"],
      candidates: candidateData
    });
  }
}

  currentAutoFillResultRows = resultRows;
  renderAutoFillModalResult(resultRows, filled, skipped);
}
function renderAutoFillModalResult(resultRows, filled, skipped) {
  unassignedTitle.innerText = "Resultat – Auto-fyll chaufförer";
  unassignedSubtitle.innerText =
    `${currentUnassignedFrom} till ${currentUnassignedTo} — ${filled} fyllda, ${skipped} hoppades över`;

  unassignedResult.innerHTML = "";

  if (resultRows.length === 0) {
    unassignedResult.innerHTML = `
      <div class="unassigned-empty">
        Inga pass behandlades.
      </div>
    `;
    return;
  }

  const infoBox = document.createElement("div");
  infoBox.className = "score-info-box";
  infoBox.innerHTML = `
    <b>Poängförklaring:</b>
    Lägre poäng är bättre. Top 1–3 visas överst i rullistan.
    Därefter visas övriga godkända chaufförer alfabetiskt och blockerade chaufförer längst ner med orsak.
  `;
  unassignedResult.appendChild(infoBox);

  const table = document.createElement("table");
  table.className = "unassigned-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Status</th>
        <th>Datum</th>
        <th>Pass</th>
        <th>Tid</th>
        <th>Fordon</th>
        <th>Ort</th>
        <th>Vald chaufför</th>
        <th>Ändra chaufför</th>
        <th>Detaljer</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  resultRows.forEach(row => {
    const tr = document.createElement("tr");

    tr.className = row.status === "filled"
      ? "unassigned-filled"
      : "unassigned-skipped";

    const shiftId = row.shift.id;
    const details = Array.isArray(row.details) ? row.details : [];

    tr.innerHTML = `
      <td>${row.status === "filled" ? "Fylld" : "Ej fylld"}</td>
      <td>${row.shift.date || "-"}</td>
      <td>${row.shift.shift || "-"}</td>
      <td>${row.shift.time || "Tid saknas"}</td>
      <td>${row.shift.vehicle || "-"}</td>
      <td>${row.shift.city || "-"}</td>
      <td>
        <b>${row.driver || "OTILLDELAD"}</b>
        ${row.score !== null && row.score !== undefined ? `<br><small>Poäng: ${row.score}</small>` : ""}
      </td>
      <td>
        ${buildCandidateSelectHtml(row)}
        <button type="button" onclick="changeAutoFilledDriverFromModal('${shiftId}')">
          Byt
        </button>
      </td>
      <td>${details.join("<br>")}</td>
    `;

    tbody.appendChild(tr);
  });

  unassignedResult.appendChild(table);
}
function buildCandidateSelectHtml(row) {
  const shiftId = row.shift.id;
  const selectedDriver = row.driver || "";

  const topThree = row.candidates?.topThree || [];

  const restOk = (row.candidates?.restOk || []).sort((a, b) =>
    a.driver.username.localeCompare(b.driver.username, "sv")
  );

  const blocked = (row.candidates?.blocked || []).sort((a, b) =>
    a.driver.username.localeCompare(b.driver.username, "sv")
  );

  let html = `<select id="candidate-select-${shiftId}">`;

  html += `
    <option value="__unassigned__" ${!selectedDriver ? "selected" : ""}>
      OTILLDELAD
    </option>
  `;

  if (topThree.length > 0) {
    html += `<optgroup label="Top 3 förslag">`;

    topThree.forEach((candidate, index) => {
      const username = candidate.driver.username;
      const selected = username === selectedDriver ? "selected" : "";

      html += `
        <option value="${username}" ${selected}>
          Top ${index + 1} – ${username} – poäng ${candidate.score}
        </option>
      `;
    });

    html += `</optgroup>`;
  }

  if (restOk.length > 0) {
    html += `<optgroup label="Övriga godkända chaufförer">`;

    restOk.forEach(candidate => {
      const username = candidate.driver.username;
      const selected = username === selectedDriver ? "selected" : "";

      html += `
        <option value="${username}" ${selected}>
          ${username} – poäng ${candidate.score}
        </option>
      `;
    });

    html += `</optgroup>`;
  }

  if (blocked.length > 0) {
    html += `<optgroup label="Blockerade chaufförer">`;

    blocked.forEach(candidate => {
      const username = candidate.driver.username;
      const reasons = candidate.details.join(", ");

      html += `
        <option value="${username}">
          ${username} – blockerad: ${reasons}
        </option>
      `;
    });

    html += `</optgroup>`;
  }

  html += `</select>`;

  return html;
}
async function changeAutoFilledDriverFromModal(shiftId) {
  const select = document.getElementById(`candidate-select-${shiftId}`);

  if (!select) {
    alert("Kunde inte hitta rullistan.");
    return;
  }

  const resultRow = currentAutoFillResultRows.find(row =>
    String(row.shift.id) === String(shiftId)
  );

  if (!resultRow) {
    alert("Kunde inte hitta passet i resultatlistan.");
    return;
  }

  const selectedUsername = select.value;

  if (selectedUsername === "__unassigned__") {
    const res = await api(`/shifts/${resultRow.shift.id}`, {
      method: "PUT",
      body: JSON.stringify({
        driver: "",
        autoFilled: false
      })
    });

    if (!res.ok) {
      alert("Kunde inte sätta passet som otilldelat.");
      return;
    }

    resultRow.driver = null;
    resultRow.score = null;
    resultRow.status = "skipped";
    resultRow.details = ["Satt som OTILLDELAD av planerare"];

    const filled = currentAutoFillResultRows.filter(r => r.status === "filled").length;
    const skipped = currentAutoFillResultRows.filter(r => r.status !== "filled").length;

    renderAutoFillModalResult(currentAutoFillResultRows, filled, skipped);
    return;
  }

  const selectedCandidate =
    resultRow.candidates.all.find(c => c.driver.username === selectedUsername);

  if (!selectedCandidate) {
    alert("Kunde inte hitta vald chaufför.");
    return;
  }

  if (!selectedCandidate.ok) {
    const approved = confirm(
      `${selectedUsername} är blockerad enligt reglerna:\n\n` +
      selectedCandidate.details.map(d => "• " + d).join("\n") +
      `\n\nVill du tilldela ändå?`
    );

    if (!approved) return;
  }

  const res = await api(`/shifts/${resultRow.shift.id}`, {
    method: "PUT",
    body: JSON.stringify({
      driver: selectedUsername,
      autoFilled: false
    })
  });

  if (!res.ok) {
    alert("Kunde inte byta chaufför.");
    return;
  }

  resultRow.driver = selectedUsername;
  resultRow.score = selectedCandidate.ok ? selectedCandidate.score : null;
  resultRow.status = "filled";

  resultRow.details = selectedCandidate.ok
    ? [
        "Ändrad manuellt av planerare",
        `Poäng: ${selectedCandidate.score}`,
        ...selectedCandidate.details
      ]
    : [
        "Ändrad manuellt av planerare",
        "OBS: Chauffören är blockerad enligt regler",
        ...selectedCandidate.details
      ];

  const filled = currentAutoFillResultRows.filter(r => r.status === "filled").length;
  const skipped = currentAutoFillResultRows.filter(r => r.status !== "filled").length;

  renderAutoFillModalResult(currentAutoFillResultRows, filled, skipped);
}
function closeUnassignedModal() {
  unassignedModal.classList.remove("open");
  unassignedResult.innerHTML = "";

  currentUnassignedShifts = [];
  currentModalDrivers = [];
  currentUnassignedFrom = "";
  currentUnassignedTo = "";
  currentAutoFillResultRows = [];
}
function printUnassignedShifts() {
  if (currentUnassignedShifts.length === 0) {
    alert("Det finns inga otilldelade pass att skriva ut.");
    return;
  }

  window.print();
}
/* ===== NAV ===== */
function updateMonthLabel() {
  const d = new Date(monthPicker.value + "-01");
  monthLabel.innerText = d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
}

function openDayView() {
  location.href = "/AdminVaxelschema.html?date=" + dayPicker.value;
}

function openMonthView() {
  location.href = "/driver-month.html?driver=" + monthDriver.value + "&month=" + monthPicker.value;
}

function openDashboardSettings() {
  loadAdminSectionSettingsIntoModal();
  renderDashboardWidgetOrderSettings();
  dashboardSettingsModal.classList.add("open");
}

function closeDashboardSettings() {
  dashboardSettingsModal.classList.remove("open");
}
window.onload = () => {
  const t = new Date();
  const today = t.toISOString().split("T")[0];

  dayPicker.value = today;
  monthPicker.value = t.toISOString().slice(0, 7);
  autoFromDate.value = today;
  autoToDate.value = today;
  testFromDate.value = today;
  testToDate.value = today;
  absenceFrom.value = today;
  absenceTo.value = today;

  updateMonthLabel();
  loadUsers();
  loadTemplates();
  loadVehicleSelect();
  loadVehicleQuickSelect();
  toggleAbsenceBlockPercent();
  applyAdminSectionSettings();
    initAdminDashboard();
};

window.addEventListener("pageshow", () => {
  if (document.getElementById("dashboardContent")) {
    initAdminDashboard();
  }
});

/* ===== DYGNVILA (TAXI 8+3) ===== */

function getMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getShiftRange(shift) {
  if (!shift.time) return null;

  const parts = shift.time.replace(/\s/g, "").split("-");
  if (parts.length !== 2) return null;

  return {
    start: getMinutes(parts[0]),
    end: getMinutes(parts[1])
  };
}

function shiftToDateRange(shift) {
  const range = getShiftRange(shift);
  if (!range || !shift.date) return null;

  const start = new Date(`${shift.date}T00:00:00`);
  const end = new Date(`${shift.date}T00:00:00`);

  start.setMinutes(range.start);
  end.setMinutes(range.end);

  return { start, end };
}

function hasDailyRestConflict(driver, shift, allShifts) {
  const current = shiftToDateRange(shift);
  if (!current) return false;

  const driverShifts = allShifts
    .filter(s => (s.driver || "").toLowerCase() === driver.username.toLowerCase())
    .map(s => ({
      id: s.id,
      range: shiftToDateRange(s)
    }))
    .filter(s => s.range);

  for (const s of driverShifts) {
    if (s.id === shift.id) continue;

    const other = s.range;

    let restBetween = 0;

    if (current.start >= other.end) {
      restBetween = current.start - other.end;
    } else if (other.start >= current.end) {
      restBetween = other.start - current.end;
    } else {
      return true;
    }

    const restMinutes = restBetween / (1000 * 60);

    if (restMinutes >= 11 * 60) continue;
    if (restMinutes >= 3 * 60) continue;

    return true;
  }

  return false;
}

function hasWeeklyRestConflict(driver, shift, allShifts) {
  const testShift = { ...shift, driver: driver.username };

  const driverShifts = allShifts
    .filter(s => (s.driver || "").toLowerCase() === driver.username.toLowerCase())
    .concat(testShift)
    .map(s => {
      const range = getShiftRange(s);
      if (!range || !s.date) return null;

      const start = new Date(`${s.date}T00:00:00`);
      const end = new Date(`${s.date}T00:00:00`);

      start.setMinutes(range.start);
      end.setMinutes(range.end);

      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  if (driverShifts.length === 0) return false;

  const ms36h = 36 * 60 * 60 * 1000;
  const ms7d = 7 * 24 * 60 * 60 * 1000;

  const firstDay = new Date(driverShifts[0].start);
  firstDay.setHours(0, 0, 0, 0);

  const lastDay = new Date(driverShifts[driverShifts.length - 1].end);
  lastDay.setHours(0, 0, 0, 0);

  for (
    let windowStart = new Date(firstDay);
    windowStart <= lastDay;
    windowStart.setDate(windowStart.getDate() + 1)
  ) {
    const windowEnd = new Date(windowStart.getTime() + ms7d);

    const shiftsInWindow = driverShifts.filter(s =>
      s.end > windowStart && s.start < windowEnd
    );

    let longestRest = 0;
    let cursor = new Date(windowStart);

    shiftsInWindow.forEach(s => {
      const restBeforeShift = s.start - cursor;
      if (restBeforeShift > longestRest) longestRest = restBeforeShift;

      if (s.end > cursor) cursor = s.end;
    });

    const restAfterLastShift = windowEnd - cursor;
    if (restAfterLastShift > longestRest) longestRest = restAfterLastShift;

    if (longestRest < ms36h) {
      return true;
    }
  }

  return false;
}

function openVehiclesPage() {
  window.location.href = "/fordon.html";
}