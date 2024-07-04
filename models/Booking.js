const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  checkIn: Date,
  checkOut: Date,
  name: String,
  phone: String,
  numberOfGuests: Number,
  price: Number,
});
const bookingModel = mongoose.model("Booking", bookingSchema);
module.exports = bookingModel;
