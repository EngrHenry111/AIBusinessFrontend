export const TERMS = { first: 'First term', second: 'Second term', third: 'Third term' };

export const STUDENT_STATUS = {
  active: { label: 'Active', badge: 'success' },
  suspended: { label: 'Suspended', badge: 'warning' },
  withdrawn: { label: 'Withdrawn', badge: 'neutral' },
  graduated: { label: 'Graduated', badge: 'info' },
};

export const APPLICATION_STATUS = {
  submitted: { label: 'New', badge: 'brand' },
  under_review: { label: 'Under review', badge: 'warning' },
  interview: { label: 'Interview', badge: 'info' },
  admitted: { label: 'Admitted', badge: 'success' },
  enrolled: { label: 'Enrolled', badge: 'success' },
  rejected: { label: 'Not admitted', badge: 'danger' },
  withdrawn: { label: 'Withdrawn', badge: 'neutral' },
};

export const BILL_STATUS = {
  unpaid: { label: 'Unpaid', badge: 'danger' },
  partial: { label: 'Part paid', badge: 'warning' },
  paid: { label: 'Paid', badge: 'success' },
  waived: { label: 'Waived', badge: 'info' },
  cancelled: { label: 'Cancelled', badge: 'neutral' },
};

export const PAYMENT_METHODS = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  pos: 'POS',
  cheque: 'Cheque',
  online: 'Online (Paystack)',
};

export const ATTENDANCE = {
  present: { label: 'Present', short: 'P' },
  late: { label: 'Late', short: 'L' },
  absent: { label: 'Absent', short: 'A' },
  excused: { label: 'Excused', short: 'E' },
};

export const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const todayInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const fullName = (s) => (s ? [s.lastName, s.firstName, s.otherNames].filter(Boolean).join(' ') : '');

export const errMsg = (e, fallback = 'Something went wrong') => e?.response?.data?.message || fallback;

// Shareable public links for parents.
export const publicLink = (slug, page) => `${window.location.origin}/schools/${slug}/${page}`;
