import { OptionGroup, PayMethod, Post, PostItem, PostKind, PostQuestion, PriceType } from '../../../core/models/post';
import { PostBody } from '../../../core/services/seller';
import { BANK_LIST } from './banks';
import { FormType, SVC_PRESETS } from './post-form-config';

/**
 * HÀM DUY NHẤT biến dữ liệu form đăng bài (khu Bán) thành `Post` đủ 7 khối (docs/post-contract.md).
 * Phía Mua chỉ đọc kết quả này; thêm trường vào Post thì thêm ở ĐÂY, không rải ở nơi khác.
 * Không đụng tới Giờ vàng / khung giờ nhận đơn / combo — form vẫn tự tính (promoOf, windowOf).
 */
type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type PostFields = Pick<
  PostBody,
  | 'category' | 'priceType' | 'estimate' | 'inspectFee' | 'items' | 'optionGroups' | 'questions' | 'fulfillmentModes' | 'deliveryFee'
  | 'needSchedule' | 'payMethods' | 'bank' | 'quickOptions' | 'noteEnabled' | 'highlights' | 'pickupAtBuyer' | 'template' | 'freeShipFrom' | 'info' | 'prepMinutes' | 'handover' | 'orderWindow' | 'condition' | 'serviceInfo' | 'dates' | 'timeMode' | 'duration' | 'repeat' | 'place' | 'stock' | 'job'
>;

/** "A, B|+5.000đ" không dùng nữa: form lưu lựa chọn là chuỗi cách nhau dấu phẩy */
const splitOpts = (s: unknown): string[] => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

const optionsOf = (arr: unknown): OptionGroup[] =>
  ((arr as V[]) ?? [])
    .filter((g) => String(g['name'] ?? '').trim() && ((g['choices'] as V[]) ?? []).some((c) => String(c['label'] ?? '').trim()))
    .map((g) => ({
      name: String(g['name']).trim(),
      multi: !!g['multi'],
      required: !!g['required'],
      choices: (g['choices'] as V[]).filter((c) => String(c['label'] ?? '').trim()).map((c) => ({ label: String(c['label']).trim(), price: +c['price'] || 0 })),
    }));

const itemsOf = (s: V): PostItem[] =>
  ((s['items'] as V[]) ?? [])
    .filter((it) => String(it['name'] ?? '').trim() && +it['price'] > 0)
    .map((it, i) => ({
      id: 'i' + (i + 1),
      name: String(it['name']).trim(),
      price: +it['price'],
      unit: it['unit'] || undefined,
      dailyQty: +it['qty'] > 0 ? +it['qty'] : undefined,
      optionGroups: optionsOf(it['options']),
    }))
    .map((it) => (it.optionGroups?.length ? it : { ...it, optionGroups: undefined }));

/** Lựa chọn của câu hỏi: form chung lưu `choices` (có thể có giá, ghi "Tên|+5.000đ"), mẫu dịch vụ khác lưu chuỗi cách nhau dấu phẩy */
const choicesOf = (q: V): string[] => {
  const list = ((q['choices'] as V[]) ?? []).filter((c) => String(c['label'] ?? '').trim());
  if (!list.length) return splitOpts(q['opts']);
  return list.map((c) => String(c['label']).trim() + (+c['price'] > 0 ? `|+${(+c['price']).toLocaleString('vi-VN')}đ` : ''));
};

const questionsOf = (arr: unknown): PostQuestion[] =>
  ((arr as V[]) ?? [])
    .filter((q) => String(q['label'] ?? '').trim())
    .map((q) => {
      // phía Mua có 4 loại câu hỏi; các kiểu riêng của form chung (đoạn dài, số, ngày, địa chỉ…) hiện thành ô chữ
      const raw = String(q['type'] ?? 'text');
      const type: PostQuestion['type'] = raw === 'choice' || raw === 'multi' || raw === 'photo' ? raw : 'text';
      const label = String(q['label']).trim();
      const hint = String(q['hint'] ?? '').trim();
      return {
        type, label, required: !!q['required'],
        ...(type === 'choice' || type === 'multi' ? { opts: choicesOf(q) } : {}),
        ...(raw === 'long' ? { long: true } : {}),
        ...(hint ? { hint } : {}),
        // câu "Cần trả tiền giùm?": chọn "Có" thì hỏi thêm số tiền (khung đặt phía Mua)
        ...(/trả tiền giùm/i.test(label) ? { pay: true } : {}),
      };
    });

/** Việc làm: `pay` là số tiền công, không phải danh sách cách trả tiền */
const payOf = (s: V): PayMethod[] => (Array.isArray(s['pay']) ? (s['pay'] as PayMethod[]) : []).filter((m) => m === 'cash' || m === 'transfer' || m === 'xu');

