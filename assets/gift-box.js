/**
 * <gift-box-builder> - pick exactly N perfumes and add them to the cart as ONE gift box line.
 * The box is the "Gift Box" product (fixed price). The picks are stored as line item properties
 * ("Perfume 1", "Perfume 2", ...) so they appear on the cart, the order and the packing slip.
 */
if (!customElements.get('gift-box-builder')) {
  customElements.define(
    'gift-box-builder',
    class GiftBoxBuilder extends HTMLElement {
      connectedCallback() {
        this.limit = Number(this.dataset.limit) || 3;
        this.boxVariant = Number(this.dataset.boxVariant);
        this.boxPrice = Number(this.dataset.boxPrice);
        this.inputs = Array.from(this.querySelectorAll('.gift-box__input'));
        this.slots = Array.from(this.querySelectorAll('[data-slot]'));
        this.countEl = this.querySelector('[data-count]');
        this.addButton = this.querySelector('[data-add]');
        this.messageEl = this.querySelector('[data-message]');
        this.savingsEl = this.querySelector('[data-savings]');
        this.savingsValueEl = this.querySelector('[data-savings-value]');
        this.currency = new Intl.NumberFormat(document.documentElement.lang || 'en', {
          style: 'currency',
          currency: this.dataset.currency || 'AED',
        });

        this.inputs.forEach((input) => input.addEventListener('change', () => this.onChange(input)));
        this.slots.forEach((slot) => slot.addEventListener('click', (event) => this.onSlotClick(event)));
        this.addButton.addEventListener('click', () => this.addToCart());
        this.render();
      }

      get selected() {
        return this.inputs.filter((input) => input.checked);
      }

      onChange(input) {
        if (input.checked && this.selected.length > this.limit) {
          input.checked = false;
        }
        this.render();
      }

      onSlotClick(event) {
        const remove = event.target.closest('[data-remove]');
        if (!remove) return;
        const input = this.inputs.find((item) => item.value === remove.dataset.remove);
        if (input) {
          input.checked = false;
          this.render();
          input.focus();
        }
      }

      money(cents) {
        return this.currency.format(cents / 100);
      }

      render() {
        const picks = this.selected;
        const full = picks.length >= this.limit;

        this.countEl.textContent = picks.length;
        this.addButton.disabled = picks.length !== this.limit;

        // Once the box is full, lock the remaining cards so the limit is obvious.
        this.inputs.forEach((input) => {
          if (input.dataset.variantId) input.disabled = full && !input.checked;
          input.closest('.gift-box__card').classList.toggle('is-selected', input.checked);
        });

        this.slots.forEach((slot, index) => {
          const input = picks[index];
          if (!input) {
            slot.className = 'gift-box__slot';
            slot.innerHTML = `<span class="gift-box__slot-label">${this.dataset.pickLabel} ${index + 1}</span>`;
            return;
          }
          slot.className = 'gift-box__slot is-filled';
          slot.innerHTML = '';
          const image = document.createElement('img');
          image.src = input.dataset.image;
          image.alt = '';
          image.width = 40;
          image.height = 40;
          const name = document.createElement('span');
          name.className = 'gift-box__slot-name';
          name.textContent = input.dataset.title;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'gift-box__slot-remove';
          button.dataset.remove = input.value;
          button.setAttribute('aria-label', `Remove ${input.dataset.title}`);
          button.textContent = '×';
          slot.append(image, name, button);
        });

        const retail = picks.reduce((sum, input) => sum + Number(input.dataset.price), 0);
        const saving = retail - this.boxPrice;
        const showSaving = full && saving > 0;
        this.savingsEl.hidden = !showSaving;
        if (showSaving) this.savingsValueEl.textContent = this.money(saving);

        this.showMessage('');
      }

      showMessage(text) {
        this.messageEl.textContent = text;
        this.messageEl.hidden = !text;
      }

      async addToCart() {
        const picks = this.selected;
        if (picks.length !== this.limit) return;

        const properties = {};
        picks.forEach((input, index) => {
          const sku = input.dataset.sku ? ` (SKU ${input.dataset.sku})` : '';
          // Property names stay in English on purpose: the warehouse reads the same labels in every language.
          properties[`Perfume ${index + 1}`] =
            `${input.dataset.title} - ${input.dataset.variantTitle}${sku}`;
        });

        this.addButton.disabled = true;
        this.addButton.setAttribute('aria-busy', 'true');

        try {
          const response = await fetch(this.dataset.addUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ items: [{ id: this.boxVariant, quantity: 1, properties }] }),
          });
          const data = await response.json();
          if (!response.ok || data.status) {
            throw new Error(data.description || data.message || this.dataset.error);
          }
          window.location.assign(this.dataset.cartUrl);
        } catch (error) {
          this.showMessage(error.message || this.dataset.error);
          this.addButton.disabled = false;
          this.addButton.removeAttribute('aria-busy');
        }
      }
    }
  );
}
