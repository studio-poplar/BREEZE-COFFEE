import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Staff, StaffRole } from "@/lib/types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function storeIdsFor(staffId: string): Promise<string[]> {
  const rows = (await sql`
    SELECT store_id FROM staff_stores WHERE staff_id = ${staffId}
  `) as { store_id: string }[];
  return rows.map((r) => r.store_id);
}

interface StaffRow extends Staff {
  password_hash: string;
  failed_attempts: number;
  locked_until: string | null;
}

export async function findStaffByUsername(username: string): Promise<StaffRow | undefined> {
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
    active: row.active as boolean,
    password_hash: row.password_hash as string,
    failed_attempts: row.failed_attempts as number,
    locked_until: (row.locked_until as string) ?? null,
    store_ids: await storeIdsFor(row.staff_id as string),
  };
}

/** For session validation: lets a deactivated account's existing session be rejected immediately instead of staying valid until the JWT expires. */
export async function isStaffActive(staffId: string): Promise<boolean> {
  const rows = (await sql`SELECT active FROM staff WHERE staff_id = ${staffId}`) as { active: boolean }[];
  return rows[0]?.active ?? false;
}

export type LoginResult =
  | { status: "ok"; staff: Staff }
  | { status: "locked"; retryAfterMinutes: number }
  | { status: "invalid" };

export async function verifyStaffPassword(username: string, password: string): Promise<LoginResult> {
  const staff = await findStaffByUsername(username);
  if (!staff || !staff.active) return { status: "invalid" };

  if (staff.locked_until && new Date(staff.locked_until).getTime() > Date.now()) {
    const retryAfterMinutes = Math.ceil((new Date(staff.locked_until).getTime() - Date.now()) / 60000);
    return { status: "locked", retryAfterMinutes };
  }

  const ok = await bcrypt.compare(password, staff.password_hash);
  if (!ok) {
    const attempts = staff.failed_attempts + 1;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
      await sql`UPDATE staff SET failed_attempts = 0, locked_until = ${lockedUntil} WHERE staff_id = ${staff.staff_id}`;
      return { status: "locked", retryAfterMinutes: LOCK_MINUTES };
    }
    await sql`UPDATE staff SET failed_attempts = ${attempts} WHERE staff_id = ${staff.staff_id}`;
    return { status: "invalid" };
  }

  await sql`UPDATE staff SET failed_attempts = 0, locked_until = NULL WHERE staff_id = ${staff.staff_id}`;
  const { password_hash: _hash, failed_attempts: _fa, locked_until: _lu, ...publicStaff } = staff;
  void _hash;
  void _fa;
  void _lu;
  return { status: "ok", staff: publicStaff };
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

/** Admin-initiated reset, bypassing the current-password check (e.g. a locked-out or forgetful staff member). */
export async function resetStaffPassword(staffId: string, newPassword: string): Promise<void> {
  const newHash = await bcrypt.hash(newPassword, 10);
  await sql`
    UPDATE staff SET password_hash = ${newHash}, failed_attempts = 0, locked_until = NULL
    WHERE staff_id = ${staffId}
  `;
}

export async function listStaff(): Promise<Staff[]> {
  const rows = (await sql`SELECT * FROM staff ORDER BY created_at DESC`) as Record<string, unknown>[];
  return Promise.all(
    rows.map(async (row) => ({
      staff_id: row.staff_id as string,
      username: row.username as string,
      display_name: row.display_name as string,
      role: row.role as StaffRole,
      active: row.active as boolean,
      store_ids: await storeIdsFor(row.staff_id as string),
    }))
  );
}

export class StaffCreateError extends Error {}

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
    active: true,
  };
}

export async function updateStaff(
  staffId: string,
  input: { display_name?: string; role?: StaffRole; store_ids?: string[]; active?: boolean }
): Promise<Staff | undefined> {
  const rows = (await sql`SELECT * FROM staff WHERE staff_id = ${staffId}`) as Record<string, unknown>[];
  const current = rows[0];
  if (!current) return undefined;

  const next = {
    display_name: input.display_name ?? (current.display_name as string),
    role: input.role ?? (current.role as StaffRole),
    active: input.active ?? (current.active as boolean),
  };

  if (input.store_ids) {
    await sql.transaction((tx) => [
      tx`
        UPDATE staff SET display_name = ${next.display_name}, role = ${next.role}, active = ${next.active}
        WHERE staff_id = ${staffId}
      `,
      tx`DELETE FROM staff_stores WHERE staff_id = ${staffId}`,
      ...input.store_ids!.map(
        (storeId) => tx`INSERT INTO staff_stores (staff_id, store_id) VALUES (${staffId}, ${storeId})`
      ),
    ]);
  } else {
    await sql`
      UPDATE staff SET display_name = ${next.display_name}, role = ${next.role}, active = ${next.active}
      WHERE staff_id = ${staffId}
    `;
  }

  return {
    staff_id: staffId,
    username: current.username as string,
    display_name: next.display_name,
    role: next.role,
    active: next.active,
    store_ids: await storeIdsFor(staffId),
  };
}

export async function findStaffById(staffId: string): Promise<Staff | undefined> {
  const rows = (await sql`SELECT * FROM staff WHERE staff_id = ${staffId}`) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) return undefined;
  return {
    staff_id: row.staff_id as string,
    username: row.username as string,
    display_name: row.display_name as string,
    role: row.role as StaffRole,
    active: row.active as boolean,
    store_ids: await storeIdsFor(row.staff_id as string),
  };
}
