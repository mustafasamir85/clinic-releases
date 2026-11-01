import { lazy, Suspense, useEffect, useState } from 'react';
import './App.css';
import { APPOINTMENT_STATUS, TABS } from './constants';
import { getToday, formatUser } from './utils/format';
import { newId } from './utils/id';
import { setPrintUser } from './utils/printUser';
import {
  INITIAL_HEARING_AIDS,
  INITIAL_INSURANCE_COMPANIES,
  INITIAL_MEDICATIONS,
  INITIAL_OFFERS,
  INITIAL_SERVICES,
  INITIAL_SUPPLIERS,
  INITIAL_SUPPLIES,
} from './data/initialData';
import { withOffer } from './features/offers/offerUtils';
import { EMPTY_CHARGES, hasCharges, proceduresText, suppliesText, toInvoiceItem } from './components/common/ChargesPicker';
import { ACTIONS } from './auth/permissions';
import { importMedications } from './api';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './features/auth/LoginScreen';
import ChangePasswordScreen from './features/auth/ChangePasswordScreen';
import UpdateBanner from './components/common/UpdateBanner';
import { useAppointments } from './hooks/useAppointments';
import { useCrudList } from './hooks/useCrudList';
import { clearAllDrafts } from './hooks/useDraft';
import { useInventory } from './hooks/useInventory';
import { invoiceCopay, useInvoices } from './hooks/useInvoices';
import { stockReturnsFor } from './features/billing/stockReturn';
import { summarizeInvoiceDeletion } from './features/billing/invoiceDeletion';
import { visitDeletionEffects, visitDeletionPrompts } from './features/patients/visitDeletion';
import { insuranceInfoFrom, planVisitInvoiceSync } from './features/billing/invoiceSync';
import { SuggestionsProvider } from './components/common/SuggestionsContext';
import { usePatients } from './hooks/usePatients';
import { useTheme } from './hooks/useTheme';
import { useDisplayPrefs } from './hooks/useDisplayPrefs';
import { useToast } from './hooks/useToast';

import Toast from './components/common/Toast';
import { PrintFooter } from './components/common/PrintBrand';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

import HomeTab from './features/home/HomeTab';
import PatientsTab from './features/patients/PatientsTab';
import PatientModal from './features/patients/PatientModal';
import VisitEditModal from './features/patients/VisitEditModal';
import EntTab from './features/ent/EntTab';
import HearingAidManagerModal from './features/audio/HearingAidManagerModal';
import HearingAidStockModal from './features/audio/HearingAidStockModal';
import SalesTab, { SALE_SOURCE } from './features/sales/SalesTab';
import { buildSaleReturn } from './features/sales/saleReturn';
import SpeechTab from './features/speech/SpeechTab';
import ServicesTab from './features/services/ServicesTab';
import SuppliesTab from './features/supplies/SuppliesTab';
import PurchasesTab from './features/purchases/PurchasesTab';
import SuppliersTab from './features/suppliers/SuppliersTab';
import InsuranceTab from './features/insurance/InsuranceTab';
import ScheduleTab from './features/schedule/ScheduleTab';
import OffersTab from './features/offers/OffersTab';
import BillingTab from './features/billing/BillingTab';
import PaymentModal from './features/billing/PaymentModal';
import EditInvoiceModal from './features/billing/EditInvoiceModal';
import { LogOut, Store, UserPlus } from 'lucide-react';
import { useConfirm } from './components/common/ConfirmDialog';
import CommandPalette from './components/layout/CommandPalette';
import ErrorBoundary from './components/common/ErrorBoundary';
import AnnouncementPopup from './components/common/AnnouncementPopup';
import { useAnnouncements } from './hooks/useAnnouncements';
import SplashScreen from './components/common/SplashScreen';
import { TabSkeleton } from './components/common/Skeleton';
import { resetSync } from './utils/syncStatus';
import { isVisitInvoiceGone, returnToStock, supplyUsageDeltas } from './utils/stockDelta';

// الشاشات والنوافذ الثقيلة أو النادرة تُحمَّل عند أول استخدام فقط (تسريع الإقلاع)
const UsersTab = lazy(() => import('./features/users/UsersTab'));
const UpdatesTab = lazy(() => import('./features/updates/UpdatesTab'));
const BackupTab = lazy(() => import('./features/backup/BackupTab'));
const AnnouncementsTab = lazy(() => import('./features/announcements/AnnouncementsTab'));
const AudioTab = lazy(() => import('./features/audio/AudioTab'));
const ReportsTab = lazy(() => import('./features/reports/ReportsTab'));
const AudiogramPreviewModal = lazy(() => import('./features/audio/AudiogramPreviewModal'));
const PrescriptionPrintModal = lazy(() => import('./features/ent/PrescriptionPrintModal'));
const InvoicePreviewModal = lazy(() => import('./features/billing/InvoicePreviewModal'));

