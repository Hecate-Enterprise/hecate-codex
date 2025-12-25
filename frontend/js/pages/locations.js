// Locations Page

import { api } from '../api.js';
import { DataTable } from '../components/table.js';
import { openModal, closeModal, confirm } from '../components/modal.js';
import { showSuccess, showError } from '../components/toast.js';
import { getFormData, setFormData } from '../utils.js';

let table = null;
let locations = [];

const Locations = {
    async init(container) {
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Locations</h1>
                    <p class="text-gray-600">Manage physical locations for your assets</p>
                </div>
                <button id="add-location-btn" class="btn btn-primary">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Location
                </button>
            </div>
            <div class="card">
                <div id="locations-table"></div>
            </div>
        `;

        await this.loadLocations();
        this.initTable(container);
        this.bindEvents(container);
    },

    async loadLocations() {
        try {
            const response = await api.getLocations({ page: 1, page_size: 100 });
            locations = response.items || [];
        } catch (error) {
            console.error('Error loading locations:', error);
            locations = [];
        }
    },

    initTable(container) {
        table = new DataTable('#locations-table', {
            columns: [
                { key: 'name', header: 'Name' },
                { key: 'address', header: 'Address', render: (val) => val || '-' },
                {
                    key: 'parent_id',
                    header: 'Parent Location',
                    render: (val) => {
                        if (!val) return '-';
                        const parent = locations.find(l => l.id === val);
                        return parent ? parent.name : '-';
                    }
                }
            ],
            fetchData: (params) => api.getLocations(params),
            emptyMessage: 'No locations found. Add your first location!',
            actions: (row) => `
                <button class="btn btn-secondary btn-sm mr-2 edit-btn" data-id="${row.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">Delete</button>
            `
        });

        table.load();
    },

    bindEvents(container) {
        container.querySelector('#add-location-btn').addEventListener('click', () => {
            this.openLocationModal();
        });

        container.addEventListener('click', async (e) => {
            if (e.target.closest('.edit-btn')) {
                const id = parseInt(e.target.closest('.edit-btn').dataset.id);
                await this.openLocationModal(id);
            }

            if (e.target.closest('.delete-btn')) {
                const id = parseInt(e.target.closest('.delete-btn').dataset.id);
                await this.deleteLocation(id);
            }
        });
    },

    async openLocationModal(id = null) {
        const isEdit = id !== null;
        let location = null;

        if (isEdit) {
            try {
                location = await api.getLocation(id);
            } catch (error) {
                showError('Failed to load location');
                return;
            }
        }

        const formHtml = `
            <form id="location-form">
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input type="text" name="name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Address</label>
                    <textarea name="address" class="form-input" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Parent Location</label>
                    <select name="parent_id" class="form-input">
                        <option value="">None (Top Level)</option>
                        ${locations.filter(l => l.id !== id).map(l => `
                            <option value="${l.id}">${l.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        openModal(isEdit ? 'Edit Location' : 'New Location', formHtml);

        const form = document.getElementById('location-form');

        if (isEdit && location) {
            setFormData(form, location);
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
                    await api.updateLocation(id, data);
                    showSuccess('Location updated successfully');
                } else {
                    await api.createLocation(data);
                    showSuccess('Location created successfully');
                }
                closeModal();
                await this.loadLocations();
                table.refresh();
            } catch (error) {
                showError(error.message || 'Failed to save location');
            }
        });
    },

    async deleteLocation(id) {
        const confirmed = await confirm('Are you sure you want to delete this location?', {
            title: 'Delete Location',
            confirmText: 'Delete',
            danger: true
        });

        if (!confirmed) return;

        try {
            await api.deleteLocation(id);
            showSuccess('Location deleted successfully');
            await this.loadLocations();
            table.refresh();
        } catch (error) {
            showError(error.message || 'Failed to delete location');
        }
    },

    destroy() {
        table = null;
        locations = [];
    }
};

export default Locations;
