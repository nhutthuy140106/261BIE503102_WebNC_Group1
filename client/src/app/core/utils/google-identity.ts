/** Phần của Google Identity Services mà AntGo dùng (không cài @types, chỉ khai báo đủ dùng). */
export interface GoogleIdentity {
  accounts: {
    id: {
      initialize(cfg: { client_id: string; callback: (r: { credential: string }) => void }): void;
      renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
    };
  };
}

let loading: Promise<GoogleIdentity> | null = null;

/** Nạp script Google một lần; lỗi mạng/bị chặn thì reject để giao diện báo cho người dùng. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const w = window as unknown as { google?: GoogleIdentity };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (w.google?.accounts?.id ? resolve(w.google) : reject(new Error('Không tải được Google')));
    s.onerror = () => {
      loading = null; // cho phép thử lại
      reject(new Error('Không tải được Google'));
    };
    document.head.appendChild(s);
  });
  return loading;
}
