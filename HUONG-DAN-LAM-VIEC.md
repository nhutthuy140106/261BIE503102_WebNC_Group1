# Hướng dẫn làm việc: 3 phiên Claude (Planning, FE, BE)

Tài liệu này quy định cách ba phiên Claude phối hợp trong đồ án Web nâng cao, nhóm 1.

- **Phiên Planning**: khung chat Claude.ai
- **Phiên FE**: terminal Claude Code, làm frontend
- **Phiên BE**: terminal Claude Code, làm backend

Mọi phiên phải đọc file này trước khi bắt đầu việc.

---

## 1. Vai trò từng phiên

### Phiên Planning (khung chat)
- Lập và cập nhật kế hoạch trong `docs/planning.md`.
- Thiết kế hợp đồng API trong `docs/api-buyer-job.md` và các file tương tự.
- Ghi quyết định kỹ thuật vào `docs/decisions.md`.
- Trả lời câu hỏi kiến trúc, review thiết kế.
- **Không** viết code trong `server/` hoặc `client/`.
- **Không** commit, không chạy lệnh git.

### Phiên BE (terminal 1)
- Chỉ làm việc trong thư mục `server/`.
- Viết model, service, controller, route, Swagger, test cho backend.
- Làm theo đúng hợp đồng trong `docs/api-buyer-job.md`. Nếu thấy hợp đồng không hợp lý, **ghi vào `docs/decisions.md` với nhãn `CẦN CHỐT`**, không tự đổi.
- Commit theo quy tắc ở mục 5.

### Phiên FE (terminal 2)
- Chỉ làm việc trong thư mục `client/`.
- Làm logic trước (interface, service, mock data, validation, guard, interceptor). Giao diện chỉ làm sau khi có UI đã duyệt.
- Dùng đúng schema trong `docs/api-buyer-job.md`. Nếu thiếu thông tin, ghi vào `decisions.md` với nhãn `CẦN CHỐT`, không tự đoán.
- Commit theo quy tắc ở mục 5.

---

## 2. Ranh giới file (quan trọng nhất)

| Vùng | Ai được sửa | Ghi chú |
|------|-------------|---------|
| `server/` | Phiên BE | Phiên FE không được sửa |
| `client/` | Phiên FE | Phiên BE không được sửa |
| `docs/planning.md` | Phiên Planning là chính. Phiên FE và BE chỉ tick checkbox và ghi trạng thái | Không xóa việc của phiên khác |
| `docs/api-buyer-job.md` | Phiên Planning là chính. Phiên BE có thể cập nhật trạng thái endpoint | Đổi schema phải qua Planning |
| `docs/decisions.md` | Ai cũng được thêm mục mới, không sửa mục cũ | Mục cũ chỉ đổi khi đã chốt |
| `CLAUDE.md` (gốc repo) | Chỉ người dùng (Khải) sửa | Mọi phiên đều đọc |

**Quy tắc vàng:** nếu cần đổi file thuộc vùng của phiên khác, dừng lại, ghi vào `decisions.md` với nhãn `CẦN CHỐT`, rồi chờ.

---

## 3. Quy trình mỗi lần làm việc

### Khi bắt đầu một phiên
1. Đọc `HUONG-DAN-LAM-VIEC.md` (file này).
2. Đọc `docs/planning.md`, tìm mục "Việc đang làm" và "Việc tiếp theo".
3. Đọc `docs/api-buyer-job.md` nếu việc liên quan đến API.
4. Đọc `docs/decisions.md`, xem có mục `CẦN CHỐT` nào đang chờ không.
5. Báo lại người dùng một câu: đang làm gì, dựa trên mục nào của planning.

### Trong lúc làm
- Mỗi bước nhỏ phải có tiêu chí "xong" rõ ràng.
- Xong một bước thì tick checkbox trong `planning.md` và ghi trạng thái.
- Gặp câu hỏi chưa có trong tài liệu: ghi vào `decisions.md` với nhãn `CẦN CHỐT`, rồi làm việc khác không phụ thuộc vào câu đó.

### Khi kết thúc một phiên
1. Cập nhật "Việc đang làm" và "Việc tiếp theo" trong `planning.md`.
2. Ghi các thay đổi hợp đồng (nếu có) vào `api-buyer-job.md`.
3. Liệt kê các mục `CẦN CHỐT` còn mở để người dùng đưa cho phiên Planning.

---

