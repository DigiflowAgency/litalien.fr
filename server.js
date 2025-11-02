const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 8080; // Port 8080 par défaut (hors de la plage 3000-3020)

// Middleware
app.use(cors());
app.use(express.static('.'));

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Normalise le format des prix
 * Accepte : 14,50 | 14.50 | 14 50 | 14.50€ | 14€
 * Retourne : 14.50€
 */
function normaliserPrix(prix) {
    if (!prix) return '';
    let prixNettoye = String(prix).trim();
    prixNettoye = prixNettoye.replace(',', '.');
    prixNettoye = prixNettoye.replace(/\s/g, '');
    prixNettoye = prixNettoye.replace('€', '');
    const nombre = parseFloat(prixNettoye);
    if (!isNaN(nombre)) {
        return nombre.toFixed(2) + ' €';
    }
    return prixNettoye;
}

/**
 * Normalise le nom de la catégorie
 */
function normaliserCategorie(categorie) {
    if (!categorie) return '';
    let cat = String(categorie).toLowerCase().trim();
    cat = cat.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cat = cat.replace(/[^\w\s]/g, '');
    cat = cat.replace(/\s+/g, '_');
    return cat;
}

/**
 * Fonction pour obtenir le nom d'affichage de la catégorie
 */
function getNomAffichageCategorie(categorieNormalisee) {
    const mappingPrincipal = {
        'entrees': 'ENTRÉES',
        'entree': 'ENTRÉES',
        'plats': 'PLATS',
        'plat': 'PLATS',
        'pates': 'PÂTES',
        'pate': 'PÂTES',
        'desserts': 'DESSERTS',
        'dessert': 'DESSERTS',
        'antipasti': 'ANTIPASTI',
        'risottos': 'RISOTTOS',
        'risotto': 'RISOTTOS'
    };

    if (mappingPrincipal[categorieNormalisee]) {
        return mappingPrincipal[categorieNormalisee];
    }

    return categorieNormalisee
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Vérifie si un plat est disponible
 */
function estDisponible(disponible) {
    if (!disponible) return false;
    const valeur = String(disponible).toLowerCase().trim();
    const variantes = ['oui', 'yes', 'o', 'y', '1', 'true', 'ok', 'disponible', 'dispo'];
    return variantes.some(v => valeur.startsWith(v));
}

/**
 * Nettoie le texte
 */
function nettoyerTexte(texte) {
    if (!texte) return '';
    return String(texte).trim();
}

// =============================================================================
// ROUTE API - MENU PRINCIPAL
// =============================================================================

app.get('/api/menu', async (req, res) => {
    try {
        if (!process.env.GOOGLE_CREDENTIALS || !process.env.GOOGLE_SHEET_ID) {
            throw new Error('Variables d\'environnement manquantes');
        }

        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Lecture de l'onglet MENU
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'MENU!A2:E200',
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return res.json({ categories: [] });
        }

        const menuParCategorie = {};

        rows.forEach(row => {
            const [nom, description, prix, categorie, disponible] = row;

            if (estDisponible(disponible)) {
                const plat = {
                    nom: nettoyerTexte(nom),
                    description: nettoyerTexte(description),
                    prix: normaliserPrix(prix)
                };

                if (!plat.nom) return;

                const catNormalisee = normaliserCategorie(categorie);
                if (!catNormalisee) return;

                if (!menuParCategorie[catNormalisee]) {
                    menuParCategorie[catNormalisee] = [];
                }

                menuParCategorie[catNormalisee].push(plat);
            }
        });

        // Ordre prioritaire des catégories
        const ordrePriorite = ['antipasti', 'entrees', 'entree', 'pates', 'pate', 'risottos', 'risotto', 'plats', 'plat', 'desserts', 'dessert'];
        const categories = [];

        ordrePriorite.forEach(catPrioritaire => {
            if (menuParCategorie[catPrioritaire]) {
                categories.push({
                    id: catPrioritaire,
                    nom: getNomAffichageCategorie(catPrioritaire),
                    plats: menuParCategorie[catPrioritaire]
                });
                delete menuParCategorie[catPrioritaire];
            }
        });

        Object.keys(menuParCategorie)
            .sort()
            .forEach(cat => {
                categories.push({
                    id: cat,
                    nom: getNomAffichageCategorie(cat),
                    plats: menuParCategorie[cat]
                });
            });

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json({ categories });

    } catch (error) {
        console.error('Erreur lors de la récupération du menu:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération du menu',
            message: error.message
        });
    }
});

