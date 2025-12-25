// Assets Page - Full CRUD with assign/return, attachments, QR codes

import { api } from '../api.js';
import { DataTable } from '../components/table.js';
import { openModal, closeModal, confirm } from '../components/modal.js';
import { showSuccess, showError } from '../components/toast.js';
import {
    getFormData, setFormData, formatDate, formatCurrency,
    getStatusBadge, formatFileSize, createLoadingSpinner
} from '../utils.js';

let table = null;
let categories = [];
let locations = [];
let departments = [];
let vendors = [];

const Assets = {
    async init(container) {
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Assets</h1>
                    <p class="text-gray-600">Manage your organization's assets</p>
                </div>
                <button id="add-asset-btn" class="btn btn-primary">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Asset
                </button>
            </div>

            <!-- Filters -->
            <div class="card mb-4">
                <div class="flex flex-wrap gap-4">
                    <div class="flex-1 min-w-[150px]">
                        <label class="form-label">Status</label>
                        <select id="filter-status" class="form-input">
                            <option value="">All Statuses</option>
                            <option value="available">Available</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_maintenance">In Maintenance</option>
                            <option value="retired">Retired</option>
                            <option value="disposed">Disposed</option>
                        </select>
                    </div>
                    <div class="flex-1 min-w-[150px]">
                        <label class="form-label">Category</label>
                        <select id="filter-category" class="form-input">
                            <option value="">All Categories</option>
                        </select>
                    </div>
                    <div class="flex-1 min-w-[150px]">
                        <label class="form-label">Location</label>
                        <select id="filter-location" class="form-input">
                            <option value="">All Locations</option>
                        </select>
                    </div>
                    <div class="flex-1 min-w-[150px]">
                        <label class="form-label">Department</label>
                        <select id="filter-department" class="form-input">
                            <option value="">All Departments</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="card">
                <div id="assets-table"></div>
            </div>
        `;

        await this.loadLookupData();
        this.populateFilters(container);
        this.initTable(container);
        this.bindEvents(container);
    },

    async loadLookupData() {
        try {
            const [catRes, locRes, deptRes, vendRes] = await Promise.all([
                api.getCategories({ page: 1, page_size: 100 }),
                api.getLocations({ page: 1, page_size: 100 }),
                api.getDepartments({ page: 1, page_size: 100 }),
                api.getVendors({ page: 1, page_size: 100 })
            ]);
            categories = catRes.items || [];
            locations = locRes.items || [];
            departments = deptRes.items || [];
            vendors = vendRes.items || [];
        } catch (error) {
            console.error('Error loading lookup data:', error);
        }
    },

    populateFilters(container) {
        const catSelect = container.querySelector('#filter-category');
        const locSelect = container.querySelector('#filter-location');
        const deptSelect = container.querySelector('#filter-department');

        categories.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        locations.forEach(l => {
            locSelect.innerHTML += `<option value="${l.id}">${l.name}</option>`;
        });
        departments.forEach(d => {
            deptSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
        });
    },

    initTable(container) {
        table = new DataTable('#assets-table', {
            columns: [
                { key: 'asset_tag', header: 'Tag', class: 'font-mono text-sm' },
                { key: 'name', header: 'Name' },
                {
                    key: 'status',
                    header: 'Status',
                    render: (val) => getStatusBadge(val)
                },
                {
                    key: 'category_id',
                    header: 'Category',
                    render: (val) => {
                        const cat = categories.find(c => c.id === val);
                        return cat ? cat.name : '-';
                    }
                },
                {
                    key: 'current_value',
                    header: 'Value',
                    render: (val) => formatCurrency(val)
                },
                {
                    key: 'purchase_date',
                    header: 'Purchased',
                    render: (val) => formatDate(val)
                }
            ],
            fetchData: (params) => {
                const filters = this.getFilters(container);
                return api.getAssets({ ...params, ...filters });
            },
            emptyMessage: 'No assets found. Add your first asset!',
            onRowClick: (row) => this.viewAsset(row.id),
            actions: (row) => `
                <button class="btn btn-secondary btn-sm mr-1 view-btn" data-id="${row.id}" title="View">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                </button>
                <button class="btn btn-secondary btn-sm mr-1 edit-btn" data-id="${row.id}" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            `
        });

        table.load();
    },

    getFilters(container) {
        const filters = {};
        const status = container.querySelector('#filter-status').value;
        const category = container.querySelector('#filter-category').value;
        const location = container.querySelector('#filter-location').value;
        const department = container.querySelector('#filter-department').value;

        if (status) filters.status = status;
        if (category) filters.category_id = parseInt(category);
        if (location) filters.location_id = parseInt(location);
        if (department) filters.department_id = parseInt(department);

        return filters;
    },

    bindEvents(container) {
        container.querySelector('#add-asset-btn').addEventListener('click', () => {
            this.openAssetModal();
        });

        // Filter changes
        ['#filter-status', '#filter-category', '#filter-location', '#filter-department'].forEach(sel => {
            container.querySelector(sel).addEventListener('change', () => table.load(1));
        });

        container.addEventListener('click', async (e) => {
            if (e.target.closest('.view-btn')) {
                e.stopPropagation();
                const id = parseInt(e.target.closest('.view-btn').dataset.id);
                await this.viewAsset(id);
            }

            if (e.target.closest('.edit-btn')) {
                e.stopPropagation();
                const id = parseInt(e.target.closest('.edit-btn').dataset.id);
                await this.openAssetModal(id);
            }

            if (e.target.closest('.delete-btn')) {
                e.stopPropagation();
                const id = parseInt(e.target.closest('.delete-btn').dataset.id);
                await this.deleteAsset(id);
            }
        });
    },

    async viewAsset(id) {
        try {
            const asset = await api.getAsset(id);
            const category = categories.find(c => c.id === asset.category_id);
            const location = locations.find(l => l.id === asset.location_id);
            const department = departments.find(d => d.id === asset.department_id);
            const vendor = vendors.find(v => v.id === asset.vendor_id);

            const content = `
                <div class="space-y-6">
                    <!-- Asset Info -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm text-gray-500">Asset Tag</label>
                            <p class="font-mono font-medium">${asset.asset_tag}</p>
                        </div>
                        <div>
                            <label class="text-sm text-gray-500">Status</label>
                            <p>${getStatusBadge(asset.status)}</p>
                        </div>
                        <div class="col-span-2">
                            <label class="text-sm text-gray-500">Name</label>
                            <p class="font-medium">${asset.name}</p>
                        </div>
                        ${asset.description ? `
                            <div class="col-span-2">
                                <label class="text-sm text-gray-500">Description</label>
                                <p>${asset.description}</p>
                            </div>
                        ` : ''}
                        ${asset.serial_number ? `
                            <div>
                                <label class="text-sm text-gray-500">Serial Number</label>
                                <p class="font-mono">${asset.serial_number}</p>
                            </div>
                        ` : ''}
                        <div>
                            <label class="text-sm text-gray-500">Category</label>
                            <p>${category?.name || '-'}</p>
                        </div>
                        <div>
                            <label class="text-sm text-gray-500">Location</label>
                            <p>${location?.name || '-'}</p>
                        </div>
                        <div>
                            <label class="text-sm text-gray-500">Department</label>
                            <p>${department?.name || '-'}</p>
                        </div>
                        <div>
                            <label class="text-sm text-gray-500">Vendor</label>
                            <p>${vendor?.name || '-'}</p>
                        </div>
                    </div>

                    <!-- Financial Info -->
                    <div class="border-t pt-4">
                        <h4 class="font-medium mb-3">Financial Information</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">Purchase Date</label>
                                <p>${formatDate(asset.purchase_date)}</p>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">Purchase Price</label>
                                <p>${formatCurrency(asset.purchase_price)}</p>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">Current Value</label>
                                <p>${formatCurrency(asset.current_value)}</p>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">Warranty Expiry</label>
                                <p>${formatDate(asset.warranty_expiry)}</p>
                            </div>
                        </div>
                    </div>

                    <!-- QR Code -->
                    <div class="border-t pt-4">
                        <h4 class="font-medium mb-3">QR Code</h4>
                        <div id="qr-code-container" class="flex justify-center">
                            ${createLoadingSpinner()}
                        </div>
                    </div>

                    <!-- Attachments -->
                    <div class="border-t pt-4">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-medium">Attachments</h4>
                            <label class="btn btn-secondary btn-sm cursor-pointer">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Upload
                                <input type="file" id="upload-file" class="hidden">
                            </label>
                        </div>
                        <div id="attachments-container">${createLoadingSpinner()}</div>
                    </div>

                    <!-- Actions -->
                    <div class="border-t pt-4 flex justify-between">
                        <div class="flex gap-2">
                            ${asset.status === 'available' ? `
                                <button class="btn btn-success" id="assign-btn">Assign</button>
                            ` : ''}
                            ${asset.status === 'assigned' ? `
                                <button class="btn btn-warning" id="return-btn">Return</button>
                            ` : ''}
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-secondary" id="close-btn">Close</button>
                            <button class="btn btn-primary" id="edit-btn">Edit</button>
                        </div>
                    </div>
                </div>
            `;

            openModal(`Asset: ${asset.name}`, content, { size: 'lg' });

            // Load QR code
            this.loadQRCode(id);

            // Load attachments
            this.loadAttachments(id);

            // Event handlers
            document.getElementById('close-btn').addEventListener('click', closeModal);
            document.getElementById('edit-btn').addEventListener('click', () => {
                closeModal();
                this.openAssetModal(id);
            });

            document.getElementById('upload-file')?.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.uploadAttachment(id, file);
                }
            });

            document.getElementById('assign-btn')?.addEventListener('click', () => {
                closeModal();
                this.openAssignModal(id);
            });

            document.getElementById('return-btn')?.addEventListener('click', async () => {
                await this.returnAsset(id);
            });

        } catch (error) {
            showError('Failed to load asset details');
        }
    },

    async loadQRCode(assetId) {
        const container = document.getElementById('qr-code-container');
        if (!container) return;

        try {
            const blob = await api.getQRCode(assetId);
            const url = URL.createObjectURL(blob);
            container.innerHTML = `<img src="${url}" alt="QR Code" class="w-32 h-32">`;
        } catch (error) {
            container.innerHTML = '<p class="text-gray-500">Failed to load QR code</p>';
        }
    },

    async loadAttachments(assetId) {
        const container = document.getElementById('attachments-container');
        if (!container) return;

        try {
            const attachments = await api.getAttachments(assetId);

            if (attachments.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-sm">No attachments</p>';
                return;
            }

            container.innerHTML = `
                <div class="space-y-2">
                    ${attachments.map(att => `
                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                                </svg>
                                <div>
                                    <p class="text-sm font-medium">${att.original_filename}</p>
                                    <p class="text-xs text-gray-500">${formatFileSize(att.file_size)}</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button class="text-primary-600 hover:text-primary-700 download-att-btn" data-id="${att.id}">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                    </svg>
                                </button>
                                <button class="text-red-600 hover:text-red-700 delete-att-btn" data-id="${att.id}">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Bind attachment events
            container.querySelectorAll('.download-att-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const attId = parseInt(btn.dataset.id);
                    await this.downloadAttachment(attId, attachments.find(a => a.id === attId)?.original_filename);
                });
            });

            container.querySelectorAll('.delete-att-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const attId = parseInt(btn.dataset.id);
                    await this.deleteAttachment(attId, assetId);
                });
            });

        } catch (error) {
            container.innerHTML = '<p class="text-red-500 text-sm">Failed to load attachments</p>';
        }
    },

    async uploadAttachment(assetId, file) {
        try {
            await api.uploadAttachment(assetId, file);
            showSuccess('File uploaded successfully');
            this.loadAttachments(assetId);
        } catch (error) {
            showError(error.message || 'Failed to upload file');
        }
    },

    async downloadAttachment(attachmentId, filename) {
        try {
            const blob = await api.downloadAttachment(attachmentId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'download';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            showError('Failed to download file');
        }
    },

    async deleteAttachment(attachmentId, assetId) {
        const confirmed = await confirm('Delete this attachment?', { danger: true });
        if (!confirmed) return;

        try {
            await api.deleteAttachment(attachmentId);
            showSuccess('Attachment deleted');
            this.loadAttachments(assetId);
        } catch (error) {
            showError('Failed to delete attachment');
        }
    },

    async openAssetModal(id = null) {
        const isEdit = id !== null;
        let asset = null;

        if (isEdit) {
            try {
                asset = await api.getAsset(id);
            } catch (error) {
                showError('Failed to load asset');
                return;
            }
        }

        const formHtml = `
            <form id="asset-form">
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Asset Tag *</label>
                        <input type="text" name="asset_tag" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Serial Number</label>
                        <input type="text" name="serial_number" class="form-input">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input type="text" name="name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" rows="2"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select name="status" class="form-input">
                            <option value="available">Available</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_maintenance">In Maintenance</option>
                            <option value="retired">Retired</option>
                            <option value="disposed">Disposed</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select name="category_id" class="form-input">
                            <option value="">Select Category</option>
                            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Location</label>
                        <select name="location_id" class="form-input">
                            <option value="">Select Location</option>
                            ${locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department</label>
                        <select name="department_id" class="form-input">
                            <option value="">Select Department</option>
                            ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Vendor</label>
                        <select name="vendor_id" class="form-input">
                            <option value="">Select Vendor</option>
                            ${vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Purchase Date</label>
                        <input type="date" name="purchase_date" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Purchase Price</label>
                        <input type="number" name="purchase_price" class="form-input" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Warranty Expiry</label>
                        <input type="date" name="warranty_expiry" class="form-input">
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        openModal(isEdit ? 'Edit Asset' : 'New Asset', formHtml, { size: 'lg' });

        const form = document.getElementById('asset-form');

        if (isEdit && asset) {
            setFormData(form, asset);
        }

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);

            // Convert IDs to numbers
            ['category_id', 'location_id', 'department_id', 'vendor_id'].forEach(key => {
                if (data[key]) data[key] = parseInt(data[key]);
            });

            try {
                if (isEdit) {
                    await api.updateAsset(id, data);
                    showSuccess('Asset updated successfully');
                } else {
                    await api.createAsset(data);
                    showSuccess('Asset created successfully');
                }
                closeModal();
                table.refresh();
            } catch (error) {
                showError(error.message || 'Failed to save asset');
            }
        });
    },

    async openAssignModal(assetId) {
        const formHtml = `
            <form id="assign-form">
                <div class="form-group">
                    <label class="form-label">Assignee ID *</label>
                    <input type="text" name="assignee_id" class="form-input" required placeholder="Employee ID, badge number, etc.">
                </div>
                <div class="form-group">
                    <label class="form-label">Assignee Name</label>
                    <input type="text" name="assignee_name" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-input" rows="2"></textarea>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-success">Assign Asset</button>
                </div>
            </form>
        `;

        openModal('Assign Asset', formHtml);

        const form = document.getElementById('assign-form');

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);

            try {
                await api.assignAsset(assetId, data);
                showSuccess('Asset assigned successfully');
                closeModal();
                table.refresh();
            } catch (error) {
                showError(error.message || 'Failed to assign asset');
            }
        });
    },

    async returnAsset(assetId) {
        try {
            await api.returnAsset(assetId);
            showSuccess('Asset returned successfully');
            closeModal();
            table.refresh();
        } catch (error) {
            showError(error.message || 'Failed to return asset');
        }
    },

    async deleteAsset(id) {
        const confirmed = await confirm('Are you sure you want to delete this asset? This action cannot be undone.', {
            title: 'Delete Asset',
            confirmText: 'Delete',
            danger: true
        });

        if (!confirmed) return;

        try {
            await api.deleteAsset(id);
            showSuccess('Asset deleted successfully');
            table.refresh();
        } catch (error) {
            showError(error.message || 'Failed to delete asset');
        }
    },

    destroy() {
        table = null;
        categories = [];
        locations = [];
        departments = [];
        vendors = [];
    }
};

export default Assets;
