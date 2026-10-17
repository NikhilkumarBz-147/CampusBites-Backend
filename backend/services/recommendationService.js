const pool = require("../db/promiseDb");
const normalizeImageUrl = require("../utils/normalizeImageUrl");

async function getShopRecommendations(userId) {
    const numericUserId = Number(userId);

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        const error = new Error("A valid user_id is required");
        error.statusCode = 400;
        throw error;
    }

    const [shopRows] = await pool.query(`
        SELECT id, name, type, rating, image_url
        FROM shops
    `);
    const shops = shopRows.map((shop) => ({
        ...shop,
        image_url: normalizeImageUrl(shop.image_url)
    }));

    const [favoriteShops] = await pool.query(`
        SELECT DISTINCT f.shop_id
        FROM favorites f
        WHERE f.user_id = ?
    `, [numericUserId]);

    const [frequentVisits] = await pool.query(`
        SELECT shop_id, clicks
        FROM user_activity
        WHERE user_id = ?
    `, [numericUserId]);

    const favoriteShopSet = new Set(favoriteShops.map((row) => Number(row.shop_id)));

    let maxClicks = 0;
    const clicksByShop = new Map();

    frequentVisits.forEach((row) => {
        const clicks = Number(row.clicks || 0);
        clicksByShop.set(Number(row.shop_id), clicks);
        if (clicks > maxClicks) {
            maxClicks = clicks;
        }
    });

    const scoredShops = shops.map((shop) => {
        const shopId = Number(shop.id);
        const clicks = clicksByShop.get(shopId) || 0;
        const visitScore = maxClicks > 0 && clicks > 0 ? (clicks / maxClicks) * 3 : 0;
        const ratingScore = Number(shop.rating || 0);

        let score = ratingScore;

        if (favoriteShopSet.has(shopId)) {
            score += 5;
        }

        score += visitScore;

        return {
            ...shop,
            score: Number(score.toFixed(2)),
            score_breakdown: {
                favorite_shop: favoriteShopSet.has(shopId) ? 5 : 0,
                frequent_visit: Number(visitScore.toFixed(2)),
                shop_rating: ratingScore
            }
        };
    });

    return scoredShops
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return Number(b.rating || 0) - Number(a.rating || 0);
        })
        .slice(0, 5);
}

module.exports = {
    getShopRecommendations
};
