import { useEffect, useRef, useState, type ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, label, onClose, children }: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef(children);
  const [closing, setClosing] = useState(false);

  if (open) content.current = children;

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open) {
      setClosing(false);
      if (!node.open) node.showModal();
    } else if (node.open) {
      setClosing(true);
    }
  }, [open]);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      dialog.current?.close();
      setClosing(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [closing]);

  function finishClose() {
    if (!closing) return;
    dialog.current?.close();
    setClosing(false);
  }

  return (
    <dialog
      ref={dialog}
      className={`drawer${closing ? " closing" : ""}`}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) finishClose();
      }}
    >
      <div className="drawer-panel">{content.current}</div>
    </dialog>
  );
}
