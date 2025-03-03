import database from '../services/database';
import { Item, Team, TransactionState } from '../types';

export const fetchAllItems = async (): Promise<Item[]> => {
  // fetches the items
  let items = await database.item.findMany();
  const order = [
    'tshirt-f-s',
    'tshirt-f-m',
    'tshirt-f-l',
    'tshirt-f-xl',
    'tshirt-h-s',
    'tshirt-h-m',
    'tshirt-h-l',
    'tshirt-h-xl',
  ];
  // sort items according to size attribute
  items = items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  // Add a left property which tells how many items are there left
  return Promise.all(
    items.map(async (item): Promise<Item> => {
      // Defines the left variable to undefined
      let left;

      // If the item contains stocks, computes the left variables
      if (typeof item.stock === 'number') {
        // Fetches all the cart items related to the item
        const cartItems = await database.cartItem.findMany({
          where: {
            itemId: item.id,
            cart: {
              transactionState: {
                in: [TransactionState.paid, TransactionState.pending],
              },
            },
          },
        });

        // Calculates how many items where ordered by adding all the quantity ordered
        const count = cartItems.reduce((previous, current) => previous + current.quantity, 0);

        // Returns the stock minus the count. The max 0 is used in case of negative number, which should never happen
        left = Math.max(item.stock - count, 0);
      }

      return {
        ...item,
        left,
      };
    }),
  );
};

export const fetchUserItems = async (team: Team) => {
  let items = await fetchAllItems();

  // Check if user is not in SSBU tournament
  if (!team || team.tournamentId !== 'ssbu') {
    // Remove the SSBU discount
    items = items.filter((element) => element.id !== 'discount-switch-ssbu');
  }

  return items;
};
