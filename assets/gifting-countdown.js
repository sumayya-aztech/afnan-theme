/**
 * <eid-countdown data-target="2027-03-09T00:00:00+04:00" data-done="Eid Mubarak!">
 * Counts down to the target date. Numbers are formatted for the page language (Arabic digits on /ar).
 */
if (!customElements.get('eid-countdown')) {
  customElements.define(
    'eid-countdown',
    class EidCountdown extends HTMLElement {
      connectedCallback() {
        this.target = new Date(this.dataset.target).getTime();
        this.units = {
          days: this.querySelector('[data-unit="days"]'),
          hours: this.querySelector('[data-unit="hours"]'),
          minutes: this.querySelector('[data-unit="minutes"]'),
          seconds: this.querySelector('[data-unit="seconds"]'),
        };
        this.format = new Intl.NumberFormat(document.documentElement.lang || 'en', { minimumIntegerDigits: 2 });
        this.tick();
        this.timer = setInterval(() => this.tick(), 1000);
      }

      disconnectedCallback() {
        clearInterval(this.timer);
      }

      tick() {
        if (Number.isNaN(this.target)) return;
        const remaining = Math.max(0, this.target - Date.now());

        if (remaining === 0) {
          clearInterval(this.timer);
          this.textContent = this.dataset.done || '';
          return;
        }

        const totalSeconds = Math.floor(remaining / 1000);
        const values = {
          days: Math.floor(totalSeconds / 86400),
          hours: Math.floor((totalSeconds % 86400) / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
        };

        Object.entries(values).forEach(([unit, value]) => {
          if (this.units[unit]) this.units[unit].textContent = this.format.format(value);
        });
      }
    }
  );
}
