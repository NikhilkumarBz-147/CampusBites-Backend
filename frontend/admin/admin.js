if (localStorage.getItem("adminLoggedIn") !== "true") {
    window.location.href = "login.html";
}

let allShops = [];
let currentShopId = null;
let toastTimer = null;
let adminPageInitialized = false;
const API_BASE_URL = window.location.protocol === "file:"
    ? "http://localhost:5000"
    : window.location.origin;

document.addEventListener("DOMContentLoaded", () => {
    if (adminPageInitialized) {
        return;
    }

    adminPageInitialized = true;
    document.getElementById("shopSearch").addEventListener("input", applyFilters);
    document.getElementById("shopTypeFilter").addEventListener("change", applyFilters);
    loadShops();
});

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2400);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function loadShops() {
    return fetch(`${API_BASE_URL}/shops`)
        .then((res) => res.json())
        .then((data) => {
            allShops = data;
            updateStats(allShops);
            applyFilters();
        })
        .catch((err) => {
            console.log(err);
            showToast("Unable to load shops", "error");
        });
}

function updateStats(shops) {
    const total = shops.length;
    const vegCount = shops.filter((shop) => shop.type === "veg").length;
    const nonVegCount = shops.filter((shop) => shop.type === "nonveg").length;
    const ratedShops = shops.filter((shop) => Number(shop.rating || 0) > 0);
    const average = ratedShops.length
        ? ratedShops.reduce((sum, shop) => sum + Number(shop.rating || 0), 0) / ratedShops.length
        : 0;

    document.getElementById("totalShops").textContent = total;
    document.getElementById("vegShops").textContent = vegCount;
    document.getElementById("nonVegShops").textContent = nonVegCount;
    document.getElementById("averageRating").textContent = average.toFixed(1);
}

function applyFilters() {
    const search = document.getElementById("shopSearch").value.toLowerCase().trim();
    const type = document.getElementById("shopTypeFilter").value;

    const filtered = allShops.filter((shop) => {
        const matchesSearch = shop.name.toLowerCase().includes(search);
        const matchesType = type ? shop.type === type : true;
        return matchesSearch && matchesType;
    });

    displayShops(filtered);
}

function displayShops(shops) {
    const table = document.getElementById("shopTable");
    const emptyState = document.getElementById("emptyState");

    if (!shops.length) {
        table.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    table.innerHTML = shops.map((shop) => {
        const typeBadgeClass = shop.type === "veg" ? "badge-veg" : "badge-nonveg";
        const typeLabel = shop.type === "veg" ? "Veg" : "Non-Veg";
        const safeName = escapeHtml(shop.name);

        return `
            <tr>
                <td>
                    <div class="shop-name">
                        <strong>${safeName}</strong>
                        <span class="shop-meta">ID: ${shop.id}</span>
                    </div>
                </td>
                <td><span class="shop-badge ${typeBadgeClass}">${typeLabel}</span></td>
                <td><span class="rating-pill">\u2B50 ${Number(shop.rating || 0).toFixed(1)}</span></td>
                <td>
                    <img src="${shop.image_url || "https://via.placeholder.com/120"}" alt="${safeName}">
                </td>
                <td>
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="menu-btn"
                            data-action="menu"
                            data-id="${shop.id}"
                            data-name="${safeName}"
                        >
                            Menu
                        </button>
                        <button
                            type="button"
                            class="edit-btn"
                            data-action="edit"
                            data-id="${shop.id}"
                            data-name="${safeName}"
                            data-type="${escapeHtml(shop.type)}"
                            data-image="${escapeHtml(shop.image_url || "")}" 
                        >
                            Edit
                        </button>
                        <button type="button" class="delete-btn" onclick="deleteShop(${shop.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    table.querySelectorAll('[data-action="menu"]').forEach((button) => {
        button.onclick = function () {
            openMenu(this.dataset.id, this.dataset.name);
        };
    });

    table.querySelectorAll('[data-action="edit"]').forEach((button) => {
        button.onclick = function () {
            editShop(
                this.dataset.id,
                this.dataset.name,
                this.dataset.type,
                this.dataset.image
            );
        };
    });
}

function resetShopForm() {
    document.getElementById("name").value = "";
    document.getElementById("type").value = "";
    document.getElementById("image_url").value = "";
    document.getElementById("image_file").value = "";
}

function addShop() {
    const name = document.getElementById("name").value.trim();
    const type = document.getElementById("type").value;
    const imageUrl = document.getElementById("image_url").value.trim();
    const imageFile = document.getElementById("image_file").files[0];

    if (!name || !type) {
        showToast("Please fill in shop name and type", "error");
        return;
    }

    if (!imageUrl && !imageFile) {
        alert("Please provide an image (URL or upload)");
        return;
    }

    let requestConfig;

    if (imageFile) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("type", type);
        formData.append("image", imageFile);

        requestConfig = {
            method: "POST",
            body: formData
        };
    } else {
        requestConfig = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                type,
                image_url: imageUrl
            })
        };
    }

    fetch(`${API_BASE_URL}/shops/add`, requestConfig)
        .then(async (res) => {
            const message = await res.text();

            if (!res.ok) {
                throw new Error(message || "Unable to add shop");
            }

            return message;
        })
        .then(() => {
            resetShopForm();
            showToast("Shop added successfully");
            loadShops();
        })
        .catch((err) => showToast(err.message || "Unable to add shop", "error"));
}

function editShop(id, name, type, image) {
    const newName = prompt("Edit Name:", name);
    if (!newName) return;

    const newType = prompt("Type (veg/nonveg):", type);
    if (!newType) return;

    const newImage = prompt("Image URL:", image ?? "");

    fetch(`${API_BASE_URL}/shops/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: newName.trim(),
            type: newType.trim(),
            image_url: (newImage || "").trim()
        })
    })
        .then((res) => res.text())
        .then(() => {
            showToast("Shop updated");
            loadShops();
        })
        .catch(() => showToast("Unable to update shop", "error"));
}

