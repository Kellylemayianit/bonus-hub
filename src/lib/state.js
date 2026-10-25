// Account lifecycle: the backbone. Pure functions, no I/O, fully testable.
export const STATUSES = ['pending', 'needs_documents', 'approved', 'rejected', 'suspended'];

const TRANSITIONS = {
  pending:         { approve: 'approved', reject: 'rejected', request_documents: 'needs_documents' },
  needs_documents: { resubmit: 'pending', approve: 'approved', reject: 'rejected' },
  rejected:        { resubmit: 'pending' },
  approved:        { suspend: 'suspended' },
  suspended:       { reinstate: 'approved' },
};

export function transition(from, action) {
  const to = TRANSITIONS[from]?.[action];
  if (!to) throw new Error(`Illegal transition: ${from} --${action}--> ?`);
  return to;
}
export const allowedActions = (from) => Object.keys(TRANSITIONS[from] || {});

// The API asks "can this business sell?", never "is it a manufacturer?"
export const isPublic = (b) => b.status === 'approved';
export const canSell = (b) => b.status === 'approved' && !!b.can_sell;
export const canBuy = (b) => b.status === 'approved' && !!b.can_buy;
export const canChat = (b) => b.status === 'approved';

// Supply-chain defaults; anything beyond must be declared and is confirmed by admin.
export function defaultCaps(role) {
  return { manufacturer: { can_sell: 1, can_buy: 0 },
           supplier:     { can_sell: 1, can_buy: 1 },
           wholesaler:   { can_sell: 0, can_buy: 1 } }[role];
}
export const ROLES = ['manufacturer', 'supplier', 'wholesaler'];
