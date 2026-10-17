function normalizeImageUrl(imageUrl) {
    if (typeof imageUrl !== "string") {
        return imageUrl;
    }

    try {
        const parsedUrl = new URL(imageUrl);
        if (
            parsedUrl.protocol === "http:" &&
            parsedUrl.hostname === "localhost" &&
            parsedUrl.port === "5000" &&
            parsedUrl.pathname.startsWith("/uploads/")
        ) {
            return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
    } catch {
        // Keep non-URL values unchanged; existing external image URLs still work.
    }

    return imageUrl;
}

module.exports = normalizeImageUrl;