## 4. Quy trình phối hợp giữa các phiên

```
Planning chốt hợp đồng API  →  BE làm endpoint  →  BE cập nhật trạng thái endpoint
                                                          ↓
FE làm mock data từ hợp đồng  →  FE chuyển sang API thật khi endpoint đã xong
                                                          ↓
                                    Phát sinh lệch → ghi decisions.md (CẦN CHỐT)
                                                          ↓
                                    Planning xử lý → cập nhật hợp đồng → báo lại FE/BE
```

- **FE không chờ BE xong mới làm.** FE làm bằng mock data theo hợp đồng.
- **BE không tự đổi hợp đồng.** Đổi thì phải qua Planning.
- **Khi endpoint BE xong**, BE đổi trạng thái sang `Xong` trong `api-buyer-job.md`. FE thấy trạng thái này thì chuyển service từ mock sang API thật.

---

## 5. Git và commit

### Nhánh
- `main`: bản nộp cuối kỳ. Không ai làm việc trực tiếp.
- `dev`: nhánh tích hợp. Merge vào đây khi một tính năng đã xong.
- `feature/be-<tên>`: nhánh của phiên BE.
- `feature/fe-<tên>`: nhánh của phiên FE.

### Quy tắc commit
- Mỗi endpoint hoặc mỗi bước nhỏ là một commit.
- Tiêu đề commit theo mẫu: `be: thêm endpoint lưu bài` hoặc `fe: thêm service đề nghị nhận việc`.
- Commit phải chạy được. Không commit code đang lỗi build.
- Không commit file `.env`, `node_modules`, file build.

### Hai phiên làm song song
- Nếu hai phiên cùng cần làm việc trên repo, dùng **git worktree** để mỗi phiên có thư mục riêng:
  ```
  git worktree add ../DoAn-be feature/be-buyer-job
  git worktree add ../DoAn-fe feature/fe-buyer-job
  ```
- Hai thư mục này cùng một repo, nhưng mỗi cái ở một nhánh khác nhau.

### Trước khi merge vào dev
- Chạy lại server, kiểm tra Swagger.
- Kiểm tra FE build được.
- Xem lại diff, không để lọt file thừa.

---

## 6. Khi nào phải dừng và hỏi

Dừng và ghi `CẦN CHỐT` trong `decisions.md`, không tự quyết, khi:
- Hợp đồng API thiếu hoặc mâu thuẫn với nhau.
- Cần đổi schema model chung (`Post`, `Job`, `Offer`, `User`).
- Cần đổi file thuộc vùng của phiên khác.
- Không rõ framework FE, cấu trúc thư mục, hay quy ước đặt tên.
- Một lệnh có thể xóa dữ liệu hoặc ghi đè file quan trọng.

Không cần dừng khi:
- Việc đã có đủ thông tin trong `planning.md` và `api-buyer-job.md`.
- Lỗi nhỏ trong phạm vi của chính phiên đó.

---

## 7. Câu lệnh khởi động cho từng phiên

**Terminal BE:**
```
Đọc HUONG-DAN-LAM-VIEC.md, docs/planning.md và docs/api-buyer-job.md.
Bạn là phiên BE. Chỉ làm trong server/.
Làm việc đầu tiên trong mục "Việc tiếp theo" của planning.md.
Khi xong, tick checkbox, cập nhật trạng thái endpoint, và báo lại những gì đã làm.
```

**Terminal FE:**
```
Đọc HUONG-DAN-LAM-VIEC.md, docs/planning.md và docs/api-buyer-job.md.
Bạn là phiên FE. Chỉ làm trong client/.
Làm việc đầu tiên trong mục "Việc tiếp theo" của planning.md, bằng mock data theo hợp đồng.
Không chờ BE. Khi xong, tick checkbox và báo lại những gì đã làm.
```

**Khung chat Planning:** dán nội dung `planning.md` và `decisions.md` vào đầu cuộc trò chuyện, rồi nói: "Đây là trạng thái hiện tại. Hãy cập nhật planning và trả lời các mục CẦN CHỐT."

---

## 8. Mẫu ghi chú

Trong `decisions.md`, mỗi mục có dạng:

```
### [Ngày] Tên vấn đề
- Trạng thái: CẦN CHỐT / ĐÃ CHỐT
- Người ghi: phiên BE / FE / Planning
- Nội dung: ...
- Quyết định: (điền khi đã chốt)
```
