const PASSWORD = "N7v!qR4#Lx9@Tz2$Mp8K";

function checkPassword() {
  const isAuthenticated = sessionStorage.getItem("authenticated");
  if (isAuthenticated === "true") return;

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Lato:wght@300;400&display=swap');

    .password-modal {
      position: fixed;
      inset: 0;
      background: rgba(30, 18, 6, .55);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: pw-fade .25s ease;
    }

    @keyframes pw-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .password-modal-content {
      background: #f5eed8;
      border: 1px solid #c8b88a;
      border-radius: 6px;
      width: min(420px, 92vw);
      box-shadow: 0 16px 50px rgba(30, 18, 6, .3);
      overflow: hidden;
      animation: pw-up .25s ease;
    }

    @keyframes pw-up {
      from { transform: translateY(16px); opacity: 0; }
      to   { transform: translateY(0);   opacity: 1; }
    }

    .password-modal-header {
      padding: 16px 22px 13px;
      background: #2b1e0e;
      position: relative;
    }

    .password-modal-header::after {
      content: '';
      display: block;
      height: 2px;
      background: linear-gradient(90deg, #8b2e12, transparent);
      position: absolute;
      bottom: -1px; left: 0; right: 0;
    }

    .password-modal-header h2 {
      margin: 0;
      font-family: 'IM Fell English', serif;
      font-size: 1.05rem;
      font-weight: 400;
      color: #f5eed8;
      letter-spacing: .01em;
    }

    .password-modal-header p {
      margin: 4px 0 0;
      font-family: 'Lato', sans-serif;
      font-size: .7rem;
      font-weight: 300;
      color: #9a8060;
      font-style: italic;
    }

    .password-modal-body {
      padding: 22px 22px 8px;
    }

    .password-modal-body label {
      display: block;
      font-family: 'IM Fell English SC', serif;
      font-size: .65rem;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: #9a8060;
      margin-bottom: 7px;
    }

    .password-input {
      width: 100%;
      padding: 9px 12px;
      background: white;
      border: 1px solid #c8b88a;
      border-radius: 3px;
      color: #2b1e0e;
      font-family: 'Lato', sans-serif;
      font-size: .88rem;
      font-weight: 300;
      outline: none;
      transition: border-color .15s;
      box-sizing: border-box;
    }

    .password-input::placeholder {
      color: #9a8060;
      font-style: italic;
    }

    .password-input:focus {
      border-color: #5a4232;
    }

    .error-message {
      margin: 9px 0 0;
      font-family: 'Lato', sans-serif;
      font-size: .72rem;
      color: #8b2e12;
      font-style: italic;
      min-height: 18px;
    }

    .password-modal-footer {
      padding: 14px 22px 20px;
      display: flex;
      justify-content: flex-end;
    }

    .btn-submit {
      padding: 7px 22px;
      background: #2b1e0e;
      border: none;
      border-radius: 3px;
      color: #f5eed8;
      font-family: 'IM Fell English SC', serif;
      font-size: .75rem;
      letter-spacing: .07em;
      cursor: pointer;
      transition: background .15s;
    }

    .btn-submit:hover  { background: #8b2e12; }
    .btn-submit:active { transform: translateY(1px); }
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.className = 'password-modal';
  modal.innerHTML = `
    <div class="password-modal-content">
      <div class="password-modal-header">
        <h2>DispHistInq</h2>
        <p>Accès restreint · authentification requise</p>
      </div>
      <div class="password-modal-body">
        <label>Mot de passe</label>
        <input
          type="password"
          class="password-input"
          placeholder="Entrez le mot de passe…"
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

  const input     = modal.querySelector('.password-input');
  const submitBtn = modal.querySelector('.btn-submit');
  const errorMsg  = modal.querySelector('.error-message');

  setTimeout(() => input.focus(), 100);

  function validatePassword() {
    if (input.value === PASSWORD) {
      sessionStorage.setItem("authenticated", "true");
      modal.remove();
    } else {
      errorMsg.textContent = "Mot de passe incorrect.";
      input.value = "";
      input.style.borderColor = "#8b2e12";
      setTimeout(() => { window.location.href = "../index.html"; }, 1500);
    }
  }

  submitBtn.addEventListener("click", validatePassword);
  input.addEventListener("keypress", e => { if (e.key === "Enter") validatePassword(); });
  input.addEventListener("input",    () => {
    errorMsg.textContent   = "";
    input.style.borderColor = "";
  });
}

document.addEventListener("DOMContentLoaded", checkPassword);