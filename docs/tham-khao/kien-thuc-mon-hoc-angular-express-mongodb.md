# Kiến thức môn học áp dụng vào đồ án AntGo

> Tổng hợp từ 9 bộ slide môn **Phát triển Web Kinh doanh Nâng cao** (TS. Trần Duy Thanh, Khoa HTTT – UEL): Giới thiệu môn học + Chương I → VIII.
> Mục đích: thầy yêu cầu *những gì đã học phải có trong đồ án*, nên file này là checklist kỹ thuật + ghi chú để cả nhóm (và AI hỗ trợ) bám theo.
> Stack đồ án: **Angular (client) · Express (server) · MongoDB** — trùng đúng stack môn học.

**Cách đọc file:**
- **[Slide]** = nội dung lấy từ slide của thầy.
- **[Bổ sung]** = mình thêm vào (không có trong slide), chủ yếu về bảo mật và chỗ code demo của thầy chưa an toàn.
- Slide chứa nhiều ảnh chụp màn hình/code trong ảnh nên phần nào chỉ có trong ảnh thì **không** được trích ra ở đây (ví dụ cấu hình `app-routing-module.ts` từng bước). Phần code dưới đây lấy từ chữ trên slide và speaker notes.

---

## 1. Checklist "thầy yêu cầu phải có trong đồ án"

| # | Nhóm kỹ thuật | Cần thể hiện trong đồ án | Chương |
|---|---|---|---|
| 1 | Kiến trúc Angular | Component, Module, Service, DI, Routing chuẩn hóa | I |
| 2 | Binding & Directive | Property/Class/Style/Event/Two-way; `@if`, `@for`, `@switch`; `@Input`/`@Output` | II |
| 3 | Service + HTTP | Service tách logic gọi API, `HttpClient`, **xử lý lỗi** (`catchError`, `retry`) | III |
| 4 | Routing | Route có `:id`, **slug SEO**, query params lọc, wildcard 404, nested route, **lazy loading**, **Guard** | IV |
| 5 | Form | Template-driven hoặc Reactive; validation; custom + cross-field validation | V |
| 6 | RESTful API (Express) | CRUD đủ GET/POST/PUT/DELETE, CORS, morgan, nodemon, upload ảnh | VI |
| 7 | MongoDB | CRUD với collection thật, `ObjectId`, kết nối `MongoClient` | VII |
| 8 | Cookie & Session | Đăng nhập, "ghi nhớ đăng nhập", giỏ hàng tạm bằng session, đăng xuất | VIII |
| 9 | **Bảo mật** | Cookie flags, session an toàn, guard, validate server-side, mã hóa mật khẩu | IV, V, VIII (+ mục 9 bên dưới) |
| 10 | Máy học (CO3) | Tích hợp máy học để nâng trải nghiệm / gợi ý sản phẩm (mục tiêu môn học, chưa có chương riêng trong bộ slide này) | Mục tiêu môn |

**Thông tin đánh giá [Slide]:** quá trình 30% (bài tập trên lớp 15% + về nhà 15%), giữa kỳ thực hành 20%, **cuối kỳ = đồ án nhóm 50%**. Nộp bài trên lms.uel.edu.vn. Công cụ: VS Code, MongoDB, Postman; AI hỗ trợ: Cursor, GitHub Copilot, ChatGPT/Claude.

---

## 2. Chương I – Angular Framework

### 2.1 Khái niệm [Slide]
- Angular = framework mã nguồn mở của Google để xây **SPA** (Single Page Application): chỉ tải `index.html` một lần, các lần sau chỉ tải dữ liệu JSON và cập nhật phần thay đổi.
- SPA vs MPA: SPA mượt hơn, server chủ yếu trả API; MPA dễ SEO hơn nhưng tải lại cả trang.
- Ngôn ngữ: **TypeScript**.
- Phiên bản gần đây (theo slide): Angular 16 (Signals, Hydration) → 17 (Control flow mới, Deferrable views) → 18 → 19 → 20 (Zoneless ổn định, Signal Forms) → **21 (11/2025)**.

### 2.2 Kiến trúc thành phần [Slide]
- **App** = 1 root module + nhiều feature module. **Module** gom Component/Directive/Pipe/Service.
- `@NgModule`: `declarations` (private), `imports`, `exports`, `providers`.
- **Feature Module + Lazy Loading** giảm bundle ban đầu, cải thiện **LCP** (tốt ≤ 2.5s; cần cải thiện 2.5–4s; kém > 4s).
- **Component** = Template (HTML) + Styles + Class (TS) + metadata `@Component` (selector, templateUrl, styleUrl).
- **Service** = business logic + gọi API + chia sẻ state giữa component không cha-con. Component **không** gọi API / xử lý nặng trực tiếp.
- **DI/IoC**: Angular tạo service, không dùng `new`. `@Injectable({ providedIn: 'root' })` → singleton toàn app.

