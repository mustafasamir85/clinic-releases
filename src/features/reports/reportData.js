import { LOW_STOCK_THRESHOLD } from '../../constants';
import { invoiceCopay, invoiceItems, patientDue } from '../../hooks/useInvoices';
import { freeEntries } from '../freeServices/freeUtils';
import { formatUser, getFileNumber } from '../../utils/format';

const round2 = (n) => Math.round(n * 100) / 100;
const sum = (list, fn) => round2(list.reduce((t, x) => t + (Number(fn(x)) || 0), 0));

// التواريخ بصيغة YYYY-MM-DD فالمقارنة النصية صحيحة. الفراغ = بلا حد.
export const inRange = (date, from, to) => Boolean(date) && (!from || date >= from) && (!to || date <= to);

// فترة أطول من شهر ونصف تُجمَّع شهرياً حتى تبقى الرسوم مقروءة في التقارير.
export function periodBucket(date, from, to) {
  if (!date) return '';
  const start = from || date;
  const end = to || date;
  const days = Math.abs((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000);
  return days > 45 ? date.slice(0, 7) : date;
}

// تجميع عناصر حسب مفتاح: يعيد مصفوفة { key, ...قيم } من الأكبر للأصغر حسب sortBy
function groupBy(list, keyFn, init, add, sortBy) {
  const map = new Map();
  list.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, { key, ...init() });
    add(map.get(key), item);
  });
  return [...map.values()].sort((a, b) => b[sortBy] - a[sortBy]);
}

// ===== التقارير المحاسبية =====
export function accountingReport({ invoices, purchases, from, to }) {
  const list = invoices.filter((i) => inRange(i.date, from, to));
  const bought = purchases.filter((p) => inRange(p.date, from, to));
  const spanDates = [...list, ...bought].map((row) => row.date).filter(Boolean).sort();
  const spanFrom = from || spanDates[0] || '';
  const spanTo = to || spanDates[spanDates.length - 1] || '';

  const billed = sum(list, (i) => i.total);
  const insuranceShare = sum(list, (i) => i.insurance_amount ?? 0);
  const collected = sum(list, (i) => i.paid);
  const expenses = sum(bought, (p) => p.total);

  const unpaid = list
    .map((i) => ({ ...i, remaining: round2(Math.max(0, patientDue(i) - i.paid)) }))
    .filter((i) => i.remaining > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const byInsurance = groupBy(
    list.filter((i) => i.insurance_company),
    (i) => i.insurance_company,
    () => ({ count: 0, total: 0, share: 0 }),
    (g, i) => {
      g.count += 1;
      g.total = round2(g.total + i.total);
      g.share = round2(g.share + (i.insurance_amount ?? 0));
    },
    'share'
  );

  const byPeriod = groupBy(
    [
      ...list.map((i) => ({ date: i.date, billed: Number(i.total) || 0, collected: Number(i.paid) || 0, expenses: 0 })),
      ...bought.map((p) => ({ date: p.date, billed: 0, collected: 0, expenses: Number(p.total) || 0 })),
    ].filter((row) => row.date),
    (row) => periodBucket(row.date, spanFrom, spanTo),
    () => ({ billed: 0, collected: 0, expenses: 0 }),
    (g, row) => {
      g.billed = round2(g.billed + row.billed);
      g.collected = round2(g.collected + row.collected);
      g.expenses = round2(g.expenses + row.expenses);
    },
    'billed'
  ).sort((a, b) => a.key.localeCompare(b.key));

  return {
    kpis: {
      count: list.length,
      billed,
      insuranceShare,
      patientShare: round2(billed - insuranceShare),
      collected,
      outstanding: sum(unpaid, (i) => i.remaining),
      expenses,
      net: round2(collected - expenses),
    },
    unpaid,
    byInsurance,
    byPeriod,
    purchases: bought,
  };
}

// ===== قائمة المرضى الحاليين =====
// تاريخ التسجيل: registered_at المحفوظ عند التسجيل. المرضى المسجّلون قبل إضافة هذا الحقل نستعمل لهم تاريخ أول زيارة
// (approx = true) بدل ترك الخانة فارغة.
export function patientsRegistry({ patients, from, to }) {
  const rows = patients
    .map((p) => {
      const visits = p.visits ?? [];
      const firstVisit = visits.map((v) => v.date).filter(Boolean).sort()[0] ?? '';
      return {
        id: p.id,
        fileNo: getFileNumber(p),
        name: p.name,
        phone: p.phone ?? '',
        registered: p.registered_at || firstVisit,
        approx: !p.registered_at && Boolean(firstVisit),
        registeredBy: p.registered_by ?? '',
        visits: visits.length,
      };
    })
    .sort((a, b) => String(b.registered).localeCompare(String(a.registered)) || String(a.name).localeCompare(String(b.name), 'ar'));
  return { rows, count: rows.length, newInPeriod: rows.filter((r) => inRange(r.registered, from, to)).length };
}

// ===== الخدمات المجانية =====
// المصدر بنود الفواتير المعلَّمة free_of؛ القسم يُستنتج من الزيارة المرتبطة بالفاتورة (invoice_id)، وإلا "فاتورة يدوية".
export const MANUAL_DEPARTMENT = 'فاتورة يدوية';

export function freeServicesReport({ invoices, patients, from, to }) {
  const deptOf = new Map();
  patients.forEach((p) => (p.visits ?? []).forEach((v) => v.invoice_id && deptOf.set(v.invoice_id, v.department)));

  const rows = invoices
    .filter((inv) => inRange(inv.date, from, to))
    .flatMap((inv) =>
      freeEntries(invoiceItems(inv)).map((e) => ({
        date: inv.date,
        invNo: inv.inv_no,
        patient: inv.patient_name,
        user: formatUser(inv.created_by, inv.created_by_username),
        department: deptOf.get(inv.id) ?? MANUAL_DEPARTMENT,
        service: e.name,
        value: e.value,
      }))
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.invNo).localeCompare(String(b.invNo)));

  const group = (keyFn) =>
    groupBy(rows, keyFn, () => ({ count: 0, value: 0 }), (g, r) => {
      g.count += 1;
      g.value = round2(g.value + r.value);
    }, 'value');

  return {
    rows,
    count: rows.length,
    value: sum(rows, (r) => r.value),
    byDepartment: group((r) => r.department),
    byService: group((r) => r.service),
  };
}

