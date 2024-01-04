function toggleDetails(elementId) {
    var moreText = document.getElementById(elementId);
    if (moreText.style.display === "none") {
        moreText.style.display = "inline";
    } else {
        moreText.style.display = "none";
    }
}