### 2.3 Tạo dự án [Slide]
```bash
npm install -g @angular/cli
ng new my-app --no-standalone --routing --ssr=false   # chọn CSS, không chọn SSR
ng serve -o                                           # chạy http://localhost:4200
ng g c contact        # tạo component
ng g s services/product-service   # tạo service
```
- Lệnh trên dùng **NgModule** (`--no-standalone`) → component trong slide có `standalone: false`.
- Lỗi PowerShell `SecurityError ... running scripts is disabled`: chạy `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- Cấu trúc: `src/app/` (app-module.ts, app-routing-module.ts, app.ts/html/css), `main.ts` (entry), `index.html` (`<app-root>`), `angular.json`, `package.json`, `.gitignore`, `.editorconfig`.

---

## 3. Chương II – Binding, Directive, Component Interaction

### 3.1 Binding [Slide]
| Loại | Cú pháp | Hướng | Dùng để |
|---|---|---|---|
| Interpolation | `{{ name }}` | Nguồn → View | Hiển thị text |
| Property | `[src]="url"` | Nguồn → View | Gán property DOM (`src`, `href`, `disabled`, `value`) |
| Class | `[class.active]="cond"` / `[class]="{a: x, b: y}"` | Nguồn → View | Bật/tắt CSS class |
| Style | `[style.width.px]="w"` | Nguồn → View | Style động (progress bar...) |
| Event | `(click)="save()"`, `$event` | View → Nguồn | Xử lý thao tác người dùng |
| Two-way | `[(ngModel)]="prop"` | Hai chiều | Form (cần import `FormsModule`) |

- Property binding gán vào **property DOM**, không phải attribute HTML (an toàn và hiệu năng hơn).
- Nhiều style thay đổi thường xuyên → ưu tiên Class Binding, tránh lạm dụng Style Binding.
- Nguyên lý **SoC**: Template lo hiển thị; Component class điều phối sự kiện + dữ liệu; Service lo nghiệp vụ và gọi API.

### 3.2 Control flow mới (Angular ≥ 17) [Slide]
| Cũ | Mới | Ghi chú |
|---|---|---|
| `*ngIf` / `else` + `ng-template` | `@if (...) {} @else {}` | Không cần `CommonModule`, tối ưu compile-time |
| `*ngSwitch` | `@switch (x) { @case ('a') {} @default {} }` | |
| `*ngFor` + `trackBy` | `@for (p of list; track p.id) {} @empty {}` | `@empty` xử lý mảng rỗng |

- Biến trong `@for`/`*ngFor`: `index`, `first`, `last`, `even`, `odd`.
- **`track p.id`** (định danh duy nhất) tốt hơn `track p`: Angular chỉ cập nhật đúng DOM của item thay đổi.
- Structural directive (thay đổi cấu trúc DOM, có `*`) vs Attribute directive (`ngClass`, `ngStyle`).

### 3.3 Component Interaction [Slide]
- Cha → con: `@Input() receivedData` + `[receivedData]="value"`.
- Con → cha: `@Output() notify = new EventEmitter<string>()` + `(notify)="handle($event)"`.

---

## 4. Chương III – Services & HTTP

### 4.1 Vấn đề "Spaghetti State" [Slide]
Dữ liệu rải rác nhiều component gây: **prop drilling**, lỗi khó truy vết ("spooky action at a distance"), UI không đồng nhất, ngại sửa code. Giải pháp: dữ liệu và logic dùng chung nằm trong **Service singleton**.

### 4.2 Dữ liệu ngoài + HTTP [Slide]
- Đặt JSON tĩnh trong `public/datasets/*.json` (đã được `angular.json` cấu hình `glob: "**/*", input: "public"`).
- Bật `HttpClient` trong `app-module.ts`:
```ts
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
providers: [ provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptorsFromDi()) ]
```
- **Signal**: wrapper chứa giá trị, khi `.set(data)` Angular cập nhật đúng chỗ dùng. Trong template gọi **`products()`** (có ngoặc), không phải `products`.

### 4.3 Xử lý lỗi (bắt buộc) [Slide]
Lý do: mạng không ổn định, server quá tải/bảo trì (500, 503), sai quyền (401, 403), UX tệ nếu spinner quay mãi, dữ liệu phải về **Safe State** (ví dụ `products = []` + thông báo lỗi), dễ log/debug (Sentry, LogRocket).
```ts
getProductList(): Observable<Product[]> {
  return this._http.get<Product[]>('/datasets/products.json').pipe(
    retry(3),
    catchError(this.handleError));
}
handleError(error: HttpErrorResponse) {
  return throwError(() => new Error(error.message));
}
```

---

## 5. Chương IV – Routing (có **Slug**, Guard, Lazy loading)