/** Tài khoản nhận tiền, chỉ gửi khi bài nhận chuyển khoản. Form lưu mã ngân hàng, phía Mua hiện tên ngắn */
const bankOf = (s: V): PostFields['bank'] => {
  const b = s['bank'] as V | undefined;
  if (!payOf(s).includes('transfer') || !String(b?.['no'] ?? '').trim()) return undefined;
  const code = String(b?.['name'] ?? '');
  return { bankName: BANK_LIST.find((x) => x.code === code)?.short ?? code, no: String(b?.['no']).trim(), holder: String(b?.['holder'] ?? '').trim(), qr: (b?.['qr'] as string) || undefined };
};

const fulfilOf = (s: V): Pick<PostFields, 'fulfillmentModes' | 'deliveryFee' | 'freeShipFrom'> => {
  const f = (s['fulfil'] as V) ?? {};
  const modes = [...(f['delivery'] ? ['delivery' as const] : []), ...(f['pickup'] ? ['pickup' as const] : [])];
  return { fulfillmentModes: modes, deliveryFee: f['delivery'] ? +f['fee'] || 0 : 0, freeShipFrom: f['delivery'] && +f['fee'] > 0 && +f['freeFrom'] > 0 ? +f['freeFrom'] : undefined };
};

/** Size (bắt buộc chọn, có giá cộng thêm), độ ngọt, đá của đồ uống thành các nhóm chọn một, không tính tiền, không bắt buộc (bỏ hết = không cho chọn) */
const drinkMixOf = (s: V): OptionGroup[] => {
  const sizes = ((s['sizes'] as V[]) ?? []).filter((z) => String(z['label'] ?? '').trim()).map((z) => ({ label: String(z['label']).trim(), price: +z['price'] || 0 }));
  const size: OptionGroup[] = sizes.length ? [{ name: 'Size', multi: false, required: true, choices: sizes }] : [];
  const group = (name: string, list: unknown): OptionGroup[] => ((list as string[]) ?? []).length ? [{ name, multi: false, required: false, choices: (list as string[]).map((label) => ({ label, price: 0 })) }] : [];
  return [...size, ...group('Độ ngọt', s['sweet']), ...group('Đá', s['ice'])];
};

const row = (label: string, value: unknown): { label: string; value: string }[] => {
  const v = String(value ?? '').trim();
  return v ? [{ label, value: v }] : [];
};

/** Thông tin dịch vụ người bán đã điền mà khung đặt không có ô riêng: hiện dưới Mô tả */
function serviceInfoRows(s: V): { label: string; value: string }[] {
  const preset = String(s['preset'] ?? '');
  // mục bị ẩn trong form của mẫu này thì không đưa giá trị mặc định của nó sang bên Mua
  const shown = SVC_PRESETS[preset] ?? SVC_PRESETS['Khác'];
  const on = ((s['rules'] as V[]) ?? []).filter((r) => r['on'] && String(r['label'] ?? '').trim()).map((r) => String(r['label']).trim());
  const f = (s['fulfil'] as V) ?? {};
  return [
    ...(shown?.noQuick ? [] : row('Phạm vi phục vụ', s['serviceArea'])),
    // các thông tin trước đây ở 3 ô đầu bài: chuyển xuống đây để không mất
    ...(shown?.generic ? [...row('Thời gian làm dự kiến', s['turnaround']), ...row('Bảo hành', s['warranty'])] : []),
    ...(s['priceType'] === 'quote' ? row('Phí kiểm tra', +s['inspect'] ? `${(+s['inspect']).toLocaleString('vi-VN')}đ, trừ vào tiền làm nếu bạn đồng ý giá` : 'Miễn phí') : []),
    ...(preset === 'Giặt sấy'
      ? [...row('Trả đồ', +s['returnHours'] ? `Trong khoảng ${+s['returnHours']} giờ` : ''), ...row('Cách trả đồ', [f['delivery'] ? 'Giao tận nơi' : '', f['pickup'] ? 'Tự đến lấy' : ''].filter(Boolean).join(', '))]
      : []),
    ...(preset === 'Lưu trú'
      ? [
          ...row('Trả phòng trước', s['checkOut']),
          ...row('Ở tối thiểu', +s['minNights'] ? `${+s['minNights']} đêm` : ''),
          ...row('Tiện nghi', ((s['amenities'] as string[]) ?? []).join(', ')),
          ...row('Nội quy', on.join('; ')),
          ...row('Hủy miễn phí', s['freeCancelDays'] !== null && s['freeCancelDays'] !== '' ? `Trước ${+s['freeCancelDays']} ngày` : ''),
          ...row('Đặt cọc', +s['deposit'] ? `${+s['deposit']}%` : ''),
          ...row('Giấy tờ', s['idRequired'] ? 'Xuất trình CCCD khi nhận phòng' : ''),
        ]
      : []),
    ...row('Điều kiện hủy', s['cancelPolicy']),
    ...row('Lưu ý cho khách', s['customerNote']),
  ];
}

