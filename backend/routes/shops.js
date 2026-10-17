const express = require("express");
const router = express.Router();
const db = require("../db/db");
const multer = require("multer");
const path = require("path");
const normalizeImageUrl = require("../utils/normalizeImageUrl");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "..", "uploads"));
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });


// ➕ Add Shop (WITH IMAGE)
router.post("/add", upload.single("image"), (req, res) => {
    const name = req.body && req.body.name;
    const type = req.body && req.body.type;
    const image_url = req.body && req.body.image_url;
    let finalImage = image_url;

    if (req.file) {
        finalImage = `/uploads/${req.file.filename}`;
    }

    if (!name || !type || !finalImage) {
        return res.status(400).send("Missing fields");
    }

    const query = `
        INSERT INTO shops (name, type, image_url)
        VALUES (?, ?, ?)
    `;

    db.query(query, [name, type, finalImage], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error adding shop");
        }

        res.send("Shop added successfully");
    });
});


// ➕ Add Menu Item
router.post("/add-item", (req, res) => {

    const { shop_id, item_name, price, category } = req.body;

    if (!shop_id || !item_name || !price) {
        return res.status(400).send("Missing fields");
    }

    const insertWithCategoryQuery = `
        INSERT INTO menu_items (shop_id, item_name, price, category)
        VALUES (?, ?, ?, ?)
    `;
    const insertFallbackQuery = `
        INSERT INTO menu_items (shop_id, item_name, price)
        VALUES (?, ?, ?)
    `;
    const valuesWithCategory = [shop_id, item_name, price, category || null];
    const fallbackValues = [shop_id, item_name, price];

    db.query(insertWithCategoryQuery, valuesWithCategory, (err) => {
        if (err && err.code === "ER_BAD_FIELD_ERROR") {
            db.query(insertFallbackQuery, fallbackValues, (fallbackErr) => {
                if (fallbackErr) {
                    console.log(fallbackErr);
                    return res.status(500).send("Error adding item");
                }

                return res.send("Item added successfully");
            });

            return;
        }

        if (err) {
            console.log(err);
            return res.status(500).send("Error adding item");
        }

        res.send("Item added successfully");
    });
});


// 📥 Get All Shops (FIXED ✅)
router.get("/", (req, res) => {

    const search = req.query.search || "";
    const value = `%${search}%`;

    const query = `
        SELECT 
            s.id,
            s.name,
            s.type,
            s.rating,
            s.image_url,

            -- ✅ Pick one item safely
            MIN(m.item_name) AS item_name,
            MIN(m.price) AS price,

            -- ✅ Check if ANY menu item matches search
            MAX(
                CASE 
                    WHEN m.item_name LIKE ? THEN 1
                    ELSE 0
                END
            ) AS is_popular_match,

            -- ✅ Check if shop has matching item
            MAX(
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM menu_items mi 
                        WHERE mi.shop_id = s.id 
                        AND mi.item_name LIKE ?
                    ) THEN 1
                    ELSE 0
                END
            ) AS has_match

        FROM shops s
        LEFT JOIN menu_items m 
            ON s.id = m.shop_id

        GROUP BY s.id

        ORDER BY 
            is_popular_match DESC,
            has_match DESC,
            s.rating DESC
    `;

    db.query(query, [value, value], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        }

        res.json(result.map((shop) => ({
            ...shop,
            image_url: normalizeImageUrl(shop.image_url)
        })));
    });
});


// 📥 Get Menu of a Shop
router.get("/menu/:shop_id", (req, res) => {

    const shop_id = req.params.shop_id;

    const queryWithCategory = `
        SELECT id, item_name, price, category
        FROM menu_items
        WHERE shop_id = ?
    `;
    const fallbackQuery = `
        SELECT id, item_name, price
        FROM menu_items
        WHERE shop_id = ?
    `;

    db.query(queryWithCategory, [shop_id], (err, result) => {
        if (err && err.code === "ER_BAD_FIELD_ERROR") {
            db.query(fallbackQuery, [shop_id], (fallbackErr, fallbackResult) => {
                if (fallbackErr) {
                    console.log(fallbackErr);
                    return res.status(500).send("Error fetching menu");
                }

                return res.json(fallbackResult);
            });

            return;
        }

        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching menu");
        }

        res.json(result);
    });
});


router.delete("/menu/delete/:id", (req, res) => {

    const id = req.params.id;

    db.query("DELETE FROM menu_items WHERE id = ?", [id], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error deleting item");
        }

        res.send("Menu item deleted successfully");
    });
});


// ❌ Delete Shop
router.delete("/delete/:id", (req, res) => {

    const id = req.params.id;

    db.query("DELETE FROM shops WHERE id = ?", [id], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error deleting shop");
        }

        res.send("Shop deleted successfully");
    });
});


// ✏️ Update Shop
router.put("/update/:id", (req, res) => {

    const id = req.params.id;
    const { name, type, image_url } = req.body;

    const query = `
        UPDATE shops 
        SET name=?, type=?, image_url=? 
        WHERE id=?
    `;

    db.query(query, [name, type, image_url, id], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error updating shop");
        }

        res.send("Shop updated successfully");
    });
});


module.exports = router;
