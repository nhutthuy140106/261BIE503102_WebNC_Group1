"""Sinh client/public/datasets/posts.json từ dữ liệu mẫu của bản HTML (design/mockups/home-v5.html,
shared/catalog.js, job.html). Chạy:  python -I tools/mock-data/gen_posts.py

Mỗi bài có `template` (food, drink, goods, svc, fix, clean, trip) để trang chi tiết dựng đủ 7 khối
(giá, số lượng, thời gian, địa điểm, tùy chọn, câu hỏi, tình trạng bán) giống bản mẫu — xem
client/src/app/core/config/post-templates.ts.
"""
import hashlib
import json
import pathlib
import re
import sys

OUT = pathlib.Path(__file__).resolve().parents[2] / "client" / "public" / "datasets" / "posts.json"


def hid(seed: str) -> str:
    return hashlib.md5(seed.encode("utf-8")).hexdigest()[:24]


def photo(pid: str, w=500, h=375) -> str:
    return f"https://images.unsplash.com/photo-{pid}?w={w}&h={h}&fit=crop&q=70"


def money(s: str) -> int:
    return int(re.sub(r"\D", "", s))


def metres(s: str) -> int:
    return int(re.sub(r"\D", "", s))


# người bán / người đăng (ảnh đại diện Unsplash)
AV = {
    "Bếp Cô Lan": "1494790108377-be9c29b29330",
    "Quán Nhà Mây": "1438761681033-6461ffad8d80",
    "Anh Quân": "1500648767791-00dcc994a43e",
    "Tiệm Sạch Thơm": "1438761681033-6461ffad8d80",
    "Anh Tùng": "1507003211169-0a1dd7228f2d",
    "Cô Ba": "1438761681033-6461ffad8d80",
    "Minh": "1500648767791-00dcc994a43e",
    "Chị Hoa": "1494790108377-be9c29b29330",
    "Thu Hà": "1438761681033-6461ffad8d80",
    "Quốc Anh": "1500648767791-00dcc994a43e",
    "Chị Ngân": "1507003211169-0a1dd7228f2d",
    "Anh Tuấn": "1500648767791-00dcc994a43e",
    "Minh Khoa": "1506794778202-cad84cf45f1d",
    "Phương": "1507003211169-0a1dd7228f2d",
    "Quán Phở Bà Tư": "1494790108377-be9c29b29330",
    "Giặt sấy Mỹ Linh": "1438761681033-6461ffad8d80",
    "Tiệm Bánh Nhà Mây": "1438761681033-6461ffad8d80",
    "Bác Sơn": "1500648767791-00dcc994a43e",
    "Bạn Linh": "1494790108377-be9c29b29330",
}


def template_of(kind_label: str, title: str) -> str:
    """Cùng luật chọn mẫu chi tiết như home-v5.html (bấm thẻ → detail.html?p=...)."""
    if re.search(r"laptop|Sửa|sửa|máy lạnh", title):
        return "fix"
    if re.search(r"Dọn|dọn", title):
        return "clean"
    if re.search(r"Lấy|lấy|Mua hộ|siêu thị|Giao đồ", title):
        return "trip"
    if re.search(r"Giặt|giặt", title):
        return "svc"
    if kind_label == "Đồ uống" or re.search(r"cà phê|trà sữa|sinh tố", title, re.I):
        return "drink"
    if kind_label in ("Hàng hóa", "Đồ dùng"):
        return "goods"
    if kind_label == "Dịch vụ":
        return "clean"
    return "food"


KIND = {"Đồ ăn": "food", "Đồ uống": "food", "Đồ dùng": "goods", "Hàng hóa": "goods", "Dịch vụ": "service"}

