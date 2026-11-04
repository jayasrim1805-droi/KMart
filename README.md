# KMart – Campus Store Management System

## About the Project

KMart is a Full Stack Web Development project developed to make the campus store experience easier for students and administrators.

Through this application, students can browse products, add items to their cart, place pickup orders, and track their orders. The administrator can manage products, update stock, and handle student orders through an admin dashboard.

The project was developed using HTML, CSS, JavaScript, Bootstrap, Node.js, Express.js, and MongoDB.

## Project Objectives

- To develop a user-friendly campus store web application.
- To allow students to browse and order products online.
- To provide an easy way for administrators to manage products and stock.
- To implement secure login and role-based access.
- To maintain accurate product stock and order details.
- To gain practical experience in Full Stack Web Development.

## Features

### Student Features
- Student registration and login.
- Browse and search products.
- Filter products by category and price.
- View product details and stock availability.
- Add products to the shopping cart.
- Place pickup orders.
- View order history and order details.
- Cancel eligible orders.

### Admin Features
- Admin login and dashboard.
- View dashboard statistics.
- Add, edit, and manage products.
- Update product stock.
- View and manage student orders.
- Update order status.
- Monitor low-stock products.

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Web page structure |
| CSS3 | Styling |
| JavaScript | Frontend functionality |
| Bootstrap 5 | Responsive design |
| Node.js | Backend runtime |
| Express.js | Server and REST API |
| MongoDB | Database |
| Mongoose | Database operations |
| Git & GitHub | Version control and project hosting |

## Project Workflow

1. Students register or log in to the application.
2. Students browse products and add items to their cart.
3. Students place a pickup order.
4. The administrator views and confirms the order.
5. The administrator updates the order status.
6. Students can track their orders.
7. Product stock is updated based on the order and cancellation process.

**Note:** Students place orders online and collect and pay for their items at the campus store counter. Online payment is not included in this project.

## Project Structure

```text
KMart/
│
├── frontend/
│   ├── index.html
│   ├── products.html
│   ├── product-details.html
│   ├── cart.html
│   ├── checkout.html
│   ├── login.html
│   ├── register.html
│   ├── my-orders.html
│   ├── admin/
│   ├── css/
│   ├── js/
│   └── assets/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── utils/
│   ├── tests/
│   ├── app.js
│   └── server.js
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Installation and Setup

### Prerequisites

- Node.js
- MongoDB Community Server or MongoDB Atlas
- Git
- Visual Studio Code

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/KMart.git
```

```bash
cd KMart
```

### Step 2: Install Dependencies

```bash
npm run install-all
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root using the `.env.example` file.

Configure the required variables:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/kmart
JWT_SECRET=your_secure_secret_key
COOKIE_SECURE=false
LOW_STOCK_THRESHOLD=5
```

Use your own secure JWT secret. Do not upload your `.env` file to GitHub.

### Step 4: Seed Sample Products

```bash
npm run seed
```

This adds sample products to the database.

### Step 5: Create Admin Account

Configure the admin credentials in `.env` and run:

```bash
npm run create-admin
```

Remove the `ADMIN_PASSWORD` variable from `.env` after creating the admin account.

### Step 6: Run the Application

```bash
npm start
```

Open the application in your browser:

http://localhost:5000

## Database Collections

The application uses MongoDB with the following collections:

- **Users** – Stores student and administrator account details.
- **Products** – Stores product information, prices, categories, and stock.
- **Orders** – Stores order details, pickup information, and order status.

## Security Features

- Password hashing using bcrypt.
- JWT-based authentication.
- Role-based access for students and administrators.
- Server-side input validation.
- Protected admin routes.
- Secure HttpOnly authentication cookies.
- CSRF protection.
- API rate limiting.

## Future Enhancements

- Email notifications for order updates.
- Product image upload.
- Order pickup time slots.
- Reports and CSV export.
- Password reset functionality.
- Online payment integration.

## Conclusion

Developing KMart helped me gain practical experience in Full Stack Web Development. Through this project, I learned how to connect a frontend application with a backend server and MongoDB database, implement authentication, manage product inventory, and handle orders.

This project improved my understanding of web application development and gave me hands-on experience in building a complete client-server application.

---

**Developed as a Full Stack Development college project.**
**Developed as a Full Stack Development college project.**