/** 3 ô đầu bài của giặt sấy, lưu trú (các mẫu không có mục Thông tin nhanh và Nơi làm trong form); mẫu khác thì không có */
function serviceHighlights(s: V): Post['highlights'] {
  const preset = String(s['preset'] ?? '');
  const cell = (icon: NonNullable<Post['highlights']>[number]['icon'], label: string, value: unknown) => (String(value ?? '').trim() ? [{ icon, label, value: String(value).trim() }] : []);
  const where = String(s['where'] ?? '').trim();
  const place =
    preset === 'Giặt sấy' ? 'Lấy đồ tại nhà bạn'
    : preset === 'Lưu trú' ? String(s['building'] ?? '').trim() || 'Tại chỗ người cho thuê'
    : preset === 'Sửa chữa' ? 'Tại nhà bạn'
    : ({ buyer: 'Tại nhà bạn', seller: where || 'Bạn mang tới', choice: 'Tại nhà bạn hoặc bạn mang tới', ab: 'Lấy ở A, giao tới B' } as V)[String(s['place'])];
  const pays = payOf(s).map((m) => ({ cash: 'Tiền mặt', transfer: 'Chuyển khoản', xu: 'AntXu' })[m]).join(', ');
  return [
    ...cell('clock', 'Giờ nhận lịch', preset === 'Lưu trú' ? (s['checkIn'] ? `Nhận phòng từ ${s['checkIn']}` : '') : s['from'] && s['to'] ? `${s['from']} – ${s['to']}` : ''),
    ...cell('pin', 'Nơi làm', place),
    ...cell('receipt', 'Thanh toán', pays),
  ];
}

/** Giá đại diện: dòng rẻ nhất; nhiều mức giá khác nhau → 'from' */
const priceTypeOf = (its: PostItem[], fixed: PriceType = 'fixed'): PriceType =>
  new Set(its.map((i) => i.price)).size > 1 ? 'from' : fixed;

/** Khung giờ người nhận việc được chọn: giờ chính rồi các khung khác. Không cố định giờ thì rỗng (bên Mua hiện Sáng, Chiều, Tối) */
export function jobWindows(s: V): string[] {
  if (s['allDay'] || !s['from']) return [];
  const main = s['to'] ? `${s['from']} – ${s['to']}` : String(s['from']);
  const others = ((s['altWindows'] as V[]) ?? []).filter((w) => w?.['from'] && w?.['to']).map((w) => `${w['from']} – ${w['to']}`);
  return [...new Set([main, ...others])];
}

