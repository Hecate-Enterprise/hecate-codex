// Vendors Page

import { api } from '../api.js';
import { DataTable } from '../components/table.js';
import { openModal, closeModal, confirm } from '../components/modal.js';
import { showSuccess, showError } from '../components/toast.js';
import { getFormData, setFormData, truncate } from '../utils.js';

let table = null;

const Vendors = {
    async init(container) {
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Vendors</h1>
                    <p class="text-gray-600">Manage asset suppliers and vendors</p>
                </div>
                <button id="add-vendor-btn" class="btn btn-primary">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Vendor
                </button>
            </div>
            <div class="card">
                <div id="vendors-table"></div>
            </div>
        `;

        this.initTable(container);
        this.bindEvents(container);
    },

    initTable(container) {
        table = new DataTable('#vendors-table', {
            columns: [
                { key: 'name', header: 'Name' },
                {
                    key: 'contact_email',
                    header: 'Email',
                    render: (val) => val ? `<a href="mailto:${val}" class="text-primary-600 hover:underline">${val}</a>` : '-'
                },
                { key: 'phone', header: 'Phone', render: (val) => val || '-' },
                {
                    key: 'website',
                    header: 'Website',
                    render: (val) => val ? `<a href="${val}" target="_blank" class="text-primary-600 hover:underline">${truncate(val, 30)}</a>` : '-'
                }
            ],
            fetchData: (params) => api.getVendors(params),
            emptyMessage: 'No vendors found. Add your first vendor!',
            actions: (row) => `
                <button class="btn btn-secondary btn-sm mr-2 view-btn" data-id="${row.id}">View</button>
                <button class="btn btn-secondary btn-sm mr-2 edit-btn" data-id="${row.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">Delete</button>
            `
        });

        table.load();
    },

    bindEvents(container) {
        container.querySelector('#add-vendor-btn').addEventListener('click', () => {
            this.openVendorModal();
        });

        container.addEventListener('click', async (e) => {
            if (e.target.closest('.view-btn')) {
                const id = parseInt(e.target.closest('.view-btn').dataset.id);
                await this.viewVendor(id);
            }

            if (e.target.closest('.edit-btn')) {
                const id = parseInt(e.target.closest('.edit-btn').dataset.id);
                await this.openVendorModal(id);
            }

            if (e.target.closest('.delete-btn')) {
                const id = parseInt(e.target.closest('.delete-btn').dataset.id);
                await this.deleteVendor(id);
            }
        });
    },

    async viewVendor(id) {
        try {
            const vendor = await api.getVendor(id);

            const content = `
                <div class="space-y-4">
                    <div>
                        <label class="text-sm text-gray-500">Name</label>
                        <p class="font-medium">${vendor.name}</p>
                    </div>
                    ${vendor.contact_email ? `
                        <div>
                            <label class="text-sm text-gray-500">Email</label>
                            <p><a href="mailto:${vendor.contact_email}" class="text-primary-600 hover:underline">${vendor.contact_email}</a></p>
                        </div>
                    ` : ''}
                    ${vendor.phone ? `
                        <div>
                            <label class="text-sm text-gray-500">Phone</label>
                            <p>${vendor.phone}</p>
                        </div>
                    ` : ''}
                    ${vendor.address ? `
                        <div>
                            <label class="text-sm text-gray-500">Address</label>
                            <p class="whitespace-pre-line">${vendor.address}</p>
                        </div>
                    ` : ''}
                    ${vendor.website ? `
                        <div>
                            <label class="text-sm text-gray-500">Website</label>
                            <p><a href="${vendor.website}" target="_blank" class="text-primary-600 hover:underline">${vendor.website}</a></p>
                        </div>
                    ` : ''}
                    ${vendor.notes ? `
                        <div>
                            <label class="text-sm text-gray-500">Notes</label>
                            <p class="whitespace-pre-line">${vendor.notes}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button class="btn btn-secondary" id="close-btn">Close</button>
                    <button class="btn btn-primary" id="edit-btn">Edit</button>
                </div>
            `;

            openModal('Vendor Details', content);

            document.getElementById('close-btn').addEventListener('click', closeModal);
            document.getElementById('edit-btn').addEventListener('click', () => {
                closeModal();
                this.openVendorModal(id);
            });
        } catch (error) {
            showError('Failed to load vendor details');
        }
    },

    async openVendorModal(id = null) {
        const isEdit = id !== null;
        let vendor = null;

        if (isEdit) {
            try {
                vendor = await api.getVendor(id);
            } catch (error) {
                showError('Failed to load vendor');
                return;
            }
        }

        const formHtml = `
            <form id="vendor-form">
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input type="text" name="name" class="form-input" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="contact_email" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone</label>
                        <input type="tel" name="phone" class="form-input">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Address</label>
                    <textarea name="address" class="form-input" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Website</label>
                    <input type="url" name="website" class="form-input" placeholder="https://">
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-input" rows="3"></textarea>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        openModal(isEdit ? 'Edit Vendor' : 'New Vendor', formHtml);

        const form = document.getElementById('vendor-form');

        if (isEdit && vendor) {
            setFormData(form, vendor);
        }

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);

            try {
                if (isEdit) {
                    await api.updateVendor(id, data);
                    showSuccess('Vendor updated successfully');
                } else {
                    await api.createVendor(data);
                    showSuccess('Vendor created successfully');
                }
                closeModal();
                table.refresh();
            } catch (error) {
                showError(error.message || 'Failed to save vendor');
            }
        });
    },

    async deleteVendor(id) {
        const confirmed = await confirm('Are you sure you want to delete this vendor?', {
            title: 'Delete Vendor',
            confirmText: 'Delete',
            danger: true
        });

        if (!confirmed) return;

        try {
            await api.deleteVendor(id);
            showSuccess('Vendor deleted successfully');
            table.refresh();
        } catch (error) {
            showError(error.message || 'Failed to delete vendor');
        }
    },

    destroy() {
        table = null;
    }
};

export default Vendors;
