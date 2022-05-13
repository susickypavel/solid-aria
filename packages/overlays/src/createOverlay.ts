import { createFocusWithin, createInteractOutside } from "@solid-aria/interactions";
import { DOMElements } from "@solid-aria/types";
import { access, MaybeAccessor } from "@solid-primitives/utils";
import { Accessor, createEffect, createMemo, JSX, onCleanup } from "solid-js";

interface CreateOverlayProps {
  /**
   * Whether the overlay is currently open.
   */
  isOpen?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether to close the overlay when the user interacts outside it.
   * @default false
   */
  isDismissable?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether the overlay should close when focus is lost or moves outside it.
   */
  shouldCloseOnBlur?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether pressing the escape key to close the overlay should be disabled.
   * @default false
   */
  isKeyboardDismissDisabled?: MaybeAccessor<boolean | undefined>;

  /**
   * Handler that is called when the overlay should close.
   */
  onClose?: () => void;

  /**
   * When user interacts with the argument element outside of the overlay ref,
   * return true if onClose should be called. This gives you a chance to filter
   * out interaction with elements that should not dismiss the overlay.
   * By default, onClose will always be called on interaction outside the overlay ref.
   */
  shouldCloseOnInteractOutside?: (element: HTMLElement) => boolean;
}

interface OverlayAria<
  OverlayElementType extends DOMElements,
  UnderlayElementType extends DOMElements
> {
  /**
   * Props to apply to the overlay container element.
   */
  overlayProps: Accessor<JSX.IntrinsicElements[OverlayElementType]>;

  /**
   * Props to apply to the underlay element, if any.
   */
  underlayProps: Accessor<JSX.IntrinsicElements[UnderlayElementType]>;
}

const visibleOverlays: Array<Accessor<HTMLElement | undefined>> = [];

/**
 * Provides the behavior for overlays such as dialogs, popovers, and menus.
 * Hides the overlay when the user interacts outside it, when the Escape key is pressed,
 * or optionally, on blur. Only the top-most overlay will close at once.
 */
export function createOverlay<
  OverlayElementType extends DOMElements = "div",
  UnderlayElementType extends DOMElements = "div",
  RefElement extends HTMLElement = HTMLDivElement
>(
  props: CreateOverlayProps,
  ref: Accessor<RefElement | undefined>
): OverlayAria<OverlayElementType, UnderlayElementType> {
  // Add the overlay ref to the stack of visible overlays on mount, and remove on unmount.
  createEffect(() => {
    if (access(props.isOpen)) {
      visibleOverlays.push(ref);
    }

    onCleanup(() => {
      const index = visibleOverlays.indexOf(ref);

      if (index >= 0) {
        visibleOverlays.splice(index, 1);
      }
    });
  });

  // Only hide the overlay when it is the topmost visible overlay in the stack.
  const onHide = () => {
    if (visibleOverlays[visibleOverlays.length - 1]() === ref()) {
      props.onClose?.();
    }
  };

  const onInteractOutsideStart = (e: Event) => {
    if (
      !props.shouldCloseOnInteractOutside ||
      props.shouldCloseOnInteractOutside(e.target as HTMLElement)
    ) {
      if (visibleOverlays[visibleOverlays.length - 1]() === ref()) {
        e.stopPropagation();
        e.preventDefault();
      }
    }
  };

  const onInteractOutside = (e: Event) => {
    if (!access(props.isDismissable)) {
      return;
    }

    if (
      !props.shouldCloseOnInteractOutside ||
      props.shouldCloseOnInteractOutside(e.target as HTMLElement)
    ) {
      if (visibleOverlays[visibleOverlays.length - 1]() === ref()) {
        e.stopPropagation();
        e.preventDefault();
      }
      onHide();
    }
  };

  // Handle the escape key
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !access(props.isKeyboardDismissDisabled)) {
      e.stopPropagation();
      e.preventDefault();
      onHide();
    }
  };

  // Handle clicking outside the overlay to close it
  createInteractOutside(
    {
      onInteractOutside,
      onInteractOutsideStart
    },
    ref
  );

  const { focusWithinProps } = createFocusWithin({
    isDisabled: () => !access(props.shouldCloseOnBlur),
    onFocusOut: e => {
      if (
        !props.shouldCloseOnInteractOutside ||
        props.shouldCloseOnInteractOutside(e.relatedTarget as HTMLElement)
      ) {
        props.onClose?.();
      }
    }
  });

  const onPointerDownUnderlay = (e: Event) => {
    // fixes a firefox issue that starts text selection https://bugzilla.mozilla.org/show_bug.cgi?id=1675846
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  };

  const overlayProps = createMemo(
    () =>
      ({
        onKeyDown,
        ...focusWithinProps()
      } as JSX.IntrinsicElements[OverlayElementType])
  );

  const underlayProps = createMemo(
    () =>
      ({
        onPointerDown: onPointerDownUnderlay
      } as JSX.IntrinsicElements[UnderlayElementType])
  );

  return { overlayProps, underlayProps };
}
