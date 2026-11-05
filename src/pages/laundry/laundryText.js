import { money } from '../services/svc';

// Messages a laundry sends its customers on WhatsApp.
export function readyMessage(o, company) {
  const items = o.pieces ? `${o.pieces} item${o.pieces === 1 ? '' : 's'}` : 'items';
  return [
    `Hello ${o.customer.name}, your clothes are ready! 👕`,
    `Ticket: ${o.ticketNumber} (${items})`,
    o.balance > 0 ? `Balance to pay: ${money(o.balance, o.currency)}` : 'Your bill is fully paid.',
    o.delivery ? 'We will bring them to you shortly.' : 'You can pick them up any time we are open.',
    '',
    `${company?.companyName || ''}`.trim(),
  ].join('\n');
}

export function receivedMessage(o, company) {
  return [
    `Hello ${o.customer.name}, thank you for choosing ${company?.companyName || 'us'}!`,
    `Ticket: ${o.ticketNumber}`,
    `Items: ${o.items.map((i) => `${i.quantity}${i.unit === 'kg' ? 'kg' : ''} ${i.item} (${i.service})`).join(', ')}`,
    `Total: ${money(o.total, o.currency)}${o.amountPaid > 0 ? `, paid ${money(o.amountPaid, o.currency)}, balance ${money(o.balance, o.currency)}` : ''}`,
    `Ready by: ${new Date(o.dueAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}`,
    'Please keep this ticket number for collection.',
  ].join('\n');
}
