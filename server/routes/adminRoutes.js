import express from "express";
import User from "../models/User.js";
import Tab from "../models/Tab.js";
import Message from "../models/Message.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// Every route below requires a logged-in, active admin.
router.use(protect, adminOnly);

/* GET /api/admin/users - list every user (excluding password hashes) */
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (err) {
    next(err);
  }
});

/* PATCH /api/admin/users/:id/status - activate or deactivate a user */
router.patch("/users/:id/status", async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false." });
    }

    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: "You can't deactivate your own account." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.isActive = isActive;
    await user.save();

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

/* PUT /api/admin/users/:id/reset-password - set a new password for a user */
router.put("/users/:id/reset-password", async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: `Password reset for ${user.email}.` });
  } catch (err) {
    next(err);
  }
});

/* DELETE /api/admin/users/:id - delete a user and their owned data */
router.delete("/users/:id", async (req, res, next) => {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: "You can't delete your own account from here." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const tabIds = await Tab.find({ user: user._id }).distinct("_id");
    await Message.deleteMany({ tab: { $in: tabIds } });
    await Tab.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: "User deleted successfully." });
  } catch (err) {
    next(err);
  }
});

export default router;
