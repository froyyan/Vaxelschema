async function api(url, options = {}) {
  return fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
}

async function logout() {
  await api("/logout", { method: "POST" });
  location.href = "/login.html";
}

function getVehicles() {
  return JSON.parse(localStorage.getItem("vehicles") || "[]");
}

function saveVehicles(vehicles) {
  localStorage.setItem("vehicles", JSON.stringify(vehicles));
}

function getInspections() {
  return JSON.parse(localStorage.getItem("inspections") || "[]");
}

function saveInspections(inspections) {
  localStorage.setItem("inspections", JSON.stringify(inspections));
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeInspectionStatus(status) {
  if (!status) return "planned";

  const value = String(status).trim().toLowerCase();

  if (value === "planned") return "planned";
  if (value === "open") return "planned";
  if (value === "ej bokad") return "planned";

  if (value === "booked") return "booked";
  if (value === "bokad") return "booked";

  if (value === "done") return "done";
  if (value === "utförd") return "done";

  if (value === "cancelled") return "cancelled";
  if (value === "avbokad") return "cancelled";

  return "planned";
}

function getInspectionStatusText(status) {
  const normalized = normalizeInspectionStatus(status);

  if (normalized === "planned") return "Ej bokad";
  if (normalized === "booked") return "Bokad";
  if (normalized === "done") return "Utförd";
  if (normalized === "cancelled") return "Avbokad";

  return "Ej bokad";
}

function getRecurringKeyFromInspectionType(type) {
  const value = String(type || "").toLowerCase();

  if (value.includes("taxameter")) return "taxameter";
  if (value.includes("alkolås") || value.includes("alkolas")) return "alkolas";
  if (value.includes("färdskriv") || value.includes("fardskriv")) return "fardskrivare";
  if (value.includes("lyft")) return "lyft";
  if (value.includes("service")) return "service";

  return "";
}

function addRecurringIntervalToDate(dateStr, interval) {
  if (!dateStr || !interval) return "";

  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return "";

  if (interval === "1m") date.setMonth(date.getMonth() + 1);
  if (interval === "1y") date.setFullYear(date.getFullYear() + 1);
  if (interval === "2y") date.setFullYear(date.getFullYear() + 2);
  if (interval === "3y") date.setFullYear(date.getFullYear() + 3);
  if (interval === "5y") date.setFullYear(date.getFullYear() + 5);

  return formatLocalDate(date);
}
function getDefaultRecurringSettings() {
  return {
    taxameter: "1y",
    alkolas: "1y",
    fardskrivare: "2y",
    lyft: "1y",
    service: ""
  };
}
function getVehicleRecurringSettings(vehicle) {
  return {
    ...getDefaultRecurringSettings(),
    ...(vehicle.recurringDeadlines || {})
  };
}

function getDefaultRecurringSettings() {
  return {
    taxameter: "1y",
    alkolas: "1y",
    fardskrivare: "2y",
    lyft: "1y",
    service: ""
  };
}