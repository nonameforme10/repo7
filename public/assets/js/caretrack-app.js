import {
  addDoc,
  auth,
  collection,
  db,
  defaultClinicId,
  deleteDoc,
  doc,
  functions,
  get,
  getDoc,
  getDocs,
  httpsCallable,
  limit,
  onAuthStateChanged,
  orderBy,
  query,
  ref,
  rtdb,
  serverTimestamp,
  setDoc,
  signOut,
  where,
} from "./firebase-config.js";

const html = String.raw;
const root = document.getElementById("app-root") || document.body;
const rawPageKey = document.body.dataset.page || "dashboard";
const pageKey = rawPageKey === "users" ? "doctors" : rawPageKey;
const assetBaseUrl = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const APP_LOGO_URL = `${assetBaseUrl}/img/logo.png`;

const state = {
  user: null,
  profile: null,
  clinicId: defaultClinicId,
  demoMode: false,
};

const FIRESTORE_TIMEOUT_MS = 2600;

const roleLabels = {
  admin: "Admin",
  doctor: "Doctor",
  receptionist: "Receptionist",
};

const icons = {
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-7"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.4-4.4"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7.1 4.3l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-5"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>`,
};

const nav = [
  { key: "dashboard", href: "admin.html", label: "Dashboard", icon: "chart", roles: ["admin", "doctor", "receptionist"], group: "Main" },
  { key: "doctors", href: "doctors.html", label: "Staff", icon: "users", roles: ["admin"], group: "Main" },
  { key: "patients", href: "patients.html", label: "Patients", icon: "users", roles: ["admin", "doctor", "receptionist"], group: "Main" },
  { key: "diagnoses", href: "diagnoses.html", label: "Diagnoses", icon: "activity", roles: ["admin", "doctor"], group: "Main" },
  { key: "reports", href: "reports.html", label: "Reports", icon: "document", roles: ["admin", "doctor"], group: "Main" },
  { key: "schedules", href: "schedules.html", label: "Schedules", icon: "calendar", roles: ["admin", "doctor", "receptionist"], group: "Main" },
  { key: "settings", href: "settings.html", label: "Settings", icon: "settings", roles: ["admin"], group: "System" },
  { key: "audit", href: "audit-logs.html", label: "Audit Logs", icon: "audit", roles: ["admin"], group: "System" },
];

const pages = {
  dashboard: { nav: "dashboard", title: "Dashboard", subtitle: "Clinic operations, records, and alerts at a glance.", roles: ["admin", "doctor", "receptionist"], render: renderDashboard },
  doctors: { nav: "doctors", title: "Staff", subtitle: "Find doctors and receptionists by name, role, department, email, or contact details.", roles: ["admin"], render: renderDoctors },
  "doctor-form": { nav: "doctors", title: "Add Doctor", subtitle: "Create or update doctor profile, specialty, contact, and availability.", roles: ["admin"], render: renderDoctorForm },
  "doctor-detail": { nav: "doctors", title: "Doctor Profile", subtitle: "Review doctor details, assigned patients, schedule, and activity.", roles: ["admin", "doctor", "receptionist"], render: renderDoctorDetail },
  patients: { nav: "patients", title: "Patients", subtitle: "View, register, and manage patient records.", roles: ["admin", "doctor", "receptionist"], render: renderPatients },
  "patient-form": { nav: "patients", title: "Register New Patient", subtitle: "Register patient information and assign the right clinical care team.", roles: ["admin", "doctor", "receptionist"], render: renderPatientForm },
  "patient-profile": { nav: "patients", title: "Patient Profile", subtitle: "Full medical record overview and linked diagnosis history.", roles: ["admin", "doctor", "receptionist"], render: renderPatientProfile },
  diagnoses: { nav: "diagnoses", title: "Diagnoses", subtitle: "Manage patient disease and diagnosis records.", roles: ["admin", "doctor"], render: renderDiagnoses },
  "diagnosis-form": { nav: "diagnoses", title: "Add Diagnosis Record", subtitle: "Create or update a diagnosis linked to a patient profile.", roles: ["admin", "doctor"], render: renderDiagnosisForm },
  reports: { nav: "reports", title: "Reports", subtitle: "Generate and review patient diagnosis reports.", roles: ["admin", "doctor"], render: renderReports },
  "patient-report": { nav: "reports", title: "Patient Diagnosis Report", subtitle: "Printable patient diagnosis history and clinical notes.", roles: ["admin", "doctor"], render: renderPatientReport },
  schedules: { nav: "schedules", title: "Doctor Schedules", subtitle: "View doctor availability and working hours.", roles: ["admin", "doctor", "receptionist"], render: renderSchedules },
  settings: { nav: "settings", title: "System Settings", subtitle: "Configure clinic profile, departments, specialties, and security defaults.", roles: ["admin"], render: renderSettings },
  audit: { nav: "audit", title: "Audit Logs", subtitle: "Track important actions performed in the medical records system.", roles: ["admin"], render: renderAuditLogs },
  "access-denied": { nav: null, title: "Access Denied", subtitle: "You do not have permission to view this page.", roles: [], render: renderAccessDenied },
};

const samples = {
  doctors: [
    { id: "dr-wilson", fullName: "Dr. James Wilson", specialty: "Cardiology", department: "Cardiology", email: "j.wilson@caretrack.test", phone: "+1 555 0120", room: "C-204", status: "Available", assignedPatients: 42, availability: "Mon, Wed, Fri" },
    { id: "dr-chen", fullName: "Dr. Sarah Chen", specialty: "Neurology", department: "Neurology", email: "s.chen@caretrack.test", phone: "+1 555 0124", room: "N-118", status: "Busy", assignedPatients: 29, availability: "Tue, Thu" },
    { id: "dr-parker", fullName: "Dr. Maya Parker", specialty: "Pediatrics", department: "Pediatrics", email: "m.parker@caretrack.test", phone: "+1 555 0162", room: "P-302", status: "Off Duty", assignedPatients: 34, availability: "Mon-Fri" },
  ],
  patients: [
    { id: "PT-2847", patientId: "PT-2847", firstName: "James", lastName: "Mitchell", age: 54, gender: "Male", phone: "+1 555 0101", email: "james@example.com", assignedDoctorName: "Dr. James Wilson", assignedDoctorId: "dr-wilson", department: "Cardiology", lastDiagnosis: "Hypertension Stage 2", status: "Monitoring", lastUpdated: "Today" },
    { id: "PT-2846", patientId: "PT-2846", firstName: "Sarah", lastName: "Reynolds", age: 37, gender: "Female", phone: "+1 555 0198", email: "sarah@example.com", assignedDoctorName: "Dr. Sarah Chen", assignedDoctorId: "dr-chen", department: "Neurology", lastDiagnosis: "Acute Migraine", status: "Critical", lastUpdated: "Today" },
    { id: "PT-2845", patientId: "PT-2845", firstName: "David", lastName: "Kim", age: 45, gender: "Male", phone: "+1 555 0177", email: "david@example.com", assignedDoctorName: "Dr. Maya Parker", assignedDoctorId: "dr-parker", department: "Orthopedics", lastDiagnosis: "Post-op follow-up", status: "Stable", lastUpdated: "Yesterday" },
  ],
  diagnoses: [
    { id: "dx-1", icdCode: "I10", description: "Hypertension Stage 2", patientId: "PT-2847", patientName: "James Mitchell", assignedDoctorName: "Dr. James Wilson", severity: "High", diagnosisDate: "2026-05-14", lastUpdated: "Today", clinicalNotes: "Medication adjusted and follow-up scheduled." },
    { id: "dx-2", icdCode: "G43.909", description: "Acute Migraine", patientId: "PT-2846", patientName: "Sarah Reynolds", assignedDoctorName: "Dr. Sarah Chen", severity: "Critical", diagnosisDate: "2026-05-14", lastUpdated: "Today", clinicalNotes: "Monitor symptoms and medication response." },
    { id: "dx-3", icdCode: "Z47.89", description: "Orthopedic aftercare", patientId: "PT-2845", patientName: "David Kim", assignedDoctorName: "Dr. Maya Parker", severity: "Medium", diagnosisDate: "2026-05-13", lastUpdated: "Yesterday", clinicalNotes: "Physical therapy review in two weeks." },
  ],
  schedules: [
    { id: "sch-1", doctorName: "Dr. James Wilson", doctorId: "dr-wilson", department: "Cardiology", specialty: "Cardiology", day: "Monday", startTime: "08:00", endTime: "14:00", room: "C-204", status: "Available" },
    { id: "sch-2", doctorName: "Dr. Sarah Chen", doctorId: "dr-chen", department: "Neurology", specialty: "Neurology", day: "Tuesday", startTime: "10:00", endTime: "17:00", room: "N-118", status: "Busy" },
    { id: "sch-3", doctorName: "Dr. Maya Parker", doctorId: "dr-parker", department: "Pediatrics", specialty: "Pediatrics", day: "Friday", startTime: "09:00", endTime: "15:00", room: "P-302", status: "Available" },
  ],
  reports: [
    { id: "rp-1", reportName: "Patient Diagnosis Report", subject: "James Mitchell", createdBy: "Alex Drummond", createdAtText: "Today", status: "Ready" },
    { id: "rp-2", reportName: "Critical Cases Report", subject: "Neurology", createdBy: "Dr. Sarah Chen", createdAtText: "Yesterday", status: "Ready" },
  ],
  users: [
    { id: "admin-demo", displayName: "Alex Drummond", email: "admin@caretrack.test", role: "admin", staffType: "admin", department: "Administration", active: true, lastLoginAtText: "Today" },
    { id: "doctor-demo", displayName: "Dr. Sarah Chen", email: "s.chen@caretrack.test", role: "doctor", staffType: "doctor", department: "Neurology", active: true, lastLoginAtText: "Today" },
    { id: "reception-demo", displayName: "Mina Patel", email: "m.patel@caretrack.test", role: "receptionist", staffType: "receptionist", department: "Front Desk", active: true, lastLoginAtText: "Yesterday" },
  ],
  auditLogs: [
    { id: "audit-1", timestampText: "Today 09:42", userName: "Alex Drummond", role: "Admin", action: "Created", entity: "Doctor", details: "Added Dr. Maya Parker", device: "Web app" },
    { id: "audit-2", timestampText: "Today 09:10", userName: "Mina Patel", role: "Receptionist", action: "Updated", entity: "Patient", details: "Updated emergency contact", device: "Web app" },
  ],
};

