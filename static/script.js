document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-btn");
    const micButton = document.getElementById("mic-btn");
    const newChatButton = document.querySelector(".start-convo-btn");
    const sidebar = document.getElementById("sidebar");
    const toggleSidebarBtn = document.getElementById("toggleSidebar");
    const closeBtn = document.getElementById("close-btn");
    const chatHistoryList = document.getElementById("chat-history");
    const container = document.querySelector(".container");

    if (!chatBox || !sendButton || !newChatButton) {
        console.error("❌ Error: Required elements not found in HTML.");
        return;
    }

    loadChatHistory();

    newChatButton.addEventListener("click", async () => {
        console.log("New Chat button clicked! ✅");
        chatBox.innerHTML = "";
        userInput.value = "";
        try {
            const response = await fetch("/clear_history", { method: "POST" });
            console.log(response.ok ? "🗑️ Chat history cleared!" : "❌ Failed to clear chat history.");
        } catch (error) {
            console.error("❌ Error clearing chat history:", error);
        }
    });

    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    toggleSidebarBtn.addEventListener("click", () => {
        sidebar.classList.toggle("show");
        container.classList.toggle("sidebar-open", sidebar.classList.contains("show"));
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            sidebar.classList.remove("show");
            container.classList.remove("sidebar-open");
        });
    }

    if (micButton) {
        micButton.addEventListener("click", () => {
            console.log("🎤 Mic button clicked!");
            micButton.style.background = "#ffc107";
            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = "en-US";
            recognition.start();

            recognition.onresult = (event) => {
                micButton.style.background = "#28a745";
                userInput.value = event.results[0][0].transcript;
            };

            recognition.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                micButton.style.background = "#dc3545";
                setTimeout(() => (micButton.style.background = ""), 1000);
            };
        });
    } else {
        console.error("🎤 Mic button not found! Check your HTML.");
    }

    async function sendMessage() {
        let message = userInput.value.trim();
        if (!message) return;

        appendMessage("user-message", message);
        userInput.value = "";
        document.getElementById("bot-thinking").style.display = "flex";

        try {
            let response = await fetch("http://127.0.0.1:5001/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            let data = await response.json();
            document.getElementById("bot-thinking").style.display = "none";
            appendMessage("bot-message", data.reply || "🤖 Hmm... I didn't get that.");
            speakText(data.reply);
            saveChatHistory(message, data.reply);
        } catch (error) {
            console.error("Error fetching response:", error);
            document.getElementById("bot-thinking").style.display = "none";
            appendMessage("bot-message", "⚠️ Oops! AI servers are sleepy 😴.");
        }
    }

    function appendMessage(className, text) {
        if (!chatBox) {
            console.error("Error: chatBox is not defined.");
            return;
        }
        let msgDiv = document.createElement("div");
        msgDiv.className = className;
        msgDiv.textContent = text;
        chatBox.appendChild(msgDiv);
    }

    async function loadChatHistory() {
        try {
            let response = await fetch("/get_history");
            let data = await response.json();
            
            chatBox.innerHTML = "";
            chatHistoryList.innerHTML = "";
    
            data.history.forEach((chat, index) => {
                appendMessage("user-message", chat.user);
                appendMessage("bot-message", chat.bot);
                addToSidebar(chat, index);
            });
    
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
        } catch (error) {
            console.error("Error loading chat history:", error);
        }
    }
    
    function addToSidebar(chat, index) {
        let historyItem = document.createElement("li");
        historyItem.innerText = chat.user.slice(0, 20) + "..."; // Short preview
        historyItem.dataset.index = index;
        historyItem.addEventListener("click", () => loadSpecificChat(index));
        chatHistoryList.appendChild(historyItem);
    }
    
    async function loadSpecificChat(index) {
        try {
            let response = await fetch("/get_history");
            let data = await response.json();
            let chat = data.history[index];
    
            chatBox.innerHTML = "";
            appendMessage("user-message", chat.user);
            appendMessage("bot-message", chat.bot);
        } catch (error) {
            console.error("Error loading specific chat:", error);
        }
    }
    
    function saveChatHistory(userMsg, botMsg) {
        let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
        history.push({ user: userMsg, bot: botMsg });
        localStorage.setItem("chatHistory", JSON.stringify(history));
    }

    function speakText(text) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "en-US";
        speech.rate = 1;
        speechSynthesis.speak(speech);
    }
});
