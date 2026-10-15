const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Pet = require("../models/Pet");
const Veterinarian = require("../models/Veterinarian");
const Notification = require("../models/Notification");
const Reminder = require("../models/Reminder");
const { createAppointmentForUser } = require("../services/appointment.service");
const { effectiveAppointmentStatus } = require("../utils/appointmentTime");

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .populate("pet", "name species images")
      .populate("veterinarian", "name clinic specialization phone")
      .sort({ date: 1, time: 1 });

    // Report the effective status: a pending/confirmed appointment whose
    // scheduled moment has passed is history. Computed on read (never written
    // back) so the stored record and any admin/audit view stay untouched, and
    // every client — dashboard, appointments page, PetGPT — agrees.
    const now = new Date();
    const list = appointments.map((a) => {
      const obj = a.toObject();
      obj.status = effectiveAppointmentStatus(obj.status, obj.date, obj.time, now);
      return obj;
    });

    res.json({ success: true, count: list.length, appointments: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { pet, veterinarian, date, time, type, symptoms, notes } = req.body;

    // Booking rules live in the service so this route and the PetGPT
    // create_appointment tool cannot drift apart. The response contract
    // (201 + { appointment } on success, error message otherwise) is
    // unchanged.
    const { appointment } = await createAppointmentForUser({
      userId: req.user._id,
      pet,
      veterinarian,
      date,
      time,
      type,
      symptoms,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      appointment,
    });
  } catch (error) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid appointment ID." });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    const originalDate = appointment.date;
    const originalTime = appointment.time;

    const allowed = ["date", "time", "type", "symptoms", "notes"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) appointment[field] = req.body[field];
    });

    if (req.body.date !== undefined || req.body.time !== undefined) {
      const newDate = new Date(appointment.date);
      if (Number.isNaN(newDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid appointment date." });
      }
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (newDate < startOfToday) {
        return res.status(400).json({
          success: false,
          message: "Appointment date cannot be in the past.",
        });
      }

      const conflict = await Appointment.findOne({
        _id: { $ne: appointment._id },
        veterinarian: appointment.veterinarian,
        date: newDate,
        time: appointment.time,
        status: { $in: ["pending", "confirmed"] },
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          message: "This veterinarian is already booked at this time.",
        });
      }
    }

    await appointment.save();

    // ------------------------------------------------
    // SYNC THE AUTO-CREATED REMINDER WHEN RESCHEDULED
    // (only for THIS appointment's slot, not every
    // reminder sharing the same title)
    // ------------------------------------------------

    const reminderTitle = appointment.type
      ? `Appointment - ${String(appointment.type).charAt(0).toUpperCase()}${String(appointment.type).slice(1)}`
      : "Appointment";

    await Reminder.updateMany(
      {
        user: req.user._id,
        pet: appointment.pet,
        title: reminderTitle,
        type: "appointment",
        date: originalDate,
        time: originalTime,
        isActive: true,
      },
      {
        $set: {
          date: appointment.date,
          time: appointment.time,
        },
      }
    );

    res.json({
      success: true,
      message: "Appointment updated successfully.",
      appointment,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid appointment ID." });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    appointment.status = "cancelled";
    await appointment.save();

    // ------------------------------------------------
    // DEACTIVATE THE AUTO-CREATED REMINDER FOR THIS
    // APPOINTMENT so cancelled visits do not leave
    // stale active reminders (GET /reminders only
    // returns isActive: true).
    // ------------------------------------------------

    await Reminder.updateMany(
      {
        user: req.user._id,
        pet: appointment.pet,
        date: appointment.date,
        time: appointment.time,
        type: "appointment",
        isActive: true,
      },
      {
        $set: { isActive: false },
      }
    );

    res.json({
      success: true,
      message: "Appointment cancelled successfully.",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