function escapeText(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "") {
  const words = String(name || "CareTrack User").trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0] || "").join("").toUpperCase() || "CT";
}

function normalizeRole(value) {
  const role = String(value || "").toLowerCase().trim();
  if (["admin", "administrator"].includes(role)) return "admin";
  if (["doctor", "clinician", "clinical"].includes(role)) return "doctor";
  if (["receptionist", "reception", "frontdesk", "front_desk"].includes(role)) return "receptionist";
  return "";
}

function staffTypeForRole(role, preferred = "") {
  const clean = String(preferred || "").toLowerCase().trim();
  if (["admin", "doctor", "receptionist"].includes(clean)) return clean;
  if (clean === "reception") return "receptionist";
  if (clean === "administrator") return "admin";
  if (["clinician", "clinical"].includes(clean)) return "doctor";
  if (role === "admin") return "admin";
  if (role === "receptionist") return "receptionist";
  return "doctor";
}

function roleBadge(role) {
  const normalized = normalizeRole(role);
  const color = normalized === "admin" ? "cyan" : normalized === "doctor" ? "teal" : "purple";
  return `<span class="badge ${color}">${roleLabels[normalized] || "Staff"}</span>`;
}

function roleAvatarClass(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "role-admin";
  if (normalized === "doctor") return "role-doctor";
  if (normalized === "receptionist") return "role-receptionist";
  return "";
}

function roleColor(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "var(--cyan)";
  if (normalized === "doctor") return "var(--teal)";
  if (normalized === "receptionist") return "var(--purple)";
  return "var(--cyan)";
}

function roleAvatarImg(role, extra = "") {
  const normalized = normalizeRole(role);
  const imgMap = {
    admin: "administrator.webp",
    doctor: "man-doc.webp",
    receptionist: "receptionist.webp",
  };
  const file = imgMap[normalized] || "patient.webp";
  const src = `${assetBaseUrl}/img/${file}`;
  const cls = `avatar with-photo ${roleAvatarClass(normalized)} ${extra}`.trim();
  return `<span class="${cls}"><img src="${src}" alt="${roleLabels[normalized] || 'Staff'}" loading="lazy"></span>`;
}

function statusBadge(status) {
  const clean = String(status || "Active");
  const key = clean.toLowerCase();
  const color =
    key.includes("critical") || key.includes("off") || key.includes("disabled") ? "rose" :
    key.includes("busy") || key.includes("monitor") || key.includes("medium") ? "amber" :
    key.includes("high") ? "rose" :
    key.includes("low") || key.includes("stable") || key.includes("available") || key.includes("ready") || key.includes("active") ? "green" :
    "cyan";
  return `<span class="badge ${color}">${escapeText(clean)}</span>`;
}

function pageUrl(page, params = {}) {
  const base = {
    dashboard: "admin.html",
    doctors: "doctors.html",
    "doctor-form": "doctor-form.html",
    "doctor-detail": "doctor-detail.html",
    patients: "patients.html",
    "patient-form": "patient-form.html",
    "patient-profile": "patient-profile.html",
    diagnoses: "diagnoses.html",
    "diagnosis-form": "diagnosis-form.html",
    reports: "reports.html",
    "patient-report": "patient-report.html",
    schedules: "schedules.html",
    users: "doctors.html",
    settings: "settings.html",
    audit: "audit-logs.html",
    "access-denied": "access-denied.html",
  }[page] || "admin.html";
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function showLoading(message = "Securing CareTrack session...") {
  root.innerHTML = html`
    <div class="loading-screen">
      <div class="loading-card">
        <div class="spinner"></div>
        <a class="ct-logo ct-logo-full" href="../index.html" aria-label="CareTrack">
          <img class="ct-logo-image auth-card-logo" src="${APP_LOGO_URL}" width="154" height="58" alt="CareTrack">
        </a>
        <p class="page-subtitle">${escapeText(message)}</p>
        <div class="skeleton-preview">
          <div class="skeleton-bar wide"></div>
          <div class="skeleton-row">
            <div class="skeleton-bar card"></div>
            <div class="skeleton-bar card"></div>
            <div class="skeleton-bar card"></div>
          </div>
          <div class="skeleton-bar table"></div>
        </div>
      </div>
    </div>`;
}

function scheduleLoading(message = "Securing CareTrack session...") {
  const timer = window.setTimeout(() => showLoading(message), 420);
  return () => window.clearTimeout(timer);
}

function toast(message) {
  let host = document.querySelector(".toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  host.appendChild(node);
  setTimeout(() => node.remove(), 3600);
}

function withTimeout(promise, message = "CareTrack data source timed out.") {
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), FIRESTORE_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.href = `../auth/index.html?next=${encodeURIComponent(next)}`;
}

function redirectDenied(reason = "role") {
  window.location.href = pageUrl("access-denied", { reason, from: `${window.location.pathname}${window.location.search}` });
}

function authReady() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
}

function inferRegistration(path = "") {
  if (path.includes("/admin/")) return { role: "admin", staffType: "admin" };
  if (path.includes("/doctor/")) return { role: "doctor", staffType: "doctor" };
  if (path.includes("/doctors/")) return { role: "doctor", staffType: "doctor" };
  if (path.includes("/reception/") || path.includes("/receptionist/")) return { role: "receptionist", staffType: "receptionist" };
  return { role: "", staffType: "" };
}

async function loadRegistration(user) {
  const paths = [
    `registration/admin/${user.uid}`,
    `registration/doctors/${user.uid}`,
    `registration/receptionist/${user.uid}`,
    `registration/clinicks/doctor/${user.uid}`,
    `registration/clinicks/reception/${user.uid}`,
    `access/users/${user.uid}`,
  ];

  const lookups = await Promise.all(paths.map(async (path) => {
    try {
      const snapshot = await get(ref(rtdb, path));
      if (snapshot.exists()) {
        const inferred = inferRegistration(path);
        return { ...inferred, ...snapshot.val(), registrationPath: path };
      }
    } catch (error) {
      console.warn("RTD registration lookup failed", error);
    }
    return null;
  }));

  for (const registration of lookups) {
    if (registration) return registration;
  }

  return null;
}

async function buildProfile(user) {
  let token = await user.getIdTokenResult();
  const registration = await loadRegistration(user);
  let claims = token.claims || {};
  const registrationActive = registration?.active === true || registration?.status === "active";
  const registrationRole = normalizeRole(registration?.role || registration?.staffType);

  if (
    registrationActive
    && registrationRole
    && (
      normalizeRole(claims.role) !== registrationRole
      || String(claims.role || "").toLowerCase().trim() !== registrationRole
      || claims.status !== "active"
      || claims.active !== true
      || !claims.clinicId
    )
  ) {
    try {
      await httpsCallable(functions, "syncOwnAccessClaims")();
      token = await user.getIdTokenResult(true);
      claims = token.claims || {};
    } catch (error) {
      console.warn("CareTrack claim refresh skipped", error);
    }
  }

  const role = normalizeRole(claims.role || registration?.role || registration?.staffType);
  const staffType = staffTypeForRole(role, claims.staffType || registration?.staffType);
  const active = claims.status === "active" || claims.active === true || registration?.active === true || registration?.status === "active";
  const displayName = registration?.displayName || claims.name || user.displayName || user.email || "CareTrack Staff";
  const clinicId = claims.clinicId || registration?.clinicId || defaultClinicId;

  return {
    uid: user.uid,
    email: user.email || registration?.email || "",
    displayName,
    role,
    staffType,
    active,
    clinicId,
    departmentId: registration?.departmentId || registration?.department || "",
    registrationPath: registration?.registrationPath || "",
  };
}

async function requireSession(config) {
  const user = await authReady();
  if (!user) {
    if (pageKey === "access-denied") return null;
    redirectToLogin();
    return null;
  }

  state.user = user;
  state.profile = await buildProfile(user);
  state.clinicId = state.profile.clinicId || defaultClinicId;

  if (!state.profile.active || !state.profile.role) {
    if (pageKey !== "access-denied") redirectDenied("inactive");
    return state.profile;
  }

  if (config.roles?.length && !config.roles.includes(state.profile.role)) {
    await writeAudit("Permission Denied", "Page", config.title, { attemptedPath: window.location.pathname });
    redirectDenied("role");
    return state.profile;
  }

  return state.profile;
}

function can(roleList) {
  return state.profile?.role && roleList.includes(state.profile.role);
}

function logoMarkup() {
  return html`
    <a class="ct-logo ct-logo-full" href="admin.html" aria-label="CareTrack Dashboard">
      <img class="ct-logo-image" src="${APP_LOGO_URL}" width="172" height="58" alt="CareTrack">
    </a>`;
}