# (id ảnh, nhãn loại, tên, giá, đơn vị, khu/block, khoảng cách, điểm, quảng bá, dùng Xu, người bán)
ITEMS = [
    # Nổi bật (4 bài quảng bá)
    ("1565958011703-44f9829ba187", "Đồ ăn", "Bánh kem dâu nhà làm, đặt trước 1 ngày", "280.000đ", "ổ", "Shop 3", "200m", 5.0, 1, 1, "Tiệm Bánh Nhà Mây"),
    ("1582735689369-4fe89db7114c", "Dịch vụ", "Giặt sấy gấp, lấy và trả tận cửa", "18.000đ", "kg", "Shop 12", "300m", 4.8, 1, 1, "Tiệm Sạch Thơm"),
    ("1504674900247-0877df9cc836", "Đồ ăn", "Cơm nhà làm, thực đơn đổi mỗi ngày", "35.000đ", "phần", "Block B", "150m", 4.9, 1, 1, "Bếp Cô Lan"),
    ("1512621776951-a57141f2eefd", "Đồ ăn", "Bowl rau củ healthy, giao trưa", "55.000đ", "phần", "Block C", "320m", 4.8, 1, 0, "Chị Hoa"),
    # Gần bạn
    ("1569718212165-3a8278d5f624", "Đồ ăn", "Phở bò tái, nước dùng hầm xương", "45.000đ", "tô", "Block D", "250m", 4.9, 0, 1, "Quán Phở Bà Tư"),
    ("1581578731548-c64695cc6952", "Dịch vụ", "Dọn nhà theo giờ", "120.000đ", "giờ", "Block A", "450m", 4.8, 0, 1, "Cô Ba"),
    ("1542838132-92c53300491e", "Đồ ăn", "Rau củ sạch theo combo", "40.000đ", "combo", "Block A", "500m", 4.7, 0, 0, "Chị Ngân"),
    ("1543466835-00a7907e9de1", "Dịch vụ", "Tắm và cắt tỉa lông thú cưng tại nhà", "150.000đ", "lần", "Block C", "350m", 4.8, 0, 0, "Phương"),
    # Khám phá
    ("1509042239860-f550ce710b93", "Đồ uống", "Cà phê sữa đá", "25.000đ", "ly", "Shop 3", "200m", None, 0, 0, "Quán Nhà Mây"),
    ("1587300003388-59208cc962cb", "Dịch vụ", "Dắt chó đi dạo buổi chiều", "50.000đ", "lượt", "Block B", "250m", None, 0, 0, "Minh"),
    ("1585032226651-759b368d7246", "Đồ ăn", "Mì xào hải sản", "40.000đ", "phần", "Block C", "400m", 4.5, 0, 0, "Chị Hoa"),
    ("1563453392212-326f5e854473", "Dịch vụ", "Vệ sinh máy lạnh", "150.000đ", "máy", "Block D", "600m", None, 0, 0, "Anh Tùng"),
    ("1604908176997-125f25cc6f3d", "Đồ ăn", "Đậu sốt cà chua", "30.000đ", "phần", "Block A", "300m", None, 0, 0, "Chị Ngân"),
    ("1558857563-b371033873b8", "Đồ uống", "Trà sữa trân châu đường đen", "30.000đ", "ly", "Shop 5", "300m", None, 0, 1, "Quán Nhà Mây"),
    ("1495474472287-4d71bcdd2085", "Đồ uống", "Cà phê hạt rang mộc", "120.000đ", "250g", "Shop 3", "200m", None, 0, 0, "Quán Nhà Mây"),
    ("1505740420928-5e560c06d30e", "Đồ dùng", "Tai nghe chụp tai, còn bảo hành 8 tháng", "650.000đ", "cái", "Block C", "350m", None, 0, 1, "Minh Khoa"),
    ("1555041469-a586c61ea9bc", "Đồ dùng", "Sofa vải 3 chỗ, chuyển nhà cần nhượng", "2.500.000đ", "cái", "Block A", "400m", None, 0, 0, "Anh Tuấn"),
    ("1485965120184-e220f721d03e", "Đồ dùng", "Xe đạp thể thao, đi được 1 năm", "1.800.000đ", "chiếc", "Block D", "500m", None, 0, 0, "Anh Quân"),
    ("1592078615290-033ee584e267", "Đồ dùng", "Ghế ăn nhựa chân gỗ, bộ 2 cái", "300.000đ", "bộ", "Block B", "200m", None, 0, 0, "Chị Hoa"),
    ("1556909114-f6e7ad7d3136", "Dịch vụ", "Nấu cơm gia đình", "250.000đ", "buổi", "Block C", "450m", None, 0, 0, "Bếp Cô Lan"),
    ("1565299624946-b28f40a0ae38", "Đồ ăn", "Pizza nướng tại nhà", "120.000đ", "cái", "Shop 9", "700m", None, 0, 0, "Bác Sơn"),
    ("1571019613454-1cb2f99b2d8b", "Dịch vụ", "PT tập tại nhà", "300.000đ", "buổi", "Block D", "650m", None, 0, 0, "Bạn Linh"),
    ("1540189549336-e6e99c3679fe", "Đồ ăn", "Salad ức gà", "45.000đ", "hộp", "Block B", "180m", 4.6, 0, 0, "Thu Hà"),
    ("1545173168-9f1947eebb7f", "Dịch vụ", "Giặt hấp đồ vest", "45.000đ", "bộ", "Shop 12", "300m", None, 0, 0, "Giặt sấy Mỹ Linh"),
    ("1567620905732-2d1ec7ab7445", "Đồ ăn", "Pancake mật ong", "35.000đ", "phần", "Shop 3", "200m", None, 0, 0, "Tiệm Bánh Nhà Mây"),
    ("1555939594-58d7cb561ad1", "Đồ ăn", "Xiên nướng BBQ", "60.000đ", "phần", "Shop 9", "700m", None, 0, 0, "Bác Sơn"),
    ("1607082348824-0a96f2a4b9da", "Dịch vụ", "Đi siêu thị hộ, giao tận cửa", "30.000đ", "lần", "Block A", "400m", None, 0, 0, "Minh"),
    ("1556909114-f6e7ad7d3136", "Đồ dùng", "Nồi chiên không dầu 5L, dùng 6 tháng", "650.000đ", "cái", "Block A", "450m", None, 0, 0, "Anh Quân"),
    ("1581092918056-0c4c3acd3789", "Dịch vụ", "Sửa laptop, điện thoại — kiểm tra tận nơi", "50.000đ", "kiểm tra", "Shop 7", "600m", None, 0, 0, "Anh Tùng"),
    ("1617347454431-f49d7ff5c3b1", "Dịch vụ", "Lấy đồ hộ, giao nhận trong khu", "15.000đ", "lượt", "Block B", "200m", None, 0, 0, "Minh"),
]

