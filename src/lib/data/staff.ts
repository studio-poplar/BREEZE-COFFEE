import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Staff, StaffRole } from "@/lib/types";

function storeIdsFor(staffId: string): string[] {
  const rows = db
    .prepare(`SELECT store_id FROM staff_stores WHERE staff_id = ?`)
    .all(staffId) as { store_id: string }[];
  return rows.map((r) => r.store_id);
}

export function findStaffByUsername(username: string): (Staff & { password_hash: string }) | undefined {
  const row = db.prepare(`SELECT * FROM staff WHERE username = ?`).get(username) as
    | Record<string, unknown>
    | undefined;
  if (!row) return undefined;
  return {
    staff_id: row.staff_id as string,
    username: row.username as string,
    display_name: row.display_name as string,
    role: row.role as StaffRole,
    password_hash: row.password_hash as string,
    store_ids: storeIdsFor(row.staff_id as string),
  };
}

export async function verifyStaffPassword(username: string, password: string): Promise<Staff | null> {
  const staff = findStaffByUsername(username);
  if (!staff) return null;
  const ok = await bcrypt.compare(password, staff.password_hash);
  if (!ok) return null;
  const { password_hash: _unused, ...publicStaff } = staff;
  void _unused;
  return publicStaff;
}

export async function createStaff(input: {
  username: string;
  password: string;
  display_name: string;
  role: StaffRole;
  store_ids: string[];
}): Promise<Staff> {
  const staff_id = newId();
  const password_hash = await bcrypt.hash(input.password, 10);
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO staff (staff_id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)`
    ).run(staff_id, input.username, password_hash, input.display_name, input.role);
    const insertLink = db.prepare(
      `INSERT INTO staff_stores (staff_id, store_id) VALUES (?, ?)`
    );
    for (const storeId of input.store_ids) insertLink.run(staff_id, storeId);
  });
  tx();
  return {
    staff_id,
    username: input.username,
    display_name: input.display_name,
    role: input.role,
    store_ids: input.store_ids,
  };
}
