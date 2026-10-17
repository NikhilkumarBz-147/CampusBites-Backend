const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

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

app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));

app.use("/reviews", reviewRoutes);
app.use("/shops", shopRoutes);
app.use("/admin", adminRoutes);
app.use("/recommendations", recommendationRoutes);
app.use("/favorites", favoritesRoutes);
app.use("/user", userRoutes);
app.use("/activity", activityRoutes);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    console.error(err);
    res.status(statusCode).json({
        error: err.message || "Internal server error"
    });
});

async function startServer() {
    try {
        await initSchema();

        const port = Number(process.env.PORT || 5000);
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error("Unable to initialize server:", error);
        process.exit(1);
    }
}

startServer();