# Việc làm: (loại việc, tên, số đề nghị, mô tả, thời gian làm, giá, đơn vị, ảnh người đăng, người đăng, đăng cách đây (phút), block, khoảng cách)
JOBS = [
    ("Mua hộ", "Lấy giúp phần cơm ở cổng sau", 1, "Shipper để ở cổng sau, mang lên giúp tận cửa tầng 2.", "Hôm nay · 11:30", "30.000đ", "lần", "Thu Hà", 120, "Block B", "200m"),
    ("Việc nhà", "Dọn phòng cuối tuần", 3, "Phòng ngủ và phòng khách khoảng 40m², dụng cụ có sẵn.", "CN 18/10 · 9:00", "80.000đ", "buổi", "Quốc Anh", 300, "Block B", "300m"),
    ("Sự kiện", "Chụp ảnh buổi workshop nhỏ", 0, "Workshop làm nến 2 tiếng, cần khoảng 30–50 ảnh đẹp.", "T7 17/10 · 14:00", "150.000đ", "buổi", "Phương", 1440, "Sảnh A", "400m"),
    ("Gia sư", "Kèm Toán lớp 8, 2 buổi mỗi tuần", 2, "Bé cần ôn hình học, học tại nhà, mỗi buổi 90 phút.", "Tối T3 & T5", "100.000đ", "buổi", "Minh Khoa", 1500, "Block D", "500m"),
    ("Thú cưng", "Cho mèo ăn 3 ngày khi đi vắng", 2, "2 bé mèo, cho ăn sáng tối và dọn cát mỗi ngày.", "14 – 16/10", "150.000đ", "3 ngày", "Chị Ngân", 1560, "Block B", "150m"),
    ("Mua hộ", "Mua đồ chợ sáng giúp nhà mình", 2, "Mua rau, thịt, trái cây theo danh sách gửi qua tin nhắn.", "T7 17/10 · 6:30", "50.000đ", "lần", "Chị Hoa", 1700, "Block A", "350m"),
    ("Vận chuyển", "Chuyển 2 thùng đồ sang Block A", 1, "Thùng sách và đồ bếp, có xe đẩy sẵn ở sảnh.", "Tối nay · 19:00", "80.000đ", "lần", "Anh Tuấn", 180, "Block D", "500m"),
    ("Phụ bán hàng", "Phụ đứng quầy bánh mì buổi sáng", 0, "Bán và thu tiền giúp quầy, có người hướng dẫn buổi đầu.", "6:00 – 9:00 · T2–T6", "150.000đ", "ca", "Bác Sơn", 2000, "Shop 5", "300m"),
    ("Gia sư", "Kèm Tiếng Anh lớp 5", 3, "Ôn ngữ pháp và luyện nói, học tại nhà bé.", "Tối T2 & T4", "120.000đ", "buổi", "Bạn Linh", 2200, "Block A", "400m"),
    ("Việc nhà", "Phơi và gấp đồ cuối tuần", 1, "Khoảng 2 giỏ đồ, phơi sáng và gấp lúc chiều.", "T7 17/10", "100.000đ", "buổi", "Chị Hoa", 2500, "Block D", "500m"),
]