### 5.1 Cơ bản [Slide]
- Thành phần: **Routes** (mảng cấu hình), **RouterOutlet**, **RouterLink** (thay `<a href>`, không reload), **Router** (điều hướng bằng code: `this.router.navigate(['/login'])`).
- Luồng: URL đổi → Router so khớp mảng Routes → hiển thị component vào `<router-outlet>`.
- Lợi ích routing trong SPA: nút Back/Forward hoạt động, **deep link** (`/products/123`), tách logic giao diện.
- **`Router`** (service toàn cục, để điều hướng) ≠ **`ActivatedRoute`** (thông tin route hiện tại: `params`, `queryParams`, `data`).

### 5.2 Route có tham số `:id` [Slide]
```ts
// service
getProductById(id: number): Observable<Product | undefined> {
  return this.getProductList().pipe(
    map(list => list.find(p => p.id === id)),
    catchError(this.handleError));
}
// component
this.activateRoute.paramMap.subscribe(param => {
  const idParam = param.get('id');
  if (idParam != null) { /* parse -> getProductById -> product.set(...) */ }
});
```
Điều hướng bằng code: `this.router.navigate(['/products', id])`, nút quay lại: `this.router.navigate(['products'])`.

### 5.3 SLUG hỗ trợ SEO [Slide] ⭐ (thầy nhấn mạnh, cần có trong đồ án)
**Ý tưởng:** URL thân thiện = tên không dấu + mã định danh, ví dụ `product/iphone-69-pro-max-p1`. Nối thêm `-p{id}` để slug **luôn duy nhất**; chỉ cần tách id ở cuối là truy được chính xác bản ghi.

```ts
// classes/slug-helper.ts  (từ slide)
export function createSlug(name: string, id: number): string {
  const sanitizedName = name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // bỏ dấu tiếng Việt
    .replace(/[^a-z0-9]+/g, '-')                        // ký tự lạ -> '-'
    .replace(/(^-|-$)+/g, '');                          // bỏ '-' đầu/cuối
  return `${sanitizedName}-p${id}`;                     // ten-san-pham-p1
}
export function extractIdFromSlug(slug: string): number | null {
  const match = slug.match(/-p(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
export function getIdentityType(identity: string): 'ID' | 'SLUG_WITH_ID' | 'PURE_SLUG' { /* ... */ }
```
- 3 dạng định danh trong URL: `ID` (`/products/1`), `SLUG_WITH_ID` (`/products/iphone-69-pro-max-p1`), `PURE_SLUG` (chỉ chữ, slide đang trả `id = -1` tức chưa hỗ trợ).
- Cùng một route `products/:id` đọc được cả hai dạng; `ProductDetailComponent` dùng `switch (getIdentityType(...))` để lấy id.
- Tạo link: `this.router.navigate(['/products', createSlug(p.name, p.id)])`.

**[Bổ sung] Hai điều chỉnh khi áp dụng vào AntGo:**
1. **Lỗi chữ "đ" của hàm slide.** Mình đã chạy thử: `createSlug("Bún bò Đường Số 5", 1)` ra `bun-bo-uong-so-5-p1` (sai), `createSlug("Đồ ăn nhanh Dĩ An", 1)` ra `o-an-nhanh-di-an-p1` (sai). Nguyên nhân: "đ" không phải ký tự ghép nên `normalize('NFD')` không tách được. Sửa bằng cách thêm `.replace(/đ/g, 'd')` ngay sau `.toLowerCase()`, khi đó ra `bun-bo-duong-so-5-p1` và `do-an-nhanh-di-an-p1`.
2. **ID của MongoDB là `ObjectId` (24 ký tự hex), không phải số.** Dạng gợi ý: `bun-bo-co-hoa-640b187e71d9faa9039ff97d`, tách bằng `slug.match(/-([a-f0-9]{24})$/)`. Phải kiểm tra chuỗi hợp lệ trước khi `new ObjectId(...)` (xem mục 9.3).
3. Slide dùng `--ssr=false` nên đây là SPA thuần: slug giúp URL dễ đọc và dễ chia sẻ; hiệu quả SEO thật với một số công cụ tìm kiếm vẫn phụ thuộc việc có render phía server hay không (đây là nhận định ngoài slide).

Câu hỏi mở rộng thầy gợi ý (chương VII): *"Xây dựng Slug để hỗ trợ SEO tìm kiếm Fashion"* (tức áp dụng slug lên dữ liệu MongoDB), cùng *tìm kiếm tương đối theo tên / theo mô tả*.

### 5.4 Query Parameters & Filtering [Slide]
- Dạng `?min=299&max=799`; không bắt buộc, nhiều tham số, **giữ được trạng thái lọc khi copy URL/bookmark**.
- Gửi: `router.navigate([], { relativeTo: this.activateRoute, queryParams: { min, max }, queryParamsHandling: 'merge' })`.
- Nhận: `activateRoute.queryParamMap.subscribe(params => { ...filter... })`.

