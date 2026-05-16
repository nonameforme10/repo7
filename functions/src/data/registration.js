"use strict";

const {auth, rtdb, RtdServerValue} = require("./firebase");

const DEFAULT_CLINIC_ID = "default";
const STAFF_TYPES = new Set(["admin", "doctor", "receptionist"]);

function normalizeStaffType(value) {
  const staffType = String(value || "").toLowerCase().trim();
  if (STAFF_TYPES.has(staffType)) return staffType;
  if (staffType === "administrator") return "admin";
  if (["clinician", "clinical"].includes(staffType)) return "doctor";
  if (["reception", "frontdesk", "front_desk"].includes(staffType)) return "receptionist";
  return "doctor";
}

function roleForStaffType(staffType) {
  const cleanStaffType = normalizeStaffType(staffType);
  if (cleanStaffType === "admin") return "admin";
  if (cleanStaffType === "receptionist") return "receptionist";
  return "doctor";
}

function registrationPath(uid, staffType) {
  const cleanStaffType = normalizeStaffType(staffType);
  if (cleanStaffType === "admin") return `registration/admin/${uid}`;
  if (cleanStaffType === "receptionist") return `registration/receptionist/${uid}`;
  return `registration/doctors/${uid}`;
}

function registrationPaths(uid) {
  return [
    `registration/admin/${uid}`,
    `registration/doctors/${uid}`,
    `registration/receptionist/${uid}`,
    `registration/clinicks/doctor/${uid}`,
    `registration/clinicks/reception/${uid}`,
  ];
}

function legacyRegistrationPaths(uid) {
  return [
    `registration/nurses/${uid}`,
    `registration/clinicks/nurse/${uid}`,
  ];
}

function staffTypeFromPath(path) {
  const parts = String(path || "").split("/");
  if (parts[1] === "admin") return "admin";
  if (parts[1] === "doctors") return "doctor";
  if (parts[1] === "receptionist") return "receptionist";
  return normalizeStaffType(parts[2]);
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
    ["doctor", "registration/doctors"],
    ["receptionist", "registration/receptionist"],
    ["doctor", "registration/clinicks/doctor"],
    ["receptionist", "registration/clinicks/reception"],
  ];
  const usersByUid = new Map();

  for (const [staffType, path] of groups) {
    const snapshot = await rtdb.ref(path).get();
    if (!snapshot.exists()) continue;

    Object.entries(snapshot.val() || {}).forEach(([uid, value]) => {
      const cleanStaffType = normalizeStaffType(value.staffType || staffType);
      if (usersByUid.has(uid)) return;
      usersByUid.set(uid, {
        uid,
        id: uid,
        path: `${path}/${uid}`,
        ...value,
        role: roleForStaffType(cleanStaffType),
        staffType: cleanStaffType,
      });
    });
  }

  return [...usersByUid.values()].sort((left, right) => {
    const a = String(left.displayName || left.email || left.uid);
    const b = String(right.displayName || right.email || right.uid);
    return a.localeCompare(b);
  });
}

async function removeOldRegistration(uid) {
  const updates = {};
  [...registrationPaths(uid), ...legacyRegistrationPaths(uid)].forEach((path) => {
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
