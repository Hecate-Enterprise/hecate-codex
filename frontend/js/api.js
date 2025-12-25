// API Client for Hecate Codex

const API_BASE_URL = 'http://localhost:8000/api/v1';

class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        // Remove Content-Type for FormData (file uploads)
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            // Return blob for file downloads
            if (contentType && (contentType.includes('image/') || contentType.includes('application/octet-stream'))) {
                return await response.blob();
            }

            return null;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data) {
        const isFormData = data instanceof FormData;
        return this.request(endpoint, {
            method: 'POST',
            body: isFormData ? data : JSON.stringify(data),
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Assets
    async getAssets(params = {}) {
        return this.get('/assets', params);
    }

    async getAsset(id) {
        return this.get(`/assets/${id}`);
    }

    async createAsset(data) {
        return this.post('/assets', data);
    }

    async updateAsset(id, data) {
        return this.put(`/assets/${id}`, data);
    }

    async deleteAsset(id) {
        return this.delete(`/assets/${id}`);
    }

    async assignAsset(id, data) {
        return this.post(`/assets/${id}/assign`, data);
    }

    async returnAsset(id, data = {}) {
        return this.post(`/assets/${id}/return`, data);
    }

    // Categories
    async getCategories(params = {}) {
        return this.get('/categories', params);
    }

    async getCategory(id) {
        return this.get(`/categories/${id}`);
    }

    async createCategory(data) {
        return this.post('/categories', data);
    }

    async updateCategory(id, data) {
        return this.put(`/categories/${id}`, data);
    }

    async deleteCategory(id) {
        return this.delete(`/categories/${id}`);
    }

    // Locations
    async getLocations(params = {}) {
        return this.get('/locations', params);
    }

    async getLocation(id) {
        return this.get(`/locations/${id}`);
    }

    async createLocation(data) {
        return this.post('/locations', data);
    }

    async updateLocation(id, data) {
        return this.put(`/locations/${id}`, data);
    }

    async deleteLocation(id) {
        return this.delete(`/locations/${id}`);
    }

    // Departments
    async getDepartments(params = {}) {
        return this.get('/departments', params);
    }

    async getDepartment(id) {
        return this.get(`/departments/${id}`);
    }

    async createDepartment(data) {
        return this.post('/departments', data);
    }

    async updateDepartment(id, data) {
        return this.put(`/departments/${id}`, data);
    }

    async deleteDepartment(id) {
        return this.delete(`/departments/${id}`);
    }

    // Vendors
    async getVendors(params = {}) {
        return this.get('/vendors', params);
    }

    async getVendor(id) {
        return this.get(`/vendors/${id}`);
    }

    async createVendor(data) {
        return this.post('/vendors', data);
    }

    async updateVendor(id, data) {
        return this.put(`/vendors/${id}`, data);
    }

    async deleteVendor(id) {
        return this.delete(`/vendors/${id}`);
    }

    // Maintenance
    async getUpcomingMaintenance(days = 30) {
        return this.get('/maintenance/upcoming', { days });
    }

    async getMaintenanceRecords(assetId, params = {}) {
        return this.get(`/maintenance/assets/${assetId}/maintenance`, params);
    }

    async createMaintenanceRecord(assetId, data) {
        return this.post(`/maintenance/assets/${assetId}/maintenance`, data);
    }

    async getMaintenanceRecord(recordId) {
        return this.get(`/maintenance/records/${recordId}`);
    }

    async updateMaintenanceRecord(recordId, data) {
        return this.put(`/maintenance/records/${recordId}`, data);
    }

    async deleteMaintenanceRecord(recordId) {
        return this.delete(`/maintenance/records/${recordId}`);
    }

    async getMaintenanceSchedules(assetId) {
        return this.get(`/maintenance/assets/${assetId}/schedules`);
    }

    async createMaintenanceSchedule(assetId, data) {
        return this.post(`/maintenance/assets/${assetId}/schedules`, data);
    }

    async updateMaintenanceSchedule(scheduleId, data) {
        return this.put(`/maintenance/schedules/${scheduleId}`, data);
    }

    async deleteMaintenanceSchedule(scheduleId) {
        return this.delete(`/maintenance/schedules/${scheduleId}`);
    }

    // Attachments
    async getAttachments(assetId) {
        return this.get(`/assets/${assetId}/attachments`);
    }

    async uploadAttachment(assetId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.post(`/assets/${assetId}/attachments`, formData);
    }

    async downloadAttachment(attachmentId) {
        return this.request(`/attachments/${attachmentId}`, { method: 'GET' });
    }

    async deleteAttachment(attachmentId) {
        return this.delete(`/attachments/${attachmentId}`);
    }

    // QR Code
    async getQRCode(assetId, size = 10, border = 2) {
        return this.request(`/assets/${assetId}/qrcode?size=${size}&border=${border}`, { method: 'GET' });
    }

    // Depreciation
    async getDepreciationHistory(assetId) {
        return this.get(`/assets/${assetId}/depreciation`);
    }

    async calculateDepreciation(assetId, periodEnd) {
        return this.post(`/assets/${assetId}/depreciation`, { period_end: periodEnd });
    }

    async getDepreciationReport() {
        return this.get('/reports/depreciation');
    }
}

export const api = new ApiClient(API_BASE_URL);
