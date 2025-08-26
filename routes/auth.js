const express = require("express");
const passport = require("passport");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const {
  validateRegistration,
  validateLogin,
} = require("../middleware/validation");

// Register new user
router.post("/register", validateRegistration, authController.register);

// Login user
router.post("/login", validateLogin, authController.login);

// Get current user
router.get("/me", auth, authController.getMe);
// Backend routes (Node.js/Express example)
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication
    const token = generateJWT(req.user);
    res.json({ token, user: req.user });
  }
);

router.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);
router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => {
    const token = generateJWT(req.user);
    res.json({ token, user: req.user });
  }
);

module.exports = router;
