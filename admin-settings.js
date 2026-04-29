const DEFAULT_ADMIN_SECTION_SETTINGS = {
  "open-day": true,
  "driver-month": true,
  "auto-fill": true,
  "test-rules": true,
  "templates": true,
  "users": true
};
const DEFAULT_DASHBOARD_WIDGET_SETTINGS = {
  summary: true,
  unassigned: true,
  inspections: true,
  absence: true,
  worktime: true
};

function getAdminSectionSettings() {
  const saved = localStorage.getItem("adminSectionSettings");

  if (!saved) {
    return { ...DEFAULT_ADMIN_SECTION_SETTINGS };
  }

  try {
    return {
      ...DEFAULT_ADMIN_SECTION_SETTINGS,
      ...JSON.parse(saved)
    };
  } catch (error) {
    return { ...DEFAULT_ADMIN_SECTION_SETTINGS };
  }
}
function getDashboardWidgetSettings() {
  const saved = localStorage.getItem("dashboardWidgetSettings");

  if (!saved) {
    return { ...DEFAULT_DASHBOARD_WIDGET_SETTINGS };
  }

  try {
    return {
      ...DEFAULT_DASHBOARD_WIDGET_SETTINGS,
      ...JSON.parse(saved)
    };
  } catch (error) {
    return { ...DEFAULT_DASHBOARD_WIDGET_SETTINGS };
  }
}

function applyAdminSectionSettings() {
  const settings = getAdminSectionSettings();

  document.querySelectorAll(".admin-section").forEach(section => {
    const key = section.dataset.section;

    if (settings[key] === false) {
      section.classList.add("is-hidden");
    } else {
      section.classList.remove("is-hidden");
    }
  });
}

function loadAdminSectionSettingsIntoModal() {
  const sectionSettings = getAdminSectionSettings();
  const dashboardSettings = getDashboardWidgetSettings();

  document.querySelectorAll(".admin-section-toggle").forEach(toggle => {
    const key = toggle.dataset.targetSection;
    toggle.checked = sectionSettings[key] !== false;
  });

  document.querySelectorAll(".dashboard-widget-toggle").forEach(toggle => {
    const key = toggle.dataset.dashboardWidget;
    toggle.checked = dashboardSettings[key] !== false;
  });
}

function saveAdminSectionSettings() {
  const sectionSettings = getAdminSectionSettings();
  const dashboardSettings = getDashboardWidgetSettings();

  document.querySelectorAll(".admin-section-toggle").forEach(toggle => {
    const key = toggle.dataset.targetSection;
    sectionSettings[key] = toggle.checked;
  });

  document.querySelectorAll(".dashboard-widget-toggle").forEach(toggle => {
    const key = toggle.dataset.dashboardWidget;
    dashboardSettings[key] = toggle.checked;
  });

  localStorage.setItem("adminSectionSettings", JSON.stringify(sectionSettings));
  localStorage.setItem("dashboardWidgetSettings", JSON.stringify(dashboardSettings));

  applyAdminSectionSettings();
  closeDashboardSettings();
}

/* ===== DASHBOARD WIDGET SETTINGS ===== */

function getDashboardWidgetSettings() {
  return JSON.parse(localStorage.getItem("dashboardWidgetSettings") || "{}");
}

function saveDashboardWidgetSettings() {
  const settings = getDashboardWidgetSettings();

  document.querySelectorAll(".dashboard-widget-toggle").forEach(checkbox => {
    const widget = checkbox.dataset.dashboardWidget;

    settings[widget] = checkbox.checked;
  });

  localStorage.setItem("dashboardWidgetSettings", JSON.stringify(settings));

  applyDashboardWidgetSettings();

  alert("Dashboard-inställningar sparades.");
}

function applyDashboardWidgetSettings() {
  const settings = getDashboardWidgetSettings();

  document.querySelectorAll(".dashboard-widget").forEach(widgetEl => {
    const widget = widgetEl.dataset.dashboardWidget;

    const isVisible = settings[widget] !== false;

    if (isVisible) {
      widgetEl.classList.remove("is-hidden");
      widgetEl.style.display = "";
    } else {
      widgetEl.classList.add("is-hidden");
      widgetEl.style.display = "none";
    }
  });
}

function loadDashboardWidgetSettingsIntoModal() {
  const settings = getDashboardWidgetSettings();

  document.querySelectorAll(".dashboard-widget-toggle").forEach(checkbox => {
    const widget = checkbox.dataset.dashboardWidget;

    checkbox.checked = settings[widget] !== false;
  });
}

function saveAllAdminSettings() {
  saveAdminSectionSettingsWithoutAlert();
  saveDashboardWidgetSettingsWithoutAlert();

  alert("Inställningar sparades.");
}

function saveAdminSectionSettingsWithoutAlert() {
  const settings = getAdminSectionSettings();

  document.querySelectorAll(".admin-section-toggle").forEach(checkbox => {
    const section = checkbox.dataset.targetSection;

    settings[section] = checkbox.checked;
  });

  localStorage.setItem("adminSectionSettings", JSON.stringify(settings));

  applyAdminSectionSettings();
}

