
const path = require("path");

// Load backend/.env when present
if (typeof process.loadEnvFile === "function") {
    try {
        process.loadEnvFile(path.join(__dirname, ".env"));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
}

module.exports = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "campusbites",
    port: Number(process.env.DB_PORT || 3306),

    // TiDB Cloud Starter public endpoints require TLS. Node.js uses its
    // built-in trusted CA store for certificate verification.
    ssl: process.env.DB_HOST
        ? {
            minVersion: "TLSv1.2",
            rejectUnauthorized: true
        }
        : undefined
};