### 5.5 Wildcard 404 & route mặc định [Slide]
- `{ path: '**', component: PageNotFoundComponent }` **phải đặt cuối mảng** (first-match wins; đặt đầu thì mọi URL đều vào Not Found).
- Cần khai báo `{ path: '', component: ... }` cho trang mặc định, nếu không `http://localhost:4200/` sẽ vào 404.

### 5.6 Nested routes [Slide]
Route cha dùng `children: [...]`; component cha phải có `<router-outlet>` riêng để hiển thị con. Dùng cho dashboard/admin/tab.

### 5.7 Lazy Loading [Slide]
- Chỉ tải code khi vào route (tách thành chunk `.js`), giảm thời gian tải đầu và băng thông.
- Điều kiện: component khai báo `standalone: true`; **xóa** khai báo component đó khỏi `app-module.ts` và khỏi `app-routing-module.ts` (nếu không sẽ mất tác dụng lazy).
- Kiểm chứng: mở DevTools → Network, thấy file `chunk-XXXX.js` chỉ tải khi vào route.

### 5.8 Route Guards [Slide]
- Functional guards (Angular ≥ 17): **`CanActivate`** (được vào route?), **`CanDeactivate`** (được rời route? – hỏi "lưu thay đổi không?"), **`CanMatch`** (route lazy có được khớp/tải không?).
- Lợi ích: **bảo mật** (chặn khách vào trang quản trị/cá nhân), ràng buộc quy trình, tránh mất dữ liệu đang nhập.
```ts
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';   // giả lập trong slide
  return isLoggedIn ? true : router.parseUrl('/contacts');
};
// routes: { path: 'lazyinfo', canActivate: [authGuard], ... }
```
> ⚠️ **[Bổ sung]** Slide tự demo cách vượt guard bằng F12: `localStorage.setItem('isLoggedIn','true')`. Vì vậy guard ở client chỉ để **trải nghiệm**; quyền thật phải kiểm tra ở **server** (xem mục 9). Thầy để `CanDeactivate`, `CanMatch` làm bài tự nghiên cứu.

---

## 6. Chương V – Form

### 6.1 Hai cách tiếp cận [Slide]
- **Template-driven**: dựa vào HTML + `ngModel`, hợp form đơn giản. Cần `FormsModule`.
- **Reactive Forms**: định nghĩa trong TS (`FormGroup`/`FormControl`/`FormBuilder`), hợp form phức tạp, dễ unit test. Cần `ReactiveFormsModule`.

### 6.2 Template-driven [Slide]
```html
<form #courseForm="ngForm" (ngSubmit)="onSubmit()">
  <input name="fullName" [(ngModel)]="courseModel.fullName" #name="ngModel" required
         [class.is-invalid]="name.invalid && name.touched">
  <small class="text-danger" *ngIf="name.invalid && name.touched">Bạn chưa nhập tên</small>
  <button type="submit" [disabled]="courseForm.invalid">Submit</button>
</form>
```
- Mỗi input **bắt buộc có `name`** khi dùng `ngModel` trong `<form>`.
- Validator HTML5 có sẵn: `required`, `email`, `minlength`, `maxlength`, `pattern`.
- Trạng thái control (cặp class đối lập): `ng-touched/untouched`, `ng-dirty/pristine`, `ng-valid/invalid`.
- **Quy tắc UX vàng:** chỉ báo lỗi khi người dùng đã chạm vào ô → điều kiện `ctrl.invalid && ctrl.touched`.
- Trạng thái cả form: `valid`, `invalid`, `submitted`. Dùng model hướng đối tượng (`class CourseRegistration`, `class UserLogin`) để binding.

### 6.3 Client-side vs Server-side validation [Slide]
- **Client**: phản hồi tức thì, giảm tải server.
- **Server**: **bắt buộc** để đảm bảo an toàn dữ liệu và chống gian lận (client có thể bị vượt qua).

### 6.4 Reactive Forms [Slide]
```ts
regForm = new FormGroup({
  name: new FormControl('', [Validators.required, Validators.minLength(3), customNameValidator]),
  email: new FormControl('', [Validators.required, Validators.email]),
  password: new FormControl(''),
  confirmPass: new FormControl('')
}, { validators: passwordMatchValidator });   // cross-field validator gắn ở FormGroup
setDefaultValues() { this.regForm.patchValue({ name: '...', email: '...' }); }  // load dữ liệu
onSubmit() { if (this.regForm.valid) { /* gửi this.regForm.value lên server */ } }
```
- **Custom validation**: ví dụ tên không được chứa ký tự đặc biệt `@ ? #`.
- **Cross-field validation** (xác nhận mật khẩu, ngày kết thúc > ngày bắt đầu) phải gắn ở **FormGroup**, lỗi đọc qua `regForm.errors?.['mismatch']`.
- Template: `[formGroup]="regForm"`, `formControlName="..."`, nút submit `[disabled]="regForm.invalid"`.

