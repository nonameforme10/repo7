"use strict";

const {HttpsError} = require("firebase-functions/v2/https");
const {DEFAULT_CLINIC_ID} = require("../data/registration");
const {rtdb} = require("../data/firebase");

function requireSignedIn(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  return request.auth;
}

async function requireAdministrator(request) {
  const signedIn = requireSignedIn(request);
  const token = signedIn.token || {};
  const fromClaims = token.role === "administrator" && token.status === "active";
  let registration = null;

  if (!fromClaims) {
    const adminRegistration = await rtdb.ref(`registration/admin/${signedIn.uid}`).get();
    if (!adminRegistration.exists() || adminRegistration.child("active").val() !== true) {
      throw new HttpsError("permission-denied", "Administrator access is required.");
    }
    registration = adminRegistration.val() || {};
  }

  return {
    uid: signedIn.uid,
    email: token.email || registration?.email || "",
    name: token.name || registration?.displayName || token.email || signedIn.uid,
    role: "administrator",
    clinicId: token.clinicId || registration?.clinicId || DEFAULT_CLINIC_ID,
  };
}

module.exports = {
  requireAdministrator,
  requireSignedIn,
};
