// One list for sign-up and Settings. The values are stored on the company:
// "legal" turns on Legal Practice and "education" turns on School in the sidebar.
export const INDUSTRIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'legal', label: 'Legal Services / Law Firm' },
  { value: 'education', label: 'Education' },
  { value: 'government', label: 'Government' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];

// Which Business tools each industry uses most, in the order they appear
// in the sidebar. Tools not listed stay one click away under "More tools".
// Industries without a profile (Other, unset) see every tool.
export const INDUSTRY_TOOLS = {
  technology: ['/leads', '/customers', '/meetings', '/invoices', '/contracts', '/expenses', '/payroll', '/reports', '/social'],
  finance: ['/customers', '/leads', '/meetings', '/invoices', '/contracts', '/expenses', '/payroll', '/procurement', '/reports'],
  healthcare: ['/invoices', '/expenses', '/payroll', '/procurement', '/contracts', '/customers', '/reports'],
  retail: ['/orders', '/products', '/customers', '/loyalty', '/group-buys', '/invoices', '/expenses', '/payroll', '/social', '/reports'],
  manufacturing: ['/orders', '/products', '/customers', '/invoices', '/procurement', '/expenses', '/payroll', '/contracts', '/leads', '/reports'],
  consulting: ['/leads', '/customers', '/meetings', '/appointments', '/invoices', '/contracts', '/expenses', '/payroll', '/social', '/reports'],
  legal: ['/customers', '/appointments', '/meetings', '/invoices', '/contracts', '/expenses', '/payroll', '/leads', '/reports'],
  education: ['/invoices', '/expenses', '/payroll', '/procurement', '/contracts', '/meetings', '/social', '/reports'],
  government: ['/procurement', '/contracts', '/expenses', '/payroll', '/meetings', '/invoices', '/reports'],
  logistics: ['/orders', '/customers', '/invoices', '/contracts', '/expenses', '/payroll', '/procurement', '/leads', '/reports'],
  agriculture: ['/products', '/orders', '/customers', '/group-buys', '/invoices', '/expenses', '/payroll', '/procurement', '/contracts', '/reports'],
};