---

## 7. Chương VI – RESTful API với Node + Express

### 7.1 MVC [Slide]
| Thành phần | Trong môn học |
|---|---|
| Model | Dữ liệu (interface `IBook`, mảng/DB, lệnh truy vấn MongoDB) |
| View | File `.html` của Angular Component |
| Controller | Các hàm callback `app.get/post/put/delete` trong `index.js` của Express |

### 7.2 REST [Slide]
- **Resource** định danh bằng URL (`/books`), **Stateless** (mỗi request tự chứa đủ thông tin), định dạng phổ biến **JSON**.
- CRUD ↔ HTTP: **GET** (đọc), **POST** (tạo), **PUT** (cập nhật), **DELETE** (xóa).

### 7.3 Dựng server (`my-server`, cổng 3000) [Slide]
```bash
npm init
npm install express
npm i --save-dev nodemon morgan     # nodemon tự restart, morgan log request
npm i cors body-parser
# package.json -> "scripts": { "start": "nodemon index.js" }
```
```js
const express = require('express'); const app = express(); const port = 3000;
app.use(require('morgan')('combined'));
app.use(express.static(require('path').join(__dirname, 'public')));  // ảnh: public/images
app.use(require('cors')());
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
```
| API | Mô tả |
|---|---|
| `GET /books` | Danh sách |
| `GET /books/:id` | Một bản ghi (`req.params["id"]`) |
| `GET /books/filter/price?min=250&max=300` | Lọc (`req.query`), trả `400` nếu thiếu tham số |
| `POST /books` | Thêm; ảnh gửi dạng **Base64**, server ghi file vào `public/images` |
| `PUT /books` | Sửa; nếu có ảnh mới thì ghi file mới, không thì giữ ảnh cũ; `404` nếu không thấy |
| `DELETE /books/:id` | Xóa (client có `window.confirm` trước khi gọi) |

### 7.4 Gọi API từ Angular [Slide]
- Tạo `interface IBook`, `BookAPIService` (`getBooks`, `getBook`, `postBook`, `putBook`, `deleteBook`; mỗi hàm có `retry(3)` + `catchError`).
- **CORS**: dùng `src/proxy.conf.json` để chạy dev, và khai báo trong `angular.json` (mục `serve → options → proxyConfig`):
```json
[ { "context": ["/books"], "target": "http://localhost:3000", "secure": true, "changeOrigin": true, "logLevel": "debug" } ]
```
- Upload ảnh phía Angular: `FileReader.readAsDataURL(file)` → lưu vào `book.ImageBase64` → gửi JSON.
- Thứ tự chạy: **server trước, rồi client**. Dùng Postman để test POST/PUT/DELETE.

---

## 8. Chương VII – MongoDB

### 8.1 Lý thuyết [Slide]
- **NoSQL**: Key-Value (Redis, DynamoDB), **Document (MongoDB)**, Wide-column (Cassandra), Graph (Neo4j); ngoài ra Time-series, In-memory, Multi-model. Ưu điểm: scale-out, **schema linh hoạt**, truy xuất nhanh (bỏ JOIN/FK).
- MongoDB lưu **BSON**. Logic: **Database → Collection (≈ table) → Document (≈ row)**. Document chứa được dữ liệu lồng nhau (embed).
- Vật lý: **Replica Set** (1 Primary + 2 Secondary, tự bầu lại khi Primary hỏng); **Sharded Cluster** cho Big Data gồm **Shard Key** (quy tắc chia), **Config Server** (lưu bản đồ dữ liệu), **Mongos** (bộ định tuyến).
- Truy vấn theo Shard Key đi thẳng đúng 1 shard; truy vấn field khác dùng **scatter-gather** (chậm) → cần **index phụ**.

### 8.2 Cài đặt & kết nối [Slide]
- Cài MongoDB Community + **MongoDB Compass**; chuỗi kết nối `mongodb://localhost:27017` (nếu lỗi dùng `127.0.0.1`). Có hướng dẫn MongoDB Atlas (cloud).
- Dữ liệu mẫu: DB `FashionData`, collection `Fashion` (import từ `Fashion.json`).
- Server riêng `my-server-mongodb` cổng **3002**; gói: `express`, `express-fileupload`, `mongodb`, `nodemon`, `morgan`, `body-parser`, `cors`, `mongoose`.
```js
const { MongoClient, ObjectId } = require('mongodb');
client = new MongoClient("mongodb://127.0.0.1:27017");
client.connect();
database = client.db("FashionData");
fashionCollection = database.collection("Fashion");
```

