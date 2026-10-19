/**
 * <cart-gift-options> - gift checkbox, gift message (max 150) and gift wrap on the cart page.
 *
 * What gets saved on the order:
 *   - cart attributes "Gift", "Gift message" and "Gift wrap" (Shopify copies them to the order)
 *   - a Gift Wrap cart line (so the charge appears and the warehouse sees it)
 *
 * Saves are serialised through one promise chain, and the checkout button waits for it, so the
 * latest message is always on the cart when the customer reaches checkout.
 */
if (!customElements.get('cart-gift-options')) {
  customElements.define(
    'cart-gift-options',
    class CartGiftOptions extends HTMLElement {
      connectedCallback() {
        this.giftInput = this.querySelector('[data-gift]');
        this.messageInput = this.querySelector('[data-message]');
        this.wrapInput = this.querySelector('[data-wrap]');
        this.details = this.querySelector('[data-details]');
        this.counter = this.querySelector('[data-count]');
        this.statusEl = this.querySelector('[data-status]');
        this.wrapHandle = this.dataset.wrapHandle;
        this.queue = Promise.resolve();
        this.dirty = false;

        this.giftInput.addEventListener('change', () => this.onGiftChange());
        this.messageInput.addEventListener('input', () => this.onMessageInput());
        this.messageInput.addEventListener('blur', () => this.flushSoon());
        if (this.wrapInput) this.wrapInput.addEventListener('change', () => this.schedule({ reload: true }));

        // The checkout button must wait for any pending save.
        this.onCheckoutClick = (event) => this.interceptCheckout(event);
        document.addEventListener('click', this.onCheckoutClick, true);

        // If the customer removes the wrap line in the cart table, keep the checkbox honest.
        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.unsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.syncFromCart());
        }

        this.updateCounter();
        this.syncFromCart();
      }

      disconnectedCallback() {
        document.removeEventListener('click', this.onCheckoutClick, true);
        if (this.unsubscribe) this.unsubscribe();
      }

      get wantsGift() {
        return this.giftInput.checked;
      }

      get wantsWrap() {
        return this.wantsGift && Boolean(this.wrapInput && this.wrapInput.checked);
      }

      onGiftChange() {
        this.details.hidden = !this.wantsGift;
        if (!this.wantsGift) {
          this.messageInput.value = '';
          if (this.wrapInput) this.wrapInput.checked = false;
          this.updateCounter();
        }
        this.schedule({ reload: true });
      }

      onMessageInput() {
        this.updateCounter();
        this.dirty = true;
        clearTimeout(this.debounce);
        this.debounce = setTimeout(() => this.schedule({ reload: false }), 600);
      }

      flushSoon() {
        if (!this.dirty) return;
        clearTimeout(this.debounce);
        this.schedule({ reload: false });
      }

      updateCounter() {
        this.counter.textContent = this.messageInput.value.length;
      }

      showStatus(text) {
        this.statusEl.textContent = text;
        this.statusEl.hidden = !text;
      }

      schedule({ reload }) {
        this.dirty = true;
        this.queue = this.queue.then(() => this.save({ reload })).catch(() => {});
        return this.queue;
      }

      async post(url, body) {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok || data.status) throw new Error(data.description || data.message || this.dataset.error);
        return data;
      }

      async save({ reload }) {
        const gift = this.wantsGift;
        const attributes = {
          Gift: gift ? 'Yes' : '',
          'Gift message': gift ? this.messageInput.value.trim().slice(0, 150) : '',
          'Gift wrap': gift ? (this.wantsWrap ? 'Yes' : 'No') : '',
        };

        try {
          this.showStatus('');
          await this.post(this.dataset.updateUrl, { attributes });
          const changedLines = await this.reconcileWrapLine(this.wantsWrap);
          this.dirty = false;
          if (reload && changedLines) window.location.reload();
        } catch (error) {
          this.showStatus(error.message || this.dataset.error);
          throw error;
        }
      }

      // Make the Gift Wrap line match the checkbox: exactly one line when wanted, none otherwise.
      async reconcileWrapLine(wanted) {
        const cart = await (await fetch('/cart.js', { headers: { Accept: 'application/json' } })).json();
        const index = cart.items.findIndex((item) => item.handle === this.wrapHandle);
        const line = index === -1 ? null : cart.items[index];

        if (wanted && !line) {
          await this.post(this.dataset.addUrl, {
            items: [{ id: Number(this.dataset.wrapVariant), quantity: 1, properties: { _gift_wrap: 'true' } }],
          });
          return true;
        }
        if (wanted && line.quantity !== 1) {
          await this.post(this.dataset.changeUrl, { line: index + 1, quantity: 1 });
          return true;
        }
        if (!wanted && line) {
          await this.post(this.dataset.changeUrl, { line: index + 1, quantity: 0 });
          return true;
        }
        return false;
      }

      // Cart changed elsewhere (quantity buttons, remove link): reflect it in the checkbox.
      async syncFromCart() {
        try {
          const cart = await (await fetch('/cart.js', { headers: { Accept: 'application/json' } })).json();
          if (!this.wrapInput) return;
          const hasWrap = cart.items.some((item) => item.handle === this.wrapHandle);
          if (hasWrap !== this.wrapInput.checked && !this.dirty) {
            this.wrapInput.checked = hasWrap;
            if (hasWrap && !this.giftInput.checked) {
              this.giftInput.checked = true;
              this.details.hidden = false;
            }
            await this.schedule({ reload: false });
          }
        } catch (error) {
          /* the customer can still use the form; saving reports its own errors */
        }
      }

      async interceptCheckout(event) {
        const button = event.target.closest('[name="checkout"]');
        if (!button || this.skipIntercept) return;

        event.preventDefault();
        event.stopPropagation();
        button.setAttribute('aria-busy', 'true');

        try {
          clearTimeout(this.debounce);
          await this.schedule({ reload: false });
        } catch (error) {
          button.removeAttribute('aria-busy');
          this.showStatus(error.message || this.dataset.error);
          return;
        }

        this.skipIntercept = true;
        const form = document.getElementById('cart');
        if (form && form.requestSubmit) form.requestSubmit(button);
        else window.location.assign('/checkout');
      }
    }
  );
}
