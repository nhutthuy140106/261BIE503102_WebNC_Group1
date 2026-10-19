/** Khung response chung theo docs/api-buyer-job.md mục 0 */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiList<T> {
  data: T[];
  meta: PageMeta;
}

export interface FieldError {
  field: string;
  message: string;
}

/** Lỗi đã chuẩn hóa để component hiển thị (401/403/404/409/422/500...) */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: FieldError[] = [],
  ) {
    super(message);
  }
}