function saveDashboardWidgetSettingsWithoutAlert() {
  const settings = getDashboardWidgetSettings();

  document.querySelectorAll(".dashboard-widget-toggle").forEach(checkbox => {
    const widget = checkbox.dataset.dashboardWidget;

    settings[widget] = checkbox.checked;
  });

  localStorage.setItem("dashboardWidgetSettings", JSON.stringify(settings));

  applyDashboardWidgetSettings();
}
/* ===== DASHBOARD WIDGET ORDER ===== */

function getDashboardWidgetOrder() {
  const saved = localStorage.getItem("dashboardWidgetOrder");

  if (saved) {
    return JSON.parse(saved);
  }

  return ["unassigned", "absence", "inspections", "summary", "worktime"];
}

function saveDashboardWidgetOrder(order) {
  localStorage.setItem("dashboardWidgetOrder", JSON.stringify(order));
}

function applyDashboardWidgetOrder() {
  const container = document.getElementById("dashboardContent");

  if (!container) return;

  const order = getDashboardWidgetOrder();

  order.forEach(widgetKey => {
    const widgetEl = container.querySelector(`[data-dashboard-widget="${widgetKey}"]`);

    if (widgetEl) {
      container.appendChild(widgetEl);
    }
  });
}

function moveDashboardWidgetUp(widgetKey) {
  const order = getDashboardWidgetOrder();
  const index = order.indexOf(widgetKey);

  if (index <= 0) return;

  const temp = order[index - 1];
  order[index - 1] = order[index];
  order[index] = temp;

  saveDashboardWidgetOrder(order);
  renderDashboardWidgetOrderSettings();
  applyDashboardWidgetOrder();
}

function moveDashboardWidgetDown(widgetKey) {
  const order = getDashboardWidgetOrder();
  const index = order.indexOf(widgetKey);

  if (index === -1 || index >= order.length - 1) return;

  const temp = order[index + 1];
  order[index + 1] = order[index];
  order[index] = temp;

  saveDashboardWidgetOrder(order);
  renderDashboardWidgetOrderSettings();
  applyDashboardWidgetOrder();
}

function getDashboardWidgetLabels() {
  return {
    summary: "Snabböversikt",
    unassigned: "Otilldelade pass",
    inspections: "Besiktningar",
    absence: "Frånvaro",
    worktime: "Arbetstid & rast"
  };
}

function renderDashboardWidgetOrderSettings() {
  const box = document.getElementById("dashboardWidgetSettingsList");

  if (!box) return;

  const settings = getDashboardWidgetSettings();
  const order = getDashboardWidgetOrder();
  const labels = getDashboardWidgetLabels();

  box.innerHTML = order.map(widgetKey => {
    const checked = settings[widgetKey] !== false;
    const label = labels[widgetKey] || widgetKey;

    return `
      <div class="dashboard-widget-setting-row">
        <label>
          <input
            type="checkbox"
            class="dashboard-widget-toggle"
            data-dashboard-widget="${widgetKey}"
            ${checked ? "checked" : ""}
          >
          Visa ${label}
        </label>

        <div class="dashboard-widget-order-buttons">
          <button type="button" onclick="moveDashboardWidgetUp('${widgetKey}')">↑</button>
          <button type="button" onclick="moveDashboardWidgetDown('${widgetKey}')">↓</button>
        </div>
      </div>
    `;
  }).join("");
}

function getDashboardWidgetOrder() {
  const saved = localStorage.getItem("dashboardWidgetOrder");

  if (saved) {
    return JSON.parse(saved);
  }

  return ["unassigned", "absence", "inspections", "summary", "worktime"];
}

function saveDashboardWidgetOrder(order) {
  localStorage.setItem("dashboardWidgetOrder", JSON.stringify(order));
}

function applyDashboardWidgetOrder() {
  const container = document.getElementById("dashboardContent");

  if (!container) return;

  const order = getDashboardWidgetOrder();

  order.forEach(widgetKey => {
    const widgetEl = container.querySelector(`[data-dashboard-widget="${widgetKey}"]`);

    if (widgetEl) {
      container.appendChild(widgetEl);
    }
  });
}

function moveDashboardWidgetUp(widgetKey) {
  const order = getDashboardWidgetOrder();
  const index = order.indexOf(widgetKey);

  if (index <= 0) return;

  [order[index - 1], order[index]] = [order[index], order[index - 1]];

  saveDashboardWidgetOrder(order);
  renderDashboardWidgetOrderSettings();
  applyDashboardWidgetOrder();
  applyDashboardWidgetSettings();
}

function moveDashboardWidgetDown(widgetKey) {
  const order = getDashboardWidgetOrder();
  const index = order.indexOf(widgetKey);

  if (index === -1 || index >= order.length - 1) return;

  [order[index + 1], order[index]] = [order[index], order[index + 1]];

  saveDashboardWidgetOrder(order);
  renderDashboardWidgetOrderSettings();
  applyDashboardWidgetOrder();
  applyDashboardWidgetSettings();
}