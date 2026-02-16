const PASSWORD = "N7v!qR4#Lx9@Tz2$Mp8K";

function checkPassword() {
  const isAuthenticated = sessionStorage.getItem("authenticated");

  if (isAuthenticated === "true") return;

  const userInput = prompt("Mot de passe requis :");

  if (userInput === PASSWORD) {
    sessionStorage.setItem("authenticated", "true");
  } else {
    alert("Mot de passe incorrect.");
    window.location.href = "../index.html";
  }
}

document.addEventListener("DOMContentLoaded", checkPassword);
