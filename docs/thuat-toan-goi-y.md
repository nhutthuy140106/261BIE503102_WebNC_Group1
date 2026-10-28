# Thuật toán gợi ý bài (phần máy học, CO3)

> Mã nguồn: `server/src/modules/buyer/recommend/recommend.service.js`. Endpoint: `GET /api/posts/:id/similar`, `GET /api/me/recommendations`.
> Đây là **bản nhỏ, tự cài**: lọc theo nội dung (content-based), không cần dữ liệu hành vi của nhiều người, không dịch vụ ngoài. Chờ nhóm/thầy xác nhận mức này (`decisions.md` D3).

## 1. Ý tưởng

Hai bài "giống nhau" khi nói về cùng thứ (từ khóa chung), cùng loại, giá gần nhau và cùng khu. Mỗi bài được biến thành một vector từ khóa, rồi đo độ giống bằng cosine.

## 2. Các bước

1. **Văn bản của bài** = tên + mô tả + danh mục. Bỏ dấu tiếng Việt (kể cả "đ"), hạ chữ thường, tách từ theo ký tự không phải chữ/số, bỏ từ quá ngắn và vài từ nối ("và", "của", "cho"…).
2. **TF-IDF** trên các bài đang mở (tối đa 500):
   - `tf(t, d)` = số lần từ `t` trong bài `d` / tổng số từ của `d`
   - `idf(t)` = `ln((N + 1) / (df(t) + 1)) + 1`, với `N` là số bài, `df` là số bài chứa `t`
   - trọng số = `tf × idf` → từ hiếm và đặc trưng nặng hơn từ xuất hiện ở mọi bài.
3. **Độ giống nội dung** = cosine giữa hai vector.
4. **Điểm cuối** (0–1):

   `score = 0.60 × cosine + 0.15 × cùng loại + 0.15 × giá gần nhau + 0.10 × cùng khu`

   - cùng loại: 1 nếu cùng `food|goods|service`, ngược lại 0
   - giá gần nhau: `min(giá1, giá2) / max(giá1, giá2)`
   - cùng khu: 1 nếu cùng `area`
5. Bỏ chính bài gốc, bài hết hàng/bị ẩn; sắp giảm dần theo `score`; lấy `limit` bài đầu.

## 3. "Gợi ý cho bạn"

- **Lịch sử** = bài đã lưu (trọng số 1) + bài đã đặt (trọng số 2, vì đặt hàng thể hiện quan tâm mạnh hơn).
- **Hồ sơ** = tổng có trọng số các vector của bài trong lịch sử; "cùng loại" lấy theo tỷ lệ loại trong lịch sử; "giá" so với giá trung bình có trọng số; "khu" so với khu của người dùng.
- Chấm điểm các bài còn lại bằng công thức ở Mục 2, **loại bài đã có trong lịch sử và bài của chính mình**.
- **Chưa có lịch sử** → trả bài mới nhất trong khu của người dùng (`reason = new_in_area`, `score = 0`). Không bịa sở thích khi chưa có dữ liệu.

## 4. Giới hạn (nói rõ khi vấn đáp)

- Chỉ dựa trên chữ trong tên/mô tả, không hiểu nghĩa ("phở" và "bún" không liên quan nếu mô tả không nhắc món nước); mô tả bài càng đầy đủ thì gợi ý càng tốt.
- Không dùng hành vi của người dùng khác (collaborative filtering) vì dữ liệu đồ án quá ít.
- Tính lại vector mỗi lần gọi (≤ 500 bài, vài chục ms); nếu dữ liệu lớn thì cần lưu sẵn vector hoặc dùng dịch vụ tìm kiếm.
- Trọng số `0.6/0.15/0.15/0.1` là chọn tay, chưa được tinh chỉnh bằng dữ liệu thật.

---

## Bổ sung: tìm kiếm thông minh, gợi ý giá, công cụ cho trợ lý

### Tìm kiếm thông minh — `server/src/utils/smart-search.js`
- Chỉ chạy khi tìm thường (regex trên `searchText`) **không ra bài nào**; kết quả có `meta.smart = true`.
- Từ khóa được **mở rộng đồng nghĩa** (bảng nhóm từ trong file: "lau nhà" ↔ "dọn nhà", "cf" ↔ "cà phê"…), rồi so với từ vựng của kho bài: khớp đúng (1.0), **gõ lặp chữ kiểu Telex** ("coom", "gaa") 0.8, tiền tố 0.8, **sai ≤ 1–2 ký tự (Levenshtein)** 0.7, đồng nghĩa 0.6.
- Điểm bài = Σ trọng số × idf (từ hiếm quan trọng hơn), xếp giảm dần. Không dịch vụ ngoài, chạy trên tối đa 500 bài.

### Gợi ý giá khi đăng — `GET /api/pricing/suggest?kind=&title=&category=`
- **kNN hồi quy**: vector TF-IDF của tên bài đang soạn so với bài cùng loại (`Post`, hoặc `Job` với tiền công); lấy k = 7 bài giống nhất (cosine ≥ 0.12).
- Giá gợi ý = **trung vị có trọng số** theo độ giống; khoảng thường gặp = phân vị 25%–75%; làm tròn theo thang giá VN.
- `confidence`: high (≥5 mẫu giống), medium (3–4), low (ít mẫu giống → dùng mặt bằng chung của loại). Bản FE cho chế độ dữ liệu mẫu: `client/src/app/core/utils/price-suggest.ts`.

### Trợ lý (chatbot) — công cụ gọi được
`search_catalog` (tìm bài, lọc giá/loại/khu), `my_orders` (đơn của chính người đang chat), `pick_dish` (chọn ngẫu nhiên một món trong ngân sách). Bộ trả lời cơ bản (không cần khóa AI) hiểu thêm: "đơn của tôi", "chọn giúp tôi…", "ngân sách 150k cho cả ngày" (thực đơn sáng–trưa–tối, mỗi bữa ≤ 1/3 ngân sách).
