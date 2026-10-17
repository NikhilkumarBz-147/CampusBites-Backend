if (localStorage.getItem("adminLoggedIn") === "true") {
    window.location.href = "admin.html";
}

function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Enter username and password");
        return;
    }

    const apiBaseUrl = window.location.protocol === "file:"
        ? "http://localhost:5000"
        : window.location.origin;

    fetch(`${apiBaseUrl}/admin/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    })
        .then((res) => res.text())
        .then((data) => {
            if (data === "Login successful") {
                localStorage.setItem("adminLoggedIn", "true");
                window.location.href = "admin.html";
            } else {
                alert(data);
            }
        })
        .catch(() => {
            alert("Unable to login right now");
        });
}

function togglePassword() {
    const passwordInput = document.getElementById("password");
    const eye = document.getElementById("eye");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eye.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        eye.textContent = "Show";
    }
}
