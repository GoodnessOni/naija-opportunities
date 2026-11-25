import Link from "next/link";
import StaffQueue from "./staff-queue";

export const metadata = { title: "Staff review", robots: { index: false, follow: false } };

export default function Admin() {
  return <section className="browse"><h1>Staff review</h1><p><Link href="/admin/audit">Audit log</Link></p><StaffQueue /></section>;
}
