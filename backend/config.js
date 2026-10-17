// Load backend/.env when present. Node 20.6+ supports this API; missing .env is valid.
if (typeof process.loadEnvFile === "function") {
    try {
        process.loadEnvFile(require("path").join(__dirname, ".env"));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
}

module.exports = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "campusbites",
    port: Number(process.env.DB_PORT || 3306)
};