# các bài ở khu khác (khu gần đó) — để trang Tìm kiếm có phần "Ở khu gần đó"
OTHER_AREA_BLOCKS = {"Block D", "Shop 12", "Shop 9", "Sảnh A"}


def area_of(block: str) -> str:
    return "Vinhomes Grand Park" if block in OTHER_AREA_BLOCKS else "Bcons"


def seller_id(name: str) -> str:
    return hid("seller:" + name)


def build():
    posts = []
    seen = set()
    for i, (pid, label, title, price, unit, block, dist, rate, ad, xu, seller) in enumerate(ITEMS):
        key = f"{title}|{label}"
        if key in seen:
            continue
        seen.add(key)
        posts.append({
            "_id": hid("post:" + title),
            "kind": KIND[label],
            "title": title,
            "description": "",
            "images": [photo(pid)],
            "sellerId": seller_id(seller),
            "sellerName": seller,
            "sellerAvatar": photo(AV[seller], 80, 80),
            "block": block,
            "area": area_of(block),
            "distance": metres(dist),
            "category": label,
            "price": money(price),
            "priceUnit": unit,
            **({"rating": rate, "reviewCount": 6 + (i * 7) % 40} if rate else {}),
            **({"promoted": True} if ad else {}),
            **({"acceptsXu": True} if xu else {}),
            "template": template_of(label, title),
            "agoMin": 3000 + i * 240,
            "createdAt": "2026-10-10T08:00:00.000Z",
        })
    for i, (cat, title, offers, desc, due, price, unit, who, ago, block, dist) in enumerate(JOBS):
        posts.append({
            "_id": hid("job:" + title),
            "kind": "job",
            "title": title,
            "description": desc,
            "images": [],
            "sellerId": seller_id(who),
            "sellerName": who,
            "sellerAvatar": photo(AV[who], 80, 80),
            "block": block,
            "area": area_of(block),
            "distance": metres(dist),
            "category": cat,
            "price": money(price),
            "priceUnit": unit,
            "agoMin": ago,
            "createdAt": "2026-10-16T08:00:00.000Z",
            "job": {"due": due, "offers": offers, "status": "taken" if title == "Phơi và gấp đồ cuối tuần" else "open"},
        })
    return posts


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(data)} bài -> {OUT}")
