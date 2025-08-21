//index.js in server side

// 1. Import core dependencies
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// 2. Middlewares
app.use(cors({
  origin: ['http://localhost:5175','http://localhost:5173','http://localhost:5174','http://localhost:5000'],
  credentials: true,
}));
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

// 4. CRUD Routes
async function run() {
  try {
    await client.connect();
    const Foods = client.db("FoodHiveDB").collection("Foods");

    // Auth APIs

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
          sameSite: "strict",
        })
        .cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: "strict",
        })
        .send({ success: true });
    });
    //Refresh → new Access Token
    app.post("/refresh", (req, res) => {
      const refreshToken = req.cookies?.refreshToken;
      const isProd = process.env.NODE_ENV === "production";

      if (!refreshToken) {
        return res.status(401).send({ message: "No refresh token" });
      }

      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
          if (err)
            return res.status(403).send({ message: "Invalid refresh token" });

          const newAccessToken = jwt.sign(
            { email: decoded.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
          );

          res
            .cookie("accessToken", newAccessToken, {
              httpOnly: true,
              secure: isProd,
              sameSite: "strict",
            })
            .send({ success: true });
        }
      );
    });
    //Logout → clear both
    app.post("/logout", (req, res) => {
      const isProd = process.env.NODE_ENV === "production";
      res
        .clearCookie("accessToken", {
          httpOnly: true,
          secure: isProd,
          sameSite: "strict",
          path: "/",
        })
        .clearCookie("refreshToken", {
          httpOnly: true,
          secure: isProd,
          sameSite: "strict",
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
        return res.status(403).send({ message: "Access Token Expired or Invalid" });
      }
      req.user = decoded;
      next();
    });
  };


    // All CRUD operations here...

    // All Foods
    app.get("/all-foods", async (req, res) => {
      const result = await Foods.find().toArray();
      res.send(result);
    });

    // Search & Pagination  both api
    /// GET /foods?search=burger&page=2&limit=9
    app.get("/foods", async (req, res) => {
      try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        // Filter condition
        const filter = search.trim()
          ? { name: { $regex: search, $options: "i" } } // case-insensitive search
          : {};

        // Get total count for pagination
        const total = await Foods.countDocuments(filter);

        // Fetch data with search + pagination
        const filteredFood = await Foods.find(filter)
          .sort({ purchaseCount: -1 }) // sort by purchaseCount (same as your old pagination)
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          total, // total matching foods
          filteredFood, // data for search & pagination  done
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Api for store user uid , phone , address
    const FoodHiveUsers = client.db("FoodHiveDB").collection("FoodHiveUsers"); //New collection for user info save

    // Updated GET endpoint for user uid
    app.get("/users/:uid", async (req, res) => {
      try {
        const { uid } = req.params;

        if (!uid) {
          return res.status(400).json({ message: "uid is required" });
        }

        const user = await FoodHiveUsers.findOne({ uid });

        if (user) {
          res.json(user); // Changed from res.send() to res.json()
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // Store user data (uid, phone, address)
    // Updated POST endpoint - allow partial updates
    app.post("/users", async (req, res) => {
      try {
        const { uid, phone, address } = req.body;

        // Only uid is required, phone and address are optional
        if (!uid) {
          return res.status(400).json({ message: "uid is required" });
        }

        // Check if user already exists
        const existingUser = await FoodHiveUsers.findOne({ uid });

        if (existingUser) {
          // Update existing user - only update provided fields
          const updateFields = { updatedAt: new Date() };
          if (phone !== undefined) updateFields.phone = phone;
          if (address !== undefined) updateFields.address = address;

          const result = await FoodHiveUsers.updateOne(
            { uid },
            { $set: updateFields }
          );
          res.json({ message: "User updated successfully", result });
        } else {
          // Create new user
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

    // Top 6 Foods by purchaseCount
    app.get("/top-six-food", async (req, res) => {
      const result = await Foods.find()
        .sort({ purchaseCount: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close(); // keep it open if you're hosting continuously
  }
}
run().catch(console.dir);

// 5. Basic route
app.get("/", (req, res) => {
  res.send("Food Hive Server is Running...");
});

// 6. Listen to port
app.listen(port, () => {
  console.log(`Food Hive Server is running on port ${port}`);
});
