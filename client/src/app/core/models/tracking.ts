/** Tọa độ (vĩ độ, kinh độ) — vị trí người giao hoàn toàn mô phỏng, không dùng GPS. */
export type LatLng = [number, number];

/** Bốn giai đoạn của người giao (các bước đặt/xác nhận đã có ở thanh tiến trình của đơn). */
export type TrackingPhase = 'toShop' | 'pickedUp' | 'delivering' | 'done';

export interface TrackingSnapshot {
  /** Chỉ số điểm hiện tại trên toàn tuyến (người giao → cửa hàng → nhà người mua) */
  cursor: number;
  /** Số nhịp còn lại đứng chờ lấy hàng tại cửa hàng */
  hold: number;
  /** Đã qua bước chờ lấy hàng */
  picked: boolean;
}

export const TRACKING_PHASE_TITLE: Record<TrackingPhase, string> = {
  toShop: 'Người giao đang đến cửa hàng',
  pickedUp: 'Người giao đã lấy hàng',
  delivering: 'Người giao đang trên đường đến bạn',
  done: 'Đơn hàng đã giao xong',
};

/** Icon Phosphor (fill) cho marker bản đồ, viewBox 256. */
export const MARKER_PATH = {
  shop: 'M231.69,93.81,217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.81A7.94,7.94,0,0,0,24,96v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96A7.94,7.94,0,0,0,231.69,93.81ZM88,112a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8H88Zm64,0a24,24,0,0,1-48,0v-8h48Zm64,0a24,24,0,0,1-11.07,20.2,8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48Z',
  courier: 'M216,128a39.3,39.3,0,0,0-6.27.5L175.49,37.19A8,8,0,0,0,168,32H136a8,8,0,0,0,0,16h26.46l32.3,86.13a40.13,40.13,0,0,0-18,25.87H136.54l-25-66.81A8,8,0,0,0,104,88H24a8,8,0,0,0,0,16h8v13.39A56.12,56.12,0,0,0,0,168a8,8,0,0,0,8,8h8.8a40,40,0,0,0,78.4,0h81.6A40,40,0,1,0,216,128ZM56,192a24,24,0,0,1-22.62-16H78.62A24,24,0,0,1,56,192Zm160,0a24,24,0,0,1-15.43-42.36l7.94,21.17a8,8,0,0,0,15-5.62L215.55,144H216a24,24,0,0,1,0,48Z',
  home: 'M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z',
} as const;
