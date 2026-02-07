# DispHistInq - Site d'exploration de données historiques

## Description

Ce site web permet d'explorer et de visualiser les données relatives aux dispenses historiques de l'Inquisition. Il offre trois fonctionnalités principales :

1. **Page d'accueil** : Présentation du projet avec statistiques globales
2. **Explorer les données** : Tableau interactif avec recherche et filtres
3. **Carte géographique** : Visualisation de la répartition géographique des diocèses

## Installation sur GitHub Pages

1. **Créer un dépôt GitHub** :
   - Allez sur [github.com](https://github.com) et créez un nouveau dépôt
   - Nommez-le par exemple `disphist-explorer` ou `nom-utilisateur.github.io`

2. **Uploader les fichiers** :
   - `index.html` : La page principale du site
   - `data.csv` : Vos données de dispenses (format point-virgule)
   - `coordonnees.csv` : Les coordonnées géographiques des diocèses

3. **Activer GitHub Pages** :
   - Dans les paramètres du dépôt, section "Pages"
   - Source : "Deploy from a branch"
   - Branch : `main` (ou `master`)
   - Dossier : `/ (root)`
   - Cliquez sur "Save"

4. **Accéder au site** :
   - Votre site sera disponible à : `https://nom-utilisateur.github.io/nom-depot/`
   - Ou si le dépôt s'appelle `nom-utilisateur.github.io` : `https://nom-utilisateur.github.io/`

## Structure des fichiers CSV

### data.csv
Votre fichier principal doit contenir les colonnes suivantes (séparées par des point-virgules `;`) :
- `cas-id` : Identifiant unique du cas
- `nom_requerant.e` : Nom du requérant
- `diocese_origine_fr` : Nom du diocèse (utilisé pour la carte)
- `annee` : Année de la demande
- `resultat_dispense` : Résultat de la dispense
- Et toutes les autres colonnes de votre base de données

### coordonnees.csv
Fichier de correspondance géographique (séparateur `;`) :
```csv
Lieu;Latitude;Longitude
Angers;47.4784;-0.5632
Paris;48.8566;2.3522
```

**Important** : Le champ `Lieu` doit correspondre exactement aux valeurs de `diocese_origine_fr` dans data.csv

## Personnalisation

### Modifier les couleurs
Dans `index.html`, section `<style>`, variables CSS (lignes 10-17) :
```css
:root {
    --color-parchment: #f8f6f0;  /* Couleur de fond */
    --color-ink: #2c2416;         /* Couleur du texte */
    --color-burgundy: #6b2737;    /* Couleur principale */
    --color-gold: #c9a961;        /* Couleur d'accent */
}
```

### Modifier les textes
- Titre principal : ligne ~265 `<h1>DispHistInq</h1>`
- Sous-titre : ligne ~266
- Texte d'accueil : lignes ~277-289

### Ajuster la pagination
Ligne ~530 du JavaScript :
```javascript
const rowsPerPage = 20;  // Nombre de lignes par page
```

## Fonctionnalités

### Page d'accueil
- Statistiques automatiques : nombre total de cas, diocèses, période couverte
- Présentation du projet

### Explorer les données
- **Recherche textuelle** : Recherche dans toutes les colonnes
- **Filtres** : Par diocèse, année, résultat de dispense
- **Pagination** : Navigation entre les pages
- **Tableau responsive** : S'adapte aux écrans mobiles

### Carte géographique
- Marqueurs proportionnels au nombre de cas par diocèse
- Info-bulles au survol
- Carte interactive (zoom, déplacement)

## Compatibilité

- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Responsive : fonctionne sur mobile, tablette et desktop
- Pas de dépendances serveur : fonctionne entièrement côté client

## Support

Pour toute question ou problème :
1. Vérifiez que vos fichiers CSV utilisent bien le séparateur `;`
2. Assurez-vous que les noms de diocèses correspondent entre les deux CSV
3. Ouvrez la console du navigateur (F12) pour voir les erreurs éventuelles

## Licence

Projet académique - Libre d'utilisation pour la recherche historique.