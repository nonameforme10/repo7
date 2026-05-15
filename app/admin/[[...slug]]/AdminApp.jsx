"use client";

import { useEffect, useMemo, useState } from "react";
import {
  auth,
  defaultClinicId,
  get,
  functions,
  getDownloadURL,
  httpsCallable,
  onAuthStateChanged,
  push,
  ref,
  remove,
  rtdb,
  serverTimestamp,
  set,
  signOut,
  storage,
  storageRef,
  update,
  uploadBytes,
} from "../../lib/firebase-client";

const logoUrl = "/assets/img/logo.png";
const defaultDoctorManUrl = "/assets/img/man-doc.webp";
const defaultDoctorWomanUrl = "/assets/img/woman-doc.webp";
const defaultPatientUrl = "/assets/img/patient.webp";

const roleLabels = {
  administrator: "Administrator",
  clinician: "Clinician",
  receptionist: "Receptionist",
};

const staffTypeLabels = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  reception: "Reception",
};

const navItems = [
  { key: "dashboard", path: "/admin", label: "Dashboard", icon: "chart", roles: ["administrator", "clinician", "receptionist"], group: "Main" },
  { key: "doctors", path: "/admin/doctors", label: "Doctors", icon: "user", roles: ["administrator", "clinician", "receptionist"], group: "Main" },
  { key: "patients", path: "/admin/patients", label: "Patients", icon: "users", roles: ["administrator", "clinician", "receptionist"], group: "Main" },
  { key: "diagnoses", path: "/admin/diagnoses", label: "Diagnoses", icon: "activity", roles: ["administrator", "clinician", "receptionist"], group: "Main" },
  { key: "reports", path: "/admin/reports", label: "Reports", icon: "document", roles: ["administrator", "clinician", "receptionist"], group: "Main" },
  { key: "schedules", path: "/admin/schedules", label: "Schedules", icon: "calendar", roles: ["administrator", "clinician", "receptionist"], group: "Main" },
  { key: "users", path: "/admin/users", label: "User Management", icon: "shield", roles: ["administrator"], group: "System" },
  { key: "settings", path: "/admin/settings", label: "Settings", icon: "settings", roles: ["administrator"], group: "System" },
];

const pageInfo = {
  dashboard: { nav: "dashboard", title: "Dashboard", subtitle: "Clinic operations, records, and alerts at a glance.", roles: ["administrator", "clinician", "receptionist"] },
  doctors: { nav: "doctors", title: "Doctors", subtitle: "Manage doctor profiles, departments, and contact details.", roles: ["administrator", "clinician", "receptionist"] },
  "doctor-form": { nav: "doctors", title: "Doctor", subtitle: "Create or update clinician profile, specialty, contact, and availability.", roles: ["administrator"] },
  "doctor-detail": { nav: "doctors", title: "Doctor Profile", subtitle: "Review doctor details, assigned patients, schedule, and activity.", roles: ["administrator", "clinician", "receptionist"] },
  patients: { nav: "patients", title: "Patients", subtitle: "View, register, and manage patient records.", roles: ["administrator", "clinician", "receptionist"] },
  "patient-form": { nav: "patients", title: "Patient", subtitle: "Register or update patient information and care assignment.", roles: ["administrator", "clinician", "receptionist"] },
  "patient-profile": { nav: "patients", title: "Patient Profile", subtitle: "Full medical record overview and linked diagnosis history.", roles: ["administrator", "clinician", "receptionist"] },
  diagnoses: { nav: "diagnoses", title: "Diagnoses", subtitle: "Manage patient disease and diagnosis records.", roles: ["administrator", "clinician", "receptionist"] },
  "diagnosis-form": { nav: "diagnoses", title: "Diagnosis", subtitle: "Record clinical findings, disease diagnosis, and patient status.", roles: ["administrator", "clinician"] },
  reports: { nav: "reports", title: "Reports", subtitle: "Generate and review patient diagnosis reports.", roles: ["administrator", "clinician", "receptionist"] },
  schedules: { nav: "schedules", title: "Schedules", subtitle: "View doctor availability and working hours.", roles: ["administrator", "clinician", "receptionist"] },
  users: { nav: "users", title: "User Management", subtitle: "Manage clinic staff accounts and access.", roles: ["administrator"] },
  settings: { nav: "settings", title: "Settings", subtitle: "Configure clinic profile, departments, specialties, and defaults.", roles: ["administrator"] },
  "access-denied": { nav: null, title: "Access Denied", subtitle: "You do not have permission to view this page.", roles: [] },
};

const samples = {
  doctors: [
    { id: "dr-wilson", fullName: "Dr. James Wilson", specialty: "Cardiology", department: "Cardiology", email: "j.wilson@caretrack.test", phone: "+1 555 0120", room: "C-204", status: "Available", assignedPatients: 42, availability: "Mon, Wed, Fri" },
    { id: "dr-chen", fullName: "Dr. Sarah Chen", specialty: "Neurology", department: "Neurology", email: "s.chen@caretrack.test", phone: "+1 555 0124", room: "N-118", status: "Busy", assignedPatients: 29, availability: "Tue, Thu" },
  ],
  patients: [
    { id: "PT-2847", patientId: "PT-2847", firstName: "James", lastName: "Mitchell", age: 54, gender: "Male", phone: "+1 555 0101", email: "james@example.com", assignedDoctorName: "Dr. James Wilson", assignedDoctorId: "dr-wilson", department: "Cardiology", lastDiagnosis: "Hypertension Stage 2", status: "Monitoring", lastUpdated: "Today" },
    { id: "PT-2846", patientId: "PT-2846", firstName: "Sarah", lastName: "Reynolds", age: 37, gender: "Female", phone: "+1 555 0198", email: "sarah@example.com", assignedDoctorName: "Dr. Sarah Chen", assignedDoctorId: "dr-chen", department: "Neurology", lastDiagnosis: "Acute Migraine", status: "Critical", lastUpdated: "Today" },
  ],
  diagnoses: [
    { id: "dx-1", icdCode: "I10", description: "Hypertension Stage 2", patientId: "PT-2847", patientName: "James Mitchell", assignedDoctorName: "Dr. James Wilson", severity: "High", diagnosisDate: "2026-05-14", status: "Open" },
    { id: "dx-2", icdCode: "G43.909", description: "Acute Migraine", patientId: "PT-2846", patientName: "Sarah Reynolds", assignedDoctorName: "Dr. Sarah Chen", severity: "Critical", diagnosisDate: "2026-05-14", status: "Monitoring" },
  ],
  schedules: [
    { id: "sch-1", doctorName: "Dr. James Wilson", department: "Cardiology", day: "Monday", startTime: "08:00", endTime: "14:00", room: "C-204", status: "Available" },
    { id: "sch-2", doctorName: "Dr. Sarah Chen", department: "Neurology", day: "Tuesday", startTime: "10:00", endTime: "17:00", room: "N-118", status: "Busy" },
  ],
  users: [],
};

const icons = {
  activity: <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  bell: <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  calendar: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  chart: <svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-7" /></svg>,
  close: <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>,
  document: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
  menu: <svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" /></svg>,
  plus: <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>,
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.4-4.4" /></svg>,
  settings: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7.1 4.3l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  shield: <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-5" /></svg>,
  user: <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  users: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>,
};

function cleanSlug(value = "") {
  const slug = String(value || "").replace(/\.html$/, "");
  if (!slug || slug === "admin") return "dashboard";
  if (slug === "audit-logs" || slug === "audit") return "dashboard";
  return slug;
}

function routeStateFromLocation() {
  if (typeof window === "undefined") return { page: "dashboard", params: new URLSearchParams() };
  const parts = window.location.pathname.split("/").filter(Boolean);
  const raw = parts[1] || "dashboard";
  return {
    page: cleanSlug(raw),
    params: new URLSearchParams(window.location.search),
  };
}

function pageUrl(page, params = {}) {
  const paths = {
    dashboard: "/admin",
    doctors: "/admin/doctors",
    "doctor-form": "/admin/doctor-form",
    "doctor-detail": "/admin/doctor-detail",
    patients: "/admin/patients",
    "patient-form": "/admin/patient-form",
    "patient-profile": "/admin/patient-profile",
    diagnoses: "/admin/diagnoses",
    "diagnosis-form": "/admin/diagnosis-form",
    reports: "/admin/reports",
    schedules: "/admin/schedules",
    users: "/admin/users",
    settings: "/admin/settings",
    "access-denied": "/admin/access-denied",
  };
  const qs = new URLSearchParams(params).toString();
  return `${paths[page] || "/admin"}${qs ? `?${qs}` : ""}`;
}

function initials(name = "") {
  return String(name || "CareTrack User").trim().split(/\s+/).slice(0, 2).map((word) => word[0] || "").join("").toUpperCase() || "CT";
}

function normalizeRole(value) {
  const role = String(value || "").toLowerCase().trim();
  if (["administrator", "admin"].includes(role)) return "administrator";
  if (["clinician", "doctor", "nurse", "clinical"].includes(role)) return "clinician";
  if (["receptionist", "reception", "frontdesk", "front_desk"].includes(role)) return "receptionist";
  return "";
}

