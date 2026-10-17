
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

require("./db/db");
const initSchema = require("./db/initSchema");

const reviewRoutes = require("./routes/reviews");
const shopRoutes = require("./routes/shops");
const adminRoutes = require("./routes/admin");
const recommendationRoutes = require("./routes/recommendation");
const favoritesRoutes = require("./routes/favorites");
const userRoutes = require("./routes/user");
const activityRoutes = require("./routes/activity");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve uploaded images
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// Serve the admin frontend before the /admin API router. The admin folder
// has admin.html rather than an index.html, so map the directory URL to it.
const frontendPath = path.join(__dirname, "..", "frontend");
const adminFrontendPath = path.join(frontendPath, "admin");
app.get(["/admin", "/admin/", "/admin/index.html"], (req, res) => {
    res.sendFile(path.join(adminFrontendPath, "admin.html"));
});
app.use("/admin", express.static(adminFrontendPath));

// API routes
app.use("/reviews", reviewRoutes);
app.use("/shops", shopRoutes);
app.use("/admin", adminRoutes);
app.use("/recommendations", recommendationRoutes);
app.use("/favorites", favoritesRoutes);
app.use("/user", userRoutes);
app.use("/activity", activityRoutes);

// Serve frontend static files
app.use(express.static(frontendPath));

// Error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    console.error(err);

    res.status(statusCode).json({
        error: err.message || "Internal server error"
    });
});

// Start server
async function startServer() {
    try {
        await initSchema();

        const port = Number(process.env.PORT || 5000);

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            console.log(`Frontend directory: ${frontendPath}`);
        });
    } catch (error) {
        console.error("Unable to initialize server:", error);
        process.exit(1);
    }
}

startServer();
