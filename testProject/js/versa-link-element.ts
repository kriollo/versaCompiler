// Web Component VersaLinkElement extraído desde spa-navigation para cumplir regla de una clase por archivo

interface NavigationOptions {
    preserveScroll?: boolean;
    preserveState?: boolean;
    replace?: boolean;
}

export default class VersaLinkElement extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['href', 'data-preserve-scroll', 'data-preserve-state', 'data-replace', 'class', 'role'];
    }

    private anchor: HTMLAnchorElement;
    private isInitialized = false;

    constructor() {
        super();
        this.anchor = document.createElement('a');
        this.anchor.setAttribute('data-spa', 'true');
    }

    connectedCallback(): void {
        if (!this.isInitialized) {
            this.render();
            this.isInitialized = true;
        }
        this.anchor.addEventListener('click', this.handleClick);
    }

    disconnectedCallback(): void {
        this.anchor.removeEventListener('click', this.handleClick);
    }

    attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
        if (!this.isInitialized) {
            return;
        }

        if (name === 'class') {
            this.anchor.className = newValue || '';
        } else if (newValue !== null) {
            this.anchor.setAttribute(name, newValue);
        } else {
            this.anchor.removeAttribute(name);
        }
    }

    private handleClick = (event: MouseEvent) => {
        // Permitir comportamientos estándar (Ctrl+Click, etc.)
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
            return;
        }

        event.preventDefault();

        // Extraer opciones dinámicamente en el momento del click
        const options: NavigationOptions = {
            preserveScroll: this.getAttribute('data-preserve-scroll') === 'true',
            preserveState: this.getAttribute('data-preserve-state') === 'true',
            replace: this.getAttribute('data-replace') === 'true',
        };

        const href = this.getAttribute('href') || '#';

        document.dispatchEvent(
            new CustomEvent('spa:link:click', {
                bubbles: true,
                composed: true,
                detail: {
                    href: new URL(href, window.location.href).href,
                    options,
                    sourceEvent: event,
                },
            }),
        );
    };

    private render(): void {
        // Sincronizar atributos iniciales
        for (const attr of VersaLinkElement.observedAttributes) {
            const value = this.getAttribute(attr);
            if (value !== null) {
                if (attr === 'class') {
                    this.anchor.className = value;
                } else {
                    this.anchor.setAttribute(attr, value);
                }
            }
        }

        // Mover hijos al anchor
        while (this.firstChild) {
            this.anchor.append(this.firstChild);
        }

        this.append(this.anchor);

        // Evitar que los estilos del host interfieran si no es necesario
        this.style.display = 'contents';
    }
}

// Registrar el custom element si no existe
if (!customElements.get('versa-link')) {
    customElements.define('versa-link', VersaLinkElement);
}
