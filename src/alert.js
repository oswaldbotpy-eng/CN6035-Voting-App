import { useEffect } from "react";
import { Alert } from "react-bootstrap";

export default function MessageAlert({
  show,
  variant = "info",
  title,
  message,
  onClose,
  autoClose = false,
  duration = 3000,
}) {

  // Optional auto-dismiss
  useEffect(() => {
    if (autoClose && show) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, autoClose, duration, onClose]);

  if (!show) return null;

  return (
    <Alert variant={variant} onClose={onClose} dismissible>
      {title && <Alert.Heading>{title}</Alert.Heading>}
      {message && <p>{message}</p>}
    </Alert>
  );
}
