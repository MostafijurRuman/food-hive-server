// 1. Import core dependencies
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

// 2. Middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      " http://localhost:5175",
      "https://foodhivee.firebaseapp.com",
      "https://foodhivee.web.app",
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// 3. MongoDB URI & Client
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fk4sfju.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ✅ Global collections (will be initialized once)
let Foods, FoodHiveUsers, Orders;

// ✅ Lazy DB init (Vercel-friendly)
async function initDB() {
  if (!Foods) {
    await client.connect();
    const db = client.db("FoodHiveDB");
    Foods = db.collection("Foods");
    FoodHiveUsers = db.collection("FoodHiveUsers");
    Orders = db.collection("Orders");
    console.log("✅ MongoDB connected");
  }
}

// ✅ Middleware to ensure DB is ready
app.use(async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// ---------------- AUTH ----------------

// Login → issue Access + Refresh
app.post("/jwt", (req, res) => {
  const user = req.body;
  const isProd = process.env.NODE_ENV === "production";

  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "strict",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "strict",
    })
    .send({ success: true });
});

// Refresh → new Access Token
app.post("/refresh", (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const isProd = process.env.NODE_ENV === "production";

  if (!refreshToken) {
    return res.status(401).send({ message: "No refresh token" });
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: "Invalid refresh token" });

    const newAccessToken = jwt.sign(
      { email: decoded.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite:isProd ? "none" : "strict",
      })
      .send({ success: true });
  });
});

// Logout → clear both
app.post("/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res
    .clearCookie("accessToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "strict",
      path: "/",
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "strict",
      path: "/",
    })
    .send({ success: true });
});

// Middleware: Verify Access Token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ message: "Access Token Expired or Invalid" });
    }
    req.user = decoded;
    next();
  });
};

// ---------------- CRUD ROUTES ----------------

// All Foods
app.get("/all-foods", async (req, res) => {
  const result = await Foods.find().toArray();
  res.send(result);
});