function renderShell(config, content) {
  const profile = state.profile || {};
  const allowed = nav.filter((item) => item.roles.includes(profile.role));
  const groups = [...new Set(allowed.map((item) => item.group))];
  const currentNav = config.nav || pageKey;
  const userName = profile.displayName || "CareTrack Staff";

  root.innerHTML = html`
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        ${logoMarkup()}
        ${groups.map((group) => html`
          <nav class="nav-group" aria-label="${escapeText(group)}">
            <div class="nav-label">${escapeText(group)}</div>
            ${allowed.filter((item) => item.group === group).map((item) => html`
              <a class="nav-link ${item.key === currentNav ? "active" : ""}" href="${item.href}">
                ${icons[item.icon]}
                <span>${escapeText(item.label)}</span>
              </a>`).join("")}
          </nav>`).join("")}
        <div class="sidebar-footer">
          <div class="sidebar-user">
            ${roleAvatarImg(profile.role)}
            <div style="min-width:0">
              <strong>${escapeText(userName)}</strong>
              <span style="color:${roleColor(profile.role)}">${escapeText(roleLabels[profile.role] || "Staff")}</span>
            </div>
          </div>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <button class="icon-button mobile-menu" id="menuToggle" aria-label="Open menu">${icons.menu}</button>
          <div class="global-search">
            ${icons.search}
            <input id="globalSearch" type="search" placeholder="Search patients, doctors, records..." autocomplete="off" aria-label="Global search">
          </div>
          <div class="topbar-actions">
            <button class="icon-button" title="Notifications">${icons.bell}<span class="notification-dot"></span></button>
            <div class="topbar-user">
              ${roleAvatarImg(profile.role)}
              <div style="min-width:0">
                <strong>${escapeText(userName)}</strong>
                <span style="color:${roleColor(profile.role)}">${escapeText(roleLabels[profile.role] || "Staff")}</span>
              </div>
            </div>
            <button class="icon-button" id="signOutButton" title="Sign out">${icons.close}</button>
          </div>
        </header>
        <section class="content">
          ${content}
        </section>
      </main>
    </div>
    <div class="toast-host" role="status" aria-live="polite"></div>`;

  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
  });
  document.getElementById("signOutButton")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../auth/index.html";
  });
}

function pageHeader(config, actions = "") {
  return html`
    <div class="page-head">
      <div>
        <p class="eyebrow">CareTrack ${escapeText(roleLabels[state.profile?.role] || "Staff")}</p>
        <h1 class="page-title">${escapeText(config.title)}</h1>
        <p class="page-subtitle">${escapeText(config.subtitle)}</p>
      </div>
      <div class="head-actions">${actions}</div>
    </div>
    <div class="pulse-line"></div>`;
}

async function readDocs(name, fallback = [], options = {}) {
  try {
    const base = collection(db, "clinics", state.clinicId, name);
    const constraints = [];
    if (options.where) constraints.push(where(...options.where));
    if (options.orderBy) constraints.push(orderBy(...options.orderBy));
    if (options.limit) constraints.push(limit(options.limit));
    const snapshot = await withTimeout(
      getDocs(constraints.length ? query(base, ...constraints) : base),
      `CareTrack ${name} data is unavailable.`
    );
    return snapshot.docs.map((item) => {
      const data = item.data() || {};
      const legacyId = data.id && data.id !== item.id ? data.id : data.legacyId;
      return { ...data, legacyId, id: item.id, docId: item.id };
    });
  } catch (error) {
    console.warn(`Using sample ${name} data`, error);
    state.demoMode = true;
    return fallback;
  }
}

async function readDoc(name, id, fallback = null) {
  if (!id) return fallback;
  try {
    const snapshot = await withTimeout(
      getDoc(doc(db, "clinics", state.clinicId, name, id)),
      `CareTrack ${name} record is unavailable.`
    );
    if (!snapshot.exists()) return fallback;
    const data = snapshot.data() || {};
    const legacyId = data.id && data.id !== snapshot.id ? data.id : data.legacyId;
    return { ...data, legacyId, id: snapshot.id, docId: snapshot.id };
  } catch (error) {
    console.warn(`Using sample ${name} document`, error);
    state.demoMode = true;
    return fallback;
  }
}

async function saveRecord(name, data, id = "") {
  const payload = {
    ...data,
    clinicId: state.clinicId,
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.uid,
  };

  if (id) {
    await setDoc(doc(db, "clinics", state.clinicId, name, id), payload, { merge: true });
    await writeAudit("Updated", name, id, data);
    return id;
  }

  const created = await addDoc(collection(db, "clinics", state.clinicId, name), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: state.profile.uid,
  });
  await writeAudit("Created", name, created.id, data);
  return created.id;
}

async function deleteRecord(name, id) {
  await deleteDoc(doc(db, "clinics", state.clinicId, name, id));
  await writeAudit("Deleted", name, id, {});
}

async function writeAudit(action, entity, entityId, details = {}) {
  try {
    await addDoc(collection(db, "clinics", state.clinicId, "auditLogs"), {
      action,
      entity,
      entityId: String(entityId || ""),
      details,
      userId: state.profile?.uid || "",
      userName: state.profile?.displayName || "",
      role: state.profile?.role || "",
      device: navigator.userAgent.slice(0, 120),
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Audit write skipped", error);
  }
}

function wireTableTools() {
  document.querySelectorAll("[data-filter-table], [data-filter-tables]").forEach((input) => {
    input.addEventListener("input", () => {
      const needle = input.value.toLowerCase();
      const tableIds = (input.dataset.filterTables || input.dataset.filterTable || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      tableIds.forEach((tableId) => {
        const table = document.getElementById(tableId);
        table?.querySelectorAll("tbody tr").forEach((row) => {
          const haystack = `${row.textContent} ${row.dataset.searchText || ""}`.toLowerCase();
          row.hidden = !haystack.includes(needle);
        });
      });
    });
  });

  document.querySelectorAll("[data-delete-record]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [name, id] = button.dataset.deleteRecord.split(":");
      if (!name || !id) return;
      if (name === "doctors") {
        try {
          const patients = await readDocs("patients", samples.patients);
          const assigned = patients.filter((p) => p.assignedDoctorId === id);
          if (assigned.length > 0) {
            const names = assigned.slice(0, 5).map((p) => patientName(p)).join(", ");
            const more = assigned.length > 5 ? ` and ${assigned.length - 5} more` : "";
            toast(`Cannot delete: ${assigned.length} patient(s) assigned (${names}${more}). Reassign them first.`);
            return;
          }
        } catch (err) {
          console.warn("Could not check assigned patients", err);
        }
      }
      if (!confirm("Delete this record?")) return;
      try {
        await deleteRecord(name, id);
        button.closest("tr")?.remove();
        toast("Record deleted.");
      } catch (error) {
        toast(error.message || "Could not delete record.");
      }
    });
  });
}

function valueOf(form, name) {
  return form.elements[name]?.value?.trim() || "";
}

function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function doctorOptions(doctors, selected = "") {
  return doctors.map((doctor) => `<option value="${escapeText(doctor.id)}" ${doctor.id === selected ? "selected" : ""}>${escapeText(doctor.fullName || doctor.doctorName || doctor.name)}</option>`).join("");
}

