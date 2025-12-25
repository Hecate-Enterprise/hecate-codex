// Categories Page

import { api } from '../api.js';
import { DataTable } from '../components/table.js';
import { openModal, closeModal, confirm } from '../components/modal.js';
import { showSuccess, showError } from '../components/toast.js';
import { getFormData, setFormData, getDepreciationMethodLabel } from '../utils.js';

let table = null;
let categories = [];

const Categories = {
    async init(container) {
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Categories</h1>
                    <p class="text-gray-600">Manage asset categories and depreciation settings</p>
                </div>
                <button id="add-category-btn" class="btn btn-primary">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Category
                </button>
            </div>
            <div class="card">
                <div id="categories-table"></div>
            </div>
        `;

        await this.loadCategories();
        this.initTable(container);
        this.bindEvents(container);
    },

    async loadCategories() {
        try {
            const response = await api.getCategories({ page: 1, page_size: 100 });
            categories = response.items || [];
        } catch (error) {
            console.error('Error loading categories:', error);
            categories = [];
        }
    },

    initTable(container) {
        table = new DataTable('#categories-table', {
            columns: [
                { key: 'name', header: 'Name' },
                { key: 'description', header: 'Description', render: (val) => val || '-' },
                {
                    key: 'parent_id',
                    header: 'Parent',
                    render: (val) => {
                        if (!val) return '-';
                        const parent = categories.find(c => c.id === val);
                        return parent ? parent.name : '-';
                    }
                },
                {
                    key: 'depreciation_method',
                    header: 'Depreciation',
                    render: (val) => getDepreciationMethodLabel(val)
                },
                {
                    key: 'useful_life_years',
                    header: 'Useful Life',
                    render: (val) => val ? `${val} years` : '-'
                }
            ],
            fetchData: (params) => api.getCategories(params),
            emptyMessage: 'No categories found. Create your first category!',
            actions: (row) => `
                <button class="btn btn-secondary btn-sm mr-2 edit-btn" data-id="${row.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">Delete</button>
            `
        });

        table.load();
    },

    bindEvents(container) {
        container.querySelector('#add-category-btn').addEventListener('click', () => {
            this.openCategoryModal();
        });

        container.addEventListener('click', async (e) => {
            if (e.target.closest('.edit-btn')) {
                const id = parseInt(e.target.closest('.edit-btn').dataset.id);
                await this.openCategoryModal(id);
            }

            if (e.target.closest('.delete-btn')) {
                const id = parseInt(e.target.closest('.delete-btn').dataset.id);
                await this.deleteCategory(id);
            }
        });
    },

    async openCategoryModal(id = null) {
        const isEdit = id !== null;
        let category = null;

        if (isEdit) {
            try {
                category = await api.getCategory(id);
            } catch (error) {
                showError('Failed to load category');
                return;
            }
        }

        const formHtml = `
            <form id="category-form">
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input type="text" name="name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Parent Category</label>
                    <select name="parent_id" class="form-input">
                        <option value="">None</option>
                        ${categories.filter(c => c.id !== id).map(c => `
                            <option value="${c.id}">${c.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Depreciation Method</label>
                    <select name="depreciation_method" class="form-input">
                        <option value="none">None</option>
                        <option value="straight_line">Straight Line</option>
                        <option value="declining_balance">Declining Balance</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Useful Life (years)</label>
                        <input type="number" name="useful_life_years" class="form-input" min="1" step="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Salvage Value (%)</label>
                        <input type="number" name="salvage_value_percent" class="form-input" min="0" max="100" step="0.01">
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        openModal(isEdit ? 'Edit Category' : 'New Category', formHtml);

        const form = document.getElementById('category-form');

        if (isEdit && category) {
            setFormData(form, category);
        }

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);

            // Convert parent_id to number or null
            if (data.parent_id) {
                data.parent_id = parseInt(data.parent_id);
            }

            try {
                if (isEdit) {
                    await api.updateCategory(id, data);
                    showSuccess('Category updated successfully');
                } else {
                    await api.createCategory(data);
                    showSuccess('Category created successfully');
                }
                closeModal();
                await this.loadCategories();
                table.refresh();
            } catch (error) {
                showError(error.message || 'Failed to save category');
            }
        });
    },

    async deleteCategory(id) {
        const confirmed = await confirm('Are you sure you want to delete this category?', {
            title: 'Delete Category',
            confirmText: 'Delete',
            danger: true
        });

        if (!confirmed) return;

        try {
            await api.deleteCategory(id);
            showSuccess('Category deleted successfully');
            await this.loadCategories();
            table.refresh();
        } catch (error) {
            showError(error.message || 'Failed to delete category');
        }
    },

    destroy() {
        table = null;
        categories = [];
    }
};

export default Categories;
