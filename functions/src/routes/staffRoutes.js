"use strict";

const {onCall} = require("firebase-functions/v2/https");
const staffController = require("../controllers/staffController");

module.exports = {
  createStaffUser: onCall(staffController.createStaffUser),
  disableStaffUser: onCall(staffController.disableStaffUser),
  listStaffUsers: onCall(staffController.listStaffUsers),
  setStaffRole: onCall(staffController.setStaffRole),
};
