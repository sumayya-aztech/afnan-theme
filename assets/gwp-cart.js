/**
 * <free-gift-manager> - keeps the free gift line in step with the cart.
 *
 *   qualifying product in cart + no gift line   -> add the gift (quantity 1)
 *   no qualifying product      + gift line      -> remove the gift
 *   gift line quantity > 1                      -> set it back to 1
 *   gift out of stock                           -> show a message, never touch the cart
 *
 * The 100% discount itself is an automatic Buy X Get Y discount in Shopify admin.
 * Runs on every cart change (Dawn publishes PUB_SUB_EVENTS.cartUpdate) and when the page loads.
 */
if (!customElements.get('free-gift-manager')) {
  customElements.define(
    'free-gift-manager',
    class FreeGiftManager extends HTMLElement {
      connectedCallback() {
        this.qualifying = new Set(
          (this.dataset.qualifying || '').split(',').filter(Boolean).map(Number)
        );
        this.giftHandle = this.dataset.giftHandle;
        this.giftVariant = Number(this.dataset.giftVariant);
        this.giftAvailable = this.dataset.giftAvailable === 'true';
        this.unlocked = this.querySelector('[data-unlocked]');
        this.locked = this.querySelector('[data-locked]');
        this.outOfStock = this.querySelector('[data-out-of-stock]');
        this.queue = Promise.resolve();

        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.unsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.sync());
        }
        this.sync();
      }

      disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
      }

      // One sync at a time, so quick changes cannot add two gifts.
      sync() {
        this.queue = this.queue.then(() => this.run()).catch(() => {});
        return this.queue;
      }

      async getCart() {
        const response = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
        return response.json();
      }

      async change(line, quantity) {
        await fetch(this.dataset.changeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line, quantity }),
        });
      }

      show(state) {
        this.unlocked.hidden = state !== 'unlocked';
        this.locked.hidden = state !== 'locked';
        this.outOfStock.hidden = state !== 'out-of-stock';
      }

      async run() {
        const cart = await this.getCart();
        const isGift = (item) => item.handle === this.giftHandle;
        const qualifies = cart.items.some((item) => !isGift(item) && this.qualifying.has(item.product_id));
        const giftIndex = cart.items.findIndex(isGift);
        const gift = giftIndex === -1 ? null : cart.items[giftIndex];

        // Rule not met: no gift may stay in the cart (also blocks buying the gift on its own).
        if (!qualifies) {
          if (gift) {
            await this.change(giftIndex + 1, 0);
            window.location.reload();
            return;
          }
          this.show('locked');
          return;
        }

        // Rule met, gift already there: make sure there is exactly one.
        if (gift) {
          if (gift.quantity !== 1) {
            await this.change(giftIndex + 1, 1);
            window.location.reload();
            return;
          }
          this.show('unlocked');
          return;
        }

        // Rule met, gift missing: add it unless it is out of stock.
        if (!this.giftAvailable) {
          this.show('out-of-stock');
          return;
        }

        const response = await fetch(this.dataset.addUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: [{ id: this.giftVariant, quantity: 1, properties: { _free_gift: 'true' } }],
          }),
        });

        if (!response.ok) {
          // Sold out between page load and now (422): tell the customer, leave the cart alone.
          this.giftAvailable = false;
          this.show('out-of-stock');
          return;
        }
        window.location.reload();
      }
    }
  );
}
