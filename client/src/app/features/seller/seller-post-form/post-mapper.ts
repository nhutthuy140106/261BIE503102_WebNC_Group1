import { OptionGroup, PayMethod, PostItem, PostKind, PostQuestion, PriceType } from '../../../core/models/post';
import { PostBody } from '../../../core/services/seller';
import { FormType } from './post-form-config';

/**
 * HÀM DUY NHẤT biến dữ liệu form đăng bài (khu Bán) thành `Post` đủ 7 khối (docs/post-contract.md).
 * Phía Mua chỉ đọc kết quả này; thêm trường vào Post thì thêm ở ĐÂY, không rải ở nơi khác.
 * Không đụng tới Giờ vàng / khung giờ nhận đơn / combo — form vẫn tự tính (promoOf, windowOf).
 */
type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type PostFields = Pick<
  PostBody,
  | 'category' | 'priceType' | 'estimate' | 'inspectFee' | 'items' | 'optionGroups' | 'questions' | 'fulfillmentModes' | 'deliveryFee'
  | 'needSchedule' | 'payMethods' | 'prepMinutes' | 'handover' | 'orderWindow' | 'condition' | 'serviceInfo' | 'dates' | 'timeMode' | 'duration' | 'repeat' | 'place' | 'stock' | 'job'
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

const questionsOf = (arr: unknown): PostQuestion[] =>
  ((arr as V[]) ?? [])
    .filter((q) => String(q['label'] ?? '').trim())
    .map((q) => {
      const type = (q['type'] as PostQuestion['type']) ?? 'text';
      const label = String(q['label']).trim();
      return {
        type, label, required: !!q['required'],
        ...(type === 'choice' || type === 'multi' ? { opts: splitOpts(q['opts']) } : {}),
        // câu "Cần trả tiền giùm?": chọn "Có" thì hỏi thêm số tiền (khung đặt phía Mua)
        ...(/trả tiền giùm/i.test(label) ? { pay: true } : {}),
      };
    });

const payOf = (s: V): PayMethod[] => ((s['pay'] as PayMethod[]) ?? []).filter((m) => m === 'cash' || m === 'transfer' || m === 'xu');

const fulfilOf = (s: V): Pick<PostFields, 'fulfillmentModes' | 'deliveryFee'> => {
  const f = (s['fulfil'] as V) ?? {};
  const modes = [...(f['delivery'] ? ['delivery' as const] : []), ...(f['pickup'] ? ['pickup' as const] : [])];
  return { fulfillmentModes: modes, deliveryFee: f['delivery'] ? +f['fee'] || 0 : 0 };
};

/** Giá đại diện: dòng rẻ nhất; nhiều mức giá khác nhau → 'from' */
const priceTypeOf = (its: PostItem[], fixed: PriceType = 'fixed'): PriceType =>
  new Set(its.map((i) => i.price)).size > 1 ? 'from' : fixed;

export function formToPostFields(type: FormType, raw: V, kind: PostKind, jobDue = ''): PostFields {
  const c = (raw['common'] as V) ?? {};
  const s = (raw['spec'] as V) ?? {};
  const base = { category: c['category'] as string, payMethods: payOf(s) };

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
        optionGroups: [...optionsOf(s['options']), ...(items.length === 1 ? (items[0]?.optionGroups ?? []) : [])],
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
      };
    }
    case 'service': {
      const its = itemsOf(s);
      const quote = s['priceType'] === 'quote';
      const where = String(s['where'] ?? '').trim();
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
        place: { mode: s['place'], ...(where ? { where } : {}) },
        // khung giờ khách chọn hẹn (giờ nhận lịch của người làm)
        handover: s['from'] && s['to'] ? { from: s['from'], to: s['to'] } : undefined,
        serviceInfo: { turnaround: String(s['turnaround'] ?? '').trim() || undefined, warranty: String(s['warranty'] ?? '').trim() || undefined, area: String(s['serviceArea'] ?? '').trim() || undefined },
        deliveryFee: s['place'] === 'buyer' || s['place'] === 'choice' ? +s['homeFee'] || 0 : 0,
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
          end: dates.length > 1 ? at(dates[dates.length - 1], s['allDay'] ? '' : s['to'] || s['from']) : undefined,
          allDay: !!s['allDay'],
          head: +s['head'] || 1,
          payUnit: s['payUnit'] || 'việc',
          due: jobDue,
        },
      };
    }
  }
}
