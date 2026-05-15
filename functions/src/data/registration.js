"use strict";

const {auth, rtdb, RtdServerValue} = require("./firebase");

const DEFAULT_CLINIC_ID = "default";
const STAFF_TYPES = new Set(["admin", "doctor", "nurse", "reception"]);

function normalizeStaffType(value) {
  const staffType = String(value || "").toLowerCase().trim();
  if (STAFF_TYPES.has(staffType)) return staffType;
  if (staffType === "administrator") return "admin";
  if (["clinician", "clinical"].includes(staffType)) return "doctor";
  if (["receptionist", "frontdesk", "front_desk"].includes(staffType)) return "reception";
  return "doctor";
}

function roleForStaffType(staffType) {
  if (staffType === "admin") return "administrator";
  if (staffType === "reception") return "receptionist";
  return "clinician";
}

function registrationPath(uid, staffType) {
  if (staffType === "admin") return `registration/admin/${uid}`;
  return `registration/clinicks/${staffType}/${uid}`;
}

function registrationPaths(uid) {
  return [
    `registration/admin/${uid}`,
    `registration/clinicks/doctor/${uid}`,
    `registration/clinicks/nurse/${uid}`,
    `registration/clinicks/reception/${uid}`,
  ];
}

function staffTypeFromPath(path) {
  const parts = String(path || "").split("/");
  return normalizeStaffType(parts[1] === "admin" ? "admin" : parts[2]);
}

async function findRegistration(uid) {
  for (const path of registrationPaths(uid)) {
    const snapshot = await rtdb.ref(path).get();
    if (snapshot.exists()) {
      const value = snapshot.val() || {};
      return {
        path,
        staffType: normalizeStaffType(value.staffType || staffTypeFromPath(path)),
        value,
      };
    }
  }
  return null;
}

async function listRegistrations() {
  const groups = [
    ["admin", "registration/admin"],
    ["doctor", "registration/clinicks/doctor"],
    ["nurse", "registration/clinicks/nurse"],
    ["reception", "registration/clinicks/reception"],
  ];
  const users = [];

  for (const [staffType, path] of groups) {
    const snapshot = await rtdb.ref(path).get();
    if (!snapshot.exists()) continue;

    Object.entries(snapshot.val() || {}).forEach(([uid, value]) => {
      const cleanStaffType = normalizeStaffType(value.staffType || staffType);
      users.push({
        uid,
        id: uid,
        path: `${path}/${uid}`,
        role: roleForStaffType(cleanStaffType),
        staffType: cleanStaffType,
        ...value,
      });
    });
  }

  return users.sort((left, right) => {
    const a = String(left.displayName || left.email || left.uid);
    const b = String(right.displayName || right.email || right.uid);
    return a.localeCompare(b);
  });
}

async function removeOldRegistration(uid) {
  const updates = {};
  registrationPaths(uid).forEach((path) => {
    updates[path] = null;
  });
  await rtdb.ref().update(updates);
}

async function upsertRegistration({
  uid,
  email,
  displayName,
  staffType,
  active,
  department,
  clinicId,
  createdBy,
  updatedBy,
}) {
  const cleanStaffType = normalizeStaffType(staffType);
  const role = roleForStaffType(cleanStaffType);
  const path = registrationPath(uid, cleanStaffType);
  const now = RtdServerValue.TIMESTAMP;
  const snapshot = await rtdb.ref(path).get();
  const existing = snapshot.val() || {};
  const actor = updatedBy || createdBy || existing.updatedBy || "";
  const value = {
    uid,
    email,
    displayName: displayName || email,
    active: active === true,
    status: active === true ? "active" : "disabled",
    role,
    staffType: cleanStaffType,
    clinicId: clinicId || DEFAULT_CLINIC_ID,
    department: department || "",
    departmentId: department || "",
    createdBy: existing.createdBy || createdBy || actor,
    updatedBy: actor,
    updatedAt: now,
  };

  if (!snapshot.exists()) value.createdAt = now;

  await rtdb.ref(path).update(value);
  return {path, role, staffType: cleanStaffType, value};
}

async function mirrorClaims(uid, {role, staffType, clinicId, active}) {
  const cleanStaffType = normalizeStaffType(staffType);
  await auth.setCustomUserClaims(uid, {
    role: role || roleForStaffType(cleanStaffType),
    staffType: cleanStaffType,
    clinicId: clinicId || DEFAULT_CLINIC_ID,
    status: active ? "active" : "disabled",
    active: active === true,
  });
}

module.exports = {
  DEFAULT_CLINIC_ID,
  STAFF_TYPES,
  findRegistration,
  listRegistrations,
  mirrorClaims,
  normalizeStaffType,
  registrationPath,
  registrationPaths,
  removeOldRegistration,
  roleForStaffType,
  upsertRegistration,
};
