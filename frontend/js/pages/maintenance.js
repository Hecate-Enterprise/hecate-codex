// Maintenance Page - Records and Schedules

import { api } from '../api.js';
import { openModal, closeModal, confirm } from '../components/modal.js';
import { showSuccess, showError } from '../components/toast.js';
import {
    getFormData, setFormData, formatDate, formatCurrency,
    getMaintenanceTypeBadge, createLoadingSpinner
} from '../utils.js';

let currentAssetId = null;
let assets = [];

const Maintenance = {
    async init(container) {
        container.innerHTML = createLoadingSpinner();

        try {
            const [assetsRes, upcoming] = await Promise.all([
                api.getAssets({ page: 1, page_size: 100 }),
                api.getUpcomingMaintenance(30)
            ]);

            assets = assetsRes.items || [];

            this.render(container, upcoming);
            this.bindEvents(container);
        } catch (error) {
            console.error('Error loading maintenance data:', error);
            showError('Failed to load maintenance data');
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-600">Failed to load maintenance data</p>
                    <button class="btn btn-primary mt-4" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    },

    render(container, upcoming) {
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Maintenance</h1>
                    <p class="text-gray-600">Manage maintenance records and schedules</p>
                </div>
            </div>

            <!-- Upcoming Maintenance -->
            <div class="card mb-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Upcoming Maintenance (Next 30 Days)</h2>
                ${upcoming.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Description</th>
                                    <th>Frequency</th>
                                    <th>Next Due</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${upcoming.map(item => {
                                    const asset = assets.find(a => a.id === item.asset_id);
                                    return `
                                        <tr>
                                            <td>${asset?.name || `Asset #${item.asset_id}`}</td>
                                            <td>${item.description || '-'}</td>
                                            <td>Every ${item.frequency_days} days</td>
                                            <td>
                                                <span class="text-orange-600 font-medium">${formatDate(item.next_due)}</span>
                                            </td>
                                            <td>
                                                <button class="btn btn-success btn-sm complete-schedule-btn" data-id="${item.id}" data-asset-id="${item.asset_id}">
                                                    Complete
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <p class="text-gray-500 text-center py-4">No upcoming maintenance scheduled</p>
                `}
            </div>

            <!-- Asset Selection -->
            <div class="card mb-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Manage Asset Maintenance</h2>
                <div class="flex gap-4 items-end">
                    <div class="flex-1">
                        <label class="form-label">Select Asset</label>
                        <select id="asset-select" class="form-input">
                            <option value="">Choose an asset...</option>
                            ${assets.map(a => `<option value="${a.id}">${a.name} (${a.asset_tag})</option>`).join('')}
                        </select>
                    </div>
                    <button id="add-record-btn" class="btn btn-primary" disabled>Add Record</button>
                    <button id="add-schedule-btn" class="btn btn-secondary" disabled>Add Schedule</button>
                </div>
            </div>

            <!-- Maintenance Records -->
            <div id="maintenance-content" class="hidden">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Records -->
                    <div class="card">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Maintenance Records</h3>
                        <div id="records-container">${createLoadingSpinner()}</div>
                    </div>

                    <!-- Schedules -->
                    <div class="card">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Maintenance Schedules</h3>
                        <div id="schedules-container">${createLoadingSpinner()}</div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(container) {
        const assetSelect = container.querySelector('#asset-select');
        const addRecordBtn = container.querySelector('#add-record-btn');
        const addScheduleBtn = container.querySelector('#add-schedule-btn');
        const maintenanceContent = container.querySelector('#maintenance-content');

        assetSelect.addEventListener('change', async (e) => {
            const assetId = parseInt(e.target.value);
            currentAssetId = assetId || null;

            addRecordBtn.disabled = !assetId;
            addScheduleBtn.disabled = !assetId;

            if (assetId) {
                maintenanceContent.classList.remove('hidden');
                await this.loadAssetMaintenance(assetId);
            } else {
                maintenanceContent.classList.add('hidden');
            }
        });

        addRecordBtn.addEventListener('click', () => {
            if (currentAssetId) this.openRecordModal(currentAssetId);
        });

        addScheduleBtn.addEventListener('click', () => {
            if (currentAssetId) this.openScheduleModal(currentAssetId);
        });

        container.addEventListener('click', async (e) => {
            if (e.target.closest('.complete-schedule-btn')) {
                const btn = e.target.closest('.complete-schedule-btn');
                const scheduleId = parseInt(btn.dataset.id);
                const assetId = parseInt(btn.dataset.assetId);
                await this.completeScheduledMaintenance(assetId, scheduleId);
            }

            if (e.target.closest('.edit-record-btn')) {
                const id = parseInt(e.target.closest('.edit-record-btn').dataset.id);
                await this.openRecordModal(currentAssetId, id);
            }

            if (e.target.closest('.delete-record-btn')) {
                const id = parseInt(e.target.closest('.delete-record-btn').dataset.id);
                await this.deleteRecord(id);
            }

            if (e.target.closest('.edit-schedule-btn')) {
                const id = parseInt(e.target.closest('.edit-schedule-btn').dataset.id);
                await this.openScheduleModal(currentAssetId, id);
            }

            if (e.target.closest('.delete-schedule-btn')) {
                const id = parseInt(e.target.closest('.delete-schedule-btn').dataset.id);
                await this.deleteSchedule(id);
            }
        });
    },

    async loadAssetMaintenance(assetId) {
        await Promise.all([
            this.loadRecords(assetId),
            this.loadSchedules(assetId)
        ]);
    },

    async loadRecords(assetId) {
        const container = document.getElementById('records-container');
        if (!container) return;

        try {
            const response = await api.getMaintenanceRecords(assetId, { page: 1, page_size: 50 });
            const records = response.items || [];

            if (records.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No maintenance records</p>';
                return;
            }

            container.innerHTML = `
                <div class="space-y-3">
                    ${records.map(record => `
                        <div class="p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-start justify-between">
                                <div>
                                    ${getMaintenanceTypeBadge(record.maintenance_type)}
                                    <p class="mt-1 text-sm">${record.notes || 'No notes'}</p>
                                </div>
                                <div class="flex gap-1">
                                    <button class="text-gray-400 hover:text-gray-600 edit-record-btn" data-id="${record.id}">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                    </button>
                                    <button class="text-red-400 hover:text-red-600 delete-record-btn" data-id="${record.id}">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="mt-2 text-xs text-gray-500 flex gap-4">
                                <span>Scheduled: ${formatDate(record.scheduled_date)}</span>
                                ${record.completed_date ? `<span>Completed: ${formatDate(record.completed_date)}</span>` : '<span class="text-orange-500">Pending</span>'}
                                ${record.cost ? `<span>Cost: ${formatCurrency(record.cost)}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            container.innerHTML = '<p class="text-red-500 text-sm">Failed to load records</p>';
        }
    },

    async loadSchedules(assetId) {
        const container = document.getElementById('schedules-container');
        if (!container) return;

        try {
            const schedules = await api.getMaintenanceSchedules(assetId);

            if (schedules.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No maintenance schedules</p>';
                return;
            }

            container.innerHTML = `
                <div class="space-y-3">
                    ${schedules.map(schedule => `
                        <div class="p-3 bg-gray-50 rounded-lg ${!schedule.is_active ? 'opacity-50' : ''}">
                            <div class="flex items-start justify-between">
                                <div>
                                    <p class="font-medium">${schedule.description || 'Scheduled Maintenance'}</p>
                                    <p class="text-sm text-gray-500">Every ${schedule.frequency_days} days</p>
                                </div>
                                <div class="flex gap-1">
                                    <button class="text-gray-400 hover:text-gray-600 edit-schedule-btn" data-id="${schedule.id}">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                    </button>
                                    <button class="text-red-400 hover:text-red-600 delete-schedule-btn" data-id="${schedule.id}">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="mt-2 text-xs text-gray-500 flex gap-4">
                                ${schedule.last_performed ? `<span>Last: ${formatDate(schedule.last_performed)}</span>` : ''}
                                <span class="${schedule.is_active ? 'text-green-600' : 'text-gray-400'}">
                                    Next: ${formatDate(schedule.next_due)}
                                </span>
                                <span class="badge ${schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                                    ${schedule.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            container.innerHTML = '<p class="text-red-500 text-sm">Failed to load schedules</p>';
        }
    },

    async openRecordModal(assetId, recordId = null) {
        const isEdit = recordId !== null;
        let record = null;

        if (isEdit) {
            try {
                record = await api.getMaintenanceRecord(recordId);
            } catch (error) {
                showError('Failed to load record');
                return;
            }
        }

        const formHtml = `
            <form id="record-form">
                <div class="form-group">
                    <label class="form-label">Maintenance Type *</label>
                    <select name="maintenance_type" class="form-input" required>
                        <option value="preventive">Preventive</option>
                        <option value="corrective">Corrective</option>
                        <option value="inspection">Inspection</option>
                        <option value="upgrade">Upgrade</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Scheduled Date *</label>
                        <input type="date" name="scheduled_date" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Completed Date</label>
                        <input type="date" name="completed_date" class="form-input">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Cost</label>
                        <input type="number" name="cost" class="form-input" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Performed By</label>
                        <input type="text" name="performed_by" class="form-input">
                    </div>
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

        openModal(isEdit ? 'Edit Maintenance Record' : 'New Maintenance Record', formHtml);

        const form = document.getElementById('record-form');

        if (isEdit && record) {
            setFormData(form, record);
        } else {
            // Default to today's date
            form.scheduled_date.value = new Date().toISOString().split('T')[0];
        }

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);

            try {
                if (isEdit) {
                    await api.updateMaintenanceRecord(recordId, data);
                    showSuccess('Record updated successfully');
                } else {
                    await api.createMaintenanceRecord(assetId, data);
                    showSuccess('Record created successfully');
                }
                closeModal();
                this.loadRecords(assetId);
            } catch (error) {
                showError(error.message || 'Failed to save record');
            }
        });
    },

    async openScheduleModal(assetId, scheduleId = null) {
        const isEdit = scheduleId !== null;
        let schedule = null;

        if (isEdit) {
            try {
                const schedules = await api.getMaintenanceSchedules(assetId);
                schedule = schedules.find(s => s.id === scheduleId);
            } catch (error) {
                showError('Failed to load schedule');
                return;
            }
        }

        const formHtml = `
            <form id="schedule-form">
                <div class="form-group">
                    <label class="form-label">Description *</label>
                    <input type="text" name="description" class="form-input" required placeholder="e.g., Monthly inspection">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Frequency (days) *</label>
                        <input type="number" name="frequency_days" class="form-input" required min="1" placeholder="e.g., 30 for monthly">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Next Due Date</label>
                        <input type="date" name="next_due" class="form-input">
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="is_active" class="rounded" checked>
                        <span class="form-label mb-0">Active</span>
                    </label>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        openModal(isEdit ? 'Edit Maintenance Schedule' : 'New Maintenance Schedule', formHtml);

        const form = document.getElementById('schedule-form');

        if (isEdit && schedule) {
            setFormData(form, schedule);
        }

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);
            data.is_active = form.is_active.checked;

            try {
                if (isEdit) {
                    await api.updateMaintenanceSchedule(scheduleId, data);
                    showSuccess('Schedule updated successfully');
                } else {
                    await api.createMaintenanceSchedule(assetId, data);
                    showSuccess('Schedule created successfully');
                }
                closeModal();
                this.loadSchedules(assetId);
            } catch (error) {
                showError(error.message || 'Failed to save schedule');
            }
        });
    },

    async completeScheduledMaintenance(assetId, scheduleId) {
        const formHtml = `
            <form id="complete-form">
                <p class="mb-4 text-gray-600">Create a maintenance record for this scheduled maintenance.</p>
                <div class="form-group">
                    <label class="form-label">Maintenance Type</label>
                    <select name="maintenance_type" class="form-input">
                        <option value="preventive">Preventive</option>
                        <option value="inspection">Inspection</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Cost</label>
                    <input type="number" name="cost" class="form-input" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Performed By</label>
                    <input type="text" name="performed_by" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-input" rows="2"></textarea>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-success">Complete Maintenance</button>
                </div>
            </form>
        `;

        openModal('Complete Scheduled Maintenance', formHtml);

        const form = document.getElementById('complete-form');

        document.getElementById('cancel-btn').addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = getFormData(form);
            const today = new Date().toISOString().split('T')[0];
            data.scheduled_date = today;
            data.completed_date = today;

            try {
                // Create the maintenance record
                await api.createMaintenanceRecord(assetId, data);

                // Update the schedule's last_performed and next_due
                const schedules = await api.getMaintenanceSchedules(assetId);
                const schedule = schedules.find(s => s.id === scheduleId);
                if (schedule) {
                    const nextDue = new Date();
                    nextDue.setDate(nextDue.getDate() + schedule.frequency_days);
                    await api.updateMaintenanceSchedule(scheduleId, {
                        last_performed: today,
                        next_due: nextDue.toISOString().split('T')[0]
                    });
                }

                showSuccess('Maintenance completed successfully');
                closeModal();
                location.reload(); // Refresh to update upcoming maintenance
            } catch (error) {
                showError(error.message || 'Failed to complete maintenance');
            }
        });
    },

    async deleteRecord(recordId) {
        const confirmed = await confirm('Delete this maintenance record?', { danger: true });
        if (!confirmed) return;

        try {
            await api.deleteMaintenanceRecord(recordId);
            showSuccess('Record deleted');
            if (currentAssetId) this.loadRecords(currentAssetId);
        } catch (error) {
            showError('Failed to delete record');
        }
    },

    async deleteSchedule(scheduleId) {
        const confirmed = await confirm('Delete this maintenance schedule?', { danger: true });
        if (!confirmed) return;

        try {
            await api.deleteMaintenanceSchedule(scheduleId);
            showSuccess('Schedule deleted');
            if (currentAssetId) this.loadSchedules(currentAssetId);
        } catch (error) {
            showError('Failed to delete schedule');
        }
    },

    destroy() {
        currentAssetId = null;
        assets = [];
    }
};

export default Maintenance;
