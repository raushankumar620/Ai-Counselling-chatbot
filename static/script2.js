document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggleSidebar");
    const closeBtn = document.getElementById("close-btn");
    const container = document.querySelector(".container");

    // Open/Close sidebar
    toggleBtn.addEventListener("click", function () {
        const isOpen = sidebar.classList.toggle("show");
        if (isOpen) {
            container.classList.add("sidebar-open");
        } else {
            container.classList.remove("sidebar-open");
        }
    });

    closeBtn.addEventListener("click", function () {
        sidebar.classList.remove("show");
        container.classList.remove("sidebar-open");
    });
});


///new code==============================================================

async function getChatResponse(message) {
    const response = await fetch("http://127.0.0.1:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        appendMessage("bot-message", result); // Real-time update
    }
}
