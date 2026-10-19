# AGENTS.md

Dự án này dùng chung một file ghi chú cho mọi trợ lý (Claude Code, Codex…): **đọc `CLAUDE.md` trước khi làm bất cứ việc gì** — trong đó có luật làm việc với người dùng (bắt buộc), trạng thái từng màn hình, các quyết định đã chốt và việc cần làm tiếp theo.

Tóm tắt những luật quan trọng nhất (chi tiết ở `CLAUDE.md` mục 1):
- Trả lời bằng **tiếng Việt**, dễ hiểu.
- **Đề xuất ngắn trước, chờ người dùng đồng ý rồi mới làm.** Đánh giá như người dùng thật, không chiều theo; hỏi "đồng ý không".
- **Đổi từng thứ một**, sao lưu file trước khi sửa lớn, chụp ảnh kiểm tra (xem `tools/README.md`).
- **Mỗi màn hình chỉ một file HTML** trong `design/mockups/` — không tạo bản v2, v3…
- Không làm kiểu "AI". Dữ liệu mẫu để demo được phép.
- Công cụ phụ ở `tools/`.

**Cuối mỗi phiên: cập nhật `CLAUDE.md`** (trạng thái, quyết định + lý do, việc tiếp theo) và lưu một mốc git (`git add -A && git commit -m "..."`) để người khác (hoặc trợ lý khác) làm tiếp được và có thể quay lại bản trước.
