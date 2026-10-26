import { useEffect, useState } from 'react';
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
import UsersTab from './features/users/UsersTab';
import UpdatesTab from './features/updates/UpdatesTab';
import BackupTab from './features/backup/BackupTab';
import UpdateBanner from './components/common/UpdateBanner';
import { useAppointments } from './hooks/useAppointments';
import { useCrudList } from './hooks/useCrudList';
import { useInventory } from './hooks/useInventory';
import { invoiceCopay, useInvoices } from './hooks/useInvoices';
import { stockReturnsFor } from './features/billing/stockReturn';
import { SuggestionsProvider } from './components/common/SuggestionsContext';
import { usePatients } from './hooks/usePatients';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';

import Toast from './components/common/Toast';
import { PrintFooter } from './components/common/PrintBrand';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

import PatientsTab from './features/patients/PatientsTab';
import PatientModal from './features/patients/PatientModal';
import VisitEditModal from './features/patients/VisitEditModal';
import EntTab from './features/ent/EntTab';
import AudioTab from './features/audio/AudioTab';
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
import PrescriptionPrintModal from './features/ent/PrescriptionPrintModal';
import OffersTab from './features/offers/OffersTab';
import ReportsTab from './features/reports/ReportsTab';
import BillingTab from './features/billing/BillingTab';
import PaymentModal from './features/billing/PaymentModal';
import EditInvoiceModal from './features/billing/EditInvoiceModal';
import InvoicePreviewModal from './features/billing/InvoicePreviewModal';

