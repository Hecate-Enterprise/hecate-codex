// Departments Page

import { api } from '../api.js';
import { DataTable } from '../components/table.js';
import { openModal, closeModal, confirm } from '../components/modal.js';
import { showSuccess, showError } from '../components/toast.js';
import { getFormData, setFormData } from '../utils.js';

let table = null;
let departments = [];

const Departments = {
    async init(container) {
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Departments</h1>
                    <p class="text-gray-600">Manage organizational departments</p>
                </div>
                <button id="add-department-btn" class="btn btn-primary">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Department
                </button>
            </div>
            <div class="card">
                <div id="departments-table"></div>
            </div>
        `;

        await this.loadDepartments();
        this.initTable(container);
        this.bindEvents(container);
    },

    async loadDepartments() {
        try {
            const response = await api.getDepartments({ page: 1, page_size: 100 });
            departments = response.items || [];
        } catch (error) {
            console.error('Error loading departments:', error);
            departments = [];
        }
    },

    initTable(container) {
        table = new DataTable('#departments-table', {
            columns: [
                { key: 'name', header: 'Name' },
                { key: 'code', header: 'Code' },
                {
                    key: 'parent_id',
                    header: 'Parent Department',
                    render: (val) => {
                        if (!val) return '-';
                        const parent = departments.find(d => d.id === val);
                        return parent ? parent.name : '-';
                    }
                }
            ],
            fetchData: (params) => api.getDepartments(params),
            emptyMessage: 'No departments found. Add your first department!',
            actions: (row) => `
                <button class="btn btn-secondary btn-sm mr-2 edit-btn" data-id="${row.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">Delete</button>
            `
        });

        table.load();
    },

    bindEvents(container) {
        container.querySelector('#add-department-btn').addEventListener('click', () => {
            this.openDepartmentModal();
        });

        container.addEventListener('click', async (e) => {
            if (e.target.closest('.edit-btn')) {
                const id = parseInt(e.target.closest('.edit-btn').dataset.id);
                await this.openDepartmentModal(id);
            }

            if (e.target.closest('.delete-btn')) {
                const id = parseInt(e.target.closest('.delete-btn').dataset.id);
                await this.deleteDepartment(id);
            }
        });
    },

    async openDepartmentModal(id = null) {
        const isEdit = id !== null;
        let department = null;

        if (isEdit) {
            try {
                department = await api.getDepartment(id);
            } catch (error) {
                showError('Failed to load department');
                return;
            }
        }

        const formHtml = `
            <form id="department-form">
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input type="text" name="name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Code *</label>
                    <input type="text" name="code" class="form-input" required placeholder="e.g., IT, HR, FIN">
                </div>
                <div class="form-group">
                    <label class="form-label">Parent Department</label>
                    <select name="parent_id" class="form-input">
                        <option value="">None (Top Level)</option>
                        ${departments.filter(d => d.id !== id).map(d => `
                            <option value="${d.id}">${d.name} (${d.code})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        openModal(isEdit ? 'Edit Department' : 'New Department', formHtml);

        const form = document.getElementById('department-form');

        if (isEdit && department) {
            setFormData(form, department);
        }

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);

            if (data.parent_id) {
                data.parent_id = parseInt(data.parent_id);
            }

            try {
                if (isEdit) {
                    await api.updateDepartment(id, data);
                    showSuccess('Department updated successfully');
                } else {
                    await api.createDepartment(data);
                    showSuccess('Department created successfully');
                }
                closeModal();
                await this.loadDepartments();
                table.refresh();
            } catch (error) {
                showError(error.message || 'Failed to save department');
            }
        });
    },

    async deleteDepartment(id) {
        const confirmed = await confirm('Are you sure you want to delete this department?', {
            title: 'Delete Department',
            confirmText: 'Delete',
            danger: true
        });

        if (!confirmed) return;

        try {
            await api.deleteDepartment(id);
            showSuccess('Department deleted successfully');
            await this.loadDepartments();
            table.refresh();
        } catch (error) {
            showError(error.message || 'Failed to delete department');
        }
    },

    destroy() {
        table = null;
        departments = [];
    }
};

export default Departments;
