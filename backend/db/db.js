const mysql = require("mysql2");
const config = require("../config");

const db = mysql.createConnection({
    ...config
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("MySQL Connected ✅");
    }
});

module.exports = db;
