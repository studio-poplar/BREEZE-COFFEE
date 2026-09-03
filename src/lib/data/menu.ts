import { sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { MenuItem, OptionGroup, OptionChoice, MenuItemInput } from "@/lib/types";

async function attachOptions(items: Omit<MenuItem, "option_groups">[]): Promise<MenuItem[]> {
  if (items.length === 0) return [];
  const itemIds = items.map((i) => i.item_id);

  const groups = (await sql`
    SELECT * FROM option_groups WHERE item_id = ANY(${itemIds}::text[]) ORDER BY sort_order
  `) as OptionGroup[];

  const groupIds = groups.map((g) => g.group_id);
  const choices = groupIds.length
    ? ((await sql`
        SELECT * FROM option_choices WHERE group_id = ANY(${groupIds}::text[]) ORDER BY sort_order
      `) as OptionChoice[])
    : [];

  const choicesByGroup = new Map<string, OptionChoice[]>();
  for (const c of choices) {
    if (!choicesByGroup.has(c.group_id)) choicesByGroup.set(c.group_id, []);
    choicesByGroup.get(c.group_id)!.push(c);
  }

  const groupsByItem = new Map<string, OptionGroup[]>();
  for (const g of groups) {
    const full = { ...g, choices: choicesByGroup.get(g.group_id) ?? [] };
    if (!groupsByItem.has(g.item_id)) groupsByItem.set(g.item_id, []);
    groupsByItem.get(g.item_id)!.push(full);
  }

  return items.map((item) => ({ ...item, option_groups: groupsByItem.get(item.item_id) ?? [] }));
}

export async function listMenu(
  storeId: string,
  opts: { includeInactive?: boolean } = {}
): Promise<MenuItem[]> {
  const rows = (
    opts.includeInactive
      ? await sql`
          SELECT * FROM menu_items WHERE store_id = ${storeId} ORDER BY sort_order, created_at
        `
      : await sql`
          SELECT * FROM menu_items WHERE store_id = ${storeId} AND active = true
          ORDER BY sort_order, created_at
        `
  ) as Omit<MenuItem, "option_groups">[];
  return attachOptions(rows);
}

export async function getMenuItem(itemId: string): Promise<MenuItem | undefined> {
  const rows = (await sql`
    SELECT * FROM menu_items WHERE item_id = ${itemId}
  `) as Omit<MenuItem, "option_groups">[];
  if (!rows[0]) return undefined;
  return (await attachOptions([rows[0]]))[0];
}

export async function getMenuItems(itemIds: string[]): Promise<Map<string, MenuItem>> {
  if (itemIds.length === 0) return new Map();
  const rows = (await sql`
    SELECT * FROM menu_items WHERE item_id = ANY(${itemIds}::text[])
  `) as Omit<MenuItem, "option_groups">[];
  const withOptions = await attachOptions(rows);
  return new Map(withOptions.map((i) => [i.item_id, i]));
}

export async function createMenuItem(storeId: string, input: MenuItemInput): Promise<MenuItem> {
  const item_id = newId();

  const groupRows = input.option_groups.map((g, gi) => ({ ...g, group_id: newId(), sort_order: gi }));
  const choiceRows = groupRows.flatMap((g) =>
    g.choices.map((c, ci) => ({ ...c, choice_id: newId(), group_id: g.group_id, sort_order: ci }))
  );

  await sql.transaction((tx) => [
    tx`
      INSERT INTO menu_items (item_id, store_id, name, price, cost_price, category, image_path, active, sort_order, created_at)
      VALUES (${item_id}, ${storeId}, ${input.name}, ${input.price}, ${input.cost_price ?? 0}, ${input.category},
        ${input.image_path ?? null}, ${input.active !== false}, ${input.sort_order ?? 0}, ${new Date().toISOString()})
    `,
    ...groupRows.map(
      (g) => tx`
        INSERT INTO option_groups (group_id, item_id, label, required, multi_select, sort_order)
        VALUES (${g.group_id}, ${item_id}, ${g.label}, ${g.required}, ${g.multi_select}, ${g.sort_order})
      `
    ),
    ...choiceRows.map(
      (c) => tx`
        INSERT INTO option_choices (choice_id, group_id, label, extra_price, sort_order)
        VALUES (${c.choice_id}, ${c.group_id}, ${c.label}, ${c.extra_price}, ${c.sort_order})
      `
    ),
  ]);

  return (await getMenuItem(item_id))!;
}

export async function updateMenuItem(
  itemId: string,
  input: MenuItemInput
): Promise<MenuItem | undefined> {
  if (!(await getMenuItem(itemId))) return undefined;

  const groupRows = input.option_groups.map((g, gi) => ({ ...g, group_id: newId(), sort_order: gi }));
  const choiceRows = groupRows.flatMap((g) =>
    g.choices.map((c, ci) => ({ ...c, choice_id: newId(), group_id: g.group_id, sort_order: ci }))
  );

  // option groups/choices are small and edited as a whole from the admin UI,
  // so replacing them wholesale is simpler and safer than diffing.
  await sql.transaction((tx) => [
    tx`
      UPDATE menu_items SET name = ${input.name}, price = ${input.price}, cost_price = ${input.cost_price ?? 0},
        category = ${input.category}, image_path = ${input.image_path ?? null}, active = ${input.active !== false},
        sort_order = ${input.sort_order ?? 0}
      WHERE item_id = ${itemId}
    `,
    tx`DELETE FROM option_groups WHERE item_id = ${itemId}`,
    ...groupRows.map(
      (g) => tx`
        INSERT INTO option_groups (group_id, item_id, label, required, multi_select, sort_order)
        VALUES (${g.group_id}, ${itemId}, ${g.label}, ${g.required}, ${g.multi_select}, ${g.sort_order})
      `
    ),
    ...choiceRows.map(
      (c) => tx`
        INSERT INTO option_choices (choice_id, group_id, label, extra_price, sort_order)
        VALUES (${c.choice_id}, ${c.group_id}, ${c.label}, ${c.extra_price}, ${c.sort_order})
      `
    ),
  ]);

  return getMenuItem(itemId);
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  await sql`DELETE FROM menu_items WHERE item_id = ${itemId}`;
}