function staffTypeForRole(role, preferred = "") {
  const clean = String(preferred || "").toLowerCase().trim();
  if (["admin", "doctor", "nurse", "reception"].includes(clean)) return clean;
  if (role === "administrator") return "admin";
  if (role === "receptionist") return "reception";
  return "doctor";
}

function inferRegistration(path = "") {
  if (path.includes("/admin/")) return { role: "administrator", staffType: "admin" };
  if (path.includes("/doctor/") || path.includes("/doctors/")) return { role: "clinician", staffType: "doctor" };
  if (path.includes("/nurse/")) return { role: "clinician", staffType: "nurse" };
  if (path.includes("/reception/") || path.includes("/receptionist/")) return { role: "receptionist", staffType: "reception" };
  return { role: "", staffType: "" };
}

async function loadRegistration(user) {
  const paths = [
    `registration/admin/${user.uid}`,
    `registration/doctors/${user.uid}`,
    `registration/receptionist/${user.uid}`,
    `registration/clinicks/doctor/${user.uid}`,
    `registration/clinicks/nurse/${user.uid}`,
    `registration/clinicks/reception/${user.uid}`,
    `access/users/${user.uid}`,
  ];
  const lookups = await Promise.all(paths.map(async (path) => {
    try {
      const snapshot = await get(ref(rtdb, path));
      return snapshot.exists() ? { ...inferRegistration(path), ...snapshot.val(), registrationPath: path } : null;
    } catch (error) {
      console.warn("RTD registration lookup failed", error);
      return null;
    }
  }));
  return lookups.find(Boolean) || null;
}

async function buildProfile(user) {
  const registration = await loadRegistration(user);
  let token = await user.getIdTokenResult();
  let claims = token.claims || {};
  const registrationActive = registration?.active === true || registration?.status === "active";
  const registrationRole = normalizeRole(registration?.role || registration?.staffType);

  if (
    registrationActive
    && registrationRole
    && (
      normalizeRole(claims.role) !== registrationRole
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

  return {
    uid: user.uid,
    email: user.email || registration?.email || "",
    displayName: registration?.displayName || claims.name || user.displayName || user.email || "CareTrack Staff",
    role,
    staffType,
    active,
    clinicId: claims.clinicId || registration?.clinicId || defaultClinicId,
  };
}

function doctorName(doctor = {}) {
  return doctor.fullName || [doctor.firstName, doctor.lastName].filter(Boolean).join(" ") || doctor.name || "Unnamed Doctor";
}

function patientName(patient = {}) {
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ") || patient.fullName || patient.name || "Unnamed Patient";
}

function patientPublicIdFromKey(key = "") {
  const suffix = String(key || "").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `PT-${suffix || Date.now().toString().slice(-6)}`;
}

function createDraftPatientIdentity() {
  const key = push(ref(rtdb, primaryCollectionPath("patients"))).key || "";
  return {
    id: key,
    patientId: patientPublicIdFromKey(key),
  };
}

function normalizeGender(value = "") {
  const gender = String(value || "").toLowerCase().trim();
  if (["male", "man"].includes(gender)) return "Male";
  if (["female", "woman"].includes(gender)) return "Female";
  if (gender === "other") return "Other";
  return "";
}

function defaultProfileImage(type, gender = "") {
  if (type === "doctor") {
    return normalizeGender(gender) === "Female" ? defaultDoctorWomanUrl : defaultDoctorManUrl;
  }
  return defaultPatientUrl;
}

function isDefaultProfileImage(url = "") {
  return [defaultDoctorManUrl, defaultDoctorWomanUrl, defaultPatientUrl].includes(String(url || ""));
}

function profileImageFor(record = {}, type) {
  return record.photoUrl || record.imageUrl || record.avatarUrl || defaultProfileImage(type, record.gender);
}

function recordFromRtdValue(id, value = {}, path = "") {
  const data = value || {};
  const legacyId = data.id && data.id !== id ? data.id : data.legacyId;
  const inferred = inferRegistration(path);
  return { ...inferred, ...data, legacyId, id, docId: id, uid: data.uid || id, _path: path ? `${path}/${id}` : "" };
}

function recordId(record) {
  return String(record?.docId || record?.id || "");
}

function findAssignedDoctor(doctors = [], patient = {}) {
  const assignedId = String(patient.assignedDoctorId || "");
  const assignedName = String(patient.assignedDoctorName || "");
  return doctors.find((doctor) => recordId(doctor) === assignedId || doctorName(doctor) === assignedName) || null;
}

function canDiagnosePatient(patient = {}, profile = {}) {
  if (profile.role === "administrator") return true;
  if (profile.role !== "clinician") return false;
  return patient.assignedDoctorId === profile.uid || patient.assignedDoctorName === profile.displayName;
}

const scheduleWeekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const scheduleDayNames = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday",
};

function normalizeScheduleDay(value = "") {
  const key = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  return scheduleDayNames[key] || "";
}

function expandScheduleRange(start, end) {
  const startDay = normalizeScheduleDay(start);
  const endDay = normalizeScheduleDay(end);
  const startIndex = scheduleWeekdays.indexOf(startDay);
  const endIndex = scheduleWeekdays.indexOf(endDay);
  if (startIndex < 0 || endIndex < 0) return [];
  if (startIndex <= endIndex) return scheduleWeekdays.slice(startIndex, endIndex + 1);
  return [...scheduleWeekdays.slice(startIndex), ...scheduleWeekdays.slice(0, endIndex + 1)];
}

function splitScheduleDays(availability = "") {
  const raw = String(availability || "").trim();
  if (!raw) return ["Not set"];

  const days = raw.split(/[,\n;/&]+/).flatMap((part) => {
    const text = part.trim();
    if (!text) return [];
    const range = text.split(/\s*-\s*/);
    if (range.length === 2) {
      const expanded = expandScheduleRange(range[0], range[1]);
      if (expanded.length) return expanded;
    }
    return normalizeScheduleDay(text) || text;
  });

  return [...new Set(days)].filter(Boolean).length ? [...new Set(days)].filter(Boolean) : [raw];
}

function patientsForDoctor(patients = [], doctor = {}) {
  const doctorId = recordId(doctor);
  const name = doctorName(doctor);
  return patients.filter((patient) => patient.assignedDoctorId === doctorId || patient.assignedDoctorName === name);
}

function assignedPatientSummary(patients = []) {
  if (!patients.length) return "0";
  const names = patients.slice(0, 2).map(patientName).join(", ");
  return patients.length > 2 ? `${names} +${patients.length - 2}` : names;
}

const diseaseSuggestions = [
  "Tuberculosis",
  "Hantavirus pulmonary syndrome",
  "Influenza",
  "Pneumonia",
  "Bronchitis",
  "Otitis media",
  "Sinusitis",
  "Allergic rhinitis",
  "Tonsillitis",
  "Pharyngitis",
  "Hypertension",
  "Migraine",
];

const defaultClinicalChecks = [
  "Fever",
  "Pain",
  "Cough",
  "Shortness of breath",
  "Fatigue",
  "Weight loss",
];

const specialtyClinicalChecks = [
  {
    terms: ["ent", "lor", "otolaryng", "ear", "nose", "throat"],
    checks: ["Ear pain", "Hearing loss", "Tinnitus", "Nasal obstruction", "Nasal discharge", "Sinus tenderness", "Sore throat", "Tonsil swelling"],
  },
  {
    terms: ["pulmo", "respir", "chest", "lung"],
    checks: ["Persistent cough", "Hemoptysis", "Wheezing", "Chest pain", "Shortness of breath", "Night sweats", "Low oxygen saturation", "Abnormal breath sounds"],
  },
  {
    terms: ["cardio", "heart"],
    checks: ["Chest pain", "Palpitations", "High blood pressure", "Shortness of breath", "Leg swelling", "Irregular rhythm"],
  },
];

function clinicalChecksForDoctor(doctor = {}) {
  const specialty = `${doctor.specialty || ""} ${doctor.department || ""}`.toLowerCase();
  const matched = specialtyClinicalChecks.find((item) => item.terms.some((term) => specialty.includes(term)));
  return matched?.checks || defaultClinicalChecks;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildScheduleRows(schedules = [], doctors = [], patients = []) {
  const rows = [];
  const explicitDoctorIds = new Set();

  schedules.forEach((schedule) => {
    const doctor = doctors.find((item) => {
      const scheduleDoctorId = String(schedule.doctorId || schedule.assignedDoctorId || "");
      return recordId(item) === scheduleDoctorId || doctorName(item) === schedule.doctorName;
    }) || {};
    const assignedPatients = recordId(doctor) ? patientsForDoctor(patients, doctor) : [];
    const doctorId = recordId(doctor) || schedule.doctorId || "";
    const day = schedule.day || "Not set";

    if (doctorId) explicitDoctorIds.add(doctorId);
    rows.push({
      ...schedule,
      id: schedule.id || `${doctorId || schedule.doctorName || "schedule"}:${day}`,
      doctorName: schedule.doctorName || doctorName(doctor),
      department: schedule.department || doctor.department || "-",
      room: schedule.room || doctor.room || doctor.officeRoom || "-",
      status: schedule.status || doctor.status || "Available",
      startTime: schedule.startTime || doctor.startTime || "-",
      endTime: schedule.endTime || doctor.endTime || "-",
      day,
      assignedPatients: assignedPatientSummary(assignedPatients),
    });
  });

  doctors.forEach((doctor) => {
    const doctorId = recordId(doctor);
    if (explicitDoctorIds.has(doctorId)) return;

    const assignedPatients = patientsForDoctor(patients, doctor);
    rows.push({
      id: `${doctorId}:profile-schedule`,
      doctorName: doctorName(doctor),
      department: doctor.department || "-",
      day: doctor.availability || "Not set",
      startTime: doctor.startTime || "-",
      endTime: doctor.endTime || "-",
      room: doctor.room || doctor.officeRoom || "-",
      status: doctor.status || "Available",
      assignedPatients: assignedPatientSummary(assignedPatients),
    });
  });

  return rows;
}

function notificationPath(notification = {}) {
  return notification._path || `notifications/${recordId(notification)}`;
}

function notificationForProfile(notification = {}, profile = {}) {
  return notification.recipientUid === profile.uid && (!notification.clinicId || notification.clinicId === (profile.clinicId || defaultClinicId));
}

async function createAssignmentNotification({ clinicId, doctor, patientRecordId, patient, assignedBy }) {
  const doctorId = recordId(doctor) || patient.assignedDoctorId;
  if (!doctorId || !patientRecordId) return;

  const notificationId = `${patientRecordId}_${doctorId}_assignment`;
  await set(ref(rtdb, `notifications/${notificationId}`), {
    id: notificationId,
    type: "patient-assignment",
    title: "New consultation assigned",
    message: `${patientName(patient)} is assigned to you for diagnosis.`,
    recipientUid: doctorId,
    recipientName: doctorName(doctor),
    patientRecordId,
    patientId: patient.patientId || patientRecordId,
    patientName: patientName(patient),
    department: patient.department || doctor.department || "",
    read: false,
    clinicId,
    createdAt: serverTimestamp(),
    createdBy: assignedBy.uid,
    createdByName: assignedBy.displayName || assignedBy.email || assignedBy.uid,
  });
}

function collectionPaths(name) {
  if (name === "doctors") return ["registration/doctors", "registration/clinicks/doctor"];
  if (name === "users") return ["registration/admin", "registration/doctors", "registration/receptionist", "registration/nurses", "registration/clinicks/doctor", "registration/clinicks/reception", "registration/clinicks/nurse"];
  return [name];
}

function primaryCollectionPath(name) {
  return collectionPaths(name)[0];
}

function parentPath(path = "") {
  return String(path || "").split("/").slice(0, -1).join("/");
}

function fileExtension(file) {
  const fromName = String(file?.name || "").split(".").pop();
  if (fromName && fromName !== file?.name) return fromName.toLowerCase();
  return String(file?.type || "image/jpeg").split("/").pop() || "jpg";
}

async function uploadProfilePhoto({ clinicId, collectionName, recordId, file }) {
  if (!file || !recordId) return null;
  if (!file.type?.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("Profile image must be 3 MB or smaller.");
  }

  const path = `clinics/${clinicId}/${collectionName}/${recordId}/profile.${fileExtension(file)}`;
  const imageRef = storageRef(storage, path);
  await uploadBytes(imageRef, file, {
    contentType: file.type || "image/jpeg",
    customMetadata: { source: "caretrack-admin" },
  });
  return {
    photoUrl: await getDownloadURL(imageRef),
    photoPath: path,
  };
}

function ageFromDob(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  return Math.max(0, new Date(Date.now() - birth.getTime()).getUTCFullYear() - 1970);
}

function statusBadge(status = "Active") {
  const key = String(status).toLowerCase();
  const color = key.includes("critical") || key.includes("off") || key.includes("disabled")
    ? "rose"
    : key.includes("busy") || key.includes("monitor") || key.includes("medium")
      ? "amber"
      : key.includes("stable") || key.includes("available") || key.includes("ready") || key.includes("active")
        ? "green"
        : "cyan";
  return <span className={`badge ${color}`}>{status}</span>;
}

function roleBadge(role = "") {
  const normalized = normalizeRole(role);
  const color = normalized === "administrator" ? "cyan" : normalized === "receptionist" ? "purple" : "teal";
  return <span className={`badge ${color}`}>{roleLabels[normalized] || "Staff"}</span>;
}

function PageHeader({ config, children }) {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">CareTrack</p>
          <h1 className="page-title">{config.title}</h1>
          <p className="page-subtitle">{config.subtitle}</p>
        </div>
        <div className="head-actions">{children}</div>
      </div>
      <div className="pulse-line" />
    </>
  );
}

function Field({ label, name, type = "text", defaultValue = "", value, required = false, ...props }) {
  const valueProps = value === undefined ? { defaultValue: defaultValue || "" } : { value: value || "" };
  return (
    <div className="field">
      <label>{label}</label>
      <input name={name} type={type} required={required} {...valueProps} {...props} />
    </div>
  );
}

function TextArea({ label, name, defaultValue = "" }) {
  return (
    <div className="field full">
      <label>{label}</label>
      <textarea name={name} defaultValue={defaultValue || ""} />
    </div>
  );
}

function SelectField({ label, name, options, defaultValue = "" }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select name={name} defaultValue={defaultValue || ""}>
        <option value="">Select</option>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
    </div>
  );
}

