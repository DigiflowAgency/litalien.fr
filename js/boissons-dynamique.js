/**
 * Boissons Dynamique - L'Italien Restaurant
 * Charge la carte des boissons depuis l'API Google Sheets et l'affiche dans la page
 * Auto-refresh toutes les 5 minutes
 */

(function() {
    'use strict';

    const API_URL = '/api/boissons';
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes en millisecondes
    const menuSection = document.getElementById('menu');

    /**
     * Formate le nom du produit avec format et volume si disponibles
     */
    function formaterNomProduit(boisson) {
        let nom = boisson.produit;

        // Ajouter le format et/ou le volume si disponibles
        const details = [];
        if (boisson.format && boisson.format.trim() !== '') {
            details.push(boisson.format);
        }
        if (boisson.volume_cl && boisson.volume_cl.trim() !== '') {
            details.push(boisson.volume_cl);
        }

        if (details.length > 0) {
            nom += ` ${details.join(' ')}`;
        }

        return nom;
    }

    /**
     * Crée le HTML pour un élément de boisson
     */
    function creerElementBoisson(boisson, hasMultiplePrices = false) {
        const menuContainer = document.createElement('div');
        menuContainer.className = 'w-layout-grid menu_container';

        const nomProduit = formaterNomProduit(boisson);
        const hasDescription = boisson.description && boisson.description.trim() !== '';

        // Détecter si le prix contient plusieurs valeurs (verre + bouteille)
        const prixParts = boisson.prix.split('/').map(p => p.trim());
        const hasDualPrice = prixParts.length > 1 || hasMultiplePrices;

        let priceHTML;
        if (hasDualPrice && prixParts.length > 1) {
            priceHTML = `
                <div class="element_price-container double">
                    <div class="price"><span class="price-label">Verre:</span> ${prixParts[0]}</div>
                    <div class="price"><span class="price-label">Btl:</span> ${prixParts[1]}</div>
                </div>
            `;
        } else {
            priceHTML = `
                <div class="element_price-container">
                    <div class="price">${boisson.prix}</div>
                </div>
            `;
        }

        menuContainer.innerHTML = `
            <div class="menu_element-container">
                <div class="main_element-container">
                    <div class="element_title-container">
                        <div class="element_name-text">${nomProduit.toUpperCase()}</div>
                    </div>
                    <div class="element_line"></div>
                    ${priceHTML}
                </div>
                ${hasDescription ? `
                <div class="descriptive_element-container">
                    <div class="descriptive_element-text">${boisson.description}</div>
                </div>
                ` : ''}
            </div>
        `;

        return menuContainer;
    }

    /**
     * Groupe les boissons par sous-catégorie si présentes
     */
    function grouperParSousCategorie(boissons) {
        const groupes = {};

        boissons.forEach(boisson => {
            const sousCat = boisson.sous_categorie && boisson.sous_categorie.trim() !== ''
                ? boisson.sous_categorie.trim()
                : null;

            if (sousCat) {
                if (!groupes[sousCat]) {
                    groupes[sousCat] = [];
                }
                groupes[sousCat].push(boisson);
            } else {
                if (!groupes['_sans_sous_cat']) {
                    groupes['_sans_sous_cat'] = [];
                }
                groupes['_sans_sous_cat'].push(boisson);
            }
        });

        return groupes;
    }

    /**
     * Crée le HTML pour une catégorie de boissons
     */
    function creerCategorieBoisson(categorie) {
        const boissonWrapper = document.createElement('div');
        boissonWrapper.className = 'boisson_wrapper';

        // Ajouter le titre de la catégorie
        const catTitle = document.createElement('div');
        catTitle.className = 'boisson_cat';
        catTitle.textContent = categorie.nom;
        boissonWrapper.appendChild(catTitle);

        // Grouper par sous-catégorie si nécessaire
        const groupes = grouperParSousCategorie(categorie.boissons);

        // Afficher d'abord les boissons sans sous-catégorie
        if (groupes['_sans_sous_cat']) {
            groupes['_sans_sous_cat'].forEach(boisson => {
                const elementBoisson = creerElementBoisson(boisson);
                boissonWrapper.appendChild(elementBoisson);
            });
        }

        // Puis afficher les autres sous-catégories
        Object.keys(groupes).forEach(sousCat => {
            if (sousCat !== '_sans_sous_cat') {
                // Ajouter un titre de sous-catégorie
                const sousCatTitle = document.createElement('div');
                sousCatTitle.className = 'boisson_sous-cat';
                sousCatTitle.textContent = sousCat.toUpperCase();
                boissonWrapper.appendChild(sousCatTitle);

                groupes[sousCat].forEach(boisson => {
                    const elementBoisson = creerElementBoisson(boisson);
                    boissonWrapper.appendChild(elementBoisson);
                });
            }
        });

        return boissonWrapper;
    }

    /**
     * Affiche un loader pendant le chargement
     */
    function afficherLoader() {
        menuSection.innerHTML = `
            <div class="menu_wrapper">
                <div class="subtitle_container">
                    <p class="about_subtitle">RESTAURANT L'ITALIEN</p>
                    <h2 class="rt-about-two-exper-heading" style="opacity: 0.5;">Chargement de la carte...</h2>
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
                    <p class="about_subtitle">RESTAURANT L'ITALIEN</p>
                    <h2 class="rt-about-two-exper-heading" style="color: #d9534f;">Erreur de chargement</h2>
                    <p style="text-align: center; margin-top: 1rem;">${message}</p>
                </div>
            </div>
        `;
    }

    /**
     * Charge et affiche la carte des boissons depuis l'API
     */
    async function chargerBoissons() {
        try {
            afficherLoader();

            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            // Vider le contenu actuel
            menuSection.innerHTML = '';

            // Créer le wrapper principal avec le titre
            const mainWrapper = document.createElement('div');
            mainWrapper.className = 'menu_wrapper';

            const subtitleContainer = document.createElement('div');
            subtitleContainer.className = 'subtitle_container';

            const subtitle = document.createElement('p');
            subtitle.className = 'about_subtitle';
            subtitle.textContent = "RESTAURANT L'ITALIEN";

            const heading = document.createElement('h2');
            heading.className = 'rt-about-two-exper-heading';
            heading.textContent = 'CARTE DES BOISSONS';

            subtitleContainer.appendChild(subtitle);
            subtitleContainer.appendChild(heading);
            mainWrapper.appendChild(subtitleContainer);

            // Vérifier si des catégories existent
            if (!data.categories || data.categories.length === 0) {
                const errorText = document.createElement('p');
                errorText.style.textAlign = 'center';
                errorText.style.marginTop = '2rem';
                errorText.textContent = 'Aucune boisson disponible pour le moment.';
                mainWrapper.appendChild(errorText);
                menuSection.appendChild(mainWrapper);
                return;
            }

            // Ajouter chaque catégorie de boissons
            data.categories.forEach(categorie => {
                if (categorie.boissons && categorie.boissons.length > 0) {
                    const categorieElement = creerCategorieBoisson(categorie);
                    mainWrapper.appendChild(categorieElement);
                }
            });

            menuSection.appendChild(mainWrapper);

            console.log('Carte des boissons chargée avec succès:', data.categories.length, 'catégories');

        } catch (error) {
            console.error('Erreur lors du chargement de la carte des boissons:', error);
            afficherErreur('Impossible de charger la carte. Veuillez rafraîchir la page.');
        }
    }

    /**
     * Initialise le chargement de la carte et le refresh automatique
     */
    function initialiser() {
        // Vérifier que la section menu existe
        if (!menuSection) {
            console.error('Section menu non trouvée dans la page');
            return;
        }

        // Charger la carte immédiatement
        chargerBoissons();

        // Configurer le refresh automatique toutes les 5 minutes
        setInterval(chargerBoissons, REFRESH_INTERVAL);

        console.log('Carte des boissons dynamique initialisée - Refresh toutes les 5 minutes');
    }

    // Initialiser quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

})();