// أسماء النوافذ المنبثقة التي تُدار من هنا (نافذة واحدة مفتوحة كحد أقصى)
const MODALS = {
  PATIENT: 'patient',
  EDIT_VISIT: 'edit-visit',
  HEARING_AIDS: 'hearingAids',
  AID_STOCK: 'aidStock',
};

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.PATIENTS);
  const [modal, setModal] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [prescriptionPrint, setPrescriptionPrint] = useState(null); // { patient, visit } بعد حفظ زيارة فيها وصفة

  const auth = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { message: toastMessage, show: notify } = useToast();

  // البيانات تُحمَّل من السيرفر وتُحفظ عليه فقط بعد تسجيل الدخول
  const enabled = Boolean(auth.currentUser) && !auth.currentUser.must_change_password;
  // ترويسة كل مطبوعة تحمل "طُبع بواسطة: المستخدم الحالي"
  setPrintUser(auth.currentUser ? formatUser(auth.currentUser.name, auth.currentUser.username) : '');

  // أخطاء الاتصال/الحفظ القادمة من طبقة المزامنة تظهر كإشعار
  useEffect(() => {
    const onError = (e) => notify(e.detail, 6000);
    window.addEventListener('clinic-sync-error', onError);
    return () => window.removeEventListener('clinic-sync-error', onError);
  }, [notify]);

  const patientsState = usePatients(enabled);
  const { selectedPatient } = patientsState;
  const { invoices, createInvoice, recordPayment, applySaleReturn, updateInvoice, cancelInvoice, removeInvoice } = useInvoices(enabled, auth.currentUser);
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
  const handleSellSupplies = ({ patient, customerName, lines, items, paidNow }) => {
    const invoice = createInvoice({
      patientName: customerName,
      patientId: patient?.id ?? null,
      items,
      paid: paidNow ? '' : 0, // '' = كامل المستحق
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

    const refund = applySaleReturn(invoice.id, { entry: result.entry, newItems: result.items, stockLines: result.stockLines });
    if (result.stockBack.length > 0) {
      // qty سالب في adjustUsage = إرجاع للمخزون (يُسجَّل في الحركة كـ «إرجاع للمخزون»)
      inventory.adjustUsage(result.stockBack.map((s) => ({ id: s.id, name: s.name, qty: -s.qty })), `مرتجع بيع: ${invoice.patient_name} (${invoice.inv_no})`);
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
      notify(error.message || 'تعذر تسجيل مشتريات السماعات.', 4000);
      return;
    }
    if (!result) return;
    closeModal();
    notify(`تم تسجيل شراء ${result.qty} × ${result.name} ضمن المشتريات (${result.purchase.no}) وإضافتها للمخزون.`, 4500);
  };

  const handleAddPatient = async (form) => {
    const saved = await patientsState.addPatient(form, auth.currentUser.name);
    closeModal();
    notify(`تم التسجيل بنجاح! رقم الملف هو ${saved.file_number}${form.previousAudiogram ? ' (وحُفظ تخطيط السمع السابق)' : ''}`, 5000);
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
          insurance: details.insurance_company
            ? { name: details.insurance_company, copay: details.insurance_copay }
            : null,
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
    // إن أُدخلت وصفة نفتح نافذة طباعتها فور الحفظ
    if (visit?.prescription?.trim()) setPrescriptionPrint({ patient: selectedPatient, visit });
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
      const invoiceGone = Boolean(visit.invoice_id) && !invoices.some((i) => i.id === visit.invoice_id);
      const before = { ...(visit.charges ?? EMPTY_CHARGES), ...(invoiceGone ? { supplies: [] } : {}) };

      // 1) المخزون: الفرق بين الكميات الجديدة والقديمة لكل مستلزم (موجب = استهلاك إضافي، سالب = إرجاع)
      const oldQty = new Map(before.supplies.map((s) => [s.id, s.qty]));
      const newQty = new Map(charges.supplies.map((s) => [s.id, s.qty]));
      const names = new Map([...before.supplies, ...charges.supplies].map((s) => [s.id, s.name]));
      const deltas = [...new Set([...oldQty.keys(), ...newQty.keys()])].map((id) => ({
        id,
        name: names.get(id),
        qty: (newQty.get(id) ?? 0) - (oldQty.get(id) ?? 0),
      }));
      inventory.adjustUsage(deltas, `تعديل زيارة: ${selectedPatient.name} (${visit.department})`);

      // 2) الفاتورة: تحديث الموجودة أو إنشاء جديدة أو إلغاؤها إذا لم يبقَ شيء
      const item = withChargeOffer(toInvoiceItem(charges));
      const insuranceInfo = changes.insurance_company
        ? { name: changes.insurance_company, copay: changes.insurance_copay }
        : null;
      let invoiceId = visit.invoice_id ?? null;
      if (invoiceId && !invoices.some((i) => i.id === invoiceId)) invoiceId = null; // الفاتورة حُذفت من قسم الفواتير

      if (item && invoiceId) {
        updateInvoice(invoiceId, { service: item.service, total: item.total, items: item.items, insurance: insuranceInfo });
      } else if (item) {
        invoiceId = createInvoice({ patientName: selectedPatient.name, patientId: selectedPatient.id, service: item.service, total: item.total, items: item.items, paid: 0, insurance: insuranceInfo }).id;
      } else if (invoiceId && cancelInvoice(invoiceId)) {
        invoiceId = null;
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
  const handleDeleteVisit = (visit) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الزيارة؟')) return;

    // فاتورة الزيارة محذوفة أصلاً: المستلزمات والسماعة أُرجعت وقت حذفها فلا نعرض إرجاعها مرة ثانية
    const invoiceGone = Boolean(visit.invoice_id) && !invoices.some((i) => i.id === visit.invoice_id);

    if (!invoiceGone && visit.charges && hasCharges(visit.charges)) {
      const revert = window.confirm(
        'هذه الزيارة تحتوي إجراءات/مستلزمات.\nهل تريد أيضاً إلغاء فاتورتها وإرجاع المستلزمات للمخزون؟\n(موافق = نعم، إلغاء = إبقاء الفاتورة والمخزون كما هما)'
      );
      if (revert) {
        inventory.adjustUsage(
          visit.charges.supplies.map((s) => ({ id: s.id, name: s.name, qty: -s.qty })),
          `حذف زيارة: ${selectedPatient.name}`
        );
        if (visit.invoice_id) cancelInvoice(visit.invoice_id);
      }
    }

    if (!invoiceGone && visit.hearing_aid_id && window.confirm('هذه الزيارة تتضمن بيع سماعة.\nهل تريد إرجاعها لمخزون السماعات وإلغاء فاتورتها؟\n(موافق = نعم، إلغاء = إبقاء المخزون والفاتورة كما هما)')) {
      inventory.returnHearingAid(visit.hearing_aid_id, `حذف زيارة: ${selectedPatient.name}`);
      if (visit.invoice_id) cancelInvoice(visit.invoice_id);
    }

    patientsState.deleteVisit(selectedPatient.id, visit.id);
    notify('تم حذف الزيارة بنجاح.');
  };

  // اختيار مريض محجوز من قائمة العيادة: نفتح ملفه ونسجّل وصوله
  const handlePickAppointment = (appt) => {
    const patient = patientsState.patients.find((p) => (appt.patient_id ? p.id === appt.patient_id : p.name === appt.patient_name));
    if (!patient) {
      notify(`لا يوجد ملف مسجّل باسم ${appt.patient_name}. سجّله أولاً من سجل المرضى.`, 4000);
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
    remove: (id) => {
      const item = list.items.find((i) => String(i.id) === String(id));
      if (item) inventory.recordRemoval(item, itemType);
      list.remove(id);
    },
  });
  const canReturnAids = ['audio', 'ent', 'speech', 'supplies', 'purchases'].some((p) => auth.can(p));
  const handleDeleteInvoice = (inv) => {
    const back = stockReturnsFor({
      invoice: inv,
      patients: patientsState.patients,
      supplies: supplies.items,
      hearingAids: hearingAids.items,
      isSale: inv.source === SALE_SOURCE,
    });
    const returnAid = Boolean(back.aid) && canReturnAids;
    const restored = [...back.supplies.map((s) => `${s.name} × ${s.qty}`), ...(returnAid ? [back.aid.name] : [])];

    const warning = inv.paid > 0 ? `\nتنبيه: سُجّل عليها مدفوعات (${inv.paid} د.أ) وستختفي من الحسابات والتقارير.` : '';
    const stockNote = restored.length > 0 ? `\nسيُعاد إلى المخزون: ${restored.join('، ')}.` : '';
    const aidNote = back.aid && !returnAid ? `\nلن تُرجَع ${back.aid.name} تلقائياً لأن حسابك لا يملك صلاحية مخزون السماعات.` : '';
    if (!window.confirm(`حذف الفاتورة ${inv.inv_no} (${inv.patient_name}) بالكامل؟${warning}${stockNote}${aidNote}`)) return;

    const note = `حذف فاتورة ${inv.inv_no}`;
    if (back.supplies.length > 0) inventory.adjustUsage(back.supplies.map((s) => ({ id: s.id, name: s.name, qty: -s.qty })), note);
    if (returnAid) inventory.returnHearingAid(back.aid.id, note);
    removeInvoice(inv.id);
    notify(restored.length > 0 ? 'تم حذف الفاتورة وإرجاع الكميات إلى المخزون.' : 'تم حذف الفاتورة.');
  };

  const handleRecordPayment = (id, amount) => {
    recordPayment(id, amount);
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
  const changeTab = (next) => {
    if (next !== activeTab) patientsState.clearSelection();
    setActiveTab(next);
  };

  const handleLogout = () => {
    setModal(null);
    setPreviewInvoice(null);
    setPrescriptionPrint(null);
    patientsState.clearSelection();
    auth.logout();
  };

  // ===== بوابة الدخول (بعد استدعاء كل الـ hooks كي تبقى بيانات الجلسة محفوظة عند الخروج) =====
  if (!auth.ready) return null; // التحقق من جلسة محفوظة
  if (!auth.currentUser) {
    return <LoginScreen onLogin={auth.login} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (auth.currentUser.must_change_password) {
    return (
      <ChangePasswordScreen user={auth.currentUser} onChange={auth.changeOwnPassword} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
    );
  }

  // الشاشة المعروضة: المختارة إن كانت مسموحة، وإلا أول شاشة يملك صلاحيتها
  // شاشة التحديثات لمدير النظام فقط (والخادم يفرض ذلك أيضاً)
  const isAdmin = auth.currentUser.role === 'admin';
  const canOpen = (id) => (id === TABS.UPDATES || id === TABS.BACKUP ? isAdmin : auth.can(id));
  const tab = canOpen(activeTab) ? activeTab : auth.firstAllowedTab;
  const canManageVisits = auth.can(ACTIONS.MANAGE_VISITS);
  const canIssueDocuments = auth.can(ACTIONS.ISSUE_DOCUMENTS);
  const canDeleteDocuments = auth.can(ACTIONS.DELETE_DOCUMENTS);

  // إصدار وثيقة باسم المستخدم الحالي (الطبيب المعالج) وحذفها
  const documentActions =
    canIssueDocuments || canDeleteDocuments
      ? {
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
      <Toast message={toastMessage} />
      <UpdateBanner />
      <Header theme={theme} onToggleTheme={toggleTheme} user={auth.currentUser} onLogout={handleLogout} />

      <div className="workspace-layout">
        <Sidebar activeTab={tab} onChange={changeTab} can={canOpen} />

        <main className="warm-content">
          {tab === TABS.PATIENTS && (
            <PatientsTab
              loading={patientsState.loading}
              patients={patientsState.patients}
              selectedPatient={selectedPatient}
              selectedVisit={patientsState.selectedVisit}
              onSelectPatient={patientsState.selectPatient}
              onSelectVisit={patientsState.selectVisit}
              onNewPatient={() => setModal(MODALS.PATIENT)}
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
              patient={selectedPatient}
              patients={patientsState.patients}
              onSelectPatient={patientsState.selectPatient}
              appointments={appointments.items}
              onPickAppointment={handlePickAppointment}
              services={services.items}
              hearingAids={hearingAids.items}
              insuranceCompanies={insurance.items}
              onAddVisit={handleAddVisit}
              onManageAids={() => setModal(MODALS.HEARING_AIDS)}
            />
          )}

          {tab === TABS.SPEECH && (
            <SpeechTab
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
          {tab === TABS.USERS && <UsersTab auth={auth} onNotify={notify} />}
          {tab === TABS.UPDATES && <UpdatesTab onNotify={notify} />}
          {tab === TABS.BACKUP && <BackupTab onNotify={notify} />}
          {!tab && <p style={{ textAlign: 'center', color: 'var(--c-faint)' }}>لا تملك صلاحية فتح أي شاشة. راجع مدير النظام.</p>}
          {tab === TABS.OFFERS && <OffersTab list={offers} services={services.items} onNotify={notify} />}
          {tab === TABS.SERVICES && <ServicesTab list={services} onNotify={notify} />}
          {tab === TABS.REPORTS && (
            <ReportsTab
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
          {tab === TABS.PURCHASES && <PurchasesTab supplies={supplies} suppliers={suppliers.items} inventory={inventory} onNotify={notify} />}
          {tab === TABS.INSURANCE && <InsuranceTab list={insurance} onNotify={notify} />}
          {tab === TABS.SCHEDULE && <ScheduleTab appointments={appointments} patients={patientsState.patients} onNotify={notify} />}

          {tab === TABS.BILLING && (
            <BillingTab
              invoices={invoices}
              onDelete={auth.can(ACTIONS.DELETE_INVOICES) ? handleDeleteInvoice : undefined}
              onRecordPayment={auth.can(ACTIONS.CONFIRM_PAYMENT) ? (inv) => setPayingId(inv.id) : undefined}
              onEdit={auth.can(ACTIONS.EDIT_INVOICES) ? (inv) => setEditingInvoiceId(inv.id) : undefined}
              onPreview={setPreviewInvoice}
            />
          )}
        </main>
      </div>

      {modal === MODALS.PATIENT && <PatientModal insuranceCompanies={insurance.items} onSubmit={handleAddPatient} onClose={closeModal} />}

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

      {prescriptionPrint && (
        <PrescriptionPrintModal patient={prescriptionPrint.patient} visit={prescriptionPrint.visit} onClose={() => setPrescriptionPrint(null)} />
      )}

      {previewInvoice && <InvoicePreviewModal invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}

      <PrintFooter />
    </div>
    </SuggestionsProvider>
  );
}
