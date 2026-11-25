import AuditLog from "./audit-log";

export const metadata = { title: "Audit log", robots: { index: false, follow: false } };

export default function Audit() {
  return <section className="browse"><h1>Audit log</h1><AuditLog /></section>;
}
