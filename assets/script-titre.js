// Animation du clic sur le titre - fonctionne sur toutes les pages
document.addEventListener('DOMContentLoaded', function() {
  const titleElement = document.getElementById('site-title');
  
  if (titleElement) {
    titleElement.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Détecter le chemin correct vers index.html
      const isInSubfolder = window.location.pathname.includes('/pages/');
      const indexPath = isInSubfolder ? '../index.html' : 'index.html';
      
      // Créer l'overlay
      const overlay = document.createElement('div');
      overlay.className = 'title-overlay';
      
      const title = document.createElement('h1');
      title.textContent = 'DispHistInq';
      
      overlay.appendChild(title);
      document.body.appendChild(overlay);
      
      // Lancer l'animation de disparition après un court délai
      setTimeout(() => {
        overlay.classList.add('fade-out');
      }, 1000);
      
      // Supprimer l'overlay du DOM et rediriger
      setTimeout(() => {
        overlay.remove();
        window.location.href = indexPath;
      }, 1000);
    });
  }
});