function PhotoField({ label = "Profile Photo", name = "photoFile", currentUrl, fallbackUrl }) {
  const previewUrl = currentUrl || fallbackUrl;
  return (
    <div className="field full photo-field">
      <label>{label}</label>
      <div className="photo-control">
        <span className="avatar photo-preview">
          <img src={previewUrl} alt="" />
        </span>
        <div>
          <input name={name} type="file" accept="image/*" />
          <small>Upload JPG, PNG, or WebP. If empty, CareTrack uses the default profile image.</small>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
    </section>
  );
}

function useAdminSession() {
  const [session, setSession] = useState({ loading: true, user: null, profile: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSession({ loading: false, user: null, profile: null });
        return;
      }

      try {
        const profile = await buildProfile(user);
        setSession({ loading: false, user, profile });
      } catch (error) {
        console.error(error);
        setSession({ loading: false, user, profile: null, error });
      }
    });
    return unsubscribe;
  }, []);

  return session;
}

function useProfileNotifications(profile = {}) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!profile.uid) return undefined;

    let alive = true;
    const clinicId = profile.clinicId || defaultClinicId;

    async function load() {
      const [records, patients] = await Promise.all([
        readCollection(clinicId, "notifications"),
        readCollection(clinicId, "patients"),
      ]);
      if (!alive) return;
      const visibleNotifications = records.filter((item) => notificationForProfile(item, profile));
      const notifiedPatients = new Set(visibleNotifications.map((item) => item.patientRecordId).filter(Boolean));
      const assignedPatientNotifications = profile.role === "clinician"
        ? patients
          .filter((patient) => canDiagnosePatient(patient, profile))
          .filter((patient) => !notifiedPatients.has(recordId(patient)))
          .map((patient) => ({
            id: `${recordId(patient)}_${profile.uid}_assignment`,
            type: "patient-assignment",
            title: "Patient assigned",
            message: `${patientName(patient)} is assigned to you for diagnosis.`,
            recipientUid: profile.uid,
            recipientName: profile.displayName || profile.email || profile.uid,
            patientRecordId: recordId(patient),
            patientId: patient.patientId || recordId(patient),
            patientName: patientName(patient),
            department: patient.department || "",
            read: false,
            clinicId,
            createdAt: patient.updatedAt || patient.createdAt || 0,
            _derived: true,
          }))
        : [];
      setNotifications(
        [...visibleNotifications, ...assignedPatientNotifications]
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
          .slice(0, 8)
      );
    }

    load();
    const timer = window.setInterval(load, 20000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [profile.clinicId, profile.uid]);

  return [notifications, setNotifications];
}

