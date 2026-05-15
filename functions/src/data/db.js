"use strict";

const {auth, rtdb, RtdServerValue} = require("./firebase");
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
  await rtdb.ref(`staffProfiles/${uid}`).update({
    ...payload,
    clinicId: clinicId || DEFAULT_CLINIC_ID,
    updatedAt: RtdServerValue.TIMESTAMP,
  });
}

async function writeAudit(clinicId, actor, action, entity, entityId, details = {}) {
  void clinicId;
  void actor;
  void action;
  void entity;
  void entityId;
  void details;
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
  RtdServerValue,
  auth,
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
