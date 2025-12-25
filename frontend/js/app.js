// Main Application - Router and Initialization

import { showToast } from './components/toast.js';

const routes = {
    '/dashboard': () => import('./pages/dashboard.js'),
    '/assets': () => import('./pages/assets.js'),
    '/categories': () => import('./pages/categories.js'),
    '/locations': () => import('./pages/locations.js'),
    '/departments': () => import('./pages/departments.js'),
    '/vendors': () => import('./pages/vendors.js'),
    '/maintenance': () => import('./pages/maintenance.js'),
    '/reports': () => import('./pages/reports.js'),
};

class Router {
    constructor() {
        this.currentPage = null;
        this.app = document.getElementById('app');

        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    getPath() {
        const hash = window.location.hash || '#/dashboard';
        return hash.slice(1); // Remove the #
    }

    async handleRoute() {
        const path = this.getPath();
        const route = routes[path];

        // Update active nav link
        this.updateActiveNav(path);

        if (!route) {
            this.app.innerHTML = `
                <div class="text-center py-12">
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
                    <p class="text-gray-600">The page you're looking for doesn't exist.</p>
                    <a href="#/dashboard" class="btn btn-primary mt-4 inline-block">Go to Dashboard</a>
                </div>
            `;
            return;
        }

        // Show loading state
        this.app.innerHTML = `
            <div class="flex justify-center items-center p-8">
                <div class="spinner"></div>
            </div>
        `;

        try {
            const module = await route();
            if (this.currentPage && typeof this.currentPage.destroy === 'function') {
                this.currentPage.destroy();
            }
            this.currentPage = module.default;
            await this.currentPage.init(this.app);
        } catch (error) {
            console.error('Error loading page:', error);
            this.app.innerHTML = `
                <div class="text-center py-12">
                    <h2 class="text-2xl font-bold text-red-600 mb-2">Error Loading Page</h2>
                    <p class="text-gray-600">${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary mt-4">Reload Page</button>
                </div>
            `;
            showToast('Failed to load page', 'error');
        }
    }

    updateActiveNav(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkPath = link.getAttribute('href')?.slice(1);
            if (linkPath === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

// Initialize the application
const router = new Router();

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred', 'error');
});

export { router };
