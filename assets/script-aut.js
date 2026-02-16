const PASSWORD = "N7v!qR4#Lx9@Tz2$Mp8K";

function checkPassword() {
  const isAuthenticated = sessionStorage.getItem("authenticated");
  if (isAuthenticated === "true") return;

  // Injection du CSS
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      --color-bg-primary: #0a0e17;
      --color-bg-secondary: #131820;
      --color-bg-tertiary: #1a2332;
      --color-text-primary: #f1f1f1;
      --color-text-secondary: #b0b0b0;
      --color-blue-primary: #3b82f6;
      --color-blue-bright: #60a5fa;
      --color-cyan-accent: #06b6d4;
      --color-blue-dark: #1e3a8a;
      --color-accent: #3b82f6;
      --color-shadow: rgba(0, 0, 0, 0.35);
      --color-glow: rgba(59, 130, 246, 0.25);
      --font-display: 'Inter', sans-serif;
      --font-body: 'Inter', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    .password-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 14, 23, 0.95);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 1;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .password-modal-content {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-bg-tertiary);
      border-radius: 16px;
      box-shadow: 0 20px 60px var(--color-shadow), 0 0 40px var(--color-glow);
      max-width: 420px;
      width: 90%;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .password-modal-header {
      padding: 24px 28px 16px;
      border-bottom: 1px solid var(--color-bg-tertiary);
    }

    .password-modal-header h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      color: var(--color-text-primary);
      letter-spacing: -0.02em;
    }

    .password-modal-body {
      padding: 24px 28px;
    }

    .password-input {
      width: 100%;
      padding: 14px 16px;
      background: var(--color-bg-primary);
      border: 1.5px solid var(--color-bg-tertiary);
      border-radius: 10px;
      color: var(--color-text-primary);
      font-family: var(--font-mono);
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.05em;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .password-input::placeholder {
      color: var(--color-text-secondary);
      font-family: var(--font-body);
      letter-spacing: normal;
      font-weight: 400;
    }

    .password-input:focus {
      border-color: var(--color-blue-primary);
      box-shadow: 0 0 0 3px var(--color-glow);
    }

    .error-message {
      margin: 12px 0 0;
      color: #ef4444;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 500;
      min-height: 18px;
    }

    .password-modal-footer {
      padding: 16px 28px 24px;
      display: flex;
      justify-content: flex-end;
    }

    .btn-submit {
      padding: 12px 32px;
      background: var(--color-blue-primary);
      border: none;
      border-radius: 10px;
      color: white;
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    }

    .btn-submit:hover {
      background: var(--color-blue-bright);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
    }

    .btn-submit:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // Création de la modale
  const modal = document.createElement('div');
  modal.className = 'password-modal';
  modal.innerHTML = `
    <div class="password-modal-content">
      <div class="password-modal-header">
        <h2>Authentification requise</h2>
      </div>
      <div class="password-modal-body">
        <input 
          type="password" 
          class="password-input" 
          placeholder="Entrez le mot de passe"
          autocomplete="off"
        />
        <p class="error-message"></p>
      </div>
      <div class="password-modal-footer">
        <button class="btn-submit">Valider</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('.password-input');
  const submitBtn = modal.querySelector('.btn-submit');
  const errorMsg = modal.querySelector('.error-message');

  setTimeout(() => input.focus(), 100);

  function validatePassword() {
    const userInput = input.value;
    if (userInput === PASSWORD) {
      sessionStorage.setItem("authenticated", "true");
      modal.remove();
    } else {
      errorMsg.textContent = "Mot de passe incorrect.";
      input.value = "";
      input.style.borderColor = "#ef4444";
      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1500);
    }
  }

  submitBtn.addEventListener("click", validatePassword);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") validatePassword();
  });
  input.addEventListener("input", () => {
    errorMsg.textContent = "";
    input.style.borderColor = "";
  });
}

document.addEventListener("DOMContentLoaded", checkPassword);