// ===== الكشف النقدي: الدخل اليومي =====
// كل دفعة تُحسب في يوم قبضها (invoice.payments). الفواتير المدفوعة قبل تتبّع الدفعات (paid بلا سجل دفعات)
// يُسنَد مبلغها لتاريخ الفاتورة ويُعلَّم legacy.
export function cashStatement({ invoices, from, to }) {
  const entries = [];
  invoices.forEach((inv) => {
    const logged = Array.isArray(inv.payments) ? inv.payments : [];
    logged.forEach((p) => entries.push({ date: p.date, amount: Number(p.amount) || 0, inv, legacy: false, by: p.by || '' }));
    const legacy = round2((Number(inv.paid) || 0) - sum(logged, (p) => p.amount));
    if (legacy > 0) entries.push({ date: inv.date, amount: legacy, inv, legacy: true });
  });

  const byDay = new Map();
  entries
    .filter((e) => e.amount > 0 && inRange(e.date, from, to))
    .forEach((e) => {
      if (!byDay.has(e.date)) byDay.set(e.date, []);
      byDay.get(e.date).push({
        invNo: e.inv.inv_no,
        patient: e.inv.patient_name,
        user: e.by || formatUser(e.inv.created_by, e.inv.created_by_username), // من قبض الدفعة، وإلا مُصدِر الفاتورة
        service: e.inv.service,
        insuranceCompany: e.inv.insurance_company || '',
        copayAmount: e.inv.insurance_company ? invoiceCopay(e.inv) : null,
        amount: round2(e.amount),
        legacy: e.legacy,
      });
    });

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({
      date,
      rows: rows.sort((a, b) => String(a.invNo).localeCompare(String(b.invNo))),
      total: sum(rows, (r) => r.amount),
    }));

  return {
    days,
    total: sum(days, (d) => d.total),
    count: days.reduce((n, d) => n + d.rows.length, 0),
    hasLegacy: days.some((d) => d.rows.some((r) => r.legacy)),
  };
}

