import type { YtMoviePlayer } from "../shared/youtube-types.ts";

export type PageRuntimeId = "chromium" | "firefox";

export type PageRuntime = {
  readonly id: PageRuntimeId;
  /** Firefox may need Xray unwrap; Chromium is identity. */
  unwrap<T>(value: T): T;
  getLocalStorage(): Storage;
  getMoviePlayer(): YtMoviePlayer | undefined;
  isAdShowing(): boolean;
  observePlayerClass(onClassChange: () => void): void;
  /** True only on Chromium — wrapping fetch breaks Firefox YouTube. */
  readonly shouldHookFetch: boolean;
};

type WrappedNode<T> = T & { wrappedJSObject?: T };

function queryMoviePlayerElement(): Element | undefined {
  return document.querySelector("#movie_player") ?? undefined;
}

function elementLooksLikePlayer(element: Element): element is Element & YtMoviePlayer {
  const candidate = element as Element & Partial<YtMoviePlayer>;
  return (
    typeof candidate.getAvailableAudioTracks === "function" &&
    typeof candidate.setAudioTrack === "function"
  );
}

function isAdShowingOnElement(element: Element): boolean {
  return element.classList.contains("ad-showing") || element.classList.contains("ad-interrupting");
}

function createPlayerClassObserver(
  getElement: () => Element | undefined,
): (onClassChange: () => void) => void {
  let observed: Element | undefined;
  let observer: MutationObserver | undefined;

  return (onClassChange: () => void): void => {
    const element = getElement();
    if (element === undefined) {
      return;
    }
    if (observed === element) {
      return;
    }
    observer?.disconnect();
    observed = element;
    observer = new MutationObserver(() => {
      onClassChange();
    });
    observer.observe(element, { attributes: true, attributeFilter: ["class"] });
  };
}

function identityUnwrap<T>(value: T): T {
  return value;
}

function firefoxUnwrap<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  const wrapped = (value as WrappedNode<T>).wrappedJSObject;
  return wrapped ?? value;
}

function createChromiumRuntime(): PageRuntime {
  const getElement = queryMoviePlayerElement;
  return {
    id: "chromium",
    shouldHookFetch: true,
    unwrap: identityUnwrap,
    getLocalStorage(): Storage {
      return window.localStorage;
    },
    getMoviePlayer(): YtMoviePlayer | undefined {
      const element = getElement();
      if (element === undefined || !elementLooksLikePlayer(element)) {
        return undefined;
      }
      return element;
    },
    isAdShowing(): boolean {
      const element = getElement();
      return element !== undefined && isAdShowingOnElement(element);
    },
    observePlayerClass: createPlayerClassObserver(getElement),
  };
}

function createFirefoxRuntime(): PageRuntime {
  const unwrap = firefoxUnwrap;
  return {
    id: "firefox",
    shouldHookFetch: false,
    unwrap,
    getLocalStorage(): Storage {
      const pageWindow = window.wrappedJSObject;
      if (pageWindow !== undefined && pageWindow !== window) {
        return pageWindow.localStorage;
      }
      return window.localStorage;
    },
    getMoviePlayer(): YtMoviePlayer | undefined {
      const element = queryMoviePlayerElement();
      if (element === undefined) {
        return undefined;
      }
      const unwrapped = unwrap(element);
      if (!elementLooksLikePlayer(unwrapped)) {
        return undefined;
      }
      return unwrapped;
    },
    isAdShowing(): boolean {
      const element = queryMoviePlayerElement();
      return element !== undefined && isAdShowingOnElement(element);
    },
    observePlayerClass: createPlayerClassObserver(queryMoviePlayerElement),
  };
}

export function createPageRuntime(): PageRuntime {
  if (navigator.userAgent.includes("Firefox")) {
    return createFirefoxRuntime();
  }
  return createChromiumRuntime();
}