// =============================================================================
// ROUTE API - CARTE DES BOISSONS
// =============================================================================

app.get('/api/boissons', async (req, res) => {
    try {
        if (!process.env.GOOGLE_CREDENTIALS || !process.env.GOOGLE_SHEET_ID) {
            throw new Error('Variables d\'environnement manquantes');
        }

        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Lecture de l'onglet MENU BOISSONS
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'MENU BOISSONS!A2:H200',
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return res.json({ categories: [] });
        }

        const boissonsParCategorie = {};

        rows.forEach(row => {
            const [produit, format, volume_cl, prix, categorie, sous_categorie, description, disponible] = row;

            if (estDisponible(disponible)) {
                const boisson = {
                    produit: nettoyerTexte(produit),
                    format: nettoyerTexte(format),
                    volume_cl: nettoyerTexte(volume_cl),
                    description: nettoyerTexte(description),
                    prix: normaliserPrix(prix),
                    sous_categorie: nettoyerTexte(sous_categorie)
                };

                if (!boisson.produit) return;

                const catNormalisee = normaliserCategorie(categorie);
                if (!catNormalisee) return;

                if (!boissonsParCategorie[catNormalisee]) {
                    boissonsParCategorie[catNormalisee] = [];
                }

                boissonsParCategorie[catNormalisee].push(boisson);
            }
        });

        // Ordre prioritaire pour les boissons
        const ordrePriorite = ['softs', 'soft', 'biere', 'bieres', 'vin', 'vins', 'spiritueux', 'digestifs', 'cocktails', 'cocktail'];
        const categories = [];

        ordrePriorite.forEach(catPrioritaire => {
            if (boissonsParCategorie[catPrioritaire]) {
                categories.push({
                    id: catPrioritaire,
                    nom: getNomAffichageCategorie(catPrioritaire).toUpperCase(),
                    boissons: boissonsParCategorie[catPrioritaire]
                });
                delete boissonsParCategorie[catPrioritaire];
            }
        });

        Object.keys(boissonsParCategorie)
            .sort()
            .forEach(cat => {
                categories.push({
                    id: cat,
                    nom: getNomAffichageCategorie(cat).toUpperCase(),
                    boissons: boissonsParCategorie[cat]
                });
            });

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json({ categories });

    } catch (error) {
        console.error('Erreur lors de la récupération des boissons:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des boissons',
            message: error.message
        });
    }
});

// =============================================================================
// ROUTES HTML
// =============================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/carte-boissons', (req, res) => {
    res.sendFile(path.join(__dirname, 'carte-boissons.html'));
});

// =============================================================================
// DÉMARRAGE DU SERVEUR
// =============================================================================

const os = require('os');
const server = app.listen(PORT, '0.0.0.0', () => {
    const actualPort = server.address().port; // Récupère le port réel assigné
    const networkInterfaces = os.networkInterfaces();
    const ip = Object.values(networkInterfaces)
        .flat()
        .find(i => i.family === 'IPv4' && !i.internal)?.address;

    console.log(`
╔════════════════════════════════════════════════════════╗
║          🍝 L'Italien - Serveur démarré! 🍝            ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Local:    http://localhost:${actualPort}                       ║
║  Network:  http://${ip || 'N/A'}:${actualPort}                      ║
║                                                        ║
║  API Menu:      http://localhost:${actualPort}/api/menu         ║
║  API Boissons:  http://localhost:${actualPort}/api/boissons     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});