// ===== التقارير الإدارية =====
export function adminReport({ patients, supplies, purchases, invoices = [], insuranceCompanies = [], from, to }) {
  const visits = patients.flatMap((p) =>
    (p.visits ?? []).map((v) => ({ ...v, patient_name: p.name, patient_insurance_id: p.insurance_id })).filter((v) => inRange(v.date, from, to))
  );
  const bought = purchases.filter((p) => inRange(p.date, from, to));
  const spanDates = visits.map((v) => v.date).filter(Boolean).sort();
  const spanFrom = from || spanDates[0] || '';
  const spanTo = to || spanDates[spanDates.length - 1] || '';

  const byDepartment = groupBy(
    visits,
    (v) => v.department,
    () => ({ count: 0, patients: new Set() }),
    (g, v) => {
      g.count += 1;
      g.patients.add(v.patient_name);
    },
    'count'
  ).map((g) => ({ ...g, patients: g.patients.size }));

  // الإجراءات الأكثر تنفيذاً (من الزيارات التي حُفظت إجراءاتها بشكل منظّم)
  const topProcedures = groupBy(
    visits.flatMap((v) => v.charges?.procedures ?? []),
    (p) => p.name,
    () => ({ count: 0, revenue: 0, free: 0 }),
    (g, p) => {
      g.count += 1;
      if (p.free) g.free += 1;
      else g.revenue = round2(g.revenue + Number(p.price || 0));
    },
    'count'
  );

  // الزيارات القديمة لم تحفظ وحدة المستلزم، فنأخذها من قائمة المخزون (بالمعرّف ثم الاسم) وإلا تبقى فارغة بدل "undefined"
  const unitOf = (s) => s.unit ?? supplies.find((x) => x.id === s.id || x.name === s.name)?.unit ?? '';

  const topSupplies = groupBy(
    visits.flatMap((v) => v.charges?.supplies ?? []),
    (s) => s.name,
    () => ({ qty: 0, revenue: 0, unit: '' }),
    (g, s) => {
      const qty = Number(s.qty) || 0;
      g.qty += qty;
      g.unit = unitOf(s) || g.unit;
      g.revenue = round2(g.revenue + qty * Number(s.price || 0));
    },
    'qty'
  );

  // سجل الزيارات التفصيلي: كل زيارة في الفترة مع بيانات المريض وما قُدّم فيها وقيمة فاتورتها (الأحدث أولاً)
  const fileOf = new Map(patients.map((p) => [p.name, p.file_number]));
  const invoiceOf = new Map(invoices.map((i) => [i.id, i]));
  const companyName = new Map(insuranceCompanies.map((c) => [c.id, c.name]));
  const visitLog = visits
    .map((v) => {
      const inv = v.invoice_id ? invoiceOf.get(v.invoice_id) : null;
      const procedures = v.charges?.procedures?.length ? v.charges.procedures.map((x) => x.name).join('، ') : v.procedures ?? '';
      const used = (v.charges?.supplies ?? []).map((s) => `${s.name} ×${Number(s.qty) || 0}`).join('، ');
      // شركة التأمين: من فاتورة الزيارة أولاً، وإلا من تأمين المريض المسجَّل في ملفه
      const insurer = inv?.insurance_company || (v.patient_insurance_id ? companyName.get(v.patient_insurance_id) ?? '' : '');
      return {
        id: v.id,
        date: v.date,
        insurer,
        insuranceShare: inv ? round2(inv.insurance_amount ?? 0) : null,
        patientShare: inv ? patientDue(inv) : null,
        fileNo: fileOf.get(v.patient_name) ?? '',
        patient: v.patient_name,
        department: v.department,
        procedures,
        supplies: used,
        summary: v.summary ?? '',
        invoiceNo: inv?.inv_no ?? '',
        user: formatUser(v.created_by ?? v.doctor, v.created_by_username),
        total: inv ? Number(inv.total) || 0 : null,
        status: inv?.status ?? '',
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.patient.localeCompare(b.patient, 'ar'));

  const lowStock = supplies.filter((s) => s.stock < LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);
  const stockValue = sum(supplies, (s) => s.stock * Number(s.cost ?? s.price ?? 0));

  const bySupplier = groupBy(
    bought,
    (p) => p.supplier,
    () => ({ count: 0, total: 0 }),
    (g, p) => {
      g.count += 1;
      g.total = round2(g.total + p.total);
    },
    'total'
  );

  const visitsByPeriod = groupBy(
    visits.filter((v) => v.date),
    (v) => periodBucket(v.date, spanFrom, spanTo),
    () => ({ count: 0 }),
    (g) => {
      g.count += 1;
    },
    'count'
  ).sort((a, b) => a.key.localeCompare(b.key));

  return {
    kpis: {
      visits: visits.length,
      patients: new Set(visits.map((v) => v.patient_name)).size,
      insuredVisits: visitLog.filter((r) => r.insurer).length,
      insuredPatients: new Set(visitLog.filter((r) => r.insurer).map((r) => r.patient)).size,
      totalPatients: patients.length,
      lowStock: lowStock.length,
      stockValue,
    },
    byDepartment,
    topProcedures,
    topSupplies,
    lowStock,
    bySupplier,
    visitLog,
    visitsByPeriod,
  };
}

// ===== مطالبة شركة التأمين: فواتير الشركة في الفترة مجمّعة حسب المريض مع بياناته الكاملة =====
// المريض يُربط بـ patient_id، وإن لم يوجد (فواتير قديمة) فبالاسم. الزيارة تُربط بـ invoice_id لإظهار القسم والملخص الطبي.
export function insuranceClaim({ invoices, patients, company, from, to }) {
  const list = invoices
    .filter((i) => i.insurance_company === company && inRange(i.date, from, to))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.inv_no).localeCompare(String(b.inv_no)));

  const groups = new Map();
  list.forEach((inv) => {
    const patient = patients.find((p) => (inv.patient_id ? p.id === inv.patient_id : p.name === inv.patient_name)) ?? null;
    const key = patient?.id ?? `name:${inv.patient_name}`;
    if (!groups.has(key)) groups.set(key, { key, patient, name: patient?.name ?? inv.patient_name, rows: [] });

    const visit = patient?.visits?.find((v) => v.invoice_id === inv.id) ?? null;
    groups.get(key).rows.push({
      inv,
      visit,
      items: invoiceItems(inv),
      share: round2(inv.insurance_amount ?? 0),
      patientShare: patientDue(inv),
    });
  });

  const patientGroups = [...groups.values()]
    .map((g) => ({
      ...g,
      total: sum(g.rows, (r) => r.inv.total),
      share: sum(g.rows, (r) => r.share),
      patientShare: sum(g.rows, (r) => r.patientShare),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return {
    company,
    groups: patientGroups,
    invoiceCount: list.length,
    total: sum(list, (i) => i.total),
    share: sum(list, (i) => i.insurance_amount ?? 0),
    patientShare: sum(list, (i) => patientDue(i)),
  };
}
