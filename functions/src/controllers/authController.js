"use strict";

const {HttpsError} = require("firebase-functions/v2/https");
const {requireAdministrator, requireSignedIn} = require("../middleware/auth");
const {
  DEFAULT_CLINIC_ID,
  RtdServerValue,
  findRegistration,
  markRegistrationLogin,
  mirrorClaims,
  normalizeStaffType,
  roleForStaffType,
  saveStaffProfile,
  writeAudit,
} = require("../data/db");

async function syncAccessClaims(request) {
  const adminUser = await requireAdministrator(request);
  const uid = String(request.data?.uid || "").trim();
  if (!uid) {
    throw new HttpsError("invalid-argument", "Staff uid is required.");
  }

  const registration = await findRegistration(uid);
  if (!registration) {
    throw new HttpsError("not-found", "No RTD registration record was found for this uid.");
  }

  const staffType = normalizeStaffType(registration.value.staffType || registration.staffType);
  const role = roleForStaffType(staffType);
  const clinicId = registration.value.clinicId || adminUser.clinicId || DEFAULT_CLINIC_ID;
  const active = registration.value.active === true || registration.value.status === "active";

  await mirrorClaims(uid, {role, staffType, clinicId, active});
  await writeAudit(clinicId, adminUser, "Updated", "Access Claims", uid, {
    role,
    staffType,
    active,
  });

  return {uid, role, staffType, clinicId, active};
}

async function syncOwnAccessClaims(request) {
  const signedIn = requireSignedIn(request);
  const uid = signedIn.uid;
  const registration = await findRegistration(uid);

  if (!registration) {
    throw new HttpsError("not-found", "No active RTD registration record was found for this account.");
  }

  if (registration.value.active !== true && registration.value.status !== "active") {
    throw new HttpsError("permission-denied", "This staff registration is not active.");
  }

  const staffType = normalizeStaffType(registration.value.staffType || registration.staffType);
  const role = roleForStaffType(staffType);
  const clinicId = registration.value.clinicId || DEFAULT_CLINIC_ID;
  const email = registration.value.email || signedIn.token?.email || "";
  const displayName = registration.value.displayName || signedIn.token?.name || email || uid;

  await mirrorClaims(uid, {role, staffType, clinicId, active: true});
  await markRegistrationLogin(registration.path, email);
  await saveStaffProfile(clinicId, uid, {
    uid,
    email,
    displayName,
    role,
    staffType,
    active: true,
    status: "active",
    department: registration.value.department || registration.value.departmentId || "",
    departmentId: registration.value.departmentId || registration.value.department || "",
    clinicId,
    registrationPath: registration.path,
    lastLoginAt: RtdServerValue.TIMESTAMP,
  });

  return {uid, role, staffType, clinicId, active: true, registrationPath: registration.path};
}

module.exports = {
  syncAccessClaims,
  syncOwnAccessClaims,
};
