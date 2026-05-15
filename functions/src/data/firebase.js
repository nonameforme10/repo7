"use strict";

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "caretrack-badc5",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://caretrack-badc5-default-rtdb.firebaseio.com",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "caretrack-badc5.firebasestorage.app",
  });
}

const auth = admin.auth();
const rtdb = admin.database();

module.exports = {
  admin,
  auth,
  rtdb,
  RtdServerValue: admin.database.ServerValue,
};
