/**
 * i18n - Système de traduction pour L'Italien
 * Gère le changement de langue entre français et anglais
 */

class I18n {
  constructor() {
    this.currentLang = this.getStoredLanguage() || 'fr';
    this.translations = {
      fr: translations_fr,
      en: translations_en
    };
    this.init();
  }

  /**
   * Récupère la langue stockée dans localStorage
   */
  getStoredLanguage() {
    return localStorage.getItem('language');
  }

  /**
   * Stocke la langue dans localStorage
   */
  setStoredLanguage(lang) {
    localStorage.setItem('language', lang);
  }

  /**
   * Initialise le système i18n
   */
  init() {
    this.updatePageLanguage();
    this.setupLanguageSelector();
    this.updateActiveLanguageFlag();
  }

  /**
   * Change la langue
   */
  changeLanguage(lang) {
    if (this.currentLang === lang) return;

    this.currentLang = lang;
    this.setStoredLanguage(lang);
    this.updatePageLanguage();
    this.updateActiveLanguageFlag();

    // Mettre à jour l'attribut lang du HTML pour l'accessibilité et le SEO
    document.documentElement.lang = lang;
  }

  /**
   * Met à jour le drapeau actif
   */
  updateActiveLanguageFlag() {
    const flags = document.querySelectorAll('.language-flag');
    flags.forEach(flag => {
      const lang = flag.dataset.lang;
      if (lang === this.currentLang) {
        flag.classList.add('active');
      } else {
        flag.classList.remove('active');
      }
    });
  }

  /**
   * Configure le sélecteur de langue
   */
  setupLanguageSelector() {
    const flags = document.querySelectorAll('.language-flag');
    flags.forEach(flag => {
      flag.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = flag.dataset.lang;
        this.changeLanguage(lang);
      });
    });
  }

  /**
   * Met à jour tous les éléments traduisibles de la page
   */
  updatePageLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.dataset.i18n;
      const translation = this.getTranslation(key);

      if (translation) {
        // Vérifier si c'est un input placeholder
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translation;
        } else {
          // Pour les éléments avec white-space: pre-line, garder les \n
          // Sinon, convertir les \n en <br>
          const style = window.getComputedStyle(element);
          if (style.whiteSpace === 'pre-line' || style.whiteSpace === 'pre-wrap') {
            element.textContent = translation;
          } else {
            element.textContent = translation;
          }
        }
      }
    });
  }

  /**
   * Récupère une traduction à partir d'une clé
   * Exemple: "nav.home" -> translations.nav.home
   */
  getTranslation(key) {
    const keys = key.split('.');
    let translation = this.translations[this.currentLang];

    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        console.warn(`Translation not found for key: ${key}`);
        return null;
      }
    }

    return translation;
  }

  /**
   * Retourne la langue actuelle
   */
  getCurrentLanguage() {
    return this.currentLang;
  }
}

// Initialiser i18n quand le DOM est chargé
let i18n;
document.addEventListener('DOMContentLoaded', () => {
  i18n = new I18n();
});
