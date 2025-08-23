# Food Hive Server

[Live API on Vercel](https://food-hive-server.vercel.app/)

---

## 🚀 About Food Hive
Food Hive is a modern, full-stack food marketplace backend built for speed, security, and scalability. Designed for real-world production, it powers food listing, search, ordering, and user management for web and mobile clients. 

This project is a showcase of professional Node.js, Express, and MongoDB engineering, with robust authentication, RESTful APIs, and best practices for cloud deployment (Vercel-ready!).

---

## 🛠️ Tech Stack
- **Node.js** (Express.js)
- **MongoDB** (Atlas)
- **JWT Authentication**
- **Cookie-based sessions**
- **CORS** (secure, multi-origin)
- **Vercel Serverless**
- **RESTful API Design**

---

## 🌐 Live API
- **Base URL:** [`https://food-hive-server.vercel.app/`](https://food-hive-server.vercel.app/)

---

## 📦 Main Features
- **User Authentication:** JWT, refresh tokens, secure cookies
- **Food CRUD:** Add, update, delete, search, paginate, get by ID
- **Order System:** Place orders, get orders by user
- **Purchase Logic:** Atomic update of food quantity and purchase count
- **User Profile:** Save and update user info
- **Top Foods:** Get top 6 foods by purchase count
- **Production-Ready:** Vercel serverless, lazy DB connection, secure CORS

---

## 🔑 API Endpoints

### Auth
- `POST /jwt` — Login, get access/refresh tokens
- `POST /refresh` — Refresh access token
- `POST /logout` — Logout, clear cookies

### Foods
- `GET /all-foods` — Get all foods
- `GET /foods?search=&page=&limit=` — Search & paginate foods
- `GET /food/:id` — Get food by ID
- `POST /foods` — Add food (auth required)
- `PUT /food/:id` — Update food by ID
- `DELETE /food/:id` — Delete food by ID
- `PUT /food/:id/purchase` — Update quantity/purchase count after purchase
- `GET /top-six-food` — Get top 6 foods

### Users
- `GET /users/:uid` — Get user by UID
- `POST /users` — Create/update user
- `GET /my-foods/:uid` — Get foods added by user (auth required)

### Orders
- `POST /orders` — Place an order
- `GET /orders?email=` — Get orders by buyer email (auth required)

---

## 📝 Example Order Object
```json
{
  "foodId": "66b5f4f29d1b23a4e1c2a9b3",
  "food": {
    "image": "...",
    "name": "Pepperoni Pizza",
    "price": 13.99,
    "owner": "Mostafijur Ruman",
    "ownerEmail": "mostafijurruman7@gmail.com"
  },
  "buyer": {
    "uid": "MR7",
    "name": "Mostafijur Ruman",
    "email": "mostafijurruman7@gmail.com"
  },
  "quantity": 2,
  "totalPrice": 27.98,
  "createdAt": "2025-08-18T14:13:02.000Z"
}
```

---

## 🛡️ Security & Best Practices
- **Environment Variables:** All secrets managed via Vercel dashboard
- **No hardcoded credentials**
- **CORS:** Only trusted origins allowed
- **JWT & Cookies:** Secure, httpOnly, sameSite
- **MongoDB:** Uses Atlas, lazy connection for serverless

---

## 💼 Why This Project Stands Out
- **Production-grade code**: Clean, modular, scalable
- **Cloud-native**: Vercel serverless, zero-downtime deploys
- **Modern stack**: JWT, REST, MongoDB Atlas
- **Professional documentation**: Easy for recruiters & teams
- **Job-ready skills**: Real-world backend, security, API design

---

## 📣 Contact & Credits
- **Author:** Mostafijur Ruman
- **Email:** mostafijurruman7@gmail.com
- **Live API:** [`https://food-hive-server.vercel.app/`](https://food-hive-server.vercel.app/)
- **Frontend:** [Food Hive Web App](https://foodhivee.web.app)

---

## 🏆 Recruiter Highlights
- **Ready for enterprise**: Scalable, secure, cloud-deployed
- **Easy integration**: Plug-and-play REST API
- **Impressive codebase**: Shows mastery of Node.js, Express, MongoDB, JWT
- **Live demo**: See it in action instantly

---

## 🚦 How to Run Locally
1. Clone repo
2. Add `.env` with MongoDB and JWT secrets
3. `npm install`
4. `npm run dev` or `node index.js`

---

## 📄 License
MIT