export function formToPostFields(type: FormType, raw: V, kind: PostKind, jobDue = ''): PostFields {
  const c = (raw['common'] as V) ?? {};
  const s = (raw['spec'] as V) ?? {};
  const base = { category: c['category'] as string, payMethods: payOf(s), bank: bankOf(s) };

  switch (type) {
    case 'food':
    case 'drink': {
      const items = itemsOf(s);
      const sc = (s['schedule'] as V) ?? {};
      const day = items.reduce((n, i) => n + (i.dailyQty ?? 0), 0);
      const unlimited = items.some((i) => !i.dailyQty);
      return {
        ...base, ...fulfilOf(s),
        priceType: priceTypeOf(items),
        // món thêm dùng chung (spec.options) luôn ở cấp bài. Một món: tùy chọn của món gộp lên cấp bài; nhiều món: ở từng món
        items: items.length > 1 ? items : undefined,
        optionGroups: [...(type === 'drink' ? drinkMixOf(s) : []), ...(items.length === 1 ? (items[0]?.optionGroups ?? []) : []), ...optionsOf(s['options'])],
        quickOptions: ((s['quick'] as V[]) ?? []).filter((q) => q['on'] && String(q['label'] ?? '').trim()).map((q) => String(q['label']).trim()),
        noteEnabled: !!s['kitchenNote'],
        template: type === 'drink' ? 'drink' : undefined,
        dates: (sc['dates'] as string[]) ?? [],
        // "Nhận đặt từ … Đóng đơn lúc …" của Lịch bán = khung giờ nhận đơn của bài (khách ngoài giờ này không đặt được)
        orderWindow: sc['orderFrom'] && sc['orderTo'] && sc['orderFrom'] !== sc['orderTo'] ? { from: sc['orderFrom'], to: sc['orderTo'], days: [] } : undefined,
        prepMinutes: +sc['prep'] > 0 ? +sc['prep'] : undefined,
        handover: sc['pickFrom'] && sc['pickTo'] ? { from: sc['pickFrom'], to: sc['pickTo'] } : undefined,
        stock: unlimited || !day ? { mode: 'open' } : { mode: 'limit', left: day },
        needSchedule: false,
      };
    }
    case 'goods': {
      const n = +s['stock'] || 1;
      return {
        ...base, ...fulfilOf(s),
        priceType: 'fixed',
        condition: { level: String(s['condition'] ?? '90'), note: String(s['flaw'] ?? '').trim() || undefined },
        optionGroups: [],
        questions: [],
        dates: (s['dates'] as string[]) ?? [],
        stock: n > 1 ? { mode: 'limit', left: n } : { mode: 'once' },
        needSchedule: !!((s['fulfil'] as V)?.['pickup']),
        handover: s['pickFrom'] && s['pickTo'] ? { from: s['pickFrom'], to: s['pickTo'] } : undefined,
        noteEnabled: !!s['kitchenNote'],
        info: row('Tình trạng chi tiết', s['flaw']),
      };
    }
    case 'service': {
      const its = itemsOf(s);
      const quote = s['priceType'] === 'quote';
      const where = String(s['where'] ?? '').trim();
      // mẫu đã bỏ (Nấu ăn) hoặc không ghi mẫu: coi như mẫu Khác
      const shown = SVC_PRESETS[String(s['preset'] ?? '')] ?? SVC_PRESETS['Khác'];
      const hideQuick = !!shown?.noQuick && !shown.generic;
      return {
        ...base,
        priceType: quote ? 'quote' : priceTypeOf(its, its.length === 1 && s['estimate'] ? 'unit' : 'fixed'),
        estimate: !!s['estimate'] || undefined,
        inspectFee: quote ? +s['inspect'] || 0 : undefined,
        items: its.length > 1 || quote ? its : undefined,
        optionGroups: optionsOf(s['options']),
        questions: questionsOf(s['questions']),
        dates: (s['dates'] as string[]) ?? [],
        timeMode: s['timeMode'],
        duration: { min: +s['durMin'] || 1, max: +s['durMax'] || 1 },
        repeat: !!s['repeat'],
        // mẫu không có mục Nơi làm (sửa chữa, giặt sấy, lưu trú): nơi làm theo mẫu, không lấy giá trị cũ còn lưu trong form
        place: { mode: shown?.noPlace ? shown.place : s['place'], ...(where && !shown?.noPlace ? { where } : {}) },
        // khung giờ khách chọn hẹn (giờ nhận lịch của người làm)
        handover: s['from'] && s['to'] ? { from: s['from'], to: s['to'] } : undefined,
        // mẫu không có mục Thông tin nhanh thì không gửi giá trị đã lưu của mục đó (mẫu Khác có ô riêng cho thời gian, bảo hành)
        serviceInfo: { turnaround: hideQuick ? undefined : String(s['turnaround'] ?? '').trim() || undefined, warranty: hideQuick ? undefined : String(s['warranty'] ?? '').trim() || undefined, area: SVC_PRESETS[String(s['preset'] ?? '')]?.noQuick ? undefined : String(s['serviceArea'] ?? '').trim() || undefined },
        highlights: serviceHighlights(s),
        // giặt sấy chọn cách nhận như đồ ăn, đồ dùng; dịch vụ khác tính phụ phí đến nhà
        ...(s['preset'] === 'Giặt sấy' ? { ...fulfilOf(s), pickupAtBuyer: true } : { deliveryFee: !shown?.noPlace && (s['place'] === 'buyer' || s['place'] === 'choice') ? +s['homeFee'] || 0 : 0 }),
        noteEnabled: !!s['kitchenNote'],
        info: serviceInfoRows(s),
        stock: { mode: 'open' },
        needSchedule: true,
      };
    }
    default: {
      // việc làm: ngày + giờ làm, số người, đơn vị tiền công. Địa chỉ chính xác KHÔNG đưa vào Post (chỉ gửi cho người được chọn).
      const dates = [...((s['dates'] as string[]) ?? [])].sort();
      const at = (d: string, t: string) => `${d}T${t || '00:00'}:00`;
      return {
        category: base.category,
        priceType: 'fixed',
        dates,
        job: {
          start: dates[0] ? at(dates[0], s['allDay'] ? '' : s['from']) : undefined,
          end: dates.length > 1 || (dates[0] && !s['allDay'] && s['to']) ? at(dates[dates.length - 1], s['allDay'] ? '' : s['to'] || s['from']) : undefined,
          allDay: !!s['allDay'],
          head: +s['head'] || 1,
          payUnit: s['payUnit'] || 'việc',
          payBy: s['payBy'] === 'transfer' ? 'transfer' : 'cash',
          building: String(s['building'] ?? '').trim() || undefined,
          windows: jobWindows(s),
          due: jobDue,
        },
      };
    }
  }
}
