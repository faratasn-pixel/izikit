import 'server-only';

export const VISIT_STATUSES = ['CONFIRMEE', 'EN_ATTENTE', 'ANNULEE'] as const;
export const VISIT_TYPES = ['PRESENTIEL', 'VIRTUELLE'] as const;

export const VISIT_SELECT = {
  id: true,
  scheduledAt: true,
  type: true,
  status: true,
  notes: true,
  createdAt: true,
  inquiry: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          propertyType: true,
          transactionType: true,
          price: true,
          currency: true,
        },
      },
    },
  },
} as const;
