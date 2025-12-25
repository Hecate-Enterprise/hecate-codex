// Data Table Component with Pagination

import { createLoadingSpinner, createEmptyState } from '../utils.js';

export class DataTable {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            columns: [],
            fetchData: null,
            pageSize: 10,
            emptyMessage: 'No data available',
            onRowClick: null,
            actions: null,
            ...options
        };

        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.data = [];
    }

    async load(page = 1) {
        this.currentPage = page;
        this.container.innerHTML = createLoadingSpinner();

        try {
            const response = await this.options.fetchData({
                page: this.currentPage,
                page_size: this.options.pageSize
            });

            this.data = response.items || [];
            this.totalItems = response.total || 0;
            this.totalPages = response.pages || 1;

            this.render();
        } catch (error) {
            console.error('Error loading data:', error);
            this.container.innerHTML = `
                <div class="text-center py-8 text-red-600">
                    <p>Failed to load data: ${error.message}</p>
                    <button class="btn btn-primary mt-4" id="retry-btn">Retry</button>
                </div>
            `;
            this.container.querySelector('#retry-btn')?.addEventListener('click', () => this.load(this.currentPage));
        }
    }

    render() {
        if (this.data.length === 0) {
            this.container.innerHTML = createEmptyState(this.options.emptyMessage);
            return;
        }

        const tableHtml = `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${this.options.columns.map(col => `
                                <th class="${col.class || ''}">${col.header}</th>
                            `).join('')}
                            ${this.options.actions ? '<th class="text-right">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.map((row, index) => `
                            <tr class="${this.options.onRowClick ? 'cursor-pointer' : ''}" data-index="${index}">
                                ${this.options.columns.map(col => `
                                    <td class="${col.class || ''}">${this.renderCell(row, col)}</td>
                                `).join('')}
                                ${this.options.actions ? `<td class="text-right">${this.options.actions(row)}</td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.renderPagination()}
        `;

        this.container.innerHTML = tableHtml;
        this.bindEvents();
    }

    renderCell(row, column) {
        if (column.render) {
            return column.render(row[column.key], row);
        }
        return row[column.key] ?? '-';
    }

    renderPagination() {
        if (this.totalPages <= 1) return '';

        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return `
            <div class="flex items-center justify-between mt-4 px-2">
                <div class="text-sm text-gray-600">
                    Showing ${((this.currentPage - 1) * this.options.pageSize) + 1} to
                    ${Math.min(this.currentPage * this.options.pageSize, this.totalItems)} of
                    ${this.totalItems} results
                </div>
                <div class="pagination">
                    <button data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    ${startPage > 1 ? `<button data-page="1">1</button>${startPage > 2 ? '<span class="px-2">...</span>' : ''}` : ''}
                    ${pages.map(page => `
                        <button data-page="${page}" class="${page === this.currentPage ? 'active' : ''}">${page}</button>
                    `).join('')}
                    ${endPage < this.totalPages ? `${endPage < this.totalPages - 1 ? '<span class="px-2">...</span>' : ''}<button data-page="${this.totalPages}">${this.totalPages}</button>` : ''}
                    <button data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Pagination clicks
        this.container.querySelectorAll('.pagination button[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page);
                if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
                    this.load(page);
                }
            });
        });

        // Row clicks
        if (this.options.onRowClick) {
            this.container.querySelectorAll('tbody tr').forEach(row => {
                row.addEventListener('click', (e) => {
                    // Don't trigger if clicking on actions
                    if (e.target.closest('button') || e.target.closest('a')) return;

                    const index = parseInt(row.dataset.index);
                    this.options.onRowClick(this.data[index], index);
                });
            });
        }
    }

    refresh() {
        this.load(this.currentPage);
    }

    getData() {
        return this.data;
    }

    getSelectedRow(index) {
        return this.data[index];
    }
}
