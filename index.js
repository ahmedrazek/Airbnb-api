const express = require("express");
const cors = require("cors");
const JWT = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");
const dotenv = require("dotenv");
const UserModel = require("./models/User");
const PlaceModel = require("./models/Place");
const Booking = require("./models/Booking");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const multer = require("multer");
let { promisify } = require("util");
const fs = require("fs");
dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(`${__dirname}/uploads`));
app.use(
  cors([
    {
      credentials: true,
      origin: "http://localhost:5173",
    },
    {
      credentials: true,
      origin: "https://airbnb-clone-iota-azure.vercel.app/",
    },
  ])
);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("DB connection successful!"));
app.get("/test", (req, res) => {
  res.json("test ok");
});
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await UserModel.create({
      name,
      email,
      password: bcrypt.hashSync(password, 8),
    });
    res.json(user);
  } catch (err) {
    res.status(400).json(err);
  }
});

app.post("/login", async (req, res) => {
  console.log("hello server");
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = JWT.sign(
      { email: user.email, id: user._id, name: user.name },
      process.env.SECRET,
      {
        expiresIn: "10h",
      }
    );

    res.cookie("token", token, { httpOnly: true }).json(user);
  } else {
    res.status(400).json({ message: "Invalid credentials" });
  }
});
app.get("/profile", async (req, res) => {
  const { token } = req.cookies;
  if (token) {
    let { email, id, name } = await promisify(JWT.verify)(
      token,
      process.env.SECRET
    );
    res.json({ email, id, name });
  } else {
    res.json(null);
  }
});
app.post("/logout", async (req, res) => {
  res.cookie("token", "").json(true);
});
app.post("/upload-link", async (req, res) => {
  try {
    const { link } = req.body;
    const newName = "photo" + Date.now() + ".jpg";
    await imageDownloader.image({
      url: link,
      dest: `${__dirname}/uploads/${newName}`,
    });
    res.json(newName);
  } catch (error) {
    console.log(error);
  }
});
const photoMiddleware = multer({ dest: "uploads/" });
app.post("/upload", photoMiddleware.array("photos", 100), (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    uploadedFiles.push(newPath.replace(`uploads\\`, ""));
  }
  res.json(uploadedFiles);
});
app.post("/places", async (req, res) => {
  const { token } = req.cookies;
  if (token) {
    let { id } = await promisify(JWT.verify)(token, process.env.SECRET);
    const {
      title,
      address,
      photos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    } = req.body;
    console.log(req.body);
    const newPlace = PlaceModel.create({
      owner: id,
      title,
      address,
      photos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    });
    res.json({ newPlace });
  } else {
    res.json({ error: "You are not logged in" });
  }
});
app.get("/my-places", async (req, res) => {
  const { token } = req.cookies;
  if (token) {
    let { id } = await promisify(JWT.verify)(token, process.env.SECRET);
    let places = await PlaceModel.find({ owner: id });
    res.json(places);
  } else {
    res.json({ error: "You are not logged in" });
  }
});
app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  const place = await PlaceModel.findById(id);
  res.json(place);
});
app.put("/places/:id", async (req, res) => {
  console.log("update");
  console.log(req.body);
  const { id } = req.params;
  const { token } = req.cookies;
  const place = req.body;
  try {
    if (token) {
      let { id: userId } = await promisify(JWT.verify)(
        token,
        process.env.SECRET
      );
      const updatedPlace = await PlaceModel.findOneAndUpdate(
        { _id: id, owner: userId },
        place
      );
      console.log(updatedPlace);
      res.json(updatedPlace);
    } else {
      res.json({ error: "You are not logged in" });
    }
  } catch (error) {
    console.log(error);
  }
});
app.get("/places", async (req, res) => {
  const places = await PlaceModel.find();
  res.json(places);
});
app.post("/booking", async (req, res) => {
  try {
    const { token } = req.cookies;
    let { id: userId } = await promisify(JWT.verify)(token, process.env.SECRET);
    const { placeId, checkIn, checkOut, numberOfGuests, name, phone, price } =
      req.body;
    const newBooking = await Booking.create({ ...req.body, userId });
    res.json(newBooking);
  } catch (error) {
    res.json(error);
  }
});
app.get("/booking", async (req, res) => {
  try {
    const { token } = req.cookies;
    let { id: userId } = await promisify(JWT.verify)(token, process.env.SECRET);
    const bookings = await Booking.find({ userId }).populate("placeId");
    res.json(bookings);
  } catch (error) {
    res.json(error);
  }
});
app.get("/booking/:id", async (req, res) => {
  try {
    const { token } = req.cookies;
    const { id } = req.params;
    let { id: userId } = await promisify(JWT.verify)(token, process.env.SECRET);
    const booking = await Booking.findOne({ userId, _id: id }).populate(
      "placeId"
    );
    res.json(booking);
  } catch (error) {
    res.json(error);
  }
});
app.listen(3000);
