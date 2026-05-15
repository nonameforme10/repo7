"use strict";

const {onCall} = require("firebase-functions/v2/https");
const authController = require("../controllers/authController");

module.exports = {
  syncAccessClaims: onCall(authController.syncAccessClaims),
  syncOwnAccessClaims: onCall(authController.syncOwnAccessClaims),
};