// Search & Pagination
app.get("/foods", async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const filter = search.trim()
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const total = await Foods.countDocuments(filter);

    const filteredFood = await Foods.find(filter)
      .sort({ purchaseCount: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.send({
      total,
      filteredFood,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Food by ID
app.get("/food/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid food ID" });
    }
    const food = await Foods.findOne({ _id: new ObjectId(id) });
    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }
    res.json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update food
app.put("/food/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid food ID" });
    }
    const updateFields = req.body;
    updateFields.updatedAt = new Date();
    const result = await Foods.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Food not found" });
    }
    res.json({ success: true, message: "Food updated successfully", result });
  } catch (error) {
    console.error("Error updating food:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Delete food
app.delete("/food/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid food ID" });
    }
    const result = await Foods.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Food not found" });
    }
    res.json({ success: true, message: "Food deleted successfully", result });
  } catch (error) {
    console.error("Error deleting food:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// User APIs
app.get("/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ message: "uid is required" });
    }
    const user = await FoodHiveUsers.findOne({ uid });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { uid, phone, address } = req.body;
    if (!uid) {
      return res.status(400).json({ message: "uid is required" });
    }
    const existingUser = await FoodHiveUsers.findOne({ uid });
    if (existingUser) {
      const updateFields = { updatedAt: new Date() };
      if (phone !== undefined) updateFields.phone = phone;
      if (address !== undefined) updateFields.address = address;
      const result = await FoodHiveUsers.updateOne(
        { uid },
        { $set: updateFields }
      );
      res.json({ message: "User updated successfully", result });
    } else {
      const newUser = {
        uid,
        phone: phone || "",
        address: address || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await FoodHiveUsers.insertOne(newUser);
      res.json({ message: "User created successfully", result });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Top 6 Foods
app.get("/top-six-food", async (req, res) => {
  const result = await Foods.find()
    .sort({ purchaseCount: -1 })
    .limit(6)
    .toArray();
  res.send(result);
});

// Add Food
app.post("/foods", verifyToken, async (req, res) => {
  try {
    const {
      name,
      image,
      category,
      price,
      quantity,
      origin,
      ingredients,
      description,
      madeBy,
      addedBy,
    } = req.body;

    if (
      !name ||
      !image ||
      !category ||
      !price ||
      !quantity ||
      !origin ||
      !ingredients ||
      !madeBy
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (!addedBy || !addedBy.uid || !addedBy.email) {
      return res
        .status(400)
        .json({ message: "User authentication information is required" });
    }

    let processedIngredients = ingredients;
    if (typeof ingredients === "string") {
      processedIngredients = ingredients
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);
    }

    const newFood = {
      name: name.trim(),
      image: image.trim(),
      category: category.trim(),
      price: parseFloat(price),
      quantityAvailable: parseInt(quantity),
      originCountry: origin.trim(),
      description: description ? description.trim() : "",
      ingredients: processedIngredients,
      madeBy: madeBy.trim(),
      addedBy: {
        userId: addedBy.uid,
        name: addedBy.name || "Anonymous",
        email: addedBy.email,
        photoURL: addedBy.photoURL || "",
      },
      purchaseCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await Foods.insertOne(newFood);
    if (result.insertedId) {
      const createdFood = await Foods.findOne({ _id: result.insertedId });
      res.status(201).json({
        success: true,
        message: "Food item added successfully",
        data: createdFood,
        foodId: result.insertedId,
      });
    } else {
      throw new Error("Failed to insert food item");
    }
  } catch (error) {
    console.error("Error adding food:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// My Foods
app.get("/my-foods/:email", verifyToken, async (req, res) => {
  try {
    const { email } = req.params;
    if (req.user.email !== email)  {
      return res.status(403).json({ message: "Access denied" });
    }
    const userFoods = await Foods.find({ "addedBy.email": email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, count: userFoods.length, foods: userFoods });
  } catch (error) {
    console.error("Error fetching user foods:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update food purchase
app.put("/food/:id/purchase", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid food ID" });
    }
    if (!quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be a positive number" });
    }
    const food = await Foods.findOne({ _id: new ObjectId(id) });
    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }
    if (food.quantityAvailable < quantity) {
      return res
        .status(400)
        .json({ message: "Not enough quantity available" });
    }
    const result = await Foods.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { quantityAvailable: -quantity, purchaseCount: quantity },
        $set: { updatedAt: new Date() },
      }
    );
    res.json({ success: true, message: "Food purchase updated", result });
  } catch (error) {
    console.error("Error updating food purchase:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Orders
app.post("/orders", async (req, res) => {
  try {
    const { foodId, food, buyer, quantity, totalPrice, createdAt } = req.body;
    if (!foodId || !food || !buyer || !quantity || !totalPrice || !createdAt) {
      return res.status(400).json({ message: "Missing required order fields" });
    }
    const order = {
      foodId: new ObjectId(foodId),
      food,
      buyer,
      quantity: parseInt(quantity),
      totalPrice: parseFloat(totalPrice),
      createdAt: new Date(createdAt),
    };
    const result = await Orders.insertOne(order);
    if (result.insertedId) {
      res.status(201).json({
        success: true,
        message: "Order placed successfully",
        orderId: result.insertedId,
      });
    } else {
      throw new Error("Failed to place order");
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/orders", verifyToken, async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res
        .status(400)
        .json({ message: "Email query parameter is required" });
    }
    if (req.user.email !== email) {
      return res.status(403).json({ message: "Access denied" });
    }
    const orders = await Orders.find({ "buyer.email": email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ---------------- ROOT ----------------
app.get("/", (req, res) => {
  res.send("Food Hive Server is Running...");
});

// ---------------- LOCAL VS VERCEL ----------------
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`🚀 Food Hive Server is running locally on port ${port}`);
  });
}

module.exports = app;
