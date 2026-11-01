import { Component } from 'react';
import { AlertTriangle, Copy, RefreshCw, RotateCcw } from 'lucide-react';

// خطأ تحميل جزء مؤجَّل (lazy) — يحدث عادة بعد صدور تحديث جديد أو عند انقطاع الاتصال
const isChunkError = (error) =>
  /Loading chunk|dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(`${error?.name ?? ''} ${error?.message ?? ''}`);

// يمنع سقوط التطبيق كله بشاشة بيضاء عند خطأ في مكوّن واحد.
//  - scope="app": يغطي التطبيق كله (شاشة كاملة).
//  - scope="tab": يغطي منطقة الشاشة الحالية فقط ويبقى التنقل والترويسة تعملان؛ resetKey = الشاشة الحالية،
//    فتغيير الشاشة يُعيد المحاولة تلقائياً.
// ملاحظة: التعديلات المحفوظة على السيرفر لا تتأثر، والمسودات المحلية تبقى في المتصفح.
export default class ErrorBoundary extends Component {
  state = { error: null, copied: false };

  static getDerivedStateFromError(error) {
    return { error, copied: false };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  retry = () => this.setState({ error: null });

  copyDetails = async () => {
    const { error } = this.state;
    const text = `${error?.name}: ${error?.message}\n${error?.stack ?? ''}`;
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
    } catch {
      /* الحافظة غير متاحة */
    }
  };

  render() {
    const { error, copied } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkError(error);
    const fullPage = this.props.scope === 'app';
    return (
      <div className={fullPage ? 'error-page' : 'error-panel'} role="alert">
        <div className="error-card">
          <span className="error-icon"><AlertTriangle size={28} aria-hidden="true" /></span>
          <h2 className="error-title">{chunk ? 'تعذّر تحميل هذه الشاشة' : 'حدث خطأ غير متوقع'}</h2>
          <p className="error-text">
            {chunk
              ? 'قد يكون السبب انقطاع الاتصال أو صدور تحديث جديد للتطبيق. أعد تحميل الصفحة للمتابعة.'
              : 'لم تتأثر البيانات المحفوظة. جرّب إعادة المحاولة، وإن تكرر الخطأ فأعد تحميل الصفحة وأبلغ مدير النظام.'}
          </p>
          <div className="error-actions">
            {!chunk && (
              <button type="button" className="btn-warm-primary" onClick={this.retry}>
                <RotateCcw size={16} /> إعادة المحاولة
              </button>
            )}
            <button type="button" className={chunk ? 'btn-warm-primary' : 'error-secondary'} onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> إعادة تحميل الصفحة
            </button>
          </div>
          {!chunk && (
            <details className="error-details">
              <summary>تفاصيل تقنية</summary>
              <pre dir="ltr">{String(error?.message ?? error)}</pre>
              <button type="button" className="error-secondary" onClick={this.copyDetails}>
                <Copy size={14} /> {copied ? 'تم النسخ' : 'نسخ التفاصيل'}
              </button>
            </details>
          )}
        </div>
      </div>
    );
  }
}
