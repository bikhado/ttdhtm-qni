# Hướng dẫn tạo Biểu đồ Deneb (Vega-Lite) trong Power BI

Tài liệu này giúp bạn tạo các biểu đồ có giao diện chuyên nghiệp (Premium) bằng Deneb, đồng bộ với Dashboard web.

---

## 0. Bước quan trọng nhất: Kiểm tra Dữ liệu (Tại sao không hiện cột?)

Nếu biểu đồ trắng xóa, có thể do Power BI chưa truyền dữ liệu vào hoặc tên trường bị sai. Bro hãy dùng code này để "khám bệnh":

**Code Kiểm tra Dữ liệu:**
```json
{
  "data": {"name": "dataset"},
  "mark": {"type": "text", "align": "left", "baseline": "middle"},
  "encoding": {
    "text": {"field": "school_year", "type": "nominal"},
    "y": {"value": 20}
  }
}
```
*   **Nếu hiện tên Năm học (ví dụ 2024-2025)**: Dữ liệu đã vào, lỗi nằm ở tên các cột g1, g2...
*   **Nếu trắng xóa**: Bro chưa kéo trường `school_year` và các trường `g1_students`... vào ô **Values** của Deneb.

---

## 1. Cách Fix "Cột Tung" (Y-Axis) triệt để

Để code JSON chạy đúng, bro nên đổi tên trường ngay trong Power BI cho gọn:

1. Tại vùng **Values** của Deneb visual (chỗ bro kéo g1_students, g2_students vào).
2. Nhấn chuột phải vào từng trường, chọn **Rename for this visual**.
3. Đặt tên lại cực ngắn là: `g1`, `g2`, `g3`,... `g12`.
4. Sau đó copy bản **Code Chuẩn** dưới đây:

### Demo 1: Biểu đồ Phân bổ Học sinh (Bản chuẩn)

```json
{
  "data": {"name": "dataset"},
  "config": { 
    "view": {"stroke": "transparent"}, 
    "background": "transparent",
    "axis": {
      "labelColor": "#94a3b8", 
      "titleColor": "#94a3b8", 
      "gridColor": "rgba(255,255,255,0.05)",
      "domain": false
    }
  },
  "transform": [
    {
      "fold": ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11", "g12"],
      "as": ["Key", "Value"]
    },
    {
      "calculate": "'Lớp ' + replace(datum.Key, 'g', '')",
      "as": "GradeLabel"
    }
  ],
  "mark": {
    "type": "bar",
    "cornerRadiusTop": 5,
    "tooltip": true,
    "color": {"gradient": "linear", "stops": [{"offset": 0, "color": "#4facfe"}, {"offset": 1, "color": "#00f2fe"}]}
  },
  "encoding": {
    "x": {
      "field": "GradeLabel", 
      "type": "nominal", 
      "sort": ["Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5", "Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12"],
      "title": null
    },
    "y": {
      "field": "Value", 
      "type": "quantitative", 
      "aggregate": "sum",
      "title": "Số lượng"
    }
  }
}
```

---

## 2. Cách kiểm tra tên trường (Debug Tool)
Nếu vẫn không lên, bro hãy nhấn vào nút **Data** (biểu tượng bảng ở góc trên bên trái Deneb). 
*   Xem cột **Name**.
*   Nếu nó hiện là `"Sum of g1"` thì trong phần `"fold"` phía trên bro phải sửa lại thành `"Sum of g1"`.

---

## 3. Xử lý Năm học
Dùng **Slicer** (Bộ lọc) mặc định của Power BI cho trường `school_year`. Khi chọn năm, biểu đồ Deneb sẽ tự động nhảy theo.