// أسماء النوافذ المنبثقة التي تُدار من هنا (نافذة واحدة مفتوحة كحد أقصى)
const MODALS = {
  PATIENT: 'patient',
  EDIT_PATIENT: 'edit-patient',
  EDIT_VISIT: 'edit-visit',
  HEARING_AIDS: 'hearingAids',
  AID_STOCK: 'aidStock',
};

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.HOME); // أول ما يراه المستخدم: الصفحة الرئيسية
  const [modal, setModal] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [prescriptionPrint, setPrescriptionPrint] = useState(null); // { patient, visit } بعد حفظ زيارة فيها وصفة
  const [audiogramPrint, setAudiogramPrint] = useState(null); // { patient, visit } بعد حفظ زيارة فيها فحص سمع

  const auth = useAuth();
  const themeCtl = useTheme(); // الثيم والألوان المخصّصة (انظر hooks/useTheme)
  const { theme, toggle: toggleTheme } = themeCtl;
  const [display, setDisplay] = useDisplayPrefs(); // حجم الخط وكثافة العرض
  const { toast, show: notify, dismiss: dismissToast, pause: pauseToast, resume: resumeToast } = useToast();
  const confirm = useConfirm();
  const [searchOpen, setSearchOpen] = useState(false); // لوحة البحث الشامل (Ctrl+K)
  const [navOpen, setNavOpen] = useState(false); // القائمة الجانبية المنسدلة (الشاشات الصغيرة والمتوسطة)
  useEffect(() => { if (searchOpen) setNavOpen(false); }, [searchOpen]);
  const [searchPick, setSearchPick] = useState(0); // عدّاد اختيارات المرضى من البحث الشامل

  // البيانات تُحمَّل من السيرفر وتُحفظ عليه فقط بعد تسجيل الدخول
  const enabled = Boolean(auth.currentUser) && !auth.currentUser.must_change_password;
  // رسائل مدير النظام: تُجلب عند فتح التطبيق ثم دورياً، وتظهر كنافذة منبثقة حتى «تم الاطلاع»
  const announcements = useAnnouncements(enabled);
  // ترويسة كل مطبوعة تحمل "طُبع بواسطة: المستخدم الحالي"
  setPrintUser(auth.currentUser ? formatUser(auth.currentUser.name, auth.currentUser.username) : '');

  // اختصار البحث الشامل: Ctrl+K (أو ⌘K) يفتح اللوحة ويغلقها، ويمنع تركيز شريط عنوان المتصفح.
  // نعتمد e.code (المفتاح الفيزيائي) لأن e.key يصبح «ل» مع تخطيط لوحة المفاتيح العربي فلا يطابق 'k'.
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if (e.repeat || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const isK = e.code === 'KeyK' || (typeof e.key === 'string' && e.key.toLowerCase() === 'k');
      if (!isK) return;
      e.preventDefault();
      setSearchOpen((open) => !open);
    };
    // مرحلة الالتقاط (capture) كي لا تستهلك الحقول/النوافذ الحدث قبل وصوله
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled]);

  // عجلة الفأرة فوق حقل رقمي مركَّز تغيّر قيمته دون قصد (أسعار/كميات): نُلغي تركيزه فيتابع التمرير للصفحة
  useEffect(() => {
    const onWheel = (e) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.type === 'number' && el === e.target) el.blur();
    };
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => document.removeEventListener('wheel', onWheel);
  }, []);

  // أخطاء الاتصال/الحفظ القادمة من طبقة المزامنة تظهر كإشعار
  useEffect(() => {
    const onError = (e) => notify(e.detail, { type: 'error', duration: 6000 });
    window.addEventListener('clinic-sync-error', onError);
    return () => window.removeEventListener('clinic-sync-error', onError);
  }, [notify]);

  const patientsState = usePatients(enabled);
  const { selectedPatient } = patientsState;
  const { loading: invoicesLoading, invoices, createInvoice, recordPayment, applySaleReturn, updateInvoice, cancelInvoice, removeInvoice } = useInvoices(enabled, auth.currentUser);
  const [payingId, setPayingId] = useState(null); // فاتورة قيد تسجيل دفعة
  const [editingInvoiceId, setEditingInvoiceId] = useState(null); // فاتورة قيد التعديل

  const hearingAids = useCrudList('hearingAids', INITIAL_HEARING_AIDS, enabled);
  const medications = useCrudList('medications', INITIAL_MEDICATIONS, enabled);
  const insurance = useCrudList('insurance', INITIAL_INSURANCE_COMPANIES, enabled);
  const services = useCrudList('services', INITIAL_SERVICES, enabled);
  const supplies = useCrudList('supplies', INITIAL_SUPPLIES, enabled);
  const suppliers = useCrudList('suppliers', INITIAL_SUPPLIERS, enabled);
  const offers = useCrudList('offers', INITIAL_OFFERS, enabled);
  const inventory = useInventory(supplies, enabled, hearingAids, suppliers, auth.currentUser);
  const appointments = useAppointments(enabled);

  const closeModal = () => setModal(null);

  // استيراد الأدوية من ملف ثم إعادة تحميل القائمة من السيرفر لتظهر فوراً في الوصفات
  const handleImportMedications = async (file) => {
    const result = await importMedications(file);
    await medications.refresh();
    return result;
  };

  // بيع مستلزمات مباشر: فاتورة (مدفوعة فوراً أو بانتظار التأكيد) + خصم الكميات من المخزون
  const handleSellSupplies = ({ patient, customerName, lines, items, paidNow, paymentMethod }) => {
    const invoice = createInvoice({
      patientName: customerName,
      patientId: patient?.id ?? null,
      items,
      paid: paidNow ? '' : 0, // '' = كامل المستحق
      paymentMethod,
      insurance: null,
      source: SALE_SOURCE,
      stockLines: lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty })),
    });
    inventory.sell(
      lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty })),
      `بيع: ${customerName} (${invoice.inv_no})`
    );
    notify(`تم البيع وإصدار الفاتورة ${invoice.inv_no} بإجمالي ${invoice.total} د.أ${paidNow ? '' : ' — بانتظار تأكيد الدفع'}.`, 4500);
  };

  // مرتجع بيع مستلزمات: يُلحَق بالفاتورة (إجمالي أقل + استرداد ما دُفع زيادة) وتعود الكميات إلى المخزون
  const handleReturnSale = ({ invoice, selections, reason }) => {
    if (!auth.can(ACTIONS.RETURN_SALES)) return 'ليست لديك صلاحية مرتجع بيع المستلزمات.';
    const result = buildSaleReturn({ invoice, supplies: supplies.items, selections, reason, user: auth.currentUser, id: newId(), date: getToday() });
    if (result.error) return result.error;
    if (result.stockBack.length > 0 && !auth.can('supplies') && !auth.can('purchases')) {
      return 'إعادة الأصناف إلى المخزون تتطلب صلاحية المستلزمات أو المشتريات.';
    }

    const refund = applySaleReturn(invoice.id, { entry: result.entry, newItems: result.items, stockLines: result.stockLines });
    if (result.stockBack.length > 0) {
      // qty سالب في adjustUsage = إرجاع للمخزون (يُسجَّل في الحركة كـ «إرجاع للمخزون»)
      inventory.adjustUsage(returnToStock(result.stockBack), `مرتجع بيع: ${invoice.patient_name} (${invoice.inv_no})`);
    }
    notify(`تم تسجيل المرتجع بقيمة ${result.value} د.أ على الفاتورة ${invoice.inv_no}${refund > 0 ? ` — يُرَدّ للعميل ${refund} د.أ` : ''}.`, 5000);
    return undefined;
  };

  // إدخال سماعات إلى المخزون
  const handleReceiveAids = (data) => {
    let result;
    try {
      result = inventory.receiveHearingAids(data);
    } catch (error) {
      notify(error.message || 'تعذر تسجيل مشتريات السماعات.', { type: 'error', duration: 4000 });
      return;
    }
    if (!result) return;
    closeModal();
    notify(
      result.lines > 1
        ? `تم تسجيل شراء ${result.lines} بنود (${result.qty} قطعة) ضمن المشتريات (${result.purchase.no}) وإضافتها للمخزون.`
        : `تم تسجيل شراء ${result.qty} × ${result.name} ضمن المشتريات (${result.purchase.no}) وإضافتها للمخزون.`,
      4500
    );
  };

  const handleAddPatient = async (form) => {
    const saved = await patientsState.addPatient(form, auth.currentUser.name);
    closeModal();
    notify(`تم التسجيل بنجاح! رقم الملف هو ${saved.file_number}${form.previousAudiogram ? ' (وحُفظ تخطيط السمع السابق)' : ''}`, 5000);
  };

  const handleEditPatient = (form) => {
    if (!selectedPatient) return;
    patientsState.updatePatient(selectedPatient.id, form);
    closeModal();
    notify('تم حفظ تعديلات بيانات المريض.');
  };

  // يضيف بند خصم العرض المختار (charges.offerId) إلى بنود فاتورة الزيارة؛ الإجمالي يُحسب من البنود
  const withChargeOffer = (item) =>
    item?.items
      ? (() => {
          const manualDiscountItems = item.items.filter((entry) => entry.id === 'discount-manual');
          const billableItems = item.items.filter((entry) => entry.id !== 'discount-manual');
          const offeredItems = withOffer(billableItems, item.charges?.offerId, offers.items, services.items).items;
          const items = [...offeredItems, ...manualDiscountItems];
          return {
            ...item,
            items,
            total: Math.round(items.reduce((total, entry) => total + entry.qty * entry.price, 0) * 100) / 100,
          };
        })()
      : item;

  // invoiceItem = { service, total, charges? } يُصدر فاتورة تلقائياً مع الزيارة (إجراءات / مستلزمات / بيع سماعة)
  const handleAddVisit = (department, details, rawInvoiceItem = null, usedSupplies = []) => {
    if (!selectedPatient) return;
    const invoiceItem = withChargeOffer(rawInvoiceItem);

    // الفاتورة أولاً لنربطها بالزيارة (invoice_id) فنستطيع تعديلها لاحقاً مع الزيارة
    const invoice = invoiceItem
      ? createInvoice({
          patientName: selectedPatient.name,
          patientId: selectedPatient.id,
          service: invoiceItem.service,
          total: invoiceItem.total,
          items: invoiceItem.items,
          paid: 0, // تُصدر بانتظار تأكيد الدفع من تبويب الفواتير
          insurance: insuranceInfoFrom(details),
        })
      : null;

    appointments.completeFor(selectedPatient, department, getToday()); // إكمال موعد اليوم إن وُجد

    const visit = patientsState.addVisit(department, {
      ...details,
      doctor: auth.currentUser.name, // الطبيب الذي سجّل الزيارة (يظهر في الوصفة)
      created_by: auth.currentUser.name,
      created_by_username: auth.currentUser.username,
      ...(invoiceItem?.charges ? { charges: invoiceItem.charges } : {}),
      ...(invoice ? { invoice_id: invoice.id } : {}),
    });

    // بيع سماعة: تُخصم من مخزون السماعات
    if (details.hearing_aid_id) {
      inventory.sellHearingAid(details.hearing_aid_id, `بيع: ${selectedPatient.name}${invoice ? ` (${invoice.inv_no})` : ''}`);
    }

    // خصم المستلزمات المستخدمة من المخزون
    if (usedSupplies.length > 0) {
      inventory.consume(usedSupplies, `زيارة: ${selectedPatient.name} (${department})`);
    }

    closeModal();
    // إن أُدخل فحص سمع نفتح شاشة معاينته وطباعته فور الحفظ (وتُفتح الوصفة بعد إغلاقها إن وُجدت)
    if (visit?.audiogram) setAudiogramPrint({ patient: selectedPatient, visit });
    // إن أُدخلت وصفة نفتح نافذة طباعتها فور الحفظ
    else if (visit?.prescription?.trim()) setPrescriptionPrint({ patient: selectedPatient, visit });
    notify(
      invoiceItem
        ? `تم إضافة زيارة (${department}) بنجاح وإصدار فاتورة بانتظار تأكيد الدفع!`
        : `تم إضافة زيارة (${department}) بنجاح!`,
      4000
    );
  };

  // تعديل الزيارة المحددة. charges = null إذا كانت الإجراءات غير قابلة للتعديل لهذه الزيارة.
  const handleUpdateVisit = (changes, charges) => {
    const visit = patientsState.selectedVisit;
    const patchData = { ...changes, updated_by: auth.currentUser.name, updated_by_username: auth.currentUser.username, updated_at: getToday() };

    if (charges) {
      // فاتورة الزيارة حُذفت من قسم الفواتير: مستلزماتها أُرجعت للمخزون وقتها، فنعدّ الاستهلاك السابق صفراً
      const invoiceGone = isVisitInvoiceGone(visit, invoices);
      const before = { ...(visit.charges ?? EMPTY_CHARGES), ...(invoiceGone ? { supplies: [] } : {}) };

      // 1) المخزون: الفرق بين الكميات الجديدة والقديمة لكل مستلزم (موجب = استهلاك إضافي، سالب = إرجاع)
      const deltas = supplyUsageDeltas(before.supplies, charges.supplies);
      inventory.adjustUsage(deltas, `تعديل زيارة: ${selectedPatient.name} (${visit.department})`);

      // 2) الفاتورة: تحديث الموجودة أو إنشاء جديدة أو إلغاؤها إذا لم يبقَ شيء
      const item = withChargeOffer(toInvoiceItem(charges));
      const insuranceInfo = insuranceInfoFrom(changes);
      const plan = planVisitInvoiceSync({ item, invoiceId: visit.invoice_id, invoices });
      let invoiceId = plan.invoiceId;

      if (plan.action === 'update') {
        updateInvoice(invoiceId, { service: item.service, total: item.total, items: item.items, insurance: insuranceInfo });
      } else if (plan.action === 'create') {
        invoiceId = createInvoice({ patientName: selectedPatient.name, patientId: selectedPatient.id, service: item.service, total: item.total, items: item.items, paid: 0, insurance: insuranceInfo }).id;
      } else if (plan.action === 'cancel' && cancelInvoice(invoiceId)) {
        invoiceId = null; // حُذفت فعلاً (إن كانت مدفوعة جزئياً تبقى مربوطة بقيمة صفر للسجل المحاسبي)
      }

      Object.assign(patchData, {
        charges,
        procedures: proceduresText(charges),
        supplies_used: suppliesText(charges),
        invoice_id: invoiceId,
      });
    }

    patientsState.updateVisit(selectedPatient.id, visit.id, patchData);
    closeModal();
    notify('تم تعديل تفاصيل الزيارة بنجاح!');
  };

  // حذف زيارة بعد التأكيد، مع خيار إلغاء فاتورتها وإرجاع مستلزماتها للمخزون
  const handleDeleteVisit = async (visit) => {
    if (!(await confirm({ title: 'حذف الزيارة', message: 'هل أنت متأكد من حذف هذه الزيارة؟', confirmLabel: 'حذف الزيارة', danger: true }))) return;

    // القرارات (ماذا نسأل وماذا ننفّذ) في features/patients/visitDeletion.js؛ هنا الأسئلة والتنفيذ فقط
    const prompts = visitDeletionPrompts({ visit, invoices, chargesPresent: Boolean(visit.charges && hasCharges(visit.charges)) });

    const revertCharges = prompts.askRevertCharges
      ? Boolean(await confirm({
          title: 'فاتورة الزيارة والمخزون',
          message: 'هذه الزيارة تحتوي إجراءات/مستلزمات.\nهل تريد أيضاً إلغاء فاتورتها وإرجاع المستلزمات للمخزون؟',
          confirmLabel: 'نعم، ألغِ الفاتورة وأرجع المستلزمات',
          cancelLabel: 'لا، أبقِ الفاتورة والمخزون',
        }))
      : false;

    const returnAid = prompts.askReturnAid
      ? Boolean(await confirm({
          title: 'سماعة الزيارة',
          message: 'هذه الزيارة تتضمن بيع سماعة.\nهل تريد إرجاعها لمخزون السماعات وإلغاء فاتورتها؟',
          confirmLabel: 'نعم، أرجع السماعة وألغِ الفاتورة',
          cancelLabel: 'لا، أبقِ المخزون والفاتورة',
        }))
      : false;

    const note = `حذف زيارة: ${selectedPatient.name}`;
    const effects = visitDeletionEffects({ visit, revertCharges, returnAid });
    if (effects.stockBack) inventory.adjustUsage(effects.stockBack, note);
    if (effects.returnAidId) inventory.returnHearingAid(effects.returnAidId, note);
    if (effects.cancelInvoiceId) cancelInvoice(effects.cancelInvoiceId);

    patientsState.deleteVisit(selectedPatient.id, visit.id);
    notify('تم حذف الزيارة بنجاح.');
  };

  // اختيار مريض محجوز من قائمة العيادة: نفتح ملفه ونسجّل وصوله
  const handlePickAppointment = (appt) => {
    const patient = patientsState.patients.find((p) => (appt.patient_id ? p.id === appt.patient_id : p.name === appt.patient_name));
    if (!patient) {
      notify(`لا يوجد ملف مسجّل باسم ${appt.patient_name}. سجّله أولاً من سجل المرضى.`, { type: 'warning', duration: 4000 });
      return;
    }
    patientsState.selectPatient(patient);
    if (appt.status === APPOINTMENT_STATUS.BOOKED) appointments.setStatus(appt.id, APPOINTMENT_STATUS.ARRIVED);
  };

  // حذف فاتورة بالكامل بعد التأكيد، مع إرجاع ما خُصم من المخزون بسببها (مستلزمات بيع/زيارة وسماعة الزيارة).
  // الزيارة نفسها تبقى كما هي.
  // حذف صنف من القوائم يُسجَّل في حركة المخزون (بمن حذفه وما كان متوفراً منه)
  const withRemovalLog = (list, itemType) => ({
    ...list,
    restore: undefined, // حذف هذه القوائم يُسجَّل في حركة المخزون فلا يُعرض عليه «تراجع»؛ يبقى بنافذة التأكيد
    remove: (id) => {
      const item = list.items.find((i) => String(i.id) === String(id));
      if (item) inventory.recordRemoval(item, itemType);
      list.remove(id);
    },
  });
  const canReturnAids = ['audio', 'ent', 'speech', 'supplies', 'purchases'].some((p) => auth.can(p));
  const handleDeleteInvoice = async (inv) => {
    const back = stockReturnsFor({
      invoice: inv,
      patients: patientsState.patients,
      supplies: supplies.items,
      hearingAids: hearingAids.items,
      isSale: inv.source === SALE_SOURCE,
    });
    const { returnAid, message, successText } = summarizeInvoiceDeletion({ invoice: inv, back, canReturnAids });
    if (!(await confirm({ title: 'حذف الفاتورة', message, confirmLabel: 'حذف الفاتورة', danger: true }))) return;

    const note = `حذف فاتورة ${inv.inv_no}`;
    if (back.supplies.length > 0) inventory.adjustUsage(returnToStock(back.supplies), note);
    if (returnAid) inventory.returnHearingAid(back.aid.id, note);
    removeInvoice(inv.id);
    notify(successText);
  };

  const handleRecordPayment = (id, amount, method) => {
    recordPayment(id, amount, method);
    setPayingId(null);
    notify('تم تسجيل الدفعة بنجاح!');
  };

  const handleEditInvoice = (id, items) => {
    const inv = invoices.find((x) => x.id === id);
    updateInvoice(id, {
      items,
      insurance: inv.insurance_company ? { name: inv.insurance_company, copay: invoiceCopay(inv) } : null,
    });
    setEditingInvoiceId(null);
    notify('تم تعديل بنود الفاتورة بنجاح!');
  };

  // تبديل الشاشة يُلغي المريض الحالي: يجب البحث عنه واختياره من جديد في كل شاشة
  // الإلغاء مقصود (يمنع تسجيل زيارة على مريض سابق بالخطأ)؛ وعند الانتقال لشاشة سريرية نعرض زر «إعادة اختياره» بنقرة واحدة صريحة.
  const CLINICAL_TABS = [TABS.ENT, TABS.AUDIO, TABS.SPEECH];
  const changeTab = (next) => {
    if (next !== activeTab) {
      const previous = selectedPatient;
      patientsState.clearSelection();
      if (previous && CLINICAL_TABS.includes(next)) {
        notify(`أُلغي اختيار المريض «${previous.name}» لهذه الشاشة.`, {
          type: 'info',
          duration: 7000,
          action: { label: 'إعادة اختياره', onClick: () => patientsState.selectPatient(previous) },
        });
      }
    }
    setActiveTab(next);
  };

  const handleLogout = () => {
    setSearchOpen(false);
    setModal(null);
    setPreviewInvoice(null);
    setPrescriptionPrint(null);
    patientsState.clearSelection();
    resetSync(); // حالة الحفظ تخص المستخدم السابق
    clearAllDrafts(); // تسجيل الخروج الصريح: لا نترك مسودات مرضى على الجهاز
    setActiveTab(TABS.HOME); // المستخدم التالي يبدأ من الرئيسية لا من شاشة سابقه
    auth.logout();
  };

  // ===== بوابة الدخول (بعد استدعاء كل الـ hooks كي تبقى بيانات الجلسة محفوظة عند الخروج) =====
  if (!auth.ready) return <SplashScreen />; // التحقق من جلسة محفوظة
  if (!auth.currentUser) {
    return <LoginScreen onLogin={auth.login} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (auth.currentUser.must_change_password) {
    return (
      <ChangePasswordScreen user={auth.currentUser} onChange={auth.changeOwnPassword} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
    );
  }

  // الشاشة المعروضة: المختارة إن كانت مسموحة، وإلا أول شاشة يملك صلاحيتها
  // النسخ الاحتياطي لمدير النظام فقط، وشاشة التحديثات لمن يملك صلاحية «updates» (المدير يملكها دائماً) — والخادم يفرض ذلك أيضاً
  const isAdmin = auth.currentUser.role === 'admin';
  const canOpen = (id) => (id === TABS.HOME ? true : id === TABS.BACKUP || id === TABS.ANNOUNCEMENTS ? isAdmin : auth.can(id));
  const tab = canOpen(activeTab) ? activeTab : auth.firstAllowedTab;

  // ===== البحث الشامل: الوجهة والإجراءات =====
  // المريض يُفتح في شاشة المرضى، وإن لم يملكها المستخدم ففي أول شاشة سريرية يملكها
  const patientDestination = canOpen(TABS.PATIENTS) ? TABS.PATIENTS : [TABS.ENT, TABS.AUDIO, TABS.SPEECH].find(canOpen);
  const goTabFromSearch = (id) => {
    setModal(null);
    changeTab(id);
  };
  const openPatientFromSearch = (patient) => {
    setModal(null);
    if (patientDestination !== tab) setActiveTab(patientDestination); // دون مسح الاختيار: نختار المريض بعدها مباشرة
    patientsState.selectPatient(patient);
    setSearchPick((n) => n + 1); // يُعلم شاشة المرضى بفتح الملف (تُظهره فقط عند الاختيار الصريح)
  };
  const paletteActions = [
    ...(canOpen(TABS.PATIENTS)
      ? [{ id: 'new-patient', label: 'تسجيل مريض جديد', icon: UserPlus, run: () => { if (tab !== TABS.PATIENTS) changeTab(TABS.PATIENTS); setModal(MODALS.PATIENT); } }]
      : []),
    ...(canOpen(TABS.SALES)
      ? [{ id: 'sell-supplies', label: 'بيع مستلزمات', icon: Store, run: () => changeTab(TABS.SALES) }]
      : []),
    { id: 'logout', label: 'تسجيل الخروج', icon: LogOut, run: handleLogout },
  ];
  // الشاشة تُعرض هيكلاً عظمياً حتى تصل بياناتها من السيرفر (بدل قائمة فارغة تتبدّل فجأة).
  // كل قيمة = مجموعات البيانات التي تعتمد عليها الشاشة؛ فشل التحميل (أو عدم الصلاحية) ينهي التحميل فلا يبقى الهيكل للأبد.
  const patientsLoading = patientsState.loading;
  const loadingByTab = {
    [TABS.HOME]: appointments.loading || invoicesLoading || supplies.loading,
    [TABS.ENT]: patientsLoading || services.loading || supplies.loading || medications.loading || insurance.loading || offers.loading,
    [TABS.AUDIO]: patientsLoading || services.loading || supplies.loading || hearingAids.loading || insurance.loading || offers.loading,
    [TABS.SPEECH]: patientsLoading || services.loading || supplies.loading || insurance.loading || offers.loading,
    [TABS.SERVICES]: services.loading,
    [TABS.OFFERS]: offers.loading || services.loading,
    [TABS.SUPPLIES]: supplies.loading || hearingAids.loading || inventory.loading,
    [TABS.SALES]: supplies.loading || invoicesLoading || patientsLoading,
    [TABS.SUPPLIERS]: suppliers.loading || inventory.loading,
    [TABS.PURCHASES]: supplies.loading || hearingAids.loading || suppliers.loading || inventory.loading,
    [TABS.INSURANCE]: insurance.loading,
    [TABS.SCHEDULE]: appointments.loading || patientsLoading,
    [TABS.BILLING]: invoicesLoading,
    [TABS.REPORTS]: patientsLoading || invoicesLoading || inventory.loading || supplies.loading || hearingAids.loading || insurance.loading,
  };
  const tabLoading = Boolean(tab) && loadingByTab[tab] === true;

  const canManageVisits = auth.can(ACTIONS.MANAGE_VISITS);
  const canIssueDocuments = auth.can(ACTIONS.ISSUE_DOCUMENTS);
  const canDeleteDocuments = auth.can(ACTIONS.DELETE_DOCUMENTS);

  // إصدار وثيقة باسم المستخدم الحالي (الطبيب المعالج) وحذفها
  const documentActions =
    canIssueDocuments || canDeleteDocuments
      ? {
          issuerNameEn: auth.currentUser.name_en ?? '',
          ...(canIssueDocuments && {
            onIssue: (patientId, data) => {
              const doc = patientsState.addDocument(patientId, { ...data, issued_by: auth.currentUser.name });
              notify(`تم إصدار ${doc.type === 'leave' ? 'الإجازة المرضية' : 'التقرير الطبي'} (${doc.no}) بنجاح!`, 4000);
              return doc;
            },
          }),
          ...(canDeleteDocuments && {
            onDelete: (patientId, docId) => {
              patientsState.deleteDocument(patientId, docId);
              notify('تم حذف الوثيقة.');
            },
          }),
        }
      : undefined;

  return (
    <SuggestionsProvider patients={patientsState.patients}>
    <div className="app-wrapper">
      <Toast toast={toast} onDismiss={dismissToast} onPause={pauseToast} onResume={resumeToast} />
      <UpdateBanner />
      <Header theme={theme} themeCtl={themeCtl} display={display} onDisplayChange={setDisplay} onToggleTheme={toggleTheme} user={auth.currentUser} onLogout={handleLogout} onOpenSearch={() => setSearchOpen(true)} onGoHome={() => changeTab(TABS.HOME)} onOpenNav={() => setNavOpen(true)} navOpen={navOpen} />

      {searchOpen && (
        <CommandPalette
          patients={patientsState.patients}
          canSearchPatients={Boolean(patientDestination)}
          can={canOpen}
          actions={paletteActions}
          onPickPatient={openPatientFromSearch}
          onGoTab={goTabFromSearch}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <div className="workspace-layout has-nav">
        <Sidebar activeTab={tab} onChange={changeTab} can={canOpen} userKey={auth.currentUser.username} open={navOpen} onOpenChange={setNavOpen} />

        <main className="warm-content">
          {/* حاجز أخطاء للشاشة الحالية: عطل في شاشة لا يُسقط الترويسة والتنقل، وتغيير الشاشة يعيد المحاولة */}
          <ErrorBoundary scope="tab" resetKey={tab}>
          <Suspense fallback={<TabSkeleton />}>
          {tabLoading ? (
            <TabSkeleton />
          ) : (
          <>
          {tab === TABS.PATIENTS && (
            <PatientsTab
              loading={patientsState.loading}
              patients={patientsState.patients}
              selectedPatient={selectedPatient}
              searchPick={searchPick}
              selectedVisit={patientsState.selectedVisit}
              onSelectPatient={patientsState.selectPatient}
              onSelectVisit={patientsState.selectVisit}
              onNewPatient={() => setModal(MODALS.PATIENT)}
              onEditPatient={() => setModal(MODALS.EDIT_PATIENT)}
              onEditVisit={canManageVisits ? (visit) => { patientsState.selectVisit(visit.id); setModal(MODALS.EDIT_VISIT); } : undefined}
              onDeleteVisit={canManageVisits ? handleDeleteVisit : undefined}
              documents={documentActions}
              onUpdateHistory={patientsState.updateMedicalHistory}
              insuranceCompanies={insurance.items}
              onUpdateInsurance={patientsState.updateInsurance}
            />
          )}

          {tab === TABS.ENT && (
            <EntTab
              draftUser={auth.currentUser.username}
              offers={offers.items}
              patient={selectedPatient}
              patients={patientsState.patients}
              services={services.items}
              supplies={supplies.items}
              medications={medications.items}
              onSaveMedicationUsage={auth.can(TABS.ENT) ? (id, usage) => medications.update(id, { usage }) : undefined}
              insuranceCompanies={insurance.items}
              onSelectPatient={patientsState.selectPatient}
              appointments={appointments.items}
              onPickAppointment={handlePickAppointment}
              onAddVisit={handleAddVisit}
              onImportMedications={handleImportMedications}
            />
          )}

          {tab === TABS.AUDIO && (
            <AudioTab
              draftUser={auth.currentUser.username}
              patient={selectedPatient}
              patients={patientsState.patients}
              onSelectPatient={patientsState.selectPatient}
              appointments={appointments.items}
              onPickAppointment={handlePickAppointment}
              services={services.items}
              supplies={supplies.items}
              offers={offers.items}
              hearingAids={hearingAids.items}
              insuranceCompanies={insurance.items}
              onAddVisit={handleAddVisit}
              onManageAids={() => setModal(MODALS.HEARING_AIDS)}
            />
          )}

          {tab === TABS.SPEECH && (
            <SpeechTab
              draftUser={auth.currentUser.username}
              offers={offers.items}
              patient={selectedPatient}
              patients={patientsState.patients}
              services={services.items}
              supplies={supplies.items}
              insuranceCompanies={insurance.items}
              onSelectPatient={patientsState.selectPatient}
              appointments={appointments.items}
              onPickAppointment={handlePickAppointment}
              onAddVisit={handleAddVisit}
            />
          )}
          {tab === TABS.HOME && (
            <HomeTab
              userName={auth.currentUser.name}
              appointments={appointments.items}
              invoices={invoices}
              supplies={supplies.items}
              can={canOpen}
              onGoTab={changeTab}
            />
          )}
          {tab === TABS.USERS && <UsersTab auth={auth} onNotify={notify} />}
          {tab === TABS.UPDATES && <UpdatesTab onNotify={notify} />}
          {tab === TABS.BACKUP && <BackupTab onNotify={notify} />}
          {tab === TABS.ANNOUNCEMENTS && <AnnouncementsTab onNotify={notify} />}
          {!tab && <p style={{ textAlign: 'center', color: 'var(--c-faint)' }}>لا تملك صلاحية فتح أي شاشة. راجع مدير النظام.</p>}
          {tab === TABS.OFFERS && <OffersTab list={offers} services={services.items} onNotify={notify} />}
          {tab === TABS.SERVICES && <ServicesTab list={services} onNotify={notify} />}
          {tab === TABS.REPORTS && (
            <ReportsTab
              prefsUser={auth.currentUser.username}
              can={auth.can}
              movements={inventory.movements}
              hearingAids={hearingAids.items}
              invoices={invoices}
              patients={patientsState.patients}
              purchases={inventory.purchases}
              supplies={supplies.items}
              insuranceCompanies={insurance.items}
            />
          )}
          {tab === TABS.SUPPLIES && (
            <SuppliesTab list={withRemovalLog(supplies, 'supply')} inventory={inventory} hearingAids={hearingAids.items} onReceiveAids={() => setModal(MODALS.AID_STOCK)} onNotify={notify} />
          )}
          {tab === TABS.SALES && (
            <SalesTab
              patients={patientsState.patients}
              supplies={supplies.items}
              invoices={invoices}
              canConfirmPayment={auth.can(ACTIONS.CONFIRM_PAYMENT)}
              onSell={handleSellSupplies}
              onReturn={auth.can(ACTIONS.RETURN_SALES) ? handleReturnSale : undefined}
              onPreview={setPreviewInvoice}
            />
          )}
          {tab === TABS.SUPPLIERS && <SuppliersTab list={suppliers} purchases={inventory.purchases} onNotify={notify} />}
          {tab === TABS.PURCHASES && <PurchasesTab supplies={supplies} hearingAids={hearingAids.items} suppliers={suppliers.items} inventory={inventory} canEdit={auth.can(ACTIONS.EDIT_PURCHASES)} canDelete={auth.can(ACTIONS.DELETE_PURCHASES)} onNotify={notify} />}
          {tab === TABS.INSURANCE && <InsuranceTab list={insurance} onNotify={notify} />}
          {tab === TABS.SCHEDULE && <ScheduleTab appointments={appointments} patients={patientsState.patients} onNotify={notify} />}

          {tab === TABS.BILLING && (
            <BillingTab
              prefsUser={auth.currentUser.username}
              invoices={invoices}
              onDelete={auth.can(ACTIONS.DELETE_INVOICES) ? handleDeleteInvoice : undefined}
              onRecordPayment={auth.can(ACTIONS.CONFIRM_PAYMENT) ? (inv) => setPayingId(inv.id) : undefined}
              onEdit={auth.can(ACTIONS.EDIT_INVOICES) ? (inv) => setEditingInvoiceId(inv.id) : undefined}
              onPreview={setPreviewInvoice}
            />
          )}
          </>
          )}
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {modal === MODALS.PATIENT && <PatientModal insuranceCompanies={insurance.items} onSubmit={handleAddPatient} onClose={closeModal} />}

      {modal === MODALS.EDIT_PATIENT && selectedPatient && (
        <PatientModal patient={selectedPatient} onSubmit={handleEditPatient} onClose={closeModal} />
      )}

      {modal === MODALS.EDIT_VISIT && selectedPatient && patientsState.selectedVisit && (
        <VisitEditModal
          offers={offers.items}
          patient={selectedPatient}
          visit={patientsState.selectedVisit}
          services={services.items}
          supplies={supplies.items}
          insuranceCompanies={insurance.items}
          onSubmit={handleUpdateVisit}
          onClose={closeModal}
        />
      )}

      {modal === MODALS.HEARING_AIDS && (
        <HearingAidManagerModal list={withRemovalLog(hearingAids, 'hearing_aid')} onNotify={notify} onClose={closeModal} onReceiveStock={() => setModal(MODALS.AID_STOCK)} />
      )}

      {modal === MODALS.AID_STOCK && (
        <HearingAidStockModal aids={hearingAids.items} suppliers={suppliers.items} onSubmit={handleReceiveAids} onClose={closeModal} />
      )}

      {payingId && invoices.find((x) => x.id === payingId) && (
        <PaymentModal invoice={invoices.find((x) => x.id === payingId)} onSubmit={handleRecordPayment} onClose={() => setPayingId(null)} />
      )}
      {editingInvoiceId && invoices.find((x) => x.id === editingInvoiceId) && (
        <EditInvoiceModal offers={offers.items} services={services.items} invoice={invoices.find((x) => x.id === editingInvoiceId)} onSubmit={handleEditInvoice} onClose={() => setEditingInvoiceId(null)} />
      )}

      <Suspense fallback={null}>
      {audiogramPrint && (
        <AudiogramPreviewModal
          patient={audiogramPrint.patient}
          visits={[audiogramPrint.visit]}
          initialVisitId={audiogramPrint.visit.id}
          onClose={() => {
            const { patient, visit } = audiogramPrint;
            setAudiogramPrint(null);
            if (visit.prescription?.trim()) setPrescriptionPrint({ patient, visit });
          }}
        />
      )}
      {prescriptionPrint && (
        <PrescriptionPrintModal patient={prescriptionPrint.patient} visit={prescriptionPrint.visit} onClose={() => setPrescriptionPrint(null)} />
      )}

      {previewInvoice && <InvoicePreviewModal invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
      </Suspense>

      <AnnouncementPopup item={announcements.visible} remaining={announcements.remaining} onAcknowledge={announcements.acknowledge} onPostpone={announcements.postpone} />

      <PrintFooter />
    </div>
    </SuggestionsProvider>
  );
}