function NotificationBell({ profile, navigate, notify }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useProfileNotifications(profile);
  const unread = notifications.filter((item) => item.read !== true).length;

  async function markRead(item) {
    if (!recordId(item)) return;
    setNotifications((current) => current.map((notification) => (
      recordId(notification) === recordId(item) ? { ...notification, read: true } : notification
    )));
    try {
      if (item._derived) {
        const { _derived, ...record } = item;
        await set(ref(rtdb, notificationPath(record)), { ...record, read: true, readAt: serverTimestamp() });
        return;
      }
      await update(ref(rtdb, notificationPath(item)), { read: true, readAt: serverTimestamp() });
    } catch (error) {
      console.warn("Could not mark notification read", error);
    }
  }

  async function openPatient(item, destination = "patient-profile") {
    await markRead(item);
    setOpen(false);
    if (item.patientRecordId) {
      navigate(destination, { id: item.patientRecordId, patientId: item.patientRecordId });
      return;
    }
    notify("This notification is missing a patient link.");
  }

  return (
    <div className="notification-wrap">
      <button className="icon-button" type="button" title="Notifications" aria-label="Notifications" onClick={() => setOpen((value) => !value)}>
        {icons.bell}
        {unread ? <span className="notification-count">{unread}</span> : null}
      </button>
      {open ? (
        <div className="notification-panel">
          <div className="notification-head">
            <strong>Notifications</strong>
            <span>{unread} unread</span>
          </div>
          {notifications.length ? notifications.map((item) => (
            <div className={`notification-item ${item.read === true ? "" : "unread"}`} key={recordId(item)}>
              <button type="button" onClick={() => openPatient(item)} className="notification-main">
                <strong>{item.title || "Patient assignment"}</strong>
                <span>{item.message || `${item.patientName || "Patient"} is assigned to you.`}</span>
                <small>{item.patientId || item.department || ""}</small>
              </button>
              <button className="btn small primary" type="button" onClick={() => openPatient(item, "diagnosis-form")}>Diagnose</button>
            </div>
          )) : <div className="notification-empty">No patient assignments.</div>}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminApp() {
  const session = useAdminSession();
  const [route, setRoute] = useState(routeStateFromLocation);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onPop = () => setRoute(routeStateFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!session.loading && !session.user && route.page !== "access-denied") {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/auth/index.html?next=${encodeURIComponent(next)}`;
    }
  }, [route.page, session.loading, session.user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(page, params = {}) {
    const url = pageUrl(page, params);
    window.history.pushState(null, "", url);
    setRoute(routeStateFromLocation());
    setSidebarOpen(false);
  }

  if (session.loading) {
    return <div className="admin-boot"><div className="spinner" /><span>Opening CareTrack...</span></div>;
  }

  if (!session.user && route.page === "access-denied") {
    return (
      <main className="content" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <AccessDenied navigate={() => { window.location.href = "/auth"; }} />
      </main>
    );
  }

  if (!session.user) return <div className="admin-boot"><span>Redirecting...</span></div>;

  const profile = session.profile || {};
  const page = pageInfo[route.page] ? route.page : "dashboard";
  const config = pageInfo[page];
  const denied = config.roles?.length && (!profile.active || !config.roles.includes(profile.role));
  const allowedNav = navItems.filter((item) => item.roles.includes(profile.role));
  const groups = [...new Set(allowedNav.map((item) => item.group))];
  const currentNav = denied ? null : config.nav || page;

  return (
    <div className="app-shell react-admin">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} id="sidebar">
        <a className="ct-logo ct-logo-full" href="/admin" onClick={(event) => { event.preventDefault(); navigate("dashboard"); }} aria-label="CareTrack Dashboard">
          <img className="ct-logo-image" src={logoUrl} width="172" height="58" alt="CareTrack" />
        </a>
        {groups.map((group) => (
          <nav className="nav-group" aria-label={group} key={group}>
            <div className="nav-label">{group}</div>
            {allowedNav.filter((item) => item.group === group).map((item) => (
              <a
                className={`nav-link ${item.key === currentNav ? "active" : ""}`}
                href={item.path}
                key={item.key}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.key);
                }}
              >
                {icons[item.icon]}
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        ))}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar">{initials(profile.displayName || profile.email)}</span>
            <div style={{ minWidth: 0 }}>
              <strong>{profile.displayName || profile.email}</strong>
              <span>{roleLabels[profile.role] || "Staff"}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" aria-label="Open menu" onClick={() => setSidebarOpen((value) => !value)}>{icons.menu}</button>
          <div className="global-search">
            {icons.search}
            <input type="search" placeholder="Search patients, doctors, records..." />
          </div>
          <div className="topbar-actions">
            <NotificationBell profile={profile} navigate={navigate} notify={setToast} />
            <div className="topbar-user">
              <span className="avatar">{initials(profile.displayName || profile.email)}</span>
              <div style={{ minWidth: 0 }}>
                <strong>{profile.displayName || profile.email}</strong>
                <span>{roleLabels[profile.role] || "Staff"}</span>
              </div>
            </div>
            <button className="icon-button" type="button" title="Sign out" onClick={async () => { await signOut(auth); window.location.href = "/auth"; }}>{icons.close}</button>
          </div>
        </header>
        <section className="content">
          {denied ? <AccessDenied navigate={navigate} /> : <AdminPage page={page} config={config} params={route.params} profile={profile} navigate={navigate} notify={setToast} />}
        </section>
      </main>
      <div className="toast-host">{toast ? <div className="toast">{toast}</div> : null}</div>
    </div>
  );
}

function AdminPage({ page, config, params, profile, navigate, notify }) {
  const [data, setData] = useState({ loading: true, doctors: [], patients: [], diagnoses: [], schedules: [], users: [] });
  const [deletingKey, setDeletingKey] = useState("");
  const clinicId = profile.clinicId || defaultClinicId;

  useEffect(() => {
    let alive = true;
    async function load() {
      setData((current) => ({ ...current, loading: true }));
      const names = ["doctors", "patients", "diagnoses", "schedules"];
      const [entries, users] = await Promise.all([
        Promise.all(names.map(async (name) => [name, await readCollection(clinicId, name)])),
        profile.role === "administrator" ? readStaffUsers(clinicId) : Promise.resolve([]),
      ]);
      if (!alive) return;
      const next = Object.fromEntries(entries);
      setData({
        loading: false,
        doctors: next.doctors,
        patients: next.patients,
        diagnoses: next.diagnoses,
        schedules: next.schedules,
        users,
      });
    }
    load();
    return () => { alive = false; };
  }, [clinicId, page, profile.role]);

  async function saveRecord(name, payload, id = "", existingRecord = null) {
    const basePath = parentPath(existingRecord?._path) || primaryCollectionPath(name);
    const targetRef = id ? ref(rtdb, `${basePath}/${id}`) : push(ref(rtdb, basePath));
    const targetId = id || targetRef.key;
    const body = {
      ...payload,
      id: targetId,
      clinicId,
      updatedAt: serverTimestamp(),
      updatedBy: profile.uid,
    };

    if (name === "doctors") {
      body.uid = payload.uid || targetId;
      body.displayName = payload.displayName || payload.fullName || existingRecord?.displayName || payload.email || targetId;
      body.role = payload.role || "clinician";
      body.staffType = "doctor";
      body.active = payload.active ?? true;
    }

    if (name === "patients") {
      body.uid = payload.uid || targetId;
      body.registeredBy = payload.registeredBy || existingRecord?.registeredBy || profile.uid;
      body.registeredByName = payload.registeredByName || existingRecord?.registeredByName || profile.displayName || profile.email || profile.uid;
    }

    if (existingRecord?._path) {
      await update(targetRef, body);
      notify("Record updated.");
      return targetId;
    }

    await set(targetRef, {
      ...body,
      createdAt: serverTimestamp(),
      createdBy: profile.uid,
    });
    notify("Record created.");
    return targetId;
  }

  async function removeRecord(name, recordOrId) {
    const id = typeof recordOrId === "object" ? recordId(recordOrId) : String(recordOrId || "");
    if (!id || !window.confirm("Delete this record?")) return;
    const key = `${name}:${id}`;
    setDeletingKey(key);
    try {
      const path = typeof recordOrId === "object" && recordOrId?._path
        ? recordOrId._path
        : `${primaryCollectionPath(name)}/${id}`;
      await remove(ref(rtdb, path));
      setData((current) => ({ ...current, [name]: current[name].filter((item) => recordId(item) !== id) }));
      notify("Record deleted.");
    } catch (error) {
      console.error("CareTrack delete failed", error);
      const reason = error?.code === "permission-denied"
        ? "Firebase denied this delete. Sign out and sign in again so admin access claims refresh, then try once more."
        : error?.message || "Could not delete record.";
      notify(reason);
    } finally {
      setDeletingKey("");
    }
  }

  const common = { data, params, navigate, saveRecord, removeRecord, notify, profile, deletingKey };
  if (page === "doctors") return <DoctorsPage config={config} {...common} />;
  if (page === "doctor-form") return <DoctorFormPage config={config} {...common} />;
  if (page === "doctor-detail") return <DoctorDetailPage config={config} {...common} />;
  if (page === "patients") return <PatientsPage config={config} {...common} />;
  if (page === "patient-form") return <PatientFormPage config={config} {...common} />;
  if (page === "patient-profile") return <PatientProfilePage config={config} {...common} />;
  if (page === "diagnoses") return <DiagnosesPage config={config} {...common} />;
  if (page === "diagnosis-form") return <DiagnosisFormPage config={config} {...common} />;
  if (page === "reports") return <SimpleRecordsPage config={config} collection="diagnoses" title="Diagnosis Reports" rows={data.diagnoses} columns={["patientName", "description", "severity", "diagnosisDate"]} />;
  if (page === "schedules") return <SchedulesPage config={config} data={data} />;
  if (page === "users") return <StaffUsersPage config={config} users={data.users} profile={profile} notify={notify} />;
  if (page === "settings") return <SettingsPage config={config} notify={notify} />;
  return <DashboardPage config={config} {...common} />;
}

async function readCollection(clinicId, name) {
  try {
    const records = [];
    const seen = new Set();

    for (const path of collectionPaths(name)) {
      const snapshot = await get(ref(rtdb, path));
      if (!snapshot.exists()) continue;

      Object.entries(snapshot.val() || {}).forEach(([id, value]) => {
        if (seen.has(id)) return;
        const record = recordFromRtdValue(id, value, path);
        if (!record.clinicId || record.clinicId === clinicId) {
          seen.add(id);
          records.push(record);
        }
      });
    }

    return records;
  } catch (error) {
    console.warn(`Using sample ${name} data`, error);
    return samples[name] || [];
  }
}

async function readStaffUsers(clinicId) {
  try {
    const listStaffUsers = httpsCallable(functions, "listStaffUsers");
    const response = await listStaffUsers({ clinicId });
    const users = Array.isArray(response.data?.users) ? response.data.users : [];
    return users
      .filter((user) => !user.clinicId || user.clinicId === clinicId)
      .map((user) => ({ ...user, id: user.uid || user.id }));
  } catch (error) {
    console.warn("Could not read staff users through Functions API", error);
    return readCollection(clinicId, "users");
  }
}

async function readOne(clinicId, name, id, fallback) {
  if (!id) return fallback || {};
  try {
    for (const path of collectionPaths(name)) {
      const snapshot = await get(ref(rtdb, `${path}/${id}`));
      if (!snapshot.exists()) continue;
      const record = recordFromRtdValue(id, snapshot.val(), path);
      return !record.clinicId || record.clinicId === clinicId ? record : fallback || {};
    }
    return fallback || {};
  } catch (error) {
    console.warn(`Using sample ${name} document`, error);
    return fallback || {};
  }
}

function DashboardPage({ config, data, navigate }) {
  return (
    <>
      <PageHeader config={config} />
      <div className="grid stats">
        <StatCard label="Doctors" value={data.doctors.length} note="Clinical profiles" color="cyan" />
        <StatCard label="Patients" value={data.patients.length} note="Protected records" color="teal" />
        <StatCard label="Diagnoses" value={data.diagnoses.length} note="Clinical records" color="blue" />
        <StatCard label="Critical" value={data.patients.filter((item) => String(item.status).toLowerCase().includes("critical")).length} note="Needs review" color="rose" />
      </div>
      <div className="grid two">
        <button className="panel pad panel-link" type="button" onClick={() => navigate("doctors")}><h2 className="panel-title">Doctor Management</h2><p className="page-subtitle">Profiles, departments, contact details, and room assignments.</p></button>
        <button className="panel pad panel-link" type="button" onClick={() => navigate("patients")}><h2 className="panel-title">Patient Records</h2><p className="page-subtitle">Registration, assignments, emergency contacts, and status tracking.</p></button>
      </div>
    </>
  );
}

function StatCard({ label, value, note, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-top"><span className="stat-label">{label}</span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function DoctorsPage({ config, data, navigate, removeRecord, profile, deletingKey }) {
  const [search, setSearch] = useState("");
  const doctors = useMemo(() => data.doctors.filter((doctor) => `${doctorName(doctor)} ${doctor.specialty || ""} ${doctor.department || ""}`.toLowerCase().includes(search.toLowerCase())), [data.doctors, search]);
  const canEdit = profile.role === "administrator";

  return (
    <>
      <PageHeader config={config}>{canEdit ? <button className="btn primary" type="button" onClick={() => navigate("doctor-form")}>{icons.plus} Add Doctor</button> : null}</PageHeader>
      <div className="toolbar">
        <div className="search-field"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctors by name, specialty, or department" /></div>
      </div>
      <div className="panel">
        <ResponsiveTable
          columns={["Doctor Name", "Specialty", "Department", "Contact", "Assigned Patients", "Status", "Actions"]}
          rows={doctors}
          empty="No doctors found."
          renderRow={(doctor) => {
            const doctorId = recordId(doctor);
            return [
              <Entity key="name" name={doctorName(doctor)} note={doctor.room || doctor.officeRoom || "Room pending"} photoUrl={profileImageFor(doctor, "doctor")} />,
              doctor.specialty || "-",
              doctor.department || "-",
              <span key="contact">{doctor.phone || "-"}<br /><span style={{ color: "var(--faint)" }}>{doctor.email || ""}</span></span>,
              doctor.assignedPatients ?? 0,
              statusBadge(doctor.status || "Available"),
              <div className="row-actions" key="actions">
                <button className="btn small" type="button" onClick={() => navigate("doctor-detail", { id: doctorId })}>View</button>
                {canEdit ? <button className="btn small" type="button" onClick={() => navigate("doctor-form", { id: doctorId })}>Edit</button> : null}
                {canEdit ? <button className="btn small danger" type="button" disabled={deletingKey === `doctors:${doctorId}`} onClick={() => removeRecord("doctors", doctor)}>{deletingKey === `doctors:${doctorId}` ? "Deleting..." : "Delete"}</button> : null}
              </div>,
            ];
          }}
        />
      </div>
    </>
  );
}

function DoctorFormPage({ config, data, params, profile, navigate, saveRecord, notify }) {
  const id = params.get("id") || "";
  const clinicId = profile.clinicId || defaultClinicId;
  const [doctor, setDoctor] = useState(data.doctors.find((item) => recordId(item) === id) || {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    readOne(clinicId, "doctors", id, data.doctors.find((item) => recordId(item) === id) || {}).then((record) => {
      if (alive) setDoctor(record);
    });
    return () => { alive = false; };
  }, [clinicId, data.doctors, id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const photoFile = form.get("photoFile");
      const payload = Object.fromEntries(form.entries());
      const temporaryPassword = String(payload.temporaryPassword || "").trim();
      let targetId = id || payload.id || "";
      delete payload.id;
      delete payload.photoFile;
      delete payload.temporaryPassword;
      payload.gender = normalizeGender(payload.gender);

      if (!id) {
        if (!payload.email) {
          throw new Error("Doctor email is required to create the Firebase Auth account.");
        }
        if (temporaryPassword.length < 8) {
          throw new Error("Temporary password must be at least 8 characters.");
        }
        const createStaffUser = httpsCallable(functions, "createStaffUser");
        const response = await createStaffUser({
          displayName: payload.fullName || payload.email,
          email: payload.email,
          temporaryPassword,
          staffType: "doctor",
          department: payload.department || payload.specialty || "General",
          active: true,
          clinicId,
        });
        targetId = response.data?.uid || "";
        if (!targetId) {
          throw new Error("Firebase Auth did not return a staff user id.");
        }
        payload.uid = targetId;
      }

      if (photoFile instanceof File && photoFile.size > 0) {
        Object.assign(payload, await uploadProfilePhoto({ clinicId, collectionName: "doctors", recordId: targetId, file: photoFile }));
      } else if (!doctor.photoUrl || isDefaultProfileImage(doctor.photoUrl)) {
        payload.photoUrl = defaultProfileImage("doctor", payload.gender);
      } else {
        payload.photoUrl = doctor.photoUrl;
        if (doctor.photoPath) payload.photoPath = doctor.photoPath;
      }

      await saveRecord("doctors", payload, targetId, doctor);
      notify(id ? "Doctor profile saved." : "Doctor Auth account and profile created.");
      navigate("doctors");
    } catch (error) {
      console.error("Doctor save failed", error);
      alert(error.message || "Could not save doctor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader config={{ ...config, title: id ? "Edit Doctor" : "Add Doctor" }}><button className="btn" type="button" onClick={() => navigate("doctors")}>Cancel</button></PageHeader>
      <div className="panel pad">
        <form onSubmit={handleSubmit} key={doctor.id || id || "new-doctor"}>
          <input type="hidden" name="id" value={id} readOnly />
          <FormSection title="Personal Information">
            <PhotoField currentUrl={doctor.photoUrl} fallbackUrl={defaultProfileImage("doctor", doctor.gender)} />
            <Field label="Full Name" name="fullName" defaultValue={doctor.fullName} required />
            <SelectField label="Gender" name="gender" options={["Male", "Female", "Other"]} defaultValue={normalizeGender(doctor.gender)} />
            <Field label="Email" name="email" type="email" defaultValue={doctor.email} required={!id} />
            <Field label="Phone Number" name="phone" defaultValue={doctor.phone} />
            <Field label="Office Room" name="room" defaultValue={doctor.room || doctor.officeRoom} />
          </FormSection>
          {!id ? (
            <FormSection title="Account Access">
              <Field label="Temporary Password" name="temporaryPassword" type="password" required minLength={8} />
            </FormSection>
          ) : null}
          <FormSection title="Professional Details">
            <Field label="Specialty" name="specialty" defaultValue={doctor.specialty} />
            <Field label="Department" name="department" defaultValue={doctor.department} />
            <SelectField label="Status" name="status" options={["Available", "Busy", "Off Duty"]} defaultValue={doctor.status || "Available"} />
          </FormSection>
          <FormSection title="Availability">
            <Field label="Available Days" name="availability" defaultValue={doctor.availability || "Mon, Wed, Fri"} />
            <Field label="Start Time" name="startTime" type="time" defaultValue={doctor.startTime || "08:00"} />
            <Field label="End Time" name="endTime" type="time" defaultValue={doctor.endTime || "16:00"} />
          </FormSection>
          <div className="form-actions">
            <button className="btn" type="button" onClick={() => navigate("doctors")}>Cancel</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save Doctor"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

function DoctorDetailPage({ config, data, params, navigate, profile }) {
  const id = params.get("id") || data.doctors[0]?.id;
  const doctor = data.doctors.find((item) => recordId(item) === id) || data.doctors[0] || {};
  const doctorId = recordId(doctor);
  const patients = data.patients.filter((patient) => patient.assignedDoctorId === doctorId || patient.assignedDoctorName === doctorName(doctor));

  return (
    <>
      <PageHeader config={config}>{profile.role === "administrator" ? <button className="btn primary" type="button" onClick={() => navigate("doctor-form", { id: doctorId })}>Edit Doctor</button> : null}</PageHeader>
      <div className="panel">
        <div className="profile-header">
          <div className="profile-main"><span className="avatar large with-photo"><img src={profileImageFor(doctor, "doctor")} alt="" /></span><div><h2>{doctorName(doctor)}</h2><p>{doctor.specialty || "-"} | {doctor.department || "-"}</p></div></div>
          {statusBadge(doctor.status || "Available")}
        </div>
      </div>
      <div className="grid stats">
        <StatCard label="Assigned Patients" value={patients.length} note="Current panel" color="cyan" />
        <StatCard label="Availability" value={doctor.availability || "Unset"} note={doctor.room || "Clinic room"} color="amber" />
      </div>
    </>
  );
}

function PatientsPage({ config, data, navigate, removeRecord, profile, deletingKey }) {
  const [search, setSearch] = useState("");
  const canEdit = ["administrator", "clinician", "receptionist"].includes(profile.role);
  const patients = useMemo(() => data.patients.filter((patient) => `${patient.patientId || patient.id} ${patientName(patient)} ${patient.phone || ""} ${patient.assignedDoctorName || ""}`.toLowerCase().includes(search.toLowerCase())), [data.patients, search]);

  return (
    <>
      <PageHeader config={config}>{canEdit ? <button className="btn primary" type="button" onClick={() => navigate("patient-form")}>{icons.plus} Register Patient</button> : null}</PageHeader>
      <div className="toolbar">
        <div className="search-field"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients by name, ID, phone, or assigned doctor" /></div>
      </div>
      <div className="panel">
        <ResponsiveTable
          columns={["Patient ID", "Name", "Age", "Gender", "Assigned Doctor", "Last Diagnosis", "Status", "Actions"]}
          rows={patients}
          empty="No patients found."
          renderRow={(patient) => {
            const patientDocId = recordId(patient);
            const canDelete = profile.role === "administrator";
            return [
              patient.patientId || patientDocId,
              <Entity key="name" name={patientName(patient)} note={patient.phone || ""} photoUrl={profileImageFor(patient, "patient")} />,
              patient.age || ageFromDob(patient.dateOfBirth) || "-",
              patient.gender || "-",
              patient.assignedDoctorName || "-",
              patient.lastDiagnosis || "-",
              statusBadge(patient.status || "Stable"),
              <div className="row-actions" key="actions">
                <button className="btn small" type="button" onClick={() => navigate("patient-profile", { id: patientDocId })}>View</button>
                {canDiagnosePatient(patient, profile) ? <button className="btn small primary" type="button" onClick={() => navigate("diagnosis-form", { patientId: patientDocId })}>Diagnose</button> : null}
                {canEdit ? <button className="btn small" type="button" onClick={() => navigate("patient-form", { id: patientDocId })}>Edit</button> : null}
                {canDelete ? <button className="btn small danger" type="button" disabled={deletingKey === `patients:${patientDocId}`} onClick={() => removeRecord("patients", patient)}>{deletingKey === `patients:${patientDocId}` ? "Deleting..." : "Delete"}</button> : null}
              </div>,
            ];
          }}
        />
      </div>
    </>
  );
}

function PatientFormPage({ config, data, params, profile, navigate, saveRecord }) {
  const id = params.get("id") || "";
  const clinicId = profile.clinicId || defaultClinicId;
  const [draftPatient] = useState(createDraftPatientIdentity);
  const [patient, setPatient] = useState(data.patients.find((item) => recordId(item) === id) || {});
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => recordId(findAssignedDoctor(data.doctors, data.patients.find((item) => recordId(item) === id) || {})) || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    readOne(clinicId, "patients", id, data.patients.find((item) => recordId(item) === id) || {}).then((record) => {
      if (!alive) return;
      setPatient(record);
      setSelectedDoctorId(recordId(findAssignedDoctor(data.doctors, record)) || record.assignedDoctorId || "");
    });
    return () => { alive = false; };
  }, [clinicId, data.patients, id]);

  useEffect(() => {
    const assignedDoctor = findAssignedDoctor(data.doctors, patient);
    if (assignedDoctor) {
      setSelectedDoctorId(recordId(assignedDoctor));
    }
  }, [data.doctors, patient.assignedDoctorId, patient.assignedDoctorName]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const photoFile = form.get("photoFile");
      const payload = Object.fromEntries(form.entries());
      const targetId = id || payload.id || draftPatient.id || push(ref(rtdb, primaryCollectionPath("patients"))).key;
      const doctor = data.doctors.find((item) => recordId(item) === selectedDoctorId);
      const previousDoctorId = patient.assignedDoctorId || "";
      delete payload.id;
      delete payload.photoFile;
      payload.gender = normalizeGender(payload.gender);
      payload.assignedDoctorId = selectedDoctorId;
      payload.assignedDoctorName = doctor ? doctorName(doctor) : patient.assignedDoctorName || "";
      payload.department = selectedDoctorId ? doctor?.department || "" : patient.department || "";
      payload.patientId = patient.patientId || (id ? targetId : draftPatient.patientId) || patientPublicIdFromKey(targetId);

      if (photoFile instanceof File && photoFile.size > 0) {
        Object.assign(payload, await uploadProfilePhoto({ clinicId, collectionName: "patients", recordId: targetId, file: photoFile }));
      } else if (!patient.photoUrl || isDefaultProfileImage(patient.photoUrl)) {
        payload.photoUrl = defaultProfileImage("patient", payload.gender);
      } else {
        payload.photoUrl = patient.photoUrl;
        if (patient.photoPath) payload.photoPath = patient.photoPath;
      }

      await saveRecord("patients", payload, targetId, patient);
      if (selectedDoctorId && selectedDoctorId !== previousDoctorId) {
        await createAssignmentNotification({
          clinicId,
          doctor,
          patientRecordId: targetId,
          patient: { ...patient, ...payload, id: targetId },
          assignedBy: profile,
        });
      }
      navigate("patients");
    } catch (error) {
      console.error("Patient save failed", error);
      alert(error.message || "Could not save patient.");
    } finally {
      setBusy(false);
    }
  }

  const selectedDoctor = data.doctors.find((item) => recordId(item) === selectedDoctorId) || {};
  const publicPatientId = id ? patient.patientId || recordId(patient) || draftPatient.patientId : patient.patientId || draftPatient.patientId;
  const autoDepartment = selectedDoctorId ? selectedDoctor.department || "" : patient.department || "";

  return (
    <>
      <PageHeader config={{ ...config, title: id ? "Edit Patient" : "Register Patient" }}><button className="btn" type="button" onClick={() => navigate("patients")}>Cancel</button></PageHeader>
      <div className="panel pad">
        <form onSubmit={handleSubmit} key={patient.id || id || "new-patient"}>
          <input type="hidden" name="id" value={id} readOnly />
          <FormSection title="Personal Information">
            <PhotoField currentUrl={patient.photoUrl} fallbackUrl={defaultProfileImage("patient", patient.gender)} />
            <Field label="First Name" name="firstName" defaultValue={patient.firstName} required />
            <Field label="Last Name" name="lastName" defaultValue={patient.lastName} required />
            <Field label="Patient ID" name="patientId" value={publicPatientId} readOnly />
            <Field label="Date of Birth" name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth} />
            <SelectField label="Gender" name="gender" options={["Male", "Female", "Other"]} defaultValue={normalizeGender(patient.gender)} />
          </FormSection>
          <FormSection title="Contact Information">
            <Field label="Phone Number" name="phone" defaultValue={patient.phone} />
            <Field label="Email" name="email" type="email" defaultValue={patient.email} />
            <TextArea label="Address" name="address" defaultValue={patient.address} />
          </FormSection>
          <FormSection title="Doctor Assignment">
            <div className="field">
              <label>Assigned Doctor</label>
              <select name="assignedDoctorId" value={selectedDoctorId} onChange={(event) => setSelectedDoctorId(event.target.value)}>
                <option value="">Select doctor</option>
                {data.doctors.map((doctor) => {
                  const doctorDocId = recordId(doctor);
                  return <option value={doctorDocId} key={doctorDocId}>{doctorName(doctor)}</option>;
                })}
              </select>
            </div>
            <Field label="Department" name="department" value={autoDepartment} readOnly />
            <SelectField label="Status" name="status" options={["Stable", "Monitoring", "Critical"]} defaultValue={patient.status || "Stable"} />
          </FormSection>
          <div className="notice">Patient data is stored securely and visible only to authorized clinic staff.</div>
          <div className="form-actions">
            <button className="btn" type="button" onClick={() => navigate("patients")}>Cancel</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving..." : id ? "Save Patient" : "Register Patient"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

function PatientProfilePage({ config, data, params, navigate, profile }) {
  const id = params.get("id") || data.patients[0]?.id;
  const patient = data.patients.find((item) => recordId(item) === id) || data.patients[0] || {};
  const patientDocId = recordId(patient);
  const doctor = data.doctors.find((item) => recordId(item) === patient.assignedDoctorId || doctorName(item) === patient.assignedDoctorName) || {};

  return (
    <>
      <PageHeader config={config}>
        {canDiagnosePatient(patient, profile) ? <button className="btn primary" type="button" onClick={() => navigate("diagnosis-form", { patientId: patientDocId })}>Add Diagnosis</button> : null}
        {["administrator", "clinician", "receptionist"].includes(profile.role) ? <button className="btn" type="button" onClick={() => navigate("patient-form", { id: patientDocId })}>Edit Patient</button> : null}
      </PageHeader>
      <div className="panel">
        <div className="profile-header">
          <div className="profile-main"><span className="avatar large with-photo"><img src={profileImageFor(patient, "patient")} alt="" /></span><div><h2>{patientName(patient)}</h2><p>{patient.patientId || patientDocId} | {patient.age || ageFromDob(patient.dateOfBirth) || "-"} years | {patient.gender || "-"}</p></div></div>
          {statusBadge(patient.status || "Stable")}
        </div>
      </div>
      <div className="grid two">
        <div className="panel pad"><h2 className="panel-title">Patient Information</h2><div className="info-list"><InfoRow label="Phone" value={patient.phone} /><InfoRow label="Email" value={patient.email} /><InfoRow label="Address" value={patient.address || "Not provided"} /></div></div>
        <div className="panel pad"><h2 className="panel-title">Assigned Doctor</h2><Entity name={doctorName(doctor)} note={`${doctor.specialty || ""} ${doctor.department || ""}`} photoUrl={profileImageFor(doctor, "doctor")} /></div>
      </div>
    </>
  );
}

function DiagnosesPage({ config, data, navigate, removeRecord, profile, deletingKey }) {
  const canDelete = profile.role === "administrator";
  const canAdd = ["administrator", "clinician"].includes(profile.role);
  return (
    <>
      <PageHeader config={config}>{canAdd ? <button className="btn primary" type="button" onClick={() => navigate("diagnosis-form")}>{icons.plus} Add Diagnosis</button> : null}</PageHeader>
      <div className="panel">
        <ResponsiveTable
          columns={["ICD", "Patient", "Diagnosis", "Clinician", "Severity", "Date", "Actions"]}
          rows={data.diagnoses}
          empty="No diagnoses found."
          renderRow={(item) => [
            item.icdCode || "-",
            item.patientName || item.patientId || "-",
            item.description || "-",
            item.assignedDoctorName || "-",
            statusBadge(item.severity || "Medium"),
            item.diagnosisDate || "-",
            canDelete ? <button className="btn small danger" type="button" disabled={deletingKey === `diagnoses:${item.id}`} onClick={() => removeRecord("diagnoses", item.id)}>{deletingKey === `diagnoses:${item.id}` ? "Deleting..." : "Delete"}</button> : "-",
          ]}
        />
      </div>
    </>
  );
}

function DiagnosisFormPage({ config, data, params, profile, navigate, saveRecord, notify }) {
  const clinicId = profile.clinicId || defaultClinicId;
  const patientIdParam = params.get("patientId") || params.get("id") || "";
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdParam);
  const [busy, setBusy] = useState(false);

  const allowedPatients = useMemo(() => {
    if (profile.role === "administrator") return data.patients;
    return data.patients.filter((patient) => canDiagnosePatient(patient, profile));
  }, [data.patients, profile]);

  useEffect(() => {
    if (!selectedPatientId && allowedPatients[0]) {
      setSelectedPatientId(recordId(allowedPatients[0]));
    }
  }, [allowedPatients, selectedPatientId]);

  const patient = allowedPatients.find((item) => recordId(item) === selectedPatientId || item.patientId === selectedPatientId) || allowedPatients[0] || {};
  const patientRecordId = recordId(patient);
  const doctor = findAssignedDoctor(data.doctors, patient) || data.doctors.find((item) => recordId(item) === profile.uid) || {};
  const clinicianName = recordId(doctor) ? doctorName(doctor) : profile.displayName || profile.email || "Clinician";
  const checks = clinicalChecksForDoctor(doctor);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!patientRecordId) {
      notify("Select a patient before saving a diagnosis.");
      return;
    }
    if (!canDiagnosePatient(patient, profile)) {
      notify("Only the assigned doctor can diagnose this patient.");
      return;
    }

    setBusy(true);
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const clinicalFindings = formData.getAll("clinicalFindings").map((item) => String(item));
      const doctorId = recordId(doctor) || profile.uid;

      payload.patientId = patientRecordId;
      payload.patientPublicId = patient.patientId || patientRecordId;
      payload.patientName = patientName(patient);
      payload.assignedDoctorId = doctorId;
      payload.assignedDoctorName = clinicianName;
      payload.department = doctor.department || patient.department || "";
      payload.specialty = doctor.specialty || "";
      payload.description = String(payload.description || "").trim();
      payload.clinicalFindings = clinicalFindings;
      payload.findingsText = clinicalFindings.join(", ");
      payload.diagnosisDate = payload.diagnosisDate || todayInputValue();
      payload.severity = payload.severity || "Medium";
      payload.status = payload.status || "Monitoring";

      await saveRecord("diagnoses", payload);

      try {
        await update(ref(rtdb, patient._path || `${primaryCollectionPath("patients")}/${patientRecordId}`), {
          lastDiagnosis: payload.description,
          status: payload.patientStatus || "Monitoring",
          updatedAt: serverTimestamp(),
          updatedBy: profile.uid,
        });
      } catch (error) {
        console.warn("Could not update patient diagnosis summary", error);
      }

      notify("Diagnosis saved.");
      navigate("patient-profile", { id: patientRecordId });
    } catch (error) {
      console.error("Diagnosis save failed", error);
      alert(error.message || "Could not save diagnosis.");
    } finally {
      setBusy(false);
    }
  }

  if (!allowedPatients.length) {
    return (
      <>
        <PageHeader config={config} />
        <div className="panel pad">
          <h2 className="panel-title">No assigned patients</h2>
          <p className="page-subtitle">A patient must be assigned to this doctor before a diagnosis can be recorded.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader config={config}><button className="btn" type="button" onClick={() => navigate("diagnoses")}>Cancel</button></PageHeader>
      <div className="panel pad">
        <form onSubmit={handleSubmit} key={patientRecordId || "diagnosis-form"}>
          <datalist id="diagnosisSuggestions">
            {diseaseSuggestions.map((item) => <option value={item} key={item} />)}
          </datalist>
          <FormSection title="Patient">
            <div className="field">
              <label>Select Patient</label>
              <select name="selectedPatientId" value={patientRecordId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                {allowedPatients.map((item) => {
                  const id = recordId(item);
                  return <option value={id} key={id}>{patientName(item)} ({item.patientId || id})</option>;
                })}
              </select>
            </div>
            <Field label="Assigned Doctor" name="assignedDoctorName" value={clinicianName} readOnly />
            <Field label="Specialty" name="specialtyDisplay" value={doctor.specialty || doctor.department || ""} readOnly />
            <SelectField label="Patient Status" name="patientStatus" options={["Stable", "Monitoring", "Critical"]} defaultValue={patient.status || "Monitoring"} />
          </FormSection>
          <FormSection title="Diagnosis">
            <Field label="Disease / Diagnosis" name="description" list="diagnosisSuggestions" required />
            <Field label="ICD Code" name="icdCode" />
            <SelectField label="Severity" name="severity" options={["Low", "Medium", "High", "Critical"]} defaultValue="Medium" />
            <Field label="Diagnosis Date" name="diagnosisDate" type="date" defaultValue={todayInputValue()} required />
            <SelectField label="Diagnosis Status" name="status" options={["Open", "Monitoring", "Resolved"]} defaultValue="Monitoring" />
          </FormSection>
          <FormSection title="Clinical Checks">
            <div className="field full">
              <label>Findings</label>
              <div className="check-grid">
                {checks.map((check) => (
                  <label className="check-card" key={check}>
                    <input type="checkbox" name="clinicalFindings" value={check} />
                    <span>{check}</span>
                  </label>
                ))}
              </div>
            </div>
            <TextArea label="Clinical Notes" name="clinicalNotes" defaultValue="" />
          </FormSection>
          <div className="form-actions">
            <button className="btn" type="button" onClick={() => navigate("patient-profile", { id: patientRecordId })}>Cancel</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save Diagnosis"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

function StaffUsersPage({ config, users, profile, notify }) {
  const clinicId = profile.clinicId || defaultClinicId;
  const [rows, setRows] = useState(users || []);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setRows(users || []);
  }, [users]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return rows.filter((user) => {
      const role = normalizeRole(user.role || user.staffType);
      return `${user.displayName || ""} ${user.email || ""} ${role} ${user.staffType || ""} ${user.department || ""}`.toLowerCase().includes(term);
    });
  }, [rows, search]);

  async function refreshUsers() {
    setRows(await readStaffUsers(clinicId));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const temporaryPassword = String(data.temporaryPassword || "").trim();
    if (temporaryPassword.length < 8) {
      notify("Temporary password must be at least 8 characters.");
      return;
    }

    setBusy("create");
    try {
      const createStaffUser = httpsCallable(functions, "createStaffUser");
      await createStaffUser({
        displayName: data.displayName,
        email: data.email,
        temporaryPassword,
        staffType: data.staffType || "doctor",
        department: data.department || "General",
        active: data.active === "true",
        clinicId,
      });
      form.reset();
      await refreshUsers();
      notify("Staff user created in Firebase Auth.");
    } catch (error) {
      console.error("Staff user creation failed", error);
      notify(error.message || "Could not create staff user.");
    } finally {
      setBusy("");
    }
  }

  async function handleDisable(uid) {
    if (!uid || uid === profile.uid || !window.confirm("Disable this staff user?")) return;
    setBusy(`disable:${uid}`);
    try {
      const disableStaffUser = httpsCallable(functions, "disableStaffUser");
      await disableStaffUser({ uid, clinicId });
      setRows((current) => current.map((user) => (user.uid || user.id) === uid ? { ...user, active: false, status: "disabled" } : user));
      notify("Staff user disabled.");
    } catch (error) {
      console.error("Staff user disable failed", error);
      notify(error.message || "Could not disable staff user.");
    } finally {
      setBusy("");
    }
  }

  async function handleStaffTypeChange(user, staffType) {
    const uid = user.uid || user.id;
    const previous = staffTypeForRole(normalizeRole(user.role || user.staffType), user.staffType);
    if (!uid || staffType === previous) return;
    if (!window.confirm(`Change this staff member to ${staffTypeLabels[staffType] || staffType}?`)) return;

    setBusy(`role:${uid}`);
    try {
      const setStaffRole = httpsCallable(functions, "setStaffRole");
      const response = await setStaffRole({ uid, staffType, clinicId, department: user.department || user.departmentId || "" });
      setRows((current) => current.map((item) => {
        if ((item.uid || item.id) !== uid) return item;
        return {
          ...item,
          role: response.data?.role || normalizeRole(staffType),
          staffType: response.data?.staffType || staffType,
          active: response.data?.active ?? item.active,
        };
      }));
      notify("Staff role updated.");
    } catch (error) {
      console.error("Staff role update failed", error);
      notify(error.message || "Could not update staff role.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader config={config} />
      <div className="grid two">
        <div>
          <div className="toolbar">
            <div className="search-field"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff by name, email, role, or department" /></div>
          </div>
          <div className="panel">
            <ResponsiveTable
              columns={["Name", "Email", "Role", "Staff Type", "Department", "Status", "Actions"]}
              rows={filtered}
              empty="No staff users found."
              renderRow={(user) => {
                const uid = user.uid || user.id || "";
                const role = normalizeRole(user.role || user.staffType);
                const staffType = staffTypeForRole(role, user.staffType);
                return [
                  <Entity name={user.displayName || user.email || uid} note={uid} />,
                  user.email || "-",
                  roleBadge(user.role || user.staffType),
                  <select className="table-select" value={staffType} disabled={uid === profile.uid || busy === `role:${uid}`} onChange={(event) => handleStaffTypeChange(user, event.target.value)}>
                    {Object.entries(staffTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>,
                  user.department || user.departmentId || "-",
                  statusBadge(user.active === false || user.status === "disabled" ? "Disabled" : "Active"),
                  <button className="btn small danger" type="button" disabled={uid === profile.uid || busy === `disable:${uid}`} onClick={() => handleDisable(uid)}>{busy === `disable:${uid}` ? "Disabling..." : "Disable"}</button>,
                ];
              }}
            />
          </div>
        </div>
        <div className="panel pad">
          <h2 className="panel-title">Add Staff User</h2>
          <form onSubmit={handleSubmit}>
            <FormSection title="Account">
              <Field label="Full Name" name="displayName" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Temporary Password" name="temporaryPassword" type="password" required minLength={8} />
              <div className="field">
                <label>Staff Type</label>
                <select name="staffType" defaultValue="doctor">
                  {Object.entries(staffTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </div>
              <Field label="Department" name="department" defaultValue="General" />
              <div className="field">
                <label>Status</label>
                <select name="active" defaultValue="true">
                  <option value="true">Active</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </FormSection>
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={busy === "create"}>{busy === "create" ? "Creating..." : "Create Staff User"}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function SchedulesPage({ config, data }) {
  const [search, setSearch] = useState("");
  const rows = useMemo(() => buildScheduleRows(data.schedules, data.doctors, data.patients), [data.schedules, data.doctors, data.patients]);
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return rows.filter((row) => `${row.doctorName || ""} ${row.department || ""} ${row.day || ""} ${row.room || ""} ${row.assignedPatients || ""} ${row.status || ""}`.toLowerCase().includes(term));
  }, [rows, search]);

  return (
    <>
      <PageHeader config={config} />
      <div className="toolbar">
        <div className="search-field">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search schedules by doctor, department, day, room, or patient" />
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><h2 className="panel-title">Doctor Schedules</h2></div>
        <ResponsiveTable
          columns={["Doctor Name", "Department", "Day", "Start Time", "End Time", "Room", "Assigned Patients", "Status"]}
          rows={filtered}
          empty="No doctor schedules found."
          renderRow={(row) => [
            row.doctorName || "-",
            row.department || "-",
            row.day || "-",
            row.startTime || "-",
            row.endTime || "-",
            row.room || "-",
            row.assignedPatients || "0",
            statusBadge(row.status || "Available"),
          ]}
        />
      </div>
    </>
  );
}

function SimpleRecordsPage({ config, title, rows, columns, empty = "No records found." }) {
  return (
    <>
      <PageHeader config={config} />
      <div className="panel">
        <div className="panel-header"><h2 className="panel-title">{title}</h2></div>
        <ResponsiveTable
          columns={columns.map((item) => item.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()))}
          rows={rows}
          empty={empty}
          renderRow={(row) => columns.map((column) => String(row[column] ?? "-"))}
        />
      </div>
    </>
  );
}

function SettingsPage({ config, notify }) {
  return (
    <>
      <PageHeader config={config} />
      <div className="panel pad">
        <form onSubmit={(event) => { event.preventDefault(); notify("Settings saved locally. Connect clinic settings storage next."); }}>
          <FormSection title="Clinic Profile">
            <Field label="Clinic Name" name="clinicName" defaultValue="CareTrack Clinic" />
            <Field label="Default Department" name="department" defaultValue="General Medicine" />
          </FormSection>
          <div className="form-actions"><button className="btn primary" type="submit">Save Settings</button></div>
        </form>
      </div>
    </>
  );
}

function AccessDenied({ navigate }) {
  return (
    <div className="panel pad">
      <p className="eyebrow">CareTrack</p>
      <h1 className="page-title">Access Denied</h1>
      <p className="page-subtitle">Your staff account does not have permission to view this page.</p>
      <button className="btn primary" type="button" onClick={() => navigate("dashboard")}>Back to Dashboard</button>
    </div>
  );
}

function ResponsiveTable({ columns, rows, renderRow, empty }) {
  if (!rows.length) return <div className="empty-state">{empty}</div>;
  return (
    <div className="table-wrap">
      <table className="responsive-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => {
            const cells = renderRow(row);
            return (
              <tr key={row.id || JSON.stringify(row)}>
                {cells.map((cell, index) => <td data-label={columns[index]} key={`${row.id || index}-${columns[index]}`}>{cell}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Entity({ name, note, photoUrl }) {
  return (
    <div className="entity">
      <span className={`avatar ${photoUrl ? "with-photo" : ""}`}>
        {photoUrl ? <img src={photoUrl} alt="" /> : initials(name)}
      </span>
      <div><strong>{name}</strong><span>{note}</span></div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}