### 8.3 CRUD [Slide]
```js
app.get("/fashions", async (req,res)=> res.send(await fashionCollection.find({}).toArray()));
app.get("/fashions/:id", async (req,res)=>{
  const o_id = new ObjectId(req.params["id"]);
  res.send((await fashionCollection.find({_id:o_id}).toArray())[0]);
});
app.post("/fashions", async (req,res)=>{ await fashionCollection.insertOne(req.body); res.send(req.body); }); // _id tự sinh
app.put("/fashions", async (req,res)=>{
  await fashionCollection.updateOne({_id:new ObjectId(req.body._id)},
    { $set:{ style:req.body.style, fashion_subject:req.body.fashion_subject,
             fashion_detail:req.body.fashion_detail, fashion_image:req.body.fashion_image } });
  /* trả lại bản ghi sau khi sửa */
});
app.delete("/fashions/:id", async (req,res)=>{ /* tìm -> deleteOne({_id:o_id}) -> trả bản ghi vừa xóa */ });
```
- Angular: `class Fashion` có `_id`, `getBase64String()`; ảnh lưu trực tiếp trong Mongo dưới dạng **chuỗi Base64**; khôi phục object bằng `Object.assign(new Fashion(), data)`.
- Chỉnh `proxy.conf.json` thêm `"/fashions"` → `http://localhost:3002`.

---

## 9. Chương VIII – Cookie & Session, và **tổng hợp Bảo mật** ⭐

### 9.1 Cookie [Slide]
- HTTP là **stateless** nên cần Cookie/Session làm "bộ nhớ" nhận diện người dùng. Cookie (theo RFC 6265) là file text nhỏ do server tạo, lưu ở trình duyệt.
- Cơ chế: (1) server gửi header `Set-Cookie: name=value; ...` → (2) trình duyệt lưu → (3) các request sau cùng domain trình duyệt **tự gửi** header `Cookie`.
- Thuộc tính:

| Thuộc tính | Ý nghĩa | Liên quan bảo mật |
|---|---|---|
| `Expires` / `Max-Age` | Vòng đời. Không có = *session cookie* (mất khi đóng trình duyệt); có = *persistent cookie* | |
| `Domain`, `Path` | Phạm vi được gửi | Thu hẹp phạm vi |
| **`Secure`** | Chỉ gửi qua HTTPS | Chống nghe lén |
| **`HttpOnly`** | JavaScript không đọc được cookie | **Giảm rủi ro XSS** đánh cắp cookie |
| **`SameSite`** (`Strict`/`Lax`/`None`) | Kiểm soát gửi cookie ở request cross-site | **Chống CSRF** |

- Phân loại: **First-party** (do trang đang truy cập tạo: đăng nhập, giỏ hàng, giao diện) vs **Third-party** (do domain khác qua script nhúng, dùng để theo dõi hành vi).
- Ứng dụng: quản lý phiên (lưu Session ID), cá nhân hóa (ngôn ngữ, dark/light), tracking.
- Giới hạn: ~4KB/cookie, ~20–50 cookie/domain, **dễ bị can thiệp/đánh cắp nếu không đặt `HttpOnly`, `Secure`**.

**Triển khai "ghi nhớ đăng nhập" trong slide:**
- Server: `npm install cookie-parser`, `app.use(cookieParser())`; CORS phải mở credentials:
```js
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
```
- API `POST /user-login`: tìm user trong collection `User`, nếu đúng và `rememberMe` thì `res.cookie('remember_user', username, { maxAge: 30*24*60*60*1000, httpOnly: false, secure: false, sameSite: 'Lax' })`; sai trả `401`.
- Angular: `ngx-cookie-service`; `AuthService.login()` gọi `http.post('/user-login', body, { withCredentials: true })`, lưu `currentUser = signal(...)`; nếu `rememberMe` thì `cookieService.set('remember_user', username, 30, '/')`, không thì `delete`. `LoginAuthComponent.ngOnInit` đọc cookie để điền sẵn ô tài khoản.
- **Mở rộng thầy giao:** chưa đăng nhập mà vào `fashion-new`, `fashion-update`, `fashion-delete` thì chuyển về `login-auth`; đăng nhập xong mới được NEW/UPDATE/DELETE; **bổ sung lưu mật khẩu nhưng cần mã hóa**.

### 9.2 Session [Slide]
- Session lưu dữ liệu **ở server**, client chỉ giữ **Session ID** trong cookie (`connect.sid`). Quy trình: tạo Session ID → gửi qua cookie → client gửi lại mỗi request → server tra dữ liệu.
- Express: `npm install express-session`
```js
const session = require('express-session');
app.use(session({ secret: 'fashion-store-secret', resave: false, saveUninitialized: true, cookie: { maxAge: 3600000 } })); // 1 giờ
```
- API: `req.session.key = value` (ghi), đọc trực tiếp, `delete req.session.key`; điều khiển: `destroy(cb)` (đăng xuất), `save(cb)`, **`regenerate(cb)` (tạo Session ID mới, chống Session Fixation khi đăng nhập)**, `reload(cb)`; `req.session.cookie.maxAge/expires`, `req.session.id`.
- Đăng xuất: `req.session.destroy(...)` rồi `res.clearCookie('connect.sid')`.
- So sánh:

