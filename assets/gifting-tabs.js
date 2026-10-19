/**
 * <budget-tabs> - accessible tabs (WAI-ARIA tabs pattern).
 * Click or arrow keys / Home / End switch panels; only the active tab is in the tab order.
 */
if (!customElements.get('budget-tabs')) {
  customElements.define(
    'budget-tabs',
    class BudgetTabs extends HTMLElement {
      connectedCallback() {
        this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
        this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));

        this.tabs.forEach((tab, index) => {
          tab.addEventListener('click', () => this.select(index));
          tab.addEventListener('keydown', (event) => this.onKeydown(event, index));
        });
      }

      select(index, focus = false) {
        this.tabs.forEach((tab, i) => {
          const active = i === index;
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
          this.panels[i].hidden = !active;
        });
        if (focus) this.tabs[index].focus();
      }

      onKeydown(event, index) {
        const rtl = document.documentElement.dir === 'rtl';
        const next = rtl ? 'ArrowLeft' : 'ArrowRight';
        const previous = rtl ? 'ArrowRight' : 'ArrowLeft';
        const last = this.tabs.length - 1;
        let target = null;

        if (event.key === next) target = index === last ? 0 : index + 1;
        else if (event.key === previous) target = index === 0 ? last : index - 1;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = last;

        if (target !== null) {
          event.preventDefault();
          this.select(target, true);
        }
      }
    }
  );
}
