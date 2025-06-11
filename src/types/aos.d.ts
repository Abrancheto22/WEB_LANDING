declare namespace AOS {
  function init(options?: {
    duration?: number;
    once?: boolean;
  }): void;

  function refresh(): void;
}

declare var AOS: typeof AOS;

interface Window {
  AOS: typeof AOS;
}
