/**
 * Cấu hình nguồn dữ liệu.
 * - USE_MOCK = true : đọc JSON tĩnh trong public/datasets (chưa có backend).
 * - USE_MOCK = false: gọi API Express qua proxy.conf.json (/api -> http://localhost:3000).
 * Khi backend MongoDB xong, đổi cờ này rồi chạy lại `ng serve`.
 */
export const USE_MOCK = true;
export const API_BASE = '/api';
export const DATASET_BASE = '/datasets';
