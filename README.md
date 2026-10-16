# AntGo — Nền tảng giao nhận nội khu

Đồ án môn Web (261BIE503102) — Nhóm 1. Ứng dụng kết nối hàng xóm trong khu: đặt món, thuê dịch vụ, nhận việc vặt.

## Công nghệ

Angular (client) · Express (server) · MongoDB (database)

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `client/` | Giao diện Angular (đồ án chính) |
| `server/` | API Express + MongoDB (đồ án chính) |
| `docs/` | Tài liệu: `pccv/` (bảng phân công), `thiet-ke/` (Use Case, BPMN, DFD, ERD), `bao-cao/`, `tham-khao/`, cùng `user-flows.md`, `handoff.md` |
| `design/mockups/` | Bản mẫu giao diện HTML thuần — chỉ để tham khảo thiết kế, mở file `.html` là xem được |
| `tools/` | `shot.sh` chụp ảnh kiểm tra giao diện |

## Quy tắc làm việc nhóm

- Nhánh `main` chỉ chứa bản chạy được. Mỗi người làm trên nhánh `ten/tinh-nang`, xong gộp lại bằng Pull Request.
- Ghi chú làm việc chi tiết: xem `CLAUDE.md`.
