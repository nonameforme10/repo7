"use strict";

const authRoutes = require("../routes/authRoutes");
const staffRoutes = require("../routes/staffRoutes");

module.exports = {
  ...authRoutes,
  ...staffRoutes,
};
