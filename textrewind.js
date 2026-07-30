/* TextRewind — lightweight, reusable heading animator (vanilla JS)
   Usage: new TextRewind(element, { interval, pause, shadowColors })
*/
(function(){
  class TextRewind {
    constructor(el, opts = {}){
      this.el = el;
      this.opts = Object.assign({ interval: 50, pause: 1200, shadowColors: {} }, opts);
      this.strings = [];
      try{
        const raw = el.getAttribute('data-strings') || '[]';
        this.strings = JSON.parse(raw);
      }catch(e){ this.strings = [el.textContent.trim()]; }
      this.i = 0; this.ch = 0; this.forward = true;
      this._installStyles();
      this.run();
    }

    _installStyles(){
      const s = this.el.style;
      s.whiteSpace = 'nowrap';
      s.display = 'inline-block';
      s.fontWeight = 700;
      s.letterSpacing = '-0.02em';
      const sc = this.opts.shadowColors;
      const glow = sc.glow || '#F5BC18';
      this.el.style.textShadow = `0 6px 24px ${this._alpha(glow,0.12)}, 0 2px 8px ${this._alpha(glow,0.06)}`;
    }

    _alpha(hex, a){
      const h = hex.replace('#','');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      return `rgba(${r},${g},${b},${a})`;
    }

    run(){
      const str = this.strings[this.i % this.strings.length] || '';
      if(this.forward){
        this.ch++;
        this.el.textContent = str.substring(0,this.ch);
        if(this.ch >= str.length){ this.forward = false; setTimeout(()=>this.run(), this.opts.pause); return; }
      } else {
        this.ch--;
        this.el.textContent = str.substring(0,this.ch);
        if(this.ch <= 0){ this.forward = true; this.i++; }
      }
      const next = this.forward ? this.opts.interval : Math.max(16, this.opts.interval/2);
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // respect reduced motion
      this._timer = setTimeout(()=>this.run(), next);
    }

    destroy(){ clearTimeout(this._timer); }
  }

  window.TextRewind = TextRewind;
})();
