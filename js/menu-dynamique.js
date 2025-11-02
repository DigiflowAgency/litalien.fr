/**
 * Menu Dynamique - L'Italien Restaurant
 * Charge le menu depuis l'API Google Sheets et l'affiche dans la page
 * Auto-refresh toutes les 5 minutes
 */

(function() {
    'use strict';

    const API_URL = '/api/menu';
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes en millisecondes
    const menuSection = document.getElementById('menu');

    /**
     * Crée le HTML pour un élément de menu
     */
    function creerElementMenu(plat) {
        const menuContainer = document.createElement('div');
        menuContainer.className = 'w-layout-grid menu_container';

        const hasDescription = plat.description && plat.description.trim() !== '';

        menuContainer.innerHTML = `
            <div class="menu_element-container">
                <div class="main_element-container">
                    <div class="element_title-container">
                        <div class="element_name-text">${plat.nom.toUpperCase()}</div>
                    </div>
                    <div class="element_line"></div>
                    <div class="element_price-container">
                        <div class="price">${plat.prix}</div>
                    </div>
                </div>
                ${hasDescription ? `
                <div class="descriptive_element-container">
                    <div class="descriptive_element-text">${plat.description}</div>
                </div>
                ` : ''}
            </div>
        `;

        return menuContainer;
    }

    /**
     * Crée le HTML pour une catégorie de menu
     */
    function creerCategorieMenu(categorie) {
        const menuWrapper = document.createElement('div');
        menuWrapper.className = 'menu_wrapper';

        const subtitleContainer = document.createElement('div');
        subtitleContainer.className = 'subtitle_container';

        const heading = document.createElement('h2');
        heading.className = 'rt-about-two-exper-heading';
        heading.textContent = categorie.nom;

        subtitleContainer.appendChild(heading);
        menuWrapper.appendChild(subtitleContainer);

        // Ajouter tous les plats de cette catégorie
        categorie.plats.forEach(plat => {
            const elementMenu = creerElementMenu(plat);
            menuWrapper.appendChild(elementMenu);
        });

        return menuWrapper;
    }

    /**
     * Affiche un loader pendant le chargement
     */
    function afficherLoader() {
        menuSection.innerHTML = `
            <div class="menu_wrapper">
                <div class="subtitle_container">
                    <h2 class="rt-about-two-exper-heading" style="opacity: 0.5;">Chargement du menu...</h2>
                </div>
            </div>
        `;
    }

    /**
     * Affiche un message d'erreur
     */
    function afficherErreur(message) {
        menuSection.innerHTML = `
            <div class="menu_wrapper">
                <div class="subtitle_container">
                    <h2 class="rt-about-two-exper-heading" style="color: #d9534f;">Erreur de chargement</h2>
                    <p style="text-align: center; margin-top: 1rem;">${message}</p>
                </div>
            </div>
        `;
    }

    /**
     * Charge et affiche le menu depuis l'API
     */
    async function chargerMenu() {
        try {
            afficherLoader();

            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            // Vider le contenu actuel
            menuSection.innerHTML = '';

            // Vérifier si des catégories existent
            if (!data.categories || data.categories.length === 0) {
                afficherErreur('Aucun plat disponible pour le moment.');
                return;
            }

            // Créer et ajouter chaque catégorie
            data.categories.forEach(categorie => {
                if (categorie.plats && categorie.plats.length > 0) {
                    const categorieElement = creerCategorieMenu(categorie);
                    menuSection.appendChild(categorieElement);
                }
            });

            console.log('Menu chargé avec succès:', data.categories.length, 'catégories');

        } catch (error) {
            console.error('Erreur lors du chargement du menu:', error);
            afficherErreur('Impossible de charger le menu. Veuillez rafraîchir la page.');
        }
    }

    /**
     * Initialise le chargement du menu et le refresh automatique
     */
    function initialiser() {
        // Vérifier que la section menu existe
        if (!menuSection) {
            console.error('Section menu non trouvée dans la page');
            return;
        }

        // Charger le menu immédiatement
        chargerMenu();

        // Configurer le refresh automatique toutes les 5 minutes
        setInterval(chargerMenu, REFRESH_INTERVAL);

        console.log('Menu dynamique initialisé - Refresh toutes les 5 minutes');
    }

    // Initialiser quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

})();
