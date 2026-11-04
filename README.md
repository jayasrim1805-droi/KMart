# KMart – Campus Store Management System

A full-stack web application where students browse a campus store, fill a cart and place **pickup orders**, and administrators manage products, stock and orders. Built with **HTML, CSS, vanilla JavaScript, Bootstrap 5.3, Node.js, Express and MongoDB (Mongoose)** for a college Full Stack Development course.

> **Honest status note:** the project was written and checked in an environment with no internet and no MongoDB. See [What has and has not been tested](#what-has-and-has-not-been-tested) before your demo, and run `npm test` once on your own computer.

---

## 1. Project overview
KMart digitises a campus store. Students reserve items online and collect and pay at the physical counter (there is **no online payment**). Admins see every order, move it through a simple status flow, and keep stock correct.

## 2. Problem statement
Queues at campus stores waste student time, and staff cannot easily see what is in stock or what has been asked for. KMart gives students a place to reserve items and gives staff a live view of products, stock and orders.

## 3. Objectives
- Build a complete client-server application with a REST API and a MongoDB database.
- Show correct authentication, role-based authorisation and server-side validation.
- Keep inventory correct even when two students order the last item at the same moment.
- Provide a responsive, accessible interface using Bootstrap.

## 4. Main features
**Students:** register / log in / log out · browse products with pagination · search, category and price filters, sorting · product details with stock check · cart (add, +/−, remove, clear, saved in the browser) · checkout with order summary · unique order reference (e.g. `KM-261031-7QX4TB`) · order history and details · cancel an order while it is *Pending* or *Confirmed*.

**Admins:** dashboard statistics · add / edit / hide / delete products · +/− stock adjustment · low-stock warnings · search and filter orders · update order status using allowed transitions · cancelling restores stock exactly once.

## 5. Technology stack
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript, Bootstrap 5.3.3, Bootstrap Icons (from the jsDelivr CDN), Google Fonts (with fallbacks) |
| Backend | Node.js 18+, Express 4 |
| Database | MongoDB with Mongoose 8 |
| Security libs | bcryptjs, jsonwebtoken, helmet, express-rate-limit, express-validator, cookie-parser, dotenv |
| Testing | Jest, Supertest, mongodb-memory-server |

> The browser needs internet access to load Bootstrap, icons and fonts from CDNs. The CDN links do not use Subresource Integrity hashes (add them before real deployment).

## 6. Architecture
```
Browser (HTML + CSS + JS + Bootstrap)
        │  fetch('/api/...')  — same origin, cookies sent automatically
        ▼
Express server (backend/app.js)
   helmet → json → cookies → rate limit → CSRF check → routes → controllers → Mongoose models
        │                                                       └─ services/orderService.js (stock rules)
        ▼
MongoDB
```
Express **also serves the frontend files**, so the pages and the API share one origin (`http://localhost:5000`). That means no CORS configuration is needed and cookies work simply.

**Authentication design.** On login the server sends a signed JWT in an **HttpOnly, SameSite=Strict cookie** (JavaScript cannot read it, which limits damage from XSS). Because cookies are sent automatically, state-changing requests are protected against CSRF with a **double-submit token**: a second readable cookie (`kmart_csrf`) must be copied into the `X-CSRF-Token` header (`frontend/js/api.js` does this). Nothing sensitive is stored in `localStorage` – only the shopping cart.

## 7. Folder structure
```
KMart/
├── frontend/
│   ├── index.html  products.html  product-details.html  cart.html  checkout.html
│   ├── login.html  register.html  my-orders.html  order-details.html
│   ├── admin/ dashboard.html  products.html  product-form.html  orders.html
│   ├── css/style.css
│   ├── js/ api.js  common.js  cart.js  home.js  products.js  product-details.js
│   │       checkout.js  auth.js  my-orders.js  order-details.js
│   │   └─ admin/ dashboard.js  products.js  product-form.js  orders.js
│   └── assets/images/ (placeholder, favicon, products/*.svg)
├── backend/
│   ├── config/ (env, db, constants)    ├── models/ (User, Product, Order)
│   ├── routes/                         ├── controllers/
│   ├── middleware/ (auth, csrf, validators, errorHandler, rateLimiters, adminPageGuard)
│   ├── services/orderService.js        ├── utils/ (status rules, money, tokens…)
│   ├── scripts/ (seed, createAdmin, sampleProducts, generateImages)
│   ├── tests/ (auth, products, orders, unit/)
│   ├── app.js   server.js   package.json
├── .env.example   .gitignore   package.json   README.md
```

## 8. Prerequisites
- **Node.js 18 or newer** (https://nodejs.org – LTS) – check with `node -v`
- **MongoDB**: either a free **MongoDB Atlas** cluster (recommended) or MongoDB Community Server installed locally
- A modern browser and an internet connection (for the Bootstrap CDN)

## 9. MongoDB Atlas setup (recommended)
1. Create a free account at https://www.mongodb.com/atlas and create a free **M0** cluster.
2. **Database Access** → *Add New Database User* → choose a username and a strong password (note them).
3. **Network Access** → *Add IP Address* → add your current IP (or `0.0.0.0/0` for a short class demo only).
4. **Database** → *Connect* → *Drivers* → copy the connection string. It looks like  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Insert the database name `kmart` before the `?` and replace `USER`/`PASSWORD`:  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/kmart?retryWrites=true&w=majority`  
   (If the password has special characters such as `@` or `#`, URL-encode them.)
6. Paste this value as `MONGODB_URI` in your `.env` file.

## 10. Local MongoDB setup (alternative)
1. Install **MongoDB Community Server** from https://www.mongodb.com/try/download/community (tick *Install as a Service* on Windows).
2. Check it is running: in PowerShell `Get-Service MongoDB` should show *Running*.
3. Use `MONGODB_URI=mongodb://127.0.0.1:27017/kmart`.

**Transactions / replica set:** KMart does **not** need MongoDB multi-document transactions, so a standalone local server works. Overselling is prevented with *atomic conditional updates* (see [Inventory](#inventory-and-overselling)). Atlas clusters are replica sets anyway; a local standalone is fine.

## 11. Environment configuration
From the project folder (PowerShell):
```powershell
Copy-Item .env.example .env
notepad .env
```
| Variable | Meaning |
|---|---|
| `PORT` | Server port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Random string, **32+ characters** (the server refuses to start otherwise) |
| `COOKIE_SECURE` | `true` only when serving over HTTPS |
| `LOW_STOCK_THRESHOLD` | Stock at or below this is "low" (default 5) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by `create-admin` |
| `TEST_MONGODB_URI` | Optional isolated DB for tests (name must contain `test`) |

Generate a secret:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
The real `.env` is in `.gitignore`; never share it.

## 12. Install, seed and run (Windows PowerShell)
```powershell
cd KMart
npm run install-all          # installs backend dependencies
Copy-Item .env.example .env  # then edit .env (MONGODB_URI, JWT_SECRET)
npm run seed                 # adds 18 sample products (safe to repeat)
npm run create-admin         # creates the first administrator (see next section)
npm start                    # or: npm run dev   (auto-restarts on changes)
```
Open **http://localhost:5000** in your browser (always through this address – do not double-click the HTML files).

### Database seeding
`npm run seed` inserts 18 products across 6 categories (Stationery, Books, Snacks, Beverages, Accessories, College Essentials). It adds only products whose name does not exist yet, so running it again never duplicates products or overwrites prices/stock you changed. One product has 0 stock and one has low stock to demonstrate those states. Product pictures are local SVG files in `frontend/assets/images/products/`.

## 13. Secure administrator creation
There is **no default admin account** and public registration can only create students.
1. In `.env` set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (10+ characters, letters and numbers), optionally `ADMIN_NAME`.
2. Run `npm run create-admin`.
3. **Delete `ADMIN_PASSWORD` from `.env`** afterwards. The password is stored only as a bcrypt hash.
4. If the email already exists the script changes nothing.

## 14. Using the application
**Student:** open the site → *Register* → browse *Products* → *Add to cart* → *Cart* → *Checkout* (login required) → confirm. Track it in *My Orders*.
**Administrator:** go to *Login*, use the admin email/password; you are taken to the Admin Dashboard (also under the account menu). Non-admins cannot open `/admin/*` pages, and every admin API route re-checks the role on the server.

### Order statuses
`Pending → Confirmed → Ready for Pickup → Completed`, and `Cancelled`.
| From | Admin may move to |
|---|---|
| Pending | Confirmed, Cancelled |
| Confirmed | Ready for Pickup, Cancelled |
| Ready for Pickup | Completed, Cancelled |
| Completed / Cancelled | *(final – no changes)* |

Students may cancel only while **Pending** or **Confirmed**. Cancelling restores stock **once**: the status change and a `stockRestored` flag are set in one atomic update, so repeated or simultaneous cancels cannot return stock twice.

### How dashboard statistics are calculated
- **Total sales** = sum of `totalAmount` of orders with status **Completed** only. Pending, Confirmed and Ready orders are not yet sales; Cancelled orders are never sales.
- **Pending / Completed orders** = number of orders in that status. **Total orders** counts all statuses.
- **Low stock** = active products with `stock ≤ LOW_STOCK_THRESHOLD` (includes 0).
- Order totals use the **price at purchase time** stored in the order, so later price changes never alter history.

### Inventory and overselling
At checkout the server ignores any price or total from the browser. For each product it runs  
`findOneAndUpdate({ _id, isActive: true, stock: { $gte: qty } }, { $inc: { stock: -qty } })`.  
MongoDB executes that as a single atomic operation, so two students cannot both take the last item. If any later step fails, stock already taken is put back. A per-checkout **idempotency key** prevents double submissions from creating two orders. The cart is kept if checkout fails.

**Deleting products:** a product that appears in any past order is **hidden** (`isActive:false`) instead of deleted, so order history stays intact; an unused product is deleted.

## 15. API documentation
All responses are JSON: `{ "success": true, "data": … }` or `{ "success": false, "message": "…", "errors": [...] }`. State-changing requests from a logged-in browser need the `X-CSRF-Token` header (handled by `api.js`).

| Method & path | Access | Purpose |
|---|---|---|
| POST `/api/auth/register` | public | Create a **student** account (name, email, password) |
| POST `/api/auth/login` | public | Log in (sets cookies) |
| POST `/api/auth/logout` | any | Clear cookies |
| GET `/api/auth/me` | logged in | Current user |
| GET `/api/products` | public | Active products. Query: `page, limit(≤50), search, category, minPrice, maxPrice, sort(name_asc, name_desc, price_asc, price_desc, newest), inStock, featured, ids` |
| GET `/api/products/categories` | public | Categories with counts |
| GET `/api/products/:id` | public (admin also sees hidden) | One product |
| POST `/api/products` | admin | Create product |
| PUT `/api/products/:id` | admin | Update product |
| PATCH `/api/products/:id/stock` | admin | `{ "adjustment": 10 }` relative stock change |
| DELETE `/api/products/:id` | admin | Delete, or hide if used in orders |
| POST `/api/orders` | logged in | `{ items:[{productId, quantity}], pickupInformation:{contactName, phone, note}, idempotencyKey }` |
| GET `/api/orders/my-orders` | logged in | Own orders (paginated) |
| GET `/api/orders/:id` | owner or admin | Order details |
| PATCH `/api/orders/:id/cancel` | owner | Cancel while Pending/Confirmed |
| GET `/api/admin/dashboard` | admin | Statistics, low-stock list, recent orders |
| GET `/api/admin/products` | admin | All products incl. hidden; extra filters `status`, `lowStock` |
| GET `/api/admin/orders` | admin | Orders; filters `status`, `q` (order no., student name/email) |
| PATCH `/api/admin/orders/:id/status` | admin | `{ "status": "Confirmed" }` (checked against allowed transitions) |
| GET `/api/health` | public | Health check |

Status codes: 400 validation · 401 not logged in · 403 not allowed / CSRF · 404 not found · 409 conflict (duplicate email, stock, invalid transition) · 429 too many requests.

## 16. Automated tests
```powershell
npm test            # all tests (needs MongoDB for the integration tests, see below)
npm run test:unit   # pure-logic tests only, no database needed
```
Integration tests (`auth`, `products`, `orders`) use an **isolated** database and never touch your development data:
- **Default:** a temporary in-memory MongoDB (`mongodb-memory-server`). The first run downloads a MongoDB binary, so internet is required once.
- **Or** set `TEST_MONGODB_URI` in `.env` (e.g. `mongodb://127.0.0.1:27017/kmart_test`). The database name **must contain `test`**; otherwise the tests refuse to run.

Covered: registration (success, duplicate, weak password, role ignored), login (valid/invalid), admin route protection (401/403), CSRF rejection, product listing/filters/validation, admin product CRUD, student blocked from product creation, order placement with server-side prices, insufficient stock, invalid quantity, idempotent double submit, concurrent last-item orders, other-student access (403), valid/invalid status transitions, cancel + stock restored once, dashboard sales excluding cancelled, deleting products used in orders.

## 17. Manual test checklist (demo script)
1. Register a student → you are logged in; the navbar shows your name.
2. Products page: search "pen", filter a category, set a price range, sort, *Clear filters*.
3. Open an out-of-stock product → *Add to cart* is disabled. Try quantity larger than stock → error message.
4. Add items; change quantities in the cart; refresh the page (cart persists); remove one; *Clear cart* asks for confirmation.
5. Log out, open Checkout → redirected to Login, then returned to Checkout after login.
6. Place an order → confirmation with an order reference; the cart empties; *My Orders* lists it.
7. Log in as admin → Dashboard: pending order count increased; stock of the ordered products decreased.
8. Admin → Orders: open the order, **Mark Confirmed → Mark Ready for Pickup → Mark Completed**; the Completed order now adds to *Total sales*.
9. Place another order, cancel it (as student or admin) → stock returns; it is not counted in sales.
10. Admin → Products: add, edit, hide, adjust stock (+/−), delete a product; try a negative price (rejected).
11. Try opening `/admin/dashboard.html` while logged out or as a student → redirected away.
12. Stop the server while on a page → friendly error message with *Try again*.

## 18. Troubleshooting
| Problem | Fix |
|---|---|
| `Configuration error: JWT_SECRET…` | `.env` missing or the secret is a placeholder/shorter than 32 chars. |
| `Could not reach MongoDB` / `ECONNREFUSED` | Local: start the MongoDB service. Atlas: check IP allow-list, username/password and that the URI includes `/kmart`. |
| `bad auth` / authentication failed | Wrong Atlas user/password; URL-encode special characters. |
| `EADDRINUSE` port already used | Change `PORT` in `.env` or stop the other program. |
| Pages look unstyled, no icons | No internet – Bootstrap/Fonts load from a CDN. |
| "Security check failed" (403) | Cookies blocked or the page is stale: refresh, log in again. Always use `http://localhost:PORT`. |
| Logged out immediately after login on a deployed site | `COOKIE_SECURE=true` requires HTTPS; keep it `false` on plain HTTP. |
| `create-admin` says user exists | That email is already registered; use another email. |
| Tests: memory server download fails | Set `TEST_MONGODB_URI` to a `…_test` database instead. |
| `npm` scripts not recognised in PowerShell | Run from the folder containing the root `package.json` (`KMart`). |

## 19. Security notes
Implemented: bcrypt password hashing (12 rounds) · server-side validation on every endpoint · role-based access and ownership checks · HttpOnly + SameSite=Strict cookie · CSRF double-submit token · rate limiting (20 login/register attempts per 15 minutes per IP, 600 API requests) · helmet headers with a Content-Security-Policy · no inline scripts · user text inserted with `textContent` (no unsafe `innerHTML`) · NoSQL-injection-safe regex escaping and `isMongoId`/type validation · passwords hashes never returned · secrets only in `.env` · whitelisted fields on product updates (no mass assignment) · generic login error message.

Known limits (be honest in your viva): this is a **student project that has not had a security audit**; JWTs are stateless, so a stolen cookie works until it expires (1 day) even after logout; no email verification or password reset; rate limiting is in-memory per server process; if deployed behind a proxy set `app.set('trust proxy', …)` and use HTTPS with `COOKIE_SECURE=true`; CDN assets lack SRI hashes; the low-stock badge colour in the admin table assumes the default threshold of 5.

## 20. What has and has not been tested
This project was generated in a sandbox **without internet or MongoDB**, so the following was done there:
- ✅ Syntax check (`node --check`) of every backend and frontend JavaScript file.
- ✅ Unit tests for status transitions, money maths and order numbers.
- ✅ A real-browser (Chromium/Playwright) smoke test of the frontend flows – home, catalogue search/filter, product detail, cart maths and persistence, login redirect, checkout validation, order confirmation, order history, admin pages – against a **mock** API (not the real server).
- ✅ Static checks: all `require` paths, HTML asset links, and every frontend API call matching a backend route.
- ❌ **Not run:** `npm install`, the Express server, the MongoDB models, the Jest/Supertest integration tests, and the seed/admin scripts against a real database. The integration tests are written but have **never been executed**; expect to fix small issues the first time you run `npm test`.
- No `package-lock.json` is included (it can only be generated with network access); `npm run install-all` creates it.

## 21. Future enhancements
Email notifications when an order is ready · password reset and email verification · product image upload · order pickup time slots · reports/CSV export · admin user management · MongoDB transactions for stricter multi-step guarantees · Subresource Integrity and a bundled copy of Bootstrap for offline labs.
