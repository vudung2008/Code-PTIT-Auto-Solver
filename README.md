# 🚀 Code PTIT Auto Solver

[![Chrome Extension](https://img.shields.io/badge/Platform-Chrome_Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)]()

> Tự động giải và nộp bài tập lập trình C trên [code.ptit.edu.vn](https://code.ptit.edu.vn) bằng AI, thông qua Omniroute hoặc Google Gemini API.

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng](#-tính-năng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Tech Stack](#-tech-stack)
- [Cài đặt](#-cài-đặt)
- [Sử dụng](#-sử-dụng)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Đóng góp](#-đóng-góp)
- [Tác giả](#-tác-giả)
- [License](#-license)

---

## 🎯 Giới thiệu

**Code PTIT Auto Solver** là một Chrome Extension (Manifest V3) giúp tự động hóa hoàn toàn quy trình giải bài tập lập trình C trên hệ thống Code PTIT. Extension sử dụng LLM (Large Language Model) thông qua API chuẩn OpenAI để đọc đề bài, sinh mã nguồn C và nộp bài — tất cả diễn ra hoàn toàn tự động.

Extension hỗ trợ hai chế độ kết nối API:
- **Omniroute (Local)** — Kết nối qua proxy tại `localhost` sử dụng chuẩn OpenAI `chat/completions`.
- **Google Gemini (Cloud)** — Fallback trực tiếp tới Gemini API khi không cấu hình Omniroute.

---

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 🤖 **Auto Solve** | Tự động quét danh sách bài chưa làm, giải lần lượt từng bài bằng AI |
| 📋 **Queue Management** | Hàng đợi FIFO — giải xong bài này tự chuyển sang bài tiếp theo |
| 🔌 **Dual API** | Hỗ trợ Omniroute (chuẩn OpenAI) và Google Gemini API |
| 📟 **Floating Terminal** | Bảng log realtime ngay trên trang web, kéo thả được, không cần mở DevTools |
| 🎮 **Dark Dashboard** | Popup UI hiện đại với dark theme, terminal log và các nút điều khiển trực quan |
| 🛡️ **Network Resilient** | Sử dụng `MutationObserver` chờ phản hồi server thay vì delay cứng, timeout 30 giây cho mạng chậm |
| ⚡ **Speed Optimized** | DOM check mỗi 100ms, delay chuyển tab chỉ 400ms, React state wait 300ms |
| 🔄 **Fault Tolerant** | Try/catch toàn bộ luồng — bài lỗi bị bỏ qua tự động, queue không bao giờ bị kẹt |
| 👁️ **Toggle UI** | Bật/tắt giao diện nổi (Terminal + FAB) từ popup với một nút bấm |
| 📡 **Broadcast Log** | Log được phát đồng thời tới Popup, Floating Terminal và Console |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHROME EXTENSION                            │
│                                                                     │
│  ┌──────────┐     ┌────────────────┐     ┌──────────────────────┐  │
│  │  Popup   │◄───►│  Background    │◄───►│  Content Scripts     │  │
│  │  (UI)    │     │  Service Worker│     │                      │  │
│  │          │     │                │     │  ┌─────────────────┐ │  │
│  │ • Config │     │ • API Caller   │     │  │ list_manager.js │ │  │
│  │ • Toggle │     │ • Queue Mgmt   │     │  │ (trang /courses)│ │  │
│  │ • Log    │     │ • Broadcast    │     │  └─────────────────┘ │  │
│  └──────────┘     │   Log System   │     │  ┌─────────────────┐ │  │
│                   │                │     │  │ problem_solver  │ │  │
│                   └───────┬────────┘     │  │ (trang /submit) │ │  │
│                           │              │  └─────────────────┘ │  │
│                           ▼              └──────────────────────┘  │
│                   ┌───────────────┐                                 │
│                   │  Omniroute /  │                                 │
│                   │  Gemini API   │                                 │
│                   └───────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Luồng xử lý chính

```
1. Quét bài  ──►  2. Mở tab  ──►  3. Đọc đề  ──►  4. Gọi LLM
                                                        │
   6. Đóng tab  ◄──  5. Upload & Submit  ◄──────────────┘
       │
       ▼
   7. Mở bài tiếp (lặp lại từ bước 2)
```

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| **Platform** | Chrome Extension Manifest V3 |
| **Language** | Vanilla JavaScript (ES2020+) |
| **UI** | HTML5, CSS3 (Dark Theme, Gradient, Custom Scrollbar) |
| **APIs** | OpenAI-compatible `chat/completions`, Google Gemini REST API |
| **Storage** | `chrome.storage.local` |
| **DOM Observation** | `MutationObserver`, `DataTransfer` API |
| **Messaging** | `chrome.runtime.sendMessage`, `chrome.tabs.sendMessage` |

---

## 📦 Cài đặt

### Yêu cầu

- Google Chrome phiên bản **88** trở lên (hỗ trợ Manifest V3)
- API Key từ Omniroute hoặc Google Gemini

### Các bước cài đặt

```bash
# 1. Clone repository
git clone https://github.com/vudung2008/Code.PTIT_Auto.git

# 2. Mở Chrome và truy cập trang quản lý extension
#    Nhập vào thanh địa chỉ:
chrome://extensions/

# 3. Bật "Developer mode" (góc trên bên phải)

# 4. Click "Load unpacked" và chọn thư mục vừa clone
```

> **Lưu ý:** Extension sẽ tự động inject content scripts khi bạn truy cập `code.ptit.edu.vn`.

---

## 🚀 Sử dụng

### Bước 1: Cấu hình API

1. Click vào icon extension trên thanh công cụ Chrome.
2. Điền thông tin cấu hình:

   | Field | Ví dụ | Ghi chú |
   |-------|-------|---------|
   | **Omniroute Base URL** | `http://localhost:20128` | Để trống nếu dùng Gemini trực tiếp |
   | **API Key** | `sk-xxxxxxxx` | Bắt buộc |
   | **Model Name** | `flash 3.8` | Mặc định `flash 3.8` |

3. Click **💾 Lưu Cấu Hình**.

### Bước 2: Chạy Auto Solve

1. Truy cập trang danh sách bài tập trên Code PTIT (`/courses`).
2. Một **Floating Terminal** (góc trái dưới) và nút **🚀 Auto Solve All** (góc phải dưới) sẽ xuất hiện.
3. Click **🚀 Auto Solve All** — Extension sẽ:
   - Quét tất cả bài chưa làm (bỏ qua `row-solved` và `row-attempted`).
   - Lưu danh sách URL vào hàng đợi.
   - Tự động mở từng bài, giải và nộp.
4. Theo dõi tiến độ trên Floating Terminal hoặc popup.

### Bước 3: Dừng

- Click **🛑 Dừng** trong popup bất cứ lúc nào để hủy queue.

---

## 📁 Cấu trúc thư mục

```
Code.PTIT_Auto/
├── manifest.json            # Khai báo extension (MV3)
├── background.js            # Service Worker — API caller, queue, broadcast log
├── popup.html               # Dashboard UI — dark theme
├── popup.js                 # Logic popup — config, controls, terminal log
├── content-courses.js       # Bootstrap script cho trang /courses
├── list_manager.js          # Quét bài, FAB, Floating Terminal
├── content-submit.js        # Bootstrap script cho trang /submit
├── problem_solver_v2.js     # Đọc đề, upload code, submit — network resilient
└── README.md                # Tài liệu bạn đang đọc
```

### Chi tiết từng module

| File | Vai trò |
|------|---------|
| `background.js` | Service Worker trung tâm. Gọi API Omniroute/Gemini, quản lý FIFO queue, broadcast log tới popup + tất cả tabs. |
| `list_manager.js` | Chạy trên trang `/courses`. Quét `tr.ant-table-row`, tạo Floating Terminal (kéo thả, thu gọn) và nút FAB "Auto Solve All". |
| `problem_solver_v2.js` | Chạy trên trang `/submit/*`. Trích xuất đề bài, gửi LLM, upload file `.c` qua `DataTransfer`, click submit, chờ kết quả bằng `MutationObserver` (timeout 30s). |
| `popup.html/js` | Dashboard: lưu config, bắt đầu/dừng, terminal log realtime, toggle UI nổi. |

---

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Để bắt đầu:

1. **Fork** repository.
2. Tạo **branch** mới: `git checkout -b feature/ten-tinh-nang`.
3. **Commit** thay đổi: `git commit -m "feat: thêm tính năng XYZ"`.
4. **Push** lên branch: `git push origin feature/ten-tinh-nang`.
5. Tạo **Pull Request**.

### Conventions

- Commit message theo [Conventional Commits](https://www.conventionalcommits.org/).
- Code JavaScript sử dụng ES2020+ syntax.
- Mỗi hàm quan trọng cần có comment mô tả mục đích.

### Ý tưởng đóng góp

- [ ] Hỗ trợ thêm ngôn ngữ ngoài C (C++, Python, Java).
- [ ] Tự động chọn ngôn ngữ nộp bài trên Code PTIT.
- [ ] Retry thông minh khi API trả về lỗi.
- [ ] Phân trang tự động khi quét danh sách `/courses`.
- [ ] Hiển thị thống kê AC/WA sau khi chạy xong.

---

## 👨‍💻 Tác giả

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/vudung2008">
        <img src="https://github.com/vudung2008.png" width="100px;" alt="Vu Tien Dung"/>
        <br />
        <sub><b>Vu Tien Dung</b></sub>
      </a>
      <br />
      <a href="https://vudungdev.io.vn">🌐 Portfolio</a> ·
      <a href="mailto:contact@vudungdev.io.vn">📧 Email</a>
    </td>
  </tr>
</table>

---

## 📄 License

Dự án này được phân phối dưới giấy phép **MIT License**. Xem file [LICENSE](./LICENSE) để biết thêm chi tiết.

```
MIT License

Copyright (c) 2026 Vu Tien Dung

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/vudung2008">Vu Tien Dung</a></sub>
</div>
