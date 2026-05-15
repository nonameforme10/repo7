"use strict";

const {HttpsError} = require("firebase-functions/v2/https");
const {requireAdministrator} = require("../middleware/auth");
const {
  DEFAULT_CLINIC_ID,
  createAuthUser,
  disableRegistration,
  findRegistration,
  getAuthUserByEmail,
  getAuthUserByUid,
  listRegistrations,
  mirrorClaims,
  normalizeStaffType,
  removeOldRegistration,
  roleForStaffType,
  saveStaffProfile,
  updateAuthUser,
  upsertRegistration,
  writeAudit,
} = require("../data/db");

function validateEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    throw new HttpsError("invalid-argument", "A valid staff email is required.");
  }
  return clean;
}

function text(value, fallback = "") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function boolFromInput(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

async function createStaffUser(request) {
  const adminUser = await requireAdministrator(request);
  const data = request.data || {};
  const email = validateEmail(data.email);
  const displayName = text(data.displayName, email);
  const temporaryPassword = String(data.temporaryPassword || "").trim();
  const staffType = normalizeStaffType(data.staffType || data.role);
  const role = roleForStaffType(staffType);
  const active = boolFromInput(data.active, true);
  const clinicId = text(data.clinicId, adminUser.clinicId || DEFAULT_CLINIC_ID);
  const department = text(data.department);

  if (temporaryPassword && temporaryPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Temporary password must be at least 8 characters.");
  }

  let userRecord;
  try {
    userRecord = await getAuthUserByEmail(email);
    await updateAuthUser(userRecord.uid, {displayName, active});
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    if (!temporaryPassword) {
      throw new HttpsError("invalid-argument", "Temporary password is required for new staff users.");
    }
    userRecord = await createAuthUser({
      email,
      password: temporaryPassword,
      displayName,
      active,
    });
  }

  const previousRegistration = await findRegistration(userRecord.uid);
  await removeOldRegistration(userRecord.uid);
  const registration = await upsertRegistration({
    uid: userRecord.uid,
    email,
    displayName,
    staffType,
    active,
    department,
    clinicId,
    createdBy: previousRegistration?.value?.createdBy || adminUser.uid,
    updatedBy: adminUser.uid,
  });
  await mirrorClaims(userRecord.uid, {role, staffType, clinicId, active});
  await saveStaffProfile(clinicId, userRecord.uid, {
    uid: userRecord.uid,
    email,
    displayName,
    role,
    staffType,
    active,
    status: active ? "active" : "disabled",
    department,
    departmentId: department,
    clinicId,
    registrationPath: registration.path,
    updatedBy: adminUser.uid,
  });

  await writeAudit(clinicId, adminUser, "Created", "Staff User", userRecord.uid, {
    email,
    role,
    staffType,
  });
  return {uid: userRecord.uid, email, role, staffType, active, registrationPath: registration.path};
}

async function setStaffRole(request) {
  const adminUser = await requireAdministrator(request);
  const data = request.data || {};
  const uid = String(data.uid || "").trim();
  if (!uid) {
    throw new HttpsError("invalid-argument", "Staff uid is required.");
  }

  const userRecord = await getAuthUserByUid(uid);
  const currentRegistration = await findRegistration(uid);
  const email = userRecord.email || validateEmail(data.email);
  const displayName = text(data.displayName, userRecord.displayName || currentRegistration?.value?.displayName || email);
  const staffType = normalizeStaffType(data.staffType || data.role);
  const role = roleForStaffType(staffType);
  const active = boolFromInput(
    data.active,
    currentRegistration ? currentRegistration.value.active === true : !userRecord.disabled,
  );
  const clinicId = text(data.clinicId, currentRegistration?.value?.clinicId || adminUser.clinicId || DEFAULT_CLINIC_ID);
  const department = text(data.department, currentRegistration?.value?.department || currentRegistration?.value?.departmentId || "");

  await updateAuthUser(uid, {displayName, active});
  await removeOldRegistration(uid);
  const registration = await upsertRegistration({
    uid,
    email,
    displayName,
    staffType,
    active,
    department,
    clinicId,
    createdBy: currentRegistration?.value?.createdBy || adminUser.uid,
    updatedBy: adminUser.uid,
  });
  await mirrorClaims(uid, {role, staffType, clinicId, active});
  await saveStaffProfile(clinicId, uid, {
    uid,
    email,
    displayName,
    role,
    staffType,
    active,
    status: active ? "active" : "disabled",
    department,
    departmentId: department,
    clinicId,
    registrationPath: registration.path,
    updatedBy: adminUser.uid,
  });

  await writeAudit(clinicId, adminUser, "Updated", "Staff Role", uid, {
    email,
    role,
    staffType,
    active,
    previousPath: currentRegistration?.path || null,
    registrationPath: registration.path,
  });

  return {uid, email, role, staffType, active, registrationPath: registration.path};
}

async function disableStaffUser(request) {
  const adminUser = await requireAdministrator(request);
  const uid = String(request.data?.uid || "").trim();
  if (!uid) {
    throw new HttpsError("invalid-argument", "Staff uid is required.");
  }
  if (uid === adminUser.uid) {
    throw new HttpsError("failed-precondition", "Administrators cannot disable their own account.");
  }

  const userRecord = await getAuthUserByUid(uid);
  const currentRegistration = await findRegistration(uid);
  const staffType = normalizeStaffType(currentRegistration?.value?.staffType || userRecord.customClaims?.staffType || "doctor");
  const role = roleForStaffType(staffType);
  const clinicId = text(request.data?.clinicId, currentRegistration?.value?.clinicId || userRecord.customClaims?.clinicId || adminUser.clinicId || DEFAULT_CLINIC_ID);

  await updateAuthUser(uid, {displayName: userRecord.displayName || userRecord.email || uid, active: false});
  await mirrorClaims(uid, {role, staffType, clinicId, active: false});

  if (currentRegistration) {
    await disableRegistration(currentRegistration.path, adminUser.uid);
  }

  await saveStaffProfile(clinicId, uid, {
    active: false,
    status: "disabled",
    updatedBy: adminUser.uid,
  });

  await writeAudit(clinicId, adminUser, "Updated", "Staff User", uid, {
    status: "disabled",
    registrationPath: currentRegistration?.path || null,
  });
  return {uid, active: false};
}

async function listStaffUsers(request) {
  await requireAdministrator(request);
  return {users: await listRegistrations()};
}

module.exports = {
  createStaffUser,
  disableStaffUser,
  listStaffUsers,
  setStaffRole,
};
