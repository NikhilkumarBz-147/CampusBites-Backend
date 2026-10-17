const storedUser = JSON.parse(localStorage.getItem("user"));
let favoriteShops = [];
const recommendationSection = document.getElementById("recommendationSection");

if (!storedUser && recommendationSection) {
    recommendationSection.style.display = "none";
}

if (storedUser) {
    const signupCard = document.querySelector(".signup-card");
    if (signupCard) signupCard.style.display = "none";
}

if (storedUser) {
    document.getElementById("nav-right").innerHTML = `
        <span class="user-name">\uD83D\uDC64 ${storedUser.name}</span>
        <button class="menu-btn nav-action-btn" onclick="showFavorites()">\u2764\uFE0F Favorites</button>
        <button class="menu-btn nav-action-btn" onclick="showChangePassword()">\u2699\uFE0F Change Password</button>
        <button class="logout-btn" onclick="logout()">Logout</button>
    `;
}

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    window.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
    let shops = [];
    let currentShopId = null;
    let recommendedIds = [];

    const API_BASE_URL = window.location.protocol === "file:"
        ? "http://localhost:5000"
        : window.location.origin;
    const container = document.getElementById("shopContainer");
    const recommendationsContainer = document.getElementById("recommendations");
    const favoritesSection = document.getElementById("favoritesSection");
    const favoritesContainer = document.getElementById("favoritesContainer");
    const allShopsHeading = document.getElementById("allShopsHeading");
    const searchContainer = document.querySelector(".search-container");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    const filtersContainer = document.querySelector(".filters");
    const passwordModal = document.getElementById("passwordModal");
    const priceFilter = document.getElementById("priceFilter");
    const typeFilter = document.getElementById("typeFilter");
    const reviewTextInput = document.getElementById("reviewText");
    const ratingInput = document.getElementById("rating");
    const oldPassInput = document.getElementById("oldPass");
    const newPassInput = document.getElementById("newPass");
    const confirmPassInput = document.getElementById("confirmPass");

    function getCurrentUser() {
        return JSON.parse(localStorage.getItem("user"));
    }

    function getStoredUserId() {
        const currentUser = getCurrentUser();

        if (currentUser?.id) {
            localStorage.setItem("user_id", String(currentUser.id));
            return Number(currentUser.id);
        }

        const savedUserId = Number(localStorage.getItem("user_id"));
        return Number.isInteger(savedUserId) && savedUserId > 0 ? savedUserId : null;
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const message = typeof payload === "string"
                ? payload
                : payload?.error || payload?.message || "Request failed";
            throw new Error(message);
        }

        return payload;
    }

    function normalizeShop(shop) {
        return {
            id: shop.id,
            name: shop.name,
            type: shop.type,
            rating: Number(shop.rating || 0),
            recommendationScore: Number(shop.score || 0),
            image: shop.image_url,
            image_url: shop.image_url,
            popularItem: {
                name: shop.item_name,
                price: shop.price
            },
            menu: shop.menu || [],
            reviews: shop.reviews || [],
            reviewsLoaded: Boolean(shop.reviewsLoaded)
        };
    }

    function showMainShopView() {
        container.style.display = "grid";
        allShopsHeading.style.display = "block";
        favoritesSection.style.display = "none";
        searchContainer.style.display = "block";
        searchResults.style.display = "block";
        filtersContainer.style.display = "flex";

        if (storedUser && recommendationSection) {
            recommendationSection.style.display = "block";
        }
    }

    function hasActiveFilters() {
        return Boolean(priceFilter.value || typeFilter.value);
    }

    function setMainListingVisibility(isVisible) {
        container.style.display = isVisible ? "grid" : "none";
        allShopsHeading.style.display = isVisible ? "block" : "none";
    }

    function syncRecommendationVisibility(shouldHide = false) {
        if (!recommendationSection) {
            return;
        }

        if (!storedUser) {
            recommendationSection.style.display = "none";
            return;
        }

        recommendationSection.style.display = shouldHide ? "none" : "block";
    }

    function loadFavorites() {
        if (!storedUser) {
            favoriteShops = [];
            return Promise.resolve();
        }

        return fetch(`${API_BASE_URL}/favorites/${storedUser.id}`)
            .then((res) => res.json())
            .then((data) => {
                favoriteShops = data.map((favorite) => Number(favorite.shop_id));
            })
            .catch((err) => {
                console.log("Favorites Error:", err);
                favoriteShops = [];
            });
    }

    function formatToday() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function timeAgo(dateValue) {
        if (!dateValue) {
            return "";
        }

        const createdAt = new Date(dateValue.replace(" ", "T"));
        const seconds = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000));

        if (seconds < 60) {
            return `${seconds || 1} sec ago`;
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} min ago`;
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours} hr ago`;
        }

        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `${days} day${days === 1 ? "" : "s"} ago`;
        }

        const weeks = Math.floor(days / 7);
        if (weeks < 5) {
            return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
        }

        const months = Math.floor(days / 30);
        if (months < 12) {
            return `${months} month${months === 1 ? "" : "s"} ago`;
        }

        const years = Math.floor(days / 365);
        return `${years} year${years === 1 ? "" : "s"} ago`;
    }

    function findShop(shopId) {
        return shops.find((shop) => String(shop.id) === String(shopId));
    }

    function updateShopRatingFromReviews(shop) {
        if (!shop) {
            return;
        }

        if (!shop.reviews.length) {
            shop.rating = 0;
            return;
        }

        const total = shop.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
        shop.rating = total / shop.reviews.length;
    }

    function getReviewsMarkup(shop) {
        if (!shop.reviewsLoaded) {
            return `
                <h4>Reviews:</h4>
                <p>Loading reviews...</p>
            `;
        }

        if (!shop.reviews.length) {
            return `
                <h4>Reviews:</h4>
                <p>No reviews yet</p>
            `;
        }

        const currentUser = getCurrentUser();

        return `
            <h4>Reviews:</h4>
            ${shop.reviews.map((review) => {
                const canDelete = currentUser && Number(review.user_id) === Number(currentUser.id);

                return `
                    <div class="review-item">
                        <p><strong>${escapeHtml(review.user)}</strong> (${Number(review.rating).toFixed(1)}\u2B50)</p>
                        <p>${escapeHtml(review.text)}</p>
                        <p class="review-time">${escapeHtml(timeAgo(review.createdAt))}</p>
                        ${canDelete ? `<button class="delete-review-btn" data-id="${review.id}" data-shop-id="${shop.id}">Delete</button>` : ""}
                    </div>
                `;
            }).join("")}
        `;
    }

    function renderShopCard(shop) {
        const isFavorite = favoriteShops.includes(Number(shop.id));
        const recommendationBadge = shop.recommendationScore
            ? `<p class="recommendation-score">Recommended score: ${shop.recommendationScore.toFixed(2)}</p>`
            : "";

        return `
            <div class="card" data-id="${shop.id}">
                <div class="image-wrapper">
                    <img
                        src="${shop.image || shop.image_url || "https://via.placeholder.com/300"}"
                        class="card-img"
                        loading="lazy"
                        onerror="this.src='https://via.placeholder.com/300'"
                    >
                </div>

                <h3 style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <span>${escapeHtml(shop.name)}</span>
                    <span
                        class="favorite-toggle"
                        data-id="${shop.id}"
                        style="cursor:pointer;"
                        title="Toggle favorite"
                    >${isFavorite ? "❤️" : "🤍"}</span>
                </h3>

                <p>\u2B50 <strong class="shop-rating">${Number(shop.rating || 0).toFixed(1)}</strong> • Overall Rating</p>

                <p>\uD83D\uDD25 <strong>Popular:</strong>
                    ${shop.popularItem?.name
                        ? `${escapeHtml(shop.popularItem.name)} (\u20B9${escapeHtml(shop.popularItem.price)})`
                        : "No items yet"}
                </p>

                <p>${shop.type === "veg" ? "\uD83C\uDF31 Veg" : shop.type === "nonveg" ? "\uD83C\uDF57 Non-Veg" : "Food Shop"}</p>
                ${recommendationBadge}

                <button class="menu-btn" data-id="${shop.id}">View Menu</button>
                <button class="review-btn" data-id="${shop.id}">Add Review</button>

                <div class="reviews">
                    ${getReviewsMarkup(shop)}
                </div>
            </div>
        `;
    }

    function updateSingleCard(shopId) {
        const shop = findShop(shopId);

        if (!shop) {
            return;
        }

        document.querySelectorAll(`.card[data-id="${shopId}"]`).forEach((card) => {
            const reviewsDiv = card.querySelector(".reviews");
            const ratingValue = card.querySelector(".shop-rating");

            if (reviewsDiv) {
                reviewsDiv.innerHTML = getReviewsMarkup(shop);
            }

            if (ratingValue) {
                ratingValue.textContent = Number(shop.rating || 0).toFixed(1);
            }
        });

        attachDeleteEvents();
    }

    function loadReviews(shopId) {
        return fetch(`${API_BASE_URL}/reviews/${shopId}`)
            .then((res) => res.json())
            .then((data) => {
                const shop = findShop(shopId);

                if (!shop) {
                    return;
                }

                shop.reviews = data.map((review) => ({
                    id: review.id,
                    user_id: review.user_id,
                    user: review.username,
                    username: review.username,
                    text: review.review_text,
                    review_text: review.review_text,
                    rating: Number(review.rating),
                    review_date: review.review_date,
                    createdAt: review.created_at
                }));
                shop.reviewsLoaded = true;
                updateShopRatingFromReviews(shop);
                updateSingleCard(shopId);
            })
            .catch((err) => console.log("Review Error:", err));
    }

    function loadMenus() {
        shops.forEach((shop) => {
            fetch(`${API_BASE_URL}/shops/menu/${shop.id}`)
                .then((res) => res.json())
                .then((menu) => {
                    const targetShop = findShop(shop.id);
                    if (targetShop) {
                        targetShop.menu = menu;
                    }
                })
                .catch((err) => console.log("Menu Error:", err));
        });
    }

    async function trackShopActivity(shopId) {
        const userId = getStoredUserId();

        if (!userId) {
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/activity/track`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: userId,
                    shop_id: Number(shopId)
                })
            });
        } catch (err) {
            console.log("Activity Tracking Error:", err);
        }
    }

    function renderRecommendations() {
        const recommendedShops = recommendedIds
            .map((id) => findShop(id))
            .filter(Boolean);

        if (!recommendedIds.length) {
            recommendationsContainer.innerHTML = "<p>No recommendations yet</p>";
            return;
        }

        if (!recommendedShops.length) {
            recommendationsContainer.innerHTML = "<p>Loading recommendations...</p>";
            return;
        }

        recommendationsContainer.innerHTML = recommendedShops.map((shop) => renderShopCard(shop)).join("");
        attachEvents();
    }

    function displayRecommendations(data) {
        const recommendations = Array.isArray(data) ? data : data?.recommendations || [];

        if (!recommendations.length) {
            recommendedIds = [];
            recommendationsContainer.innerHTML = "<p>No recommendations yet</p>";
            applyBrowseState();
            return;
        }

        recommendations.forEach((recommendedShop) => {
            const existingShop = findShop(recommendedShop.id);

            if (existingShop) {
                existingShop.recommendationScore = Number(recommendedShop.score || 0);
                return;
            }

            shops.push({
                ...normalizeShop(recommendedShop),
                menu: [],
                reviews: [],
                reviewsLoaded: false
            });
        });

        recommendedIds = recommendations
            .slice(0, 4)
            .map((shop) => Number(shop.id));
        renderRecommendations();
        applyBrowseState();
    }

    function loadRecommendations() {
        const userId = getStoredUserId();

        if (!userId) {
            recommendedIds = [];
            recommendationsContainer.innerHTML = "<p>Login to get personalized recommendations</p>";
            return Promise.resolve();
        }

        return fetchJson(`${API_BASE_URL}/recommendations/${userId}`)
            .then((data) => {
                displayRecommendations(data);
            })
            .catch((err) => {
                console.log("Recommendation Error:", err);
                recommendationsContainer.innerHTML = "<p>Unable to load recommendations right now</p>";
            });
    }

    function renderShops(data = shops, options = {}) {
        const { excludeRecommended = true } = options;
        const filteredShops = excludeRecommended
            ? (data || []).filter((shop) => !recommendedIds.includes(Number(shop.id)))
            : (data || []);

        if (!filteredShops.length) {
            container.innerHTML = "<p style='text-align:center;'>No results found</p>";
            return;
        }

        container.innerHTML = filteredShops.map((shop) => renderShopCard(shop)).join("");
        attachEvents();
    }

    function renderFavoriteShops(favIds) {
        const favShops = shops.filter((shop) => favIds.includes(Number(shop.id)));

        if (!favShops.length) {
            favoritesContainer.innerHTML = "<p style='text-align:center;'>No favorites yet</p>";
            return;
        }

        favoritesContainer.innerHTML = favShops.map((shop) => renderShopCard(shop)).join("");
        attachEvents();
        favShops.forEach((shop) => loadReviews(shop.id));
    }

    function loadShops(search = "") {
        return fetch(`${API_BASE_URL}/shops?search=${encodeURIComponent(search)}`)
            .then((res) => res.json())
            .then((data) => {
                shops = data.map((shop) => ({
                    ...normalizeShop(shop),
                    menu: [],
                    reviews: [],
                    reviewsLoaded: false
                }));

                renderRecommendations();
                renderShops(shops);
                loadMenus();
                shops.forEach((shop) => loadReviews(shop.id));
            })
            .catch((err) => console.log("ERROR:", err));
    }

    function attachEvents() {
        document.querySelectorAll(".card[data-id]").forEach((card) => {
            card.onclick = function (event) {
                if (event.target.closest("button, .favorite-toggle, .delete-review-btn")) {
                    return;
                }

                trackShopActivity(this.dataset.id);
            };
        });

        document.querySelectorAll(".card .menu-btn[data-id]").forEach((btn) => {
            btn.onclick = function () {
                viewMenu(this.dataset.id);
            };
        });

        document.querySelectorAll(".card .review-btn[data-id]").forEach((btn) => {
            btn.onclick = function () {
                openReview(this.dataset.id);
            };
        });

        document.querySelectorAll(".favorite-toggle").forEach((btn) => {
            btn.onclick = function () {
                toggleFavorite(Number(this.dataset.id));
            };
        });

        attachDeleteEvents();
    }

    function attachDeleteEvents() {
        document.querySelectorAll(".delete-review-btn").forEach((btn) => {
            btn.onclick = function () {
                const confirmDelete = confirm("Do you really want to delete this review?");

                if (!confirmDelete) {
                    return;
                }

                deleteReview(this.dataset.id, this.dataset.shopId);
            };
        });
    }

    window.viewMenu = function (shopId) {
        trackShopActivity(shopId);

        fetchJson(`${API_BASE_URL}/shops/menu/${shopId}`)
            .then((menu) => {
                const menuMarkup = menu.length
                    ? menu.map((item) => `
                        <div class="menu-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
                            <div>
                                <p style="margin:0;"><strong>${escapeHtml(item.item_name)}</strong> - \u20B9${escapeHtml(item.price)}</p>
                            </div>
                        </div>
                    `).join("")
                    : "<p>No items available</p>";

                document.getElementById("modalContent").innerHTML =
                    "<h3>Menu</h3>" + menuMarkup;

                document.getElementById("modal").style.display = "flex";
            })
            .catch((err) => {
                console.log("Menu Error:", err);
                document.getElementById("modalContent").innerHTML = "<h3>Menu</h3><p>Unable to load menu right now</p>";
                document.getElementById("modal").style.display = "flex";
            });
    };

    window.openReview = function (shopId) {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Login first to add review");
            window.location.href = "login.html";
            return;
        }

        currentShopId = shopId;

        loadReviews(shopId).then(() => {
            const shop = findShop(shopId);
            const today = formatToday();
            const existingReview = shop?.reviews.find(
                (review) =>
                    review.username === currentUser.name &&
                    review.review_date === today
            );

            if (existingReview) {
                reviewTextInput.value = existingReview.review_text;
                ratingInput.value = String(existingReview.rating);
                alert("You already reviewed today. You can update your review.");
            } else {
                reviewTextInput.value = "";
                ratingInput.value = "";
            }

            document.getElementById("reviewModal").style.display = "flex";
        });
    };

    window.submitReview = function (event) {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Login first to add review");
            window.location.href = "login.html";
            return;
        }

        if (!currentShopId) {
            alert("Please choose a shop first");
            return;
        }

        const button = event.target;
        const reviewText = reviewTextInput.value.trim();
        const rating = ratingInput.value;

        if (!reviewText) {
            alert("Please write a review");
            return;
        }

        if (!rating) {
            alert("Please select a rating");
            return;
        }

        button.disabled = true;

        fetch(`${API_BASE_URL}/reviews/add`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                username: currentUser.name,
                shop_id: currentShopId,
                review_text: reviewText,
                rating
            })
        })
            .then(async (res) => {
                const message = await res.text();

                if (!res.ok) {
                    throw new Error(message || "Something went wrong");
                }

                return message;
            })
            .then((message) => {
                alert(message);
                reviewTextInput.value = "";
                ratingInput.value = "";

                return loadReviews(currentShopId).then(() => {
                    closeModal();
                });
            })
            .catch((err) => {
                alert(err.message || "Something went wrong");
            })
            .finally(() => {
                button.disabled = false;
            });
    };

    window.deleteReview = function (reviewId, shopId) {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Login first to manage reviews");
            window.location.href = "login.html";
            return;
        }

        fetch(`${API_BASE_URL}/reviews/delete/${reviewId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        })
            .then(async (res) => {
                const message = await res.text();

                if (!res.ok) {
                    throw new Error(message || "Delete failed");
                }

                return message;
            })
            .then((message) => {
                alert(message);
                return loadReviews(shopId);
            })
            .catch((err) => {
                alert(err.message || "Something went wrong");
            });
    };

    window.closeModal = function () {
        document.getElementById("modal").style.display = "none";
        document.getElementById("reviewModal").style.display = "none";
    };

    window.showFavorites = function () {
        if (!storedUser) {
            alert("Login first");
            return;
        }

        container.style.display = "none";
        allShopsHeading.style.display = "none";
        favoritesSection.style.display = "block";
        searchContainer.style.display = "none";
        searchResults.style.display = "none";
        filtersContainer.style.display = "none";

        if (recommendationSection) {
            recommendationSection.style.display = "none";
        }

        fetch(`${API_BASE_URL}/favorites/${storedUser.id}`)
            .then((res) => res.json())
            .then((data) => {
                const favIds = data.map((favorite) => Number(favorite.shop_id));
                favoriteShops = favIds;
                renderFavoriteShops(favIds);
            })
            .catch((err) => {
                console.log("Favorites View Error:", err);
                favoritesContainer.innerHTML = "<p style='text-align:center;'>Unable to load favorites</p>";
            });
    };

    window.goBack = function () {
        showMainShopView();
        renderRecommendations();
        applyBrowseState();
    };

    window.showChangePassword = function () {
        if (!storedUser) {
            alert("Login first");
            return;
        }

        oldPassInput.value = "";
        newPassInput.value = "";
        confirmPassInput.value = "";
        passwordModal.style.display = "flex";
    };

    window.closePassword = function () {
        passwordModal.style.display = "none";
    };

    window.changePassword = function () {
        const oldPass = oldPassInput.value;
        const newPass = newPassInput.value;
        const confirmPass = confirmPassInput.value;

        if (!oldPass || !newPass || !confirmPass) {
            alert("Please fill all password fields");
            return;
        }

        if (newPass !== confirmPass) {
            alert("Passwords do not match");
            return;
        }

        fetch(`${API_BASE_URL}/user/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: storedUser.id,
                oldPassword: oldPass,
                newPassword: newPass
            })
        })
            .then((res) => res.text())
            .then((message) => {
                alert(message);

                if (message.toLowerCase().includes("success")) {
                    closePassword();
                }
            })
            .catch(() => {
                alert("Unable to change password");
            });
    };

    window.toggleFavorite = function (shopId) {
        if (!storedUser) {
            alert("Login to use favorites");
            return;
        }

        const isFav = favoriteShops.includes(shopId);

        fetch(`${API_BASE_URL}/favorites/${isFav ? "remove" : "add"}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: storedUser.id,
                shop_id: shopId
            })
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Unable to update favorites");
                }

                if (isFav) {
                    favoriteShops = favoriteShops.filter((id) => id !== shopId);
                } else {
                    favoriteShops.push(shopId);
                }

                if (favoritesSection.style.display === "block") {
                    showFavorites();
                    return;
                }

                renderRecommendations();
                applyBrowseState();
            })
            .catch((err) => {
                alert(err.message || "Something went wrong");
            });
    };

    searchInput.addEventListener("input", function () {
        applyBrowseState();
    });

    function getFilteredShops(sourceShops = shops) {
        const price = priceFilter.value;
        const type = typeFilter.value;

        return sourceShops.filter((shop) => {
            let matchesPrice = true;
            const popularPrice = Number(shop.popularItem?.price || 0);

            if (price === "low") matchesPrice = popularPrice < 100;
            if (price === "mid") matchesPrice = popularPrice >= 100 && popularPrice <= 200;
            if (price === "high") matchesPrice = popularPrice > 200;

            const matchesType = type ? shop.type === type : true;

            return matchesPrice && matchesType;
        });
    }

    function performSearch(query, sourceShops = shops) {
        let foodResults = [];
        let shopResults = [];

        sourceShops.forEach((shop) => {
            const addedItems = new Set();

            if (shop.name.toLowerCase().includes(query)) {
                shopResults.push(shop);
            }

            if (shop.popularItem?.name?.toLowerCase().includes(query)) {
                foodResults.push({
                    name: shop.popularItem.name,
                    price: shop.popularItem.price,
                    shop: shop.name,
                    rating: shop.rating,
                    priority: 1
                });

                addedItems.add(shop.popularItem.name.toLowerCase());
            }

            shop.menu.forEach((item) => {
                const itemName = item.item_name.toLowerCase();

                if (itemName.includes(query) && !addedItems.has(itemName)) {
                    foodResults.push({
                        name: item.item_name,
                        price: item.price,
                        shop: shop.name,
                        rating: shop.rating,
                        priority: 2
                    });
                }
            });
        });

        foodResults.sort((a, b) => a.priority - b.priority);

        if (shopResults.length || foodResults.length) {
            const sections = [];

            if (shopResults.length) {
                sections.push(`
                    <div class="search-group">
                        <h3>Matching shops</h3>
                        <div class="shop-container">
                            ${shopResults.map((shop) => renderShopCard(shop)).join("")}
                        </div>
                    </div>
                `);
            }

            if (foodResults.length) {
                sections.push(`
                    <div class="search-group">
                        <h3>Matching food</h3>
                        ${foodResults.map((item) => `
                            <div class="search-item">
                                <h4>\uD83C\uDF7D\uFE0F ${escapeHtml(item.name)} - \u20B9${escapeHtml(item.price)}</h4>
                                <p>\uD83C\uDFEA ${escapeHtml(item.shop)}</p>
                                <p>\u2B50 ${Number(item.rating || 0).toFixed(1)}</p>
                            </div>
                        `).join("")}
                    </div>
                `);
            }

            searchResults.innerHTML = sections.join("");
            attachEvents();
            return true;
        }

        searchResults.innerHTML = "<p>No results found</p>";
        return false;
    }

    function applyBrowseState() {
        const query = searchInput.value.toLowerCase().trim();
        const filteredShops = getFilteredShops(shops);

        if (query) {
            filtersContainer.style.display = "none";
            syncRecommendationVisibility(true);
            setMainListingVisibility(false);
            performSearch(query, filteredShops);
            return;
        }

        filtersContainer.style.display = "flex";
        searchResults.innerHTML = "";
        setMainListingVisibility(true);

        if (hasActiveFilters()) {
            syncRecommendationVisibility(true);
            renderShops(filteredShops);
            return;
        }

        syncRecommendationVisibility(false);
        renderShops(shops);
    }

    priceFilter.addEventListener("change", filterShops);
    typeFilter.addEventListener("change", filterShops);

    function filterShops() {
        applyBrowseState();
    }

    loadFavorites().finally(() => {
        if (storedUser?.id) {
            localStorage.setItem("user_id", String(storedUser.id));
        }

        loadShops().then(() => {
            if (storedUser) {
                return loadRecommendations();
            }

            return null;
        });
    });
});