| | Cookie | Session |
|---|---|---|
| Nơi lưu | Trình duyệt | Server |
| Bảo mật | Thấp (dễ bị can thiệp) | Cao (client không thấy dữ liệu) |
| Dung lượng | ~4KB | Rất lớn (tùy RAM) |
| Hiệu năng | Không tốn tài nguyên server | Tốn RAM server |

- **Kịch bản giỏ hàng [Slide]:** khách chưa đăng nhập chọn sản phẩm → lưu tạm `req.session.cart` (`POST /cart/add`, `GET /cart`) → khi bấm **Thanh toán** và đã đăng nhập (`401` nếu chưa) → ghi đơn vào MongoDB collection `Orders` (`{ userId, items, totalStatus:'Pending', createdAt }`) → xóa `req.session.cart = []`. Quy tắc: **dữ liệu tạm** (RAM, mất khi hết phiên) vs **dữ liệu bền** (MongoDB).

### 9.3 Checklist bảo mật cho đồ án

**Những gì slide dạy (nên thể hiện được khi vấn đáp):**
- [x] Cookie flags `HttpOnly`, `Secure`, `SameSite` và lý do (XSS, nghe lén, CSRF).
- [x] Dùng **Session** cho dữ liệu nhạy cảm; cookie chỉ giữ Session ID.
- [x] `regenerate()` khi đăng nhập (chống Session Fixation), `destroy()` + `clearCookie` khi đăng xuất.
- [x] Guard (`CanActivate`...) để chặn route; trả `401` khi chưa đăng nhập.
- [x] **Validate cả client lẫn server**; server là bắt buộc.
- [x] CORS giới hạn `origin` + `credentials: true`, client dùng `withCredentials: true`.
- [x] Mật khẩu "cần mã hóa" (thầy nêu ở phần mở rộng).
- [x] Property/Interpolation binding của Angular gán vào property DOM (an toàn hơn thao tác DOM thủ công).

**[Bổ sung] Điểm yếu trong code demo của thầy, KHÔNG copy nguyên vào đồ án, và cách làm đúng:**

| Code demo trong slide | Vấn đề | Nên làm trong AntGo |
|---|---|---|
| `findOne({ username, password: req.body.password })` | Mật khẩu lưu và so sánh **dạng thường**; nhận nguyên object từ body nên có thể bị **NoSQL injection** (gửi `{"$ne":null}`) | Băm mật khẩu bằng `bcrypt`/`argon2`; ép `username`, `password` về **string** trước khi truy vấn |
| `res.cookie('remember_user', ..., { httpOnly: false, secure: false })` | Cookie đọc được bằng JS, chạy HTTP; lưu username và tin vào cookie gửi lên | Với đăng nhập thật dùng cookie session `httpOnly: true`, `secure: true` (khi có HTTPS), `sameSite`. Chỉ giữ "nhớ tên đăng nhập" bằng cookie thường, không dùng nó để xác thực |
| `secret: 'fashion-store-secret'` viết cứng, `saveUninitialized: true` | Secret lộ trong repo; tạo session cho cả khách vô danh | Lấy secret từ biến môi trường (`.env`, không commit); cân nhắc `saveUninitialized: false`; khai báo rõ `cookie: { httpOnly, secure, sameSite, maxAge }`. Dùng session store thật (ví dụ lưu vào MongoDB) thay vì RAM mặc định khi triển khai |
| `POST /api/login` luôn "giả định thành công", gán `role: 'admin'` | Ai cũng thành admin | Xác thực thật rồi mới tạo session; gọi `req.session.regenerate()` trước khi gán `req.session.user`; **không** để client quyết định `role` |
| `POST/PUT/DELETE /books`, `/fashions` không kiểm tra đăng nhập | Ai biết URL cũng sửa/xóa được dữ liệu | Middleware kiểm tra `req.session.user` (và vai trò/chủ sở hữu) cho mọi thao tác ghi |
| Guard chỉ đọc `localStorage.isLoggedIn` | Tự set được bằng F12 (chính slide demo) | Guard hỏi server (ví dụ `GET /api/profile` trả 401 hay 200); quyền thật nằm ở server |
| `app.use(cors())` mở mọi origin (chương VI–VII) | Bất kỳ site nào cũng gọi được API | Giới hạn `origin: 'http://localhost:4200'` (và domain triển khai) kèm `credentials: true` |
| `new ObjectId(req.params.id)` | Id sai định dạng → ném lỗi, server trả 500 | Kiểm tra bằng `ObjectId.isValid(id)` và trả `400`/`404` |
| `PUT` ghi `req.body` trực tiếp | Client ghi đè trường không được phép | Chỉ lấy danh sách trường cho phép (whitelist), validate kiểu và độ dài |
| Upload ảnh: tên file từ `BookId` do client gửi, `limit: '50mb'` | Có thể ghi file ra ngoài thư mục (path traversal) và đẩy payload quá lớn | Tự sinh tên file ở server, kiểm tra loại file (png/jpg) và kích thước tối đa, hạ `limit` xuống mức hợp lý |
| `checkout` dùng `req.session.user.id` nhưng lúc login không gán `id` | Lỗi logic, đơn không gắn đúng người | Gán `_id` người dùng vào session khi đăng nhập, lấy từ DB chứ không từ client |
| Trả `err.message` thô cho client | Lộ chi tiết nội bộ | Log chi tiết ở server (morgan/log), trả thông báo chung cho client |