function deleteShop(id) {
    if (!confirm("Delete this shop?")) return;

    fetch(`${API_BASE_URL}/shops/delete/${id}`, {
        method: "DELETE"
    })
        .then((res) => res.text())
        .then(() => {
            showToast("Shop deleted");
            loadShops();
        })
        .catch(() => showToast("Unable to delete shop", "error"));
}

function openMenu(shopId, shopName) {
    currentShopId = shopId;
    document.getElementById("menuTitle").innerText = shopName;
    document.getElementById("menuModal").style.display = "flex";
    document.getElementById("itemCategory").value = "";
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
    fetchMenu(shopId);
}

function fetchMenu(shopId) {
    fetch(`${API_BASE_URL}/shops/menu/${shopId}`)
        .then((res) => res.json())
        .then((data) => {
            displayMenu(data);
        })
        .catch(() => showToast("Unable to load menu", "error"));
}

function displayMenu(items) {
    const menuList = document.getElementById("menuList");

    if (!items.length) {
        menuList.innerHTML = `
            <div class="empty-state">
                <h3>No items yet</h3>
                <p>Add the first menu item for this shop.</p>
            </div>
        `;
        return;
    }

    menuList.innerHTML = items.map((item) => `
        <div class="menu-item">
            <div>
                <strong>${escapeHtml(item.item_name)}</strong>
                ${item.category ? `<div class="menu-category">${escapeHtml(item.category)}</div>` : ""}
                <span class="menu-price">&#8377;${escapeHtml(item.price)}</span>
            </div>
            <button type="button" onclick="deleteItem(${item.id})">Remove</button>
        </div>
    `).join("");
}

function addMenuItem() {
    const category = document.getElementById("itemCategory").value;
    const name = document.getElementById("itemName").value.trim();
    const price = document.getElementById("itemPrice").value.trim();

    if (!name || !price) {
        showToast("Please fill in item name and price", "error");
        return;
    }

    fetch(`${API_BASE_URL}/shops/add-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            shop_id: currentShopId,
            category,
            item_name: name,
            price
        })
    })
        .then((res) => res.text())
        .then(() => {
            document.getElementById("itemCategory").value = "";
            document.getElementById("itemName").value = "";
            document.getElementById("itemPrice").value = "";
            showToast("Menu item added");
            fetchMenu(currentShopId);
        })
        .catch(() => showToast("Unable to add item", "error"));
}

function deleteItem(id) {
    if (!confirm("Delete this item?")) return;

    fetch(`${API_BASE_URL}/shops/menu/delete/${id}`, {
        method: "DELETE"
    })
        .then((res) => res.text())
        .then(() => {
            showToast("Menu item deleted");
            fetchMenu(currentShopId);
        })
        .catch(() => showToast("Unable to delete item", "error"));
}

function closeMenu() {
    document.getElementById("menuModal").style.display = "none";
}

window.addShop = addShop;
window.editShop = editShop;
window.deleteShop = deleteShop;
window.openMenu = openMenu;
window.addMenuItem = addMenuItem;
window.deleteItem = deleteItem;
window.closeMenu = closeMenu;

function logout() {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("admin");
    window.location.href = "login.html";
}