function patientName(patient) {
  return `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.fullName || patient.name || "Unnamed Patient";
}

function doctorName(doctor) {
  return doctor.fullName || doctor.doctorName || doctor.name || "Unnamed Doctor";
}

function bindRecordForm(selector, collectionName, transform, successUrl) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    try {
      const id = valueOf(form, "id");
      const payload = await transform(formPayload(form), form);
      const targetId = payload.__id || id;
      delete payload.__id;
      const savedId = await saveRecord(collectionName, payload, targetId);
      toast("Record saved.");
      setTimeout(() => {
        window.location.href = typeof successUrl === "function" ? successUrl(savedId) : successUrl;
      }, 650);
    } catch (error) {
      toast(error.message || "Could not save record.");
    } finally {
      submit.disabled = false;
    }
  });
}

async function renderDashboard(config) {
  const canViewDiagnoses = can(["admin", "doctor"]);
  const canViewAudit = can(["admin"]);
  const [doctors, patients, diagnoses, auditLogs, users] = await Promise.all([
    readDocs("doctors", samples.doctors),
    readDocs("patients", samples.patients),
    canViewDiagnoses ? readDocs("diagnoses", samples.diagnoses) : Promise.resolve([]),
    canViewAudit ? readDocs("auditLogs", samples.auditLogs, { orderBy: ["timestamp", "desc"], limit: 5 }) : Promise.resolve([]),
    readRtdUsers(),
  ]);
  const critical = patients.filter((patient) => String(patient.status || "").toLowerCase().includes("critical")).length;
  const receptionistCount = users.filter((user) => normalizeRole(user.role || user.staffType) === "receptionist").length;
  const actions = html`
    ${can(["admin"]) ? `<a class="btn primary" href="${pageUrl("doctor-form")}">${icons.plus} Add Doctor</a>` : ""}
    ${can(["admin", "doctor", "receptionist"]) ? `<a class="btn primary" href="${pageUrl("patient-form")}">${icons.plus} Register Patient</a>` : ""}
    ${can(["admin", "doctor"]) ? `<a class="btn" href="${pageUrl("diagnosis-form")}">${icons.activity} Add Diagnosis</a>` : ""}`;

  return html`
    ${pageHeader(config, actions)}
    ${state.demoMode ? `<div class="notice">Firestore data is unavailable for this session, so CareTrack is showing sample rows while keeping the UI functional.</div><br>` : ""}
    <div class="grid stats">
      ${statCard("Total Staff", doctors.length + receptionistCount, "Doctors and receptionists", "cyan", "users")}
      ${statCard("Total Patients", patients.length, "Registered patient records", "teal", "users")}
      ${canViewDiagnoses ? statCard("Active Diagnoses", diagnoses.length, "Linked medical records", "blue", "activity") : ""}
      ${statCard("Critical Cases", critical, "Needs close monitoring", "rose", "shield")}
    </div>
    <br>
    <div class="grid two">
      <div class="panel">
        <div class="panel-header"><div><h2 class="panel-title">Recent Patients</h2><p class="panel-subtitle">Latest patient activity across departments.</p></div><a class="btn small" href="${pageUrl("patients")}">View All</a></div>
        ${patientsTable(patients.slice(0, 5), false)}
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2 class="panel-title">Recent Activity</h2><p class="panel-subtitle">Important system events.</p></div>${canViewAudit ? `<a class="btn small" href="${pageUrl("audit")}">Audit</a>` : ""}</div>
        <div class="timeline">
          ${auditLogs.slice(0, 5).map((item) => timelineItem(item.action || "Updated", item.details || item.entity || "CareTrack activity", item.timestampText || item.createdAtText || "Recently")).join("") || `<div class="empty-state">No recent activity.</div>`}
        </div>
      </div>
    </div>
    <br>
    <div class="grid three">
      <a class="panel pad" href="${pageUrl("doctors")}" style="text-decoration:none"><h2 class="panel-title">Staff Directory</h2><p class="page-subtitle">Doctors, receptionists, departments, contact details, and room assignments.</p></a>
      ${canViewDiagnoses ? `<a class="panel pad" href="${pageUrl("diagnoses")}" style="text-decoration:none"><h2 class="panel-title">Diagnosis Tracking</h2><p class="page-subtitle">ICD codes, severity, follow-ups, and doctor notes.</p></a>` : ""}
      ${canViewDiagnoses ? `<a class="panel pad" href="${pageUrl("reports")}" style="text-decoration:none"><h2 class="panel-title">Reports</h2><p class="page-subtitle">Printable patient diagnosis summaries and clinic reports.</p></a>` : ""}
    </div>`;
}

function statCard(label, value, note, color, iconName) {
  return html`
    <div class="stat-card ${color}">
      <div class="stat-top"><span class="stat-label">${escapeText(label)}</span><span class="stat-icon">${icons[iconName]}</span></div>
      <div class="stat-value">${escapeText(value)}</div>
      <div class="stat-note">${escapeText(note)}</div>
    </div>`;
}

function timelineItem(title, body, time) {
  return html`
    <div class="timeline-item">
      <span class="timeline-dot">${icons.activity}</span>
      <div><strong>${escapeText(title)}</strong><p>${escapeText(typeof body === "string" ? body : JSON.stringify(body))}</p></div>
      <span class="timeline-time">${escapeText(time)}</span>
    </div>`;
}

function staffDisplayName(staff = {}) {
  return staff.displayName || staff.fullName || staff.name || staff.email || staff.uid || staff.id || "Staff member";
}

function staffRecordKey(staff = {}) {
  return String(staff.uid || staff.id || staff.email || staffDisplayName(staff)).toLowerCase();
}

function userToDoctorProfile(user = {}) {
  const uid = user.uid || user.id || user.email || "";
  return {
    ...user,
    id: uid,
    uid,
    fullName: staffDisplayName(user),
    specialty: user.specialty || user.department || user.departmentId || "General Medicine",
    department: user.department || user.departmentId || "-",
    room: user.room || user.officeRoom || "Room pending",
    status: user.active === false || user.status === "disabled" ? "Disabled" : (user.status || "Available"),
    assignedPatients: user.assignedPatients ?? 0,
  };
}

function mergeDoctorSources(doctors = [], staffUsers = []) {
  const merged = new Map();
  const emailIndex = new Map();

  doctors.forEach((doctor) => {
    const key = staffRecordKey(doctor);
    merged.set(key, doctor);
    if (doctor.email) emailIndex.set(String(doctor.email).toLowerCase(), key);
  });

  staffUsers
    .filter((user) => normalizeRole(user.role || user.staffType) === "doctor")
    .forEach((user) => {
      const byEmail = user.email ? emailIndex.get(String(user.email).toLowerCase()) : "";
      const key = byEmail || staffRecordKey(user);
      const existing = merged.get(key) || {};
      merged.set(key, { ...userToDoctorProfile(user), ...existing });
    });

  return [...merged.values()];
}

async function renderDoctors(config) {
  const [storedDoctors, rtdUsers] = await Promise.all([
    readDocs("doctors", samples.doctors),
    readRtdUsers(),
  ]);
  const staffUsers = rtdUsers.length ? rtdUsers : (state.demoMode ? samples.users : []);
  const doctors = mergeDoctorSources(storedDoctors, rtdUsers);
  const receptionists = staffUsers.filter((user) => normalizeRole(user.role || user.staffType) === "receptionist");
  const actions = can(["admin"]) ? `<button class="btn primary" type="button" id="openStaffModal">${icons.plus} Add Staff</button>` : "";
  return html`
    ${pageHeader(config, actions)}
    <div class="toolbar">
      <div class="search-field"><input data-filter-tables="doctorsTable,receptionistsTable" placeholder="Search staff by name, role, department, email, or contact"></div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Doctors</h2></div>
      ${doctorsTable(doctors)}
    </div>
    <br>
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Receptionists</h2></div>
      ${receptionistsTable(receptionists)}
    </div>
    ${can(["admin"]) ? staffFormModal() : ""}`;
}

function doctorsTable(doctors) {
  return html`
    <div class="table-wrap">
      <table id="doctorsTable">
        <thead><tr><th>Doctor Name</th><th>Specialty</th><th>Department</th><th>Contact</th><th>Assigned Patients</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${doctors.map((doctor) => html`
            <tr data-search-text="${escapeText(`doctor ${doctorName(doctor)} ${doctor.specialty || ""} ${doctor.department || ""} ${doctor.email || ""} ${doctor.phone || ""}`)}">
              <td><div class="entity">${roleAvatarImg("doctor")}<div><strong>${escapeText(doctorName(doctor))}</strong><span>${escapeText(doctor.room || doctor.officeRoom || "Room pending")}</span></div></div></td>
              <td>${escapeText(doctor.specialty || "-")}</td>
              <td>${escapeText(doctor.department || "-")}</td>
              <td>${escapeText(doctor.phone || "-")}<br><span style="color:var(--faint)">${escapeText(doctor.email || "")}</span></td>
              <td>${escapeText(doctor.assignedPatients ?? 0)}</td>
              <td>${statusBadge(doctor.status || "Available")}</td>
              <td><div class="row-actions">
                <a class="btn small" href="${pageUrl("doctor-detail", { id: doctor.id })}">View</a>
                ${can(["admin"]) ? `<a class="btn small" href="${pageUrl("doctor-form", { id: doctor.id })}">Edit</a><button class="btn small danger" data-delete-record="doctors:${escapeText(doctor.id)}">Delete</button>` : ""}
              </div></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function receptionistsTable(receptionists) {
  return html`
    <div class="table-wrap">
      <table id="receptionistsTable">
        <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${receptionists.map((user) => {
            const uid = user.uid || user.id || "";
            return html`
              <tr data-search-text="${escapeText(`receptionist ${staffDisplayName(user)} ${user.email || ""} ${user.department || user.departmentId || ""} ${user.phone || ""}`)}">
                <td><div class="entity">${roleAvatarImg("receptionist")}<div><strong>${escapeText(staffDisplayName(user))}</strong><span>${escapeText(uid)}</span></div></div></td>
                <td>${escapeText(user.email || "-")}</td>
                <td>${escapeText(user.department || user.departmentId || "-")}</td>
                <td>${statusBadge(user.active === false || user.status === "disabled" ? "Disabled" : "Active")}</td>
                <td><div class="row-actions">${can(["admin"]) ? `<button class="btn small danger" data-disable-user="${escapeText(uid)}" ${uid === state.profile?.uid ? "disabled" : ""}>Disable</button>` : "-"}</div></td>
              </tr>`;
          }).join("") || `<tr><td colspan="5"><div class="empty-state">No receptionists found.</div></td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function staffFormModal() {
  return html`
    <div class="modal-backdrop" id="staffModal" hidden>
      <div class="modal-window" role="dialog" aria-modal="true" aria-labelledby="staffModalTitle">
        <div class="modal-header">
          <div>
            <h2 class="panel-title" id="staffModalTitle">Add Staff</h2>
            <p class="panel-subtitle">Create a doctor or receptionist account.</p>
          </div>
          <button class="icon-button" type="button" data-close-staff-modal aria-label="Close">${icons.close}</button>
        </div>
        <form id="staffUserForm">
          <section class="form-section">
            <h3>Account</h3>
            <div class="form-grid">
              <div class="field"><label>Role</label><select name="staffType" id="staffRoleSelect"><option value="doctor">Doctor</option><option value="receptionist">Receptionist</option></select></div>
              <div class="field"><label>Full Name</label><input name="displayName" required></div>
              <div class="field"><label>Email</label><input name="email" type="email" required></div>
              <div class="field"><label>Temporary Password</label><input name="temporaryPassword" type="password" minlength="8" required></div>
              <div class="field"><label>Department</label><input name="department" id="staffDepartment" value="General"></div>
              <div class="field"><label>Status</label><select name="active"><option value="true">Active</option><option value="false">Disabled</option></select></div>
            </div>
          </section>
          <section class="form-section" id="staffDoctorFields">
            <h3>Doctor Profile</h3>
            <div class="form-grid">
              <div class="field"><label>Specialty</label><input name="specialty" value="General Medicine"></div>
              <div class="field"><label>Phone Number</label><input name="phone"></div>
              <div class="field"><label>Office Room</label><input name="room"></div>
              <div class="field"><label>Available Days</label><input name="availability" value="Mon-Fri"></div>
              <div class="field"><label>Start Time</label><input name="startTime" type="time" value="08:00"></div>
              <div class="field"><label>End Time</label><input name="endTime" type="time" value="16:00"></div>
              <div class="field"><label>Doctor Status</label><select name="status"><option>Available</option><option>Busy</option><option>Off Duty</option></select></div>
            </div>
          </section>
          <div class="form-actions">
            <button class="btn" type="button" data-close-staff-modal>Cancel</button>
            <button class="btn primary" type="submit">Create Staff</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function renderDoctorForm(config) {
  const id = getParam("id");
  const fallback = samples.doctors.find((item) => item.id === id) || {};
  const doctor = await readDoc("doctors", id, fallback);
  const title = id ? "Edit Doctor" : "Add Doctor";
  return html`
    ${pageHeader({ ...config, title }, `<a class="btn" href="${pageUrl("doctors")}">Cancel</a>`)}
    <div class="panel pad">
      <form id="doctorForm">
        <input type="hidden" name="id" value="${escapeText(id || "")}">
        ${formSection("Personal Information", [
          field("Full Name", "fullName", doctor.fullName || ""),
          field("Email", "email", doctor.email || "", "email"),
          field("Phone Number", "phone", doctor.phone || ""),
          field("Office Room", "room", doctor.room || doctor.officeRoom || ""),
        ])}
        ${!id ? formSection("Account Access", [
          field("Temporary Password", "temporaryPassword", "", "password"),
        ]) : ""}
        ${formSection("Professional Details", [
          field("Specialty", "specialty", doctor.specialty || ""),
          field("Department", "department", doctor.department || ""),
          selectField("Status", "status", ["Available", "Busy", "Off Duty"], doctor.status || "Available"),
        ])}
        ${formSection("Availability", [
          field("Available Days", "availability", doctor.availability || "Mon, Wed, Fri"),
          field("Start Time", "startTime", doctor.startTime || "08:00", "time"),
          field("End Time", "endTime", doctor.endTime || "16:00", "time"),
        ])}
        <div class="form-actions"><a class="btn" href="${pageUrl("doctors")}">Cancel</a><button class="btn primary" type="submit">Save Doctor</button></div>
      </form>
    </div>`;
}

async function renderDoctorDetail(config) {
  const doctors = await readDocs("doctors", samples.doctors);
  const id = getParam("id") || doctors[0]?.id;
  const doctor = await readDoc("doctors", id, doctors.find((item) => item.id === id) || doctors[0]);
  const patients = (await readDocs("patients", samples.patients)).filter((patient) => !doctor?.id || patient.assignedDoctorId === doctor.id || patient.assignedDoctorName === doctorName(doctor)).slice(0, 5);
  const schedules = (await readDocs("schedules", samples.schedules)).filter((item) => item.doctorId === doctor?.id || item.doctorName === doctorName(doctor));
  return html`
    ${pageHeader(config, `<a class="btn" href="${pageUrl("schedules", { doctor: doctor?.id || "" })}">View Schedule</a>${can(["admin"]) ? `<a class="btn primary" href="${pageUrl("doctor-form", { id: doctor?.id || "" })}">Edit Doctor</a>` : ""}`)}
    <div class="panel">
      <div class="profile-header">
        <div class="profile-main">
          ${roleAvatarImg("doctor", "large")}
          <div><h2>${escapeText(doctorName(doctor))}</h2><p>${escapeText(doctor?.specialty || "")} | ${escapeText(doctor?.department || "")}</p></div>
        </div>
        ${statusBadge(doctor?.status || "Available")}
      </div>
    </div>
    <br>
    <div class="grid stats">
      ${statCard("Assigned Patients", patients.length, "Current panel", "cyan", "users")}
      ${statCard("Active Cases", Math.max(1, patients.length - 1), "Open diagnoses", "teal", "activity")}
      ${statCard("Diagnoses Reviewed", 18, "This month", "blue", "document")}
      ${statCard("Availability", doctor?.availability || "Mon-Fri", doctor?.room || "Clinic room", "amber", "calendar")}
    </div>
    <div class="tabs"><button class="tab active">Overview</button><button class="tab">Assigned Patients</button><button class="tab">Schedule</button><button class="tab">Activity</button></div>
    <div class="grid two">
      <div class="panel"><div class="panel-header"><h2 class="panel-title">Assigned Patients</h2></div>${patientsTable(patients, false)}</div>
      <div class="panel pad"><h2 class="panel-title">Weekly Schedule</h2><br><div class="info-list">${schedules.map((item) => infoRow(item.day, `${item.startTime} - ${item.endTime} | ${item.room}`)).join("") || infoRow("Schedule", "No schedule saved")}</div></div>
    </div>`;
}

async function renderPatients(config) {
  const patients = await readDocs("patients", samples.patients);
  const actions = can(["admin", "doctor", "receptionist"]) ? `<a class="btn primary" href="${pageUrl("patient-form")}">${icons.plus} Register Patient</a>` : "";
  return html`
    ${pageHeader(config, actions)}
    <div class="toolbar">
      <div class="search-field"><input data-filter-table="patientsTable" placeholder="Search patients by name, ID, phone, or assigned doctor"></div>
      <div class="field"><select><option>All Doctors</option><option>Dr. James Wilson</option><option>Dr. Sarah Chen</option></select></div>
      <div class="field"><select><option>All Departments</option><option>Cardiology</option><option>Neurology</option></select></div>
      <div class="field"><select><option>All Statuses</option><option>Stable</option><option>Monitoring</option><option>Critical</option></select></div>
    </div>
    <div class="panel">${patientsTable(patients)}</div>`;
}

function patientsTable(patients, includeActions = true) {
  return html`
    <div class="table-wrap">
      <table id="patientsTable">
        <thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Assigned Doctor</th><th>Last Diagnosis</th><th>Last Updated</th><th>Status</th>${includeActions ? "<th>Actions</th>" : ""}</tr></thead>
        <tbody>
          ${patients.map((patient) => html`
            <tr>
              <td>${escapeText(patient.patientId || patient.id)}</td>
              <td><div class="entity">${roleAvatarImg("patient")}<div><strong>${escapeText(patientName(patient))}</strong><span>${escapeText(patient.phone || "")}</span></div></div></td>
              <td>${escapeText(patient.age || ageFromDob(patient.dateOfBirth) || "-")}</td>
              <td>${escapeText(patient.gender || "-")}</td>
              <td>${escapeText(patient.assignedDoctorName || "-")}</td>
              <td>${escapeText(patient.lastDiagnosis || "-")}</td>
              <td>${escapeText(patient.lastUpdated || patient.lastUpdatedText || "Recently")}</td>
              <td>${statusBadge(patient.status || "Stable")}</td>
              ${includeActions ? `<td><div class="row-actions"><a class="btn small" href="${pageUrl("patient-profile", { id: patient.id })}">View</a>${can(["admin", "doctor", "receptionist"]) ? `<a class="btn small" href="${pageUrl("patient-form", { id: patient.id })}">Edit</a>` : ""}${can(["admin"]) ? `<button class="btn small danger" data-delete-record="patients:${escapeText(patient.id)}">Delete</button>` : ""}</div></td>` : ""}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function ageFromDob(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const diff = Date.now() - birth.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

async function renderPatientForm(config) {
  const id = getParam("id");
  const fallback = samples.patients.find((item) => item.id === id) || {};
  const [patient, doctors] = await Promise.all([
    readDoc("patients", id, fallback),
    readDocs("doctors", samples.doctors),
  ]);
  return html`
    ${pageHeader(config, `<a class="btn" href="${pageUrl("patients")}">Cancel</a>`)}
    <div class="panel pad">
      <form id="patientForm">
        <input type="hidden" name="id" value="${escapeText(id || "")}">
        ${formSection("Personal Information", [
          field("First Name", "firstName", patient.firstName || ""),
          field("Last Name", "lastName", patient.lastName || ""),
          field("Date of Birth", "dateOfBirth", patient.dateOfBirth || "", "date"),
          selectField("Gender", "gender", ["Female", "Male", "Other"], patient.gender || ""),
        ])}
        ${formSection("Contact Information", [
          field("Phone Number", "phone", patient.phone || ""),
          field("Email", "email", patient.email || "", "email"),
          field("Address", "address", patient.address || "", "text", true),
        ])}
        ${formSection("Emergency Contact", [
          field("Emergency Contact Name", "emergencyContactName", patient.emergencyContactName || ""),
          field("Emergency Contact Phone", "emergencyContactPhone", patient.emergencyContactPhone || ""),
        ])}
        ${formSection("Doctor Assignment", [
          `<div class="field"><label>Assigned Doctor</label><select name="assignedDoctorId"><option value="">Select doctor</option>${doctorOptions(doctors, patient.assignedDoctorId)}</select></div>`,
          field("Department", "department", patient.department || ""),
          `<div class="field full"><label>Registration Notes</label><textarea name="registrationNotes">${escapeText(patient.registrationNotes || "")}</textarea></div>`,
        ])}
        <div class="notice">Patient data is stored securely and visible only to authorized clinic staff.</div>
        <div class="form-actions"><a class="btn" href="${pageUrl("patients")}">Cancel</a><button class="btn primary" type="submit">Register Patient</button></div>
      </form>
    </div>`;
}

async function renderPatientProfile(config) {
  const canViewDiagnoses = can(["admin", "doctor"]);
  const patients = await readDocs("patients", samples.patients);
  const id = getParam("id") || patients[0]?.id;
  const patient = await readDoc("patients", id, patients.find((item) => item.id === id) || patients[0]);
  const [doctors, diagnoses] = await Promise.all([
    readDocs("doctors", samples.doctors),
    canViewDiagnoses ? readDocs("diagnoses", samples.diagnoses) : Promise.resolve([]),
  ]);
  const doctor = doctors.find((item) => item.id === patient?.assignedDoctorId || doctorName(item) === patient?.assignedDoctorName) || doctors[0];
  const patientDiagnoses = diagnoses.filter((item) => item.patientId === patient?.id || item.patientId === patient?.patientId || item.patientName === patientName(patient));
  return html`
    ${pageHeader(config, `${can(["admin", "doctor"]) ? `<a class="btn primary" href="${pageUrl("diagnosis-form", { patientId: patient?.id || "" })}">${icons.plus} Add Diagnosis</a><a class="btn" href="${pageUrl("patient-report", { id: patient?.id || "" })}">Generate Report</a>` : ""}`)}
    <div class="panel">
      <div class="profile-header">
        <div class="profile-main">${roleAvatarImg("patient", "large")}<div><h2>${escapeText(patientName(patient))}</h2><p>${escapeText(patient?.patientId || patient?.id)} | ${escapeText(patient?.age || ageFromDob(patient?.dateOfBirth) || "-")} years | ${escapeText(patient?.gender || "-")}</p></div></div>
        ${statusBadge(patient?.status || "Stable")}
      </div>
    </div>
    <div class="tabs"><button class="tab active">Overview</button><button class="tab">Diagnoses</button><button class="tab">Documents</button><button class="tab">Activity</button></div>
    <div class="grid two">
      <div class="grid">
        <div class="panel pad"><h2 class="panel-title">Patient Information</h2><br><div class="info-list">${infoRow("Phone", patient?.phone)}${infoRow("Email", patient?.email)}${infoRow("Address", patient?.address || "Not provided")}${infoRow("Emergency Contact", `${patient?.emergencyContactName || "-"} ${patient?.emergencyContactPhone || ""}`)}</div></div>
        <div class="panel"><div class="panel-header"><h2 class="panel-title">Diagnosis Records</h2></div>${diagnosesTable(patientDiagnoses, false)}</div>
      </div>
      <div class="grid">
        <div class="panel pad"><h2 class="panel-title">Assigned Doctor</h2><br><div class="entity">${roleAvatarImg("doctor")}<div><strong>${escapeText(doctorName(doctor))}</strong><span>${escapeText(doctor?.specialty || "")} | ${escapeText(doctor?.department || "")}</span></div></div><br><div class="info-list">${infoRow("Contact", doctor?.phone)}${infoRow("Email", doctor?.email)}</div></div>
        <div class="panel"><div class="panel-header"><h2 class="panel-title">Diagnosis History</h2></div><div class="timeline">${patientDiagnoses.map((item) => timelineItem(item.description || item.icdCode, `${item.severity || "Medium"} severity by ${item.assignedDoctorName || "Doctor"}`, item.diagnosisDate || "Recent")).join("") || `<div class="empty-state">No diagnosis records yet.</div>`}</div></div>
      </div>
    </div>`;
}

async function renderDiagnoses(config) {
  const diagnoses = await readDocs("diagnoses", samples.diagnoses);
  const actions = can(["admin", "doctor"]) ? `<a class="btn primary" href="${pageUrl("diagnosis-form")}">${icons.plus} Add Diagnosis</a>` : "";
  return html`
    ${pageHeader(config, actions)}
    <div class="toolbar">
      <div class="search-field"><input data-filter-table="diagnosesTable" placeholder="Search by ICD code, patient name, or diagnosis"></div>
      <div class="field"><select><option>All Severity</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
      <div class="field"><input type="date"></div>
      <div class="field"><select><option>All Departments</option><option>Cardiology</option><option>Neurology</option></select></div>
    </div>
    <div class="panel">${diagnosesTable(diagnoses)}</div>`;
}

function diagnosesTable(diagnoses, includeActions = true) {
  return html`
    <div class="table-wrap">
      <table id="diagnosesTable">
        <thead><tr><th>ICD Code</th><th>Diagnosis Description</th><th>Patient</th><th>Assigned Doctor</th><th>Severity</th><th>Diagnosis Date</th><th>Last Updated</th>${includeActions ? "<th>Actions</th>" : ""}</tr></thead>
        <tbody>
          ${diagnoses.map((item) => html`
            <tr>
              <td><strong>${escapeText(item.icdCode || "-")}</strong></td>
              <td>${escapeText(item.description || item.diagnosisDescription || "-")}</td>
              <td>${escapeText(item.patientName || item.patientId || "-")}</td>
              <td>${escapeText(item.assignedDoctorName || "-")}</td>
              <td>${statusBadge(item.severity || "Medium")}</td>
              <td>${escapeText(item.diagnosisDate || "-")}</td>
              <td>${escapeText(item.lastUpdated || "Recently")}</td>
              ${includeActions ? `<td><div class="row-actions"><a class="btn small" href="${pageUrl("patient-profile", { id: item.patientId || "" })}">View</a>${can(["admin", "doctor"]) ? `<a class="btn small" href="${pageUrl("diagnosis-form", { id: item.id })}">Edit</a>` : ""}${can(["admin"]) ? `<button class="btn small danger" data-delete-record="diagnoses:${escapeText(item.id)}">Delete</button>` : ""}</div></td>` : ""}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function renderDiagnosisForm(config) {
  const id = getParam("id");
  const patientId = getParam("patientId");
  const fallback = samples.diagnoses.find((item) => item.id === id) || {};
  const [diagnosis, patients, doctors] = await Promise.all([
    readDoc("diagnoses", id, fallback),
    readDocs("patients", samples.patients),
    readDocs("doctors", samples.doctors),
  ]);
  const selectedPatient = patients.find((item) => item.id === (diagnosis?.patientId || patientId) || item.patientId === (diagnosis?.patientId || patientId));
  return html`
    ${pageHeader(config, `<a class="btn" href="${pageUrl("diagnoses")}">Cancel</a>`)}
    <div class="panel pad">
      <form id="diagnosisForm">
        <input type="hidden" name="id" value="${escapeText(id || "")}">
        ${formSection("Patient Selection", [
          `<div class="field"><label>Select Patient</label><select name="patientId" required><option value="">Select patient</option>${patients.map((patient) => `<option value="${escapeText(patient.id)}" ${(patient.id === selectedPatient?.id) ? "selected" : ""}>${escapeText(patientName(patient))} (${escapeText(patient.patientId || patient.id)})</option>`).join("")}</select></div>`,
          `<div class="field"><label>Assigned Doctor</label><select name="assignedDoctorId"><option value="">Auto-filled from patient</option>${doctorOptions(doctors, selectedPatient?.assignedDoctorId || diagnosis?.assignedDoctorId)}</select></div>`,
        ])}
        ${formSection("Diagnosis Details", [
          `<div class="field"><label>ICD Code</label><input name="icdCode" value="${escapeText(diagnosis?.icdCode || "")}" pattern="^[A-Za-z][0-9]{2}(\\.[0-9]{1,4})?$" title="Valid ICD-10 format: letter + 2 digits, optional .digits (e.g. A15.0, J18.9)" placeholder="e.g. A15.0, J18.9"></div>`,
          `<div class="field"><label>Diagnosis Description</label><input name="description" value="${escapeText(diagnosis?.description || "")}" list="commonDiagnosesList"><datalist id="commonDiagnosesList"><option value="Hypertension"><option value="Type 2 Diabetes Mellitus"><option value="Pneumonia"><option value="Bronchitis"><option value="Asthma"><option value="Acute Migraine"><option value="Otitis Media"><option value="Influenza"><option value="Urinary Tract Infection"><option value="Gastroesophageal Reflux"><option value="Fracture"><option value="Coronary Artery Disease"><option value="Chronic Kidney Disease"><option value="Anemia"><option value="Anxiety Disorder"><option value="Depression"><option value="Allergic Rhinitis"><option value="Dermatitis"><option value="Osteoarthritis"><option value="Orthopedic aftercare"></datalist></div>`,
          selectField("Severity Level", "severity", ["Low", "Medium", "High", "Critical"], diagnosis?.severity || "Medium"),
          field("Diagnosis Date", "diagnosisDate", diagnosis?.diagnosisDate || new Date().toISOString().slice(0, 10), "date"),
        ])}
        ${formSection("Clinical Checks", [
          `<fieldset class="clinical-checks-fieldset"><legend>Findings</legend><div class="checkbox-grid"><label><input type="checkbox" name="finding_fever" ${diagnosis?.finding_fever ? "checked" : ""}> Fever</label><label><input type="checkbox" name="finding_cough" ${diagnosis?.finding_cough ? "checked" : ""}> Cough</label><label><input type="checkbox" name="finding_pain" ${diagnosis?.finding_pain ? "checked" : ""}> Pain</label><label><input type="checkbox" name="finding_shortness_of_breath" ${diagnosis?.finding_shortness_of_breath ? "checked" : ""}> Shortness of breath</label><label><input type="checkbox" name="finding_fatigue" ${diagnosis?.finding_fatigue ? "checked" : ""}> Fatigue</label><label><input type="checkbox" name="finding_weight_loss" ${diagnosis?.finding_weight_loss ? "checked" : ""}> Weight loss</label></div></fieldset>`,
        ])}
        ${formSection("Clinical Notes", [
          `<div class="field full"><label>Clinical Notes</label><textarea name="clinicalNotes">${escapeText(diagnosis?.clinicalNotes || "")}</textarea><small>Diagnosis records are linked to the patient profile.</small></div>`,
          `<div class="field"><label>Follow-up Required</label><select name="followUpRequired"><option value="false">No</option><option value="true" ${diagnosis?.followUpRequired ? "selected" : ""}>Yes</option></select></div>`,
          field("Follow-up Date", "followUpDate", diagnosis?.followUpDate || "", "date"),
        ])}
        <div class="form-actions"><a class="btn" href="${pageUrl("diagnoses")}">Cancel</a><button class="btn primary" type="submit">Save Diagnosis</button></div>
      </form>
    </div>`;
}

async function renderReports(config) {
  const reports = await readDocs("reports", samples.reports);
  return html`
    ${pageHeader(config, `<button class="btn primary" id="generateReport">${icons.plus} Generate Report</button>`)}
    <div class="grid four"></div>
    <div class="grid three">
      ${reportCard("Patient Diagnosis Report", "Create a printable patient-level diagnosis report.", pageUrl("patient-report"))}
      ${reportCard("Doctor Patient Summary", "Summarize patients assigned to a specific doctor.", "#")}
      ${reportCard("Department Diagnosis Overview", "Compare diagnosis activity by department.", "#")}
      ${reportCard("Critical Cases Report", "Review high-severity cases requiring attention.", "#")}
    </div>
    <br>
    <div class="toolbar">
      <div class="field"><input type="date"></div><div class="field"><select><option>All Departments</option><option>Cardiology</option><option>Neurology</option></select></div><div class="field"><select><option>All Doctors</option></select></div><div class="field"><select><option>All Severity</option><option>Critical</option></select></div>
    </div>
    <div class="panel">${reportsTable(reports)}</div>`;
}

function reportCard(title, body, href) {
  return html`<a class="panel pad" href="${href}" style="text-decoration:none"><div class="stat-icon">${icons.document}</div><h2 class="panel-title" style="margin-top:16px">${escapeText(title)}</h2><p class="page-subtitle">${escapeText(body)}</p></a>`;
}

function reportsTable(reports) {
  return html`
    <div class="table-wrap">
      <table>
        <thead><tr><th>Report Name</th><th>Patient/Department</th><th>Created By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${reports.map((report) => html`<tr><td>${escapeText(report.reportName || report.name)}</td><td>${escapeText(report.subject || report.patientName || "-")}</td><td>${escapeText(report.createdBy || "-")}</td><td>${escapeText(report.createdAtText || "Recently")}</td><td>${statusBadge(report.status || "Ready")}</td><td><div class="row-actions"><a class="btn small" href="${pageUrl("patient-report")}">View</a><button class="btn small">Download</button><button class="btn small" onclick="window.print()">Print</button></div></td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

async function renderPatientReport(config) {
  const patients = await readDocs("patients", samples.patients);
  const id = getParam("id") || patients[0]?.id;
  const patient = await readDoc("patients", id, patients.find((item) => item.id === id) || patients[0]);
  const [doctors, diagnoses] = await Promise.all([readDocs("doctors", samples.doctors), readDocs("diagnoses", samples.diagnoses)]);
  const doctor = doctors.find((item) => item.id === patient?.assignedDoctorId || doctorName(item) === patient?.assignedDoctorName) || doctors[0];
  const rows = diagnoses.filter((item) => item.patientId === patient?.id || item.patientId === patient?.patientId || item.patientName === patientName(patient));
  return html`
    ${pageHeader(config, `<a class="btn" href="${pageUrl("reports")}">Back</a><button class="btn primary" onclick="window.print()">Print</button><button class="btn">Download PDF</button>`)}
    <article class="report-sheet">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:2px solid #dbe4ef;padding-bottom:18px;margin-bottom:22px">
        <div><h1 style="margin:0">CareTrack Clinic</h1><p style="margin:5px 0 0">Patient Diagnosis Report</p></div>
        <strong>Generated ${new Date().toLocaleDateString()}</strong>
      </div>
      <h2>Patient Information</h2>
      <p><strong>${escapeText(patientName(patient))}</strong> | ${escapeText(patient?.patientId || patient?.id)} | ${escapeText(patient?.gender || "-")} | ${escapeText(patient?.age || ageFromDob(patient?.dateOfBirth) || "-")} years</p>
      <h2>Assigned Doctor</h2>
      <p><strong>${escapeText(doctorName(doctor))}</strong> | ${escapeText(doctor?.specialty || "-")} | ${escapeText(doctor?.department || "-")} | ${escapeText(doctor?.phone || "-")}</p>
      <h2>Diagnosis History</h2>
      <table><thead><tr><th>ICD Code</th><th>Description</th><th>Severity</th><th>Date</th><th>Doctor Notes</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${escapeText(item.icdCode)}</td><td>${escapeText(item.description)}</td><td>${escapeText(item.severity)}</td><td>${escapeText(item.diagnosisDate)}</td><td>${escapeText(item.clinicalNotes || "-")}</td></tr>`).join("") || `<tr><td colspan="5">No diagnosis records available.</td></tr>`}</tbody></table>
      <h2>Summary</h2>
      <p>This report contains patient diagnosis records available to authorized CareTrack clinic staff at generation time.</p>
      <p><strong>Generated by:</strong> ${escapeText(state.profile?.displayName || "CareTrack Staff")}</p>
    </article>`;
}

async function renderSchedules(config) {
  const schedules = await readDocs("schedules", samples.schedules);
  const actions = can(["admin"]) ? `<button class="btn primary" id="addScheduleButton">${icons.plus} Add Schedule</button>` : `<span class="badge cyan">View-only mode</span>`;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return html`
    ${pageHeader(config, actions)}
    <div class="toolbar"><div class="search-field"><input data-filter-table="schedulesTable" placeholder="Search and filter by Doctor, Department, Specialty, Day"></div><div class="field"><select><option>All Departments</option></select></div><div class="field"><select><option>All Days</option></select></div></div>
    <div class="panel"><div class="schedule-grid">${days.map((day) => `<div class="schedule-day"><h3>${day}</h3>${schedules.filter((item) => item.day === day).map((item) => `<div class="schedule-slot"><strong>${escapeText(item.doctorName)}</strong><span>${escapeText(item.startTime)} - ${escapeText(item.endTime)}</span><span>${escapeText(item.room)} | ${escapeText(item.status)}</span></div>`).join("") || `<p class="panel-subtitle">No schedule</p>`}</div>`).join("")}</div></div>
    <br>
    <div class="panel">${schedulesTable(schedules)}</div>`;
}

function schedulesTable(schedules) {
  return html`
    <div class="table-wrap"><table id="schedulesTable"><thead><tr><th>Doctor Name</th><th>Department</th><th>Day</th><th>Start Time</th><th>End Time</th><th>Room</th><th>Status</th></tr></thead><tbody>${schedules.map((item) => `<tr><td>${escapeText(item.doctorName)}</td><td>${escapeText(item.department)}</td><td>${escapeText(item.day)}</td><td>${escapeText(item.startTime)}</td><td>${escapeText(item.endTime)}</td><td>${escapeText(item.room)}</td><td>${statusBadge(item.status)}</td></tr>`).join("")}</tbody></table></div>`;
}

async function readRtdUsers() {
  try {
    const listStaffUsers = httpsCallable(functions, "listStaffUsers");
    const response = await withTimeout(listStaffUsers({ clinicId: state.clinicId }), "Staff user service is unavailable.");
    if (Array.isArray(response.data?.users)) return response.data.users;
  } catch (error) {
    console.warn("Could not read staff users through Functions API", error);
  }

  const paths = [
    ["admin", "registration/admin"],
    ["doctor", "registration/doctors"],
    ["receptionist", "registration/receptionist"],
    ["doctor", "registration/clinicks/doctor"],
    ["receptionist", "registration/clinicks/reception"],
  ];
  const users = [];
  for (const [staffType, path] of paths) {
    try {
      const snapshot = await withTimeout(get(ref(rtdb, path)), "Registration data is unavailable.");
      if (snapshot.exists()) {
        Object.entries(snapshot.val()).forEach(([uid, value]) => {
          const role = normalizeRole(value.role || staffType);
          users.push({ id: uid, uid, ...value, staffType: staffTypeForRole(role, value.staffType), role });
        });
      }
    } catch (error) {
      console.warn("Could not read RTD registration", error);
    }
  }
  return users;
}

async function renderSettings(config) {
  const settings = await readDoc("settings", "system", {
    clinicName: "CareTrack Clinic",
    clinicEmail: "admin@caretrack.test",
    emergencyPhone: "+1 555 0100",
    departments: "Cardiology, Neurology, Pediatrics, Orthopedics, General",
    specialties: "Cardiology, Neurology, Pediatrics, General Medicine",
    severityLabels: "Low, Medium, High, Critical",
    sessionTimeout: "60",
  });
  return html`
    ${pageHeader(config)}
    <div class="panel pad">
      <form id="settingsForm">
        <input type="hidden" name="id" value="system">
        ${formSection("Clinic Profile", [field("Clinic Name", "clinicName", settings.clinicName), field("Clinic Contact Email", "clinicEmail", settings.clinicEmail, "email"), field("Emergency Contact Number", "emergencyPhone", settings.emergencyPhone)])}
        ${formSection("Departments and Specialties", [field("Department list", "departments", settings.departments, "text", true), field("Specialty list", "specialties", settings.specialties, "text", true), field("Diagnosis Severity Labels", "severityLabels", settings.severityLabels, "text", true)])}
        ${formSection("Security Settings", [field("Session timeout", "sessionTimeout", settings.sessionTimeout, "number"), `<div class="field"><label>Data Backup</label><button class="btn" type="button">Export Backup</button></div>`])}
        <div class="form-actions"><button class="btn" type="reset">Cancel</button><button class="btn primary" type="submit">Save Settings</button></div>
      </form>
    </div>`;
}

async function renderAuditLogs(config) {
  const logs = await readDocs("auditLogs", samples.auditLogs, { orderBy: ["timestamp", "desc"], limit: 50 });
  return html`
    ${pageHeader(config, `<button class="btn">${icons.document} Export Logs</button>`)}
    <div class="toolbar"><div class="search-field"><input data-filter-table="auditTable" placeholder="Search audit logs"></div><div class="field"><select><option>All Users</option></select></div><div class="field"><select><option>All Actions</option><option>Created</option><option>Updated</option><option>Deleted</option><option>Login</option><option>Permission Denied</option></select></div><div class="field"><input type="date"></div></div>
    <div class="panel">
      <div class="table-wrap"><table id="auditTable"><thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Details</th><th>IP/Device</th></tr></thead><tbody>${logs.map((log) => `<tr><td>${escapeText(log.timestampText || log.createdAtText || "Recently")}</td><td>${escapeText(log.userName || "-")}</td><td>${escapeText(roleLabels[log.role] || log.role || "-")}</td><td>${statusBadge(log.action || "Updated")}</td><td>${escapeText(log.entity || "-")}</td><td>${escapeText(typeof log.details === "string" ? log.details : JSON.stringify(log.details || {}))}</td><td>${escapeText(log.device || "Web app")}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
}

function renderAccessDenied(config) {
  return html`
    <div class="loading-screen">
      <div class="loading-card">
        <span class="ct-logo-mark" style="margin:auto">${icons.lock}</span>
        <h1 class="page-title">Access Denied</h1>
        <p class="page-subtitle">You do not have permission to view this page.</p>
        <p class="security-note">Please contact your system admin if you believe this is a mistake.</p>
        <br>
        <a class="btn primary" href="admin.html">Back to Dashboard</a>
      </div>
    </div>`;
}

function formSection(title, fields) {
  return html`
    <section class="form-section">
      <h3>${escapeText(title)}</h3>
      <div class="form-grid">${fields.join("")}</div>
    </section>`;
}

function field(label, name, value = "", type = "text", full = false) {
  return html`<div class="field ${full ? "full" : ""}"><label>${escapeText(label)}</label><input name="${escapeText(name)}" type="${escapeText(type)}" value="${escapeText(value)}"></div>`;
}

function selectField(label, name, options, selected = "") {
  return html`<div class="field"><label>${escapeText(label)}</label><select name="${escapeText(name)}">${options.map((item) => `<option value="${escapeText(item)}" ${String(item) === String(selected) ? "selected" : ""}>${escapeText(item)}</option>`).join("")}</select></div>`;
}

function infoRow(label, value = "-") {
  return html`<div class="info-row"><span>${escapeText(label)}</span><strong>${escapeText(value || "-")}</strong></div>`;
}

function bindPageBehavior() {
  wireTableTools();

  bindRecordForm("#doctorForm", "doctors", async (data, form) => {
    const id = valueOf(form, "id");
    const temporaryPassword = String(data.temporaryPassword || "").trim();
    delete data.temporaryPassword;

    if (!id) {
      if (!data.email) {
        throw new Error("Doctor email is required to create the Firebase Auth account.");
      }
      if (temporaryPassword.length < 8) {
        throw new Error("Temporary password must be at least 8 characters.");
      }
      const createStaffUser = httpsCallable(functions, "createStaffUser");
      const response = await createStaffUser({
        displayName: data.fullName || data.email,
        email: data.email,
        temporaryPassword,
        staffType: "doctor",
        department: data.department || data.specialty || "General",
        active: true,
        clinicId: state.clinicId,
      });
      const uid = response.data?.uid;
      if (!uid) {
        throw new Error("Firebase Auth did not return a staff user id.");
      }
      return {
        ...data,
        __id: uid,
        uid,
        displayName: data.fullName || data.email,
        role: "doctor",
        staffType: "doctor",
        active: true,
        assignedPatients: Number(data.assignedPatients || 0),
      };
    }

    return {
      ...data,
      assignedPatients: Number(data.assignedPatients || 0),
    };
  }, pageUrl("doctors"));

  bindRecordForm("#patientForm", "patients", async (data, form) => {
    const [doctors, existingPatients] = await Promise.all([
      readDocs("doctors", samples.doctors),
      readDocs("patients", samples.patients),
    ]);
    const doctor = doctors.find((item) => item.id === data.assignedDoctorId);
    const id = valueOf(form, "id");
    if (!id) {
      const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim().toLowerCase();
      const dob = data.dateOfBirth || "";
      const duplicate = existingPatients.find((p) => {
        const pName = `${p.firstName || ""} ${p.lastName || ""}`.trim().toLowerCase();
        return pName === fullName && pName.length > 0 && (dob && p.dateOfBirth === dob);
      });
      if (duplicate && !confirm(`A patient named "${patientName(duplicate)}" with the same date of birth already exists (${duplicate.patientId || duplicate.id}). Continue registering?`)) {
        throw new Error("Registration cancelled — possible duplicate detected.");
      }
    }
    return {
      ...data,
      patientId: id || `PT-${Date.now().toString().slice(-6)}`,
      assignedDoctorName: doctor ? doctorName(doctor) : "",
      status: data.status || "Stable",
      lastUpdated: "Just now",
    };
  }, (id) => pageUrl("patient-profile", { id }));

  bindRecordForm("#diagnosisForm", "diagnoses", async (data) => {
    const icdCode = String(data.icdCode || "").trim();
    if (icdCode && !/^[A-Za-z][0-9]{2}(\.[0-9]{1,4})?$/.test(icdCode)) {
      throw new Error("Invalid ICD-10 code. Expected format: letter + 2 digits, optional .digits (e.g. A15.0, J18.9).");
    }
    const [patients, doctors] = await Promise.all([readDocs("patients", samples.patients), readDocs("doctors", samples.doctors)]);
    const patient = patients.find((item) => item.id === data.patientId || item.patientId === data.patientId);
    const doctor = doctors.find((item) => item.id === (data.assignedDoctorId || patient?.assignedDoctorId));
    return {
      ...data,
      icdCode: icdCode.toUpperCase(),
      patientName: patient ? patientName(patient) : "",
      assignedDoctorId: doctor?.id || "",
      assignedDoctorName: doctor ? doctorName(doctor) : "",
      followUpRequired: data.followUpRequired === "true",
      finding_fever: data.finding_fever === "on",
      finding_cough: data.finding_cough === "on",
      finding_pain: data.finding_pain === "on",
      finding_shortness_of_breath: data.finding_shortness_of_breath === "on",
      finding_fatigue: data.finding_fatigue === "on",
      finding_weight_loss: data.finding_weight_loss === "on",
      lastUpdated: "Just now",
    };
  }, pageUrl("diagnoses"));

  bindRecordForm("#settingsForm", "settings", async (data) => data, pageUrl("settings"));

  const staffModal = document.getElementById("staffModal");
  const staffRoleSelect = document.getElementById("staffRoleSelect");
  const staffDoctorFields = document.getElementById("staffDoctorFields");
  const staffDepartment = document.getElementById("staffDepartment");
  function setStaffModalOpen(open) {
    if (!staffModal) return;
    staffModal.hidden = !open;
  }
  function syncStaffRoleFields() {
    const role = staffRoleSelect?.value === "receptionist" ? "receptionist" : "doctor";
    if (staffDoctorFields) staffDoctorFields.hidden = role !== "doctor";
    if (staffDepartment && (!staffDepartment.value || ["General", "Front Desk"].includes(staffDepartment.value))) {
      staffDepartment.value = role === "doctor" ? "General" : "Front Desk";
    }
  }
  document.getElementById("openStaffModal")?.addEventListener("click", () => setStaffModalOpen(true));
  document.querySelectorAll("[data-close-staff-modal]").forEach((button) => {
    button.addEventListener("click", () => setStaffModalOpen(false));
  });
  staffModal?.addEventListener("mousedown", (event) => {
    if (event.target === staffModal) setStaffModalOpen(false);
  });
  staffRoleSelect?.addEventListener("change", syncStaffRoleFields);
  syncStaffRoleFields();

  const staffForm = document.getElementById("staffUserForm");
  staffForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formPayload(staffForm);
    const staffType = data.staffType === "receptionist" ? "receptionist" : "doctor";
    const temporaryPassword = String(data.temporaryPassword || "").trim();
    if (temporaryPassword.length < 8) {
      toast("Temporary password must be at least 8 characters.");
      return;
    }
    const button = staffForm.querySelector("[type=submit]");
    button.disabled = true;
    try {
      const createStaffUser = httpsCallable(functions, "createStaffUser");
      const response = await createStaffUser({
        displayName: data.displayName,
        email: data.email,
        temporaryPassword,
        staffType,
        department: data.department || (staffType === "doctor" ? data.specialty || "General" : "Front Desk"),
        active: data.active === "true",
        clinicId: state.clinicId,
      });
      const uid = response.data?.uid;
      if (!uid) throw new Error("Firebase Auth did not return a staff user id.");

      if (staffType === "doctor") {
        await saveRecord("doctors", {
          uid,
          fullName: data.displayName || data.email,
          displayName: data.displayName || data.email,
          email: data.email,
          phone: data.phone || "",
          room: data.room || "",
          specialty: data.specialty || "General Medicine",
          department: data.department || data.specialty || "General",
          status: data.status || "Available",
          availability: data.availability || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          role: "doctor",
          staffType: "doctor",
          active: data.active === "true",
          assignedPatients: 0,
        }, uid);
      } else {
        await writeAudit("Created", "Staff User", uid || data.email, { email: data.email, staffType });
      }

      toast(`${staffType === "doctor" ? "Doctor" : "Receptionist"} account created.`);
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      toast(error.message || "Could not create staff member.");
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("generateReport")?.addEventListener("click", async () => {
    try {
      await saveRecord("reports", {
        reportName: "Patient Diagnosis Report",
        subject: "Clinic",
        createdBy: state.profile.displayName,
        status: "Ready",
        createdAtText: "Just now",
      });
      toast("Report metadata created.");
      setTimeout(() => window.location.href = pageUrl("patient-report"), 700);
    } catch (error) {
      toast(error.message || "Could not generate report.");
    }
  });

  document.querySelectorAll("[data-disable-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Disable this user?")) return;
      try {
        const disableStaffUser = httpsCallable(functions, "disableStaffUser");
        await disableStaffUser({ uid: button.dataset.disableUser, clinicId: state.clinicId });
        toast("User disabled.");
        setTimeout(() => window.location.reload(), 900);
      } catch (error) {
        toast(error.message || "Could not disable user.");
      }
    });
  });

  initSessionTimeout();
}

async function init() {
  const config = pages[pageKey] || pages.dashboard;
  const cancelLoading = scheduleLoading();

  const profile = await requireSession(config);
  if (!profile && pageKey !== "access-denied") {
    cancelLoading();
    return;
  }

  if (pageKey === "access-denied" && !profile) {
    cancelLoading();
    root.innerHTML = renderAccessDenied(config);
    return;
  }

  const content = await config.render(config);
  cancelLoading();
  if (pageKey === "access-denied") {
    root.innerHTML = content;
  } else {
    renderShell(config, content);
  }
  bindPageBehavior();
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
let sessionTimer = 0;

function resetSessionTimer() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(async () => {
    if (state.user) {
      toast("Session expired due to inactivity. Signing out...");
      await signOut(auth);
      setTimeout(() => { window.location.href = "../auth/index.html"; }, 1200);
    }
  }, SESSION_TIMEOUT_MS);
}

function initSessionTimeout() {
  ["mousemove", "keydown", "scroll", "click", "touchstart"].forEach((event) => {
    document.addEventListener(event, resetSessionTimer, { passive: true });
  });
  resetSessionTimer();
}

init().catch((error) => {
  console.error(error);
  root.innerHTML = html`<div class="loading-screen"><div class="loading-card"><h1 class="page-title">CareTrack could not load</h1><p class="page-subtitle">${escapeText(error.message || "Unexpected application error.")}</p><br><a class="btn primary" href="../auth/index.html">Return to Login</a></div></div>`;
});