**[Bổ sung] Lưu ý khi dùng Angular:** tránh `[innerHTML]` với dữ liệu người dùng nhập; không dùng `bypassSecurityTrust*` trừ khi thật sự cần; nội dung bài đăng, tin nhắn, mô tả từ người dùng luôn coi là không tin cậy.

---

## 10. Áp dụng vào AntGo (gợi ý, chưa chốt)

Repo hiện chỉ mới có mockup + tài liệu; `client/` và `server/` đều "chưa khởi tạo". Bảng dưới là gợi ý ánh xạ, để nhóm tự quyết định:

| Kỹ thuật môn học | Gợi ý đặt ở đâu trong AntGo |
|---|---|
| Khởi tạo | `client/`: `ng new ... --no-standalone --routing --ssr=false` (nếu muốn bám đúng môn). `server/`: Express + `mongodb`, cổng riêng, `nodemon` + `morgan` |
| Service + `catchError`/`retry` | Mỗi nhóm tài nguyên (bài đăng, đơn, tin nhắn, người dùng) một service riêng |
| **Slug + `:id`** | Trang chi tiết bài đăng/gian hàng/việc: `/posts/:slugWithId`, dạng `ten-bai-dang-<ObjectId>`; dùng `createSlug` đã sửa chữ "đ" |
| Query params | Trang tìm kiếm/lọc (danh mục, khoảng giá, khu vực) để chia sẻ được URL đã lọc |
| Wildcard 404 + route `''` | Đặt cuối cùng; trang mặc định theo quy tắc mở app (lần đầu vào "Tìm và chọn") |
| Nested routes | Layout của hai không gian "Tìm và chọn" / "Đăng và quản lý" (mỗi không gian có bottom nav riêng) |
| Lazy loading | Tách không gian "Đăng và quản lý" và các trang ít dùng thành chunk riêng |
| Guard | `CanActivate` cho không gian "Đăng và quản lý", đơn hàng, tin nhắn; `CanDeactivate` cho form đang nhập dở (khớp yêu cầu "cảnh báo khi có nguy cơ mất dữ liệu form" trong tài liệu dự án) |
| Form | Đăng ký/đăng nhập (Reactive + cross-field xác nhận mật khẩu), form đăng bài/đặt đơn |
| Session | Giỏ/nháp đơn tạm, phiên đăng nhập |
| Cookie | Ghi nhớ tên đăng nhập, ngôn ngữ/giao diện |
| MongoDB | `users`, `posts`, `orders`, `messages`... (theo ERD nhóm sẽ làm ở `docs/thiet-ke/`) |

---

## 11. Tra cứu nhanh

**Cổng và công cụ:** Angular `4200` · `my-server` `3000` · `my-server-mongodb` `3002` · MongoDB `27017` · test API bằng Postman · xem DB bằng Compass.

**Thư viện đã dùng trong môn:**
- Server: `express`, `cors`, `body-parser`, `morgan`, `nodemon`, `mongodb`, `mongoose`, `express-fileupload`, `cookie-parser`, `express-session`.
- Client: `bootstrap`, `jquery` (cấu hình trong `angular.json`), `ngx-cookie-service`.

**Mẫu `proxy.conf.json` (client):** mỗi nhóm đường dẫn API cần một mục `context` → `target`; sau đó chạy lại `ng serve`.

**Bài mở rộng thầy gợi ý (nên cân nhắc đưa vào đồ án):**
- Tìm kiếm tương đối theo tên / theo mô tả; slug cho dữ liệu MongoDB (VII).
- `CanDeactivate`, `CanMatch` (IV).
- Chặn `fashion-new/update/delete` khi chưa đăng nhập; mã hóa mật khẩu (VIII).
- Thảo luận `track p` và `track p.id` (VI); đổi `book = new Book()` thành `signal<Book|null>(null)` thì xử lý thế nào (VI).
- Hiểu `Router` vs `ActivatedRoute`; bật `FormsModule`/`ReactiveFormsModule` đúng chỗ.
