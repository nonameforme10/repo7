"use strict";

const {auth, FieldValue, firestore, rtdb, RtdServerValue} = require("./firebase");
const {
  DEFAULT_CLINIC_ID,
  findRegistration,
  listRegistrations,
  mirrorClaims,
  normalizeStaffType,
  registrationPath,
  registrationPaths,
  removeOldRegistration,
  roleForStaffType,
  upsertRegistration,
} = require("./registration");

function clinicRef(clinicId = DEFAULT_CLINIC_ID) {
  return firestore.collection("clinics").doc(clinicId || DEFAULT_CLINIC_ID);
}

function staffProfileRef(clinicId, uid) {
  return clinicRef(clinicId).collection("staffProfiles").doc(uid);
}

function auditLogsRef(clinicId) {
  return clinicRef(clinicId).collection("auditLogs");
}

async function getAuthUserByUid(uid) {
  return auth.getUser(uid);
}

async function getAuthUserByEmail(email) {
  return auth.getUserByEmail(email);
}

async function createAuthUser({email, password, displayName, active}) {
  return auth.createUser({
    email,
    password,
    displayName,
    disabled: active !== true,
    emailVerified: false,
  });
}

async function updateAuthUser(uid, {displayName, active}) {
  return auth.updateUser(uid, {
    displayName,
    disabled: active !== true,
  });
}

async function saveStaffProfile(clinicId, uid, payload) {
  await staffProfileRef(clinicId, uid).set({
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

async function writeAudit(clinicId, actor, action, entity, entityId, details = {}) {
  await auditLogsRef(clinicId).add({
    action,
    entity,
    entityId,
    details,
    userId: actor.uid,
    userName: actor.name || actor.email || actor.uid,
    role: actor.role || "administrator",
    device: "Cloud Functions",
    timestamp: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function markRegistrationLogin(path, email) {
  await rtdb.ref(path).update({
    lastLoginAt: RtdServerValue.TIMESTAMP,
    lastLoginEmail: email || "",
    status: "active",
    updatedAt: RtdServerValue.TIMESTAMP,
  });
}

async function disableRegistration(path, actorUid) {
  await rtdb.ref(path).update({
    active: false,
    status: "disabled",
    disabledAt: RtdServerValue.TIMESTAMP,
    updatedAt: RtdServerValue.TIMESTAMP,
    updatedBy: actorUid,
  });
}

module.exports = {
  DEFAULT_CLINIC_ID,
  FieldValue,
  RtdServerValue,
  auth,
  firestore,
  rtdb,
  createAuthUser,
  disableRegistration,
  findRegistration,
  getAuthUserByEmail,
  getAuthUserByUid,
  listRegistrations,
  markRegistrationLogin,
  mirrorClaims,
  normalizeStaffType,
  registrationPath,
  registrationPaths,
  removeOldRegistration,
  roleForStaffType,
  saveStaffProfile,
  updateAuthUser,
  upsertRegistration,
  writeAudit,
};
