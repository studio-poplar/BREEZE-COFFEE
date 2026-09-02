import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Staff, StaffRole } from "@/lib/types";

async function storeIdsFor(staffId: string): Promise<string[]> {
  const rows = (await sql`
    SELECT store_id FROM staff_stores WHERE staff_id = ${staffId}
  `) as { store_id: string }[];
  return rows.map((r) => r.store_id);
}

export async function findStaffByUsername(
  username: string
): Promise<(Staff & { password_hash: string }) | undefined> {
  const rows = (await sql`SELECT * FROM staff WHERE username = ${username}`) as Record<
    string,
    unknown
  >[];
  const row = rows[0];
  if (!row) return undefined;
  return {
    staff_id: row.staff_id as string,
    username: row.username as string,
    display_name: row.display_name as string,
    role: row.role as StaffRole,
    password_hash: row.password_hash as string,
    store_ids: await storeIdsFor(row.staff_id as string),
  };
}

export async function verifyStaffPassword(
  username: string,
  password: string
): Promise<Staff | null> {
  const staff = await findStaffByUsername(username);
  if (!staff) return null;
  const ok = await bcrypt.compare(password, staff.password_hash);
  if (!ok) return null;
  const { password_hash: _unused, ...publicStaff } = staff;
  void _unused;
  return publicStaff;
}

export class PasswordChangeError extends Error {}

export async function changeStaffPassword(
  staffId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const rows = (await sql`
    SELECT password_hash FROM staff WHERE staff_id = ${staffId}
  `) as { password_hash: string }[];
  if (!rows[0]) throw new PasswordChangeError("アカウントが見つかりません");

  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) throw new PasswordChangeError("現在のパスワードが違います");

  const newHash = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE staff SET password_hash = ${newHash} WHERE staff_id = ${staffId}`;
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

  await sql.transaction((tx) => [
    tx`
      INSERT INTO staff (staff_id, username, password_hash, display_name, role, created_at)
      VALUES (${staff_id}, ${input.username}, ${password_hash}, ${input.display_name}, ${input.role}, ${new Date().toISOString()})
    `,
    ...input.store_ids.map(
      (storeId) => tx`
        INSERT INTO staff_stores (staff_id, store_id) VALUES (${staff_id}, ${storeId})
      `
    ),
  ]);

  return {
    staff_id,
    username: input.username,
    display_name: input.display_name,
    role: input.role,
    store_ids: input.store_ids,
  };
}
