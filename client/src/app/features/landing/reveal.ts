import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';

/** Hiện dần khi cuộn tới: thêm class "in" lần đầu phần tử vào khung nhìn (CSS tự lo chuyển động). */
@Directive({
  selector: '[appReveal]',
  standalone: false,
})
export class Reveal implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private observer?: IntersectionObserver;

  /** Độ trễ (ms) để các thẻ cạnh nhau hiện lệch nhịp. */
  @Input('appReveal') delay: number | '' = 0;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    if (this.delay) this.renderer.setStyle(node, 'transitionDelay', `${this.delay}ms`);
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.renderer.addClass(node, 'in');
        this.observer?.disconnect();
      },
      { threshold: 0.15 },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
