/** Đọc ảnh người dùng chọn thành chuỗi dữ liệu, thu nhỏ để không làm đầy bộ nhớ trình duyệt. Không phải ảnh hoặc đọc lỗi thì trả rỗng. */
export function imageToDataUrl(file: File, maxSize = 1000): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve('');
    const r = new FileReader();
    r.onerror = () => resolve('');
    r.onload = () => {
      const im = new Image();
      im.onerror = () => resolve('');
      im.onload = () => {
        const k = Math.min(1, maxSize / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k);
        cv.height = Math.round(im.height * k);
        cv.getContext('2d')?.drawImage(im, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', 0.8));
      };
      im.src = r.result as string;
    };
    r.readAsDataURL(file);
  });
}
