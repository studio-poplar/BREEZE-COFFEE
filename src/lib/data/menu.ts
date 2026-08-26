import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { MenuItem, OptionGroup, OptionChoice, MenuItemInput } from "@/lib/types";

function attachOptions(items: Omit<MenuItem, "option_groups">[]): MenuItem[] {
  if (items.length === 0) return [];
  const itemIds = items.map((i) => i.item_id);
  const placeholders = itemIds.map(() => "?").join(",");

  const groups = db
    .prepare(
      `SELECT * FROM option_groups WHERE item_id IN (${placeholders}) ORDER BY sort_order`
    )
    .all(...itemIds) as OptionGroup[];

  const groupIds = groups.map((g) => g.group_id);
  const choices = groupIds.length
    ? (db
        .prepare(
          `SELECT * FROM option_choices WHERE group_id IN (${groupIds
            .map(() => "?")
            .join(",")}) ORDER BY sort_order`
        )
        .all(...groupIds) as OptionChoice[])
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

export function listMenu(storeId: string, opts: { includeInactive?: boolean } = {}): MenuItem[] {
  const rows = opts.includeInactive
    ? (db
        .prepare(`SELECT * FROM menu_items WHERE store_id = ? ORDER BY sort_order, created_at`)
        .all(storeId) as Omit<MenuItem, "option_groups">[])
    : (db
        .prepare(
          `SELECT * FROM menu_items WHERE store_id = ? AND active = 1 ORDER BY sort_order, created_at`
        )
        .all(storeId) as Omit<MenuItem, "option_groups">[]);
  return attachOptions(rows);
}

export function getMenuItem(itemId: string): MenuItem | undefined {
  const row = db.prepare(`SELECT * FROM menu_items WHERE item_id = ?`).get(itemId) as
    | Omit<MenuItem, "option_groups">
    | undefined;
  if (!row) return undefined;
  return attachOptions([row])[0];
}

export function getMenuItems(itemIds: string[]): Map<string, MenuItem> {
  if (itemIds.length === 0) return new Map();
  const placeholders = itemIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM menu_items WHERE item_id IN (${placeholders})`)
    .all(...itemIds) as Omit<MenuItem, "option_groups">[];
  const withOptions = attachOptions(rows);
  return new Map(withOptions.map((i) => [i.item_id, i]));
}

export function createMenuItem(storeId: string, input: MenuItemInput): MenuItem {
  const item_id = newId();
  const insertItem = db.prepare(
    `INSERT INTO menu_items (item_id, store_id, name, price, category, image_path, active, sort_order)
     VALUES (@item_id, @store_id, @name, @price, @category, @image_path, @active, @sort_order)`
  );
  const insertGroup = db.prepare(
    `INSERT INTO option_groups (group_id, item_id, label, required, multi_select, sort_order)
     VALUES (@group_id, @item_id, @label, @required, @multi_select, @sort_order)`
  );
  const insertChoice = db.prepare(
    `INSERT INTO option_choices (choice_id, group_id, label, extra_price, sort_order)
     VALUES (@choice_id, @group_id, @label, @extra_price, @sort_order)`
  );

  const tx = db.transaction(() => {
    insertItem.run({
      item_id,
      store_id: storeId,
      name: input.name,
      price: input.price,
      category: input.category,
      image_path: input.image_path ?? null,
      active: input.active === false ? 0 : 1,
      sort_order: input.sort_order ?? 0,
    });
    input.option_groups.forEach((g, gi) => {
      const group_id = newId();
      insertGroup.run({
        group_id,
        item_id,
        label: g.label,
        required: g.required ? 1 : 0,
        multi_select: g.multi_select ? 1 : 0,
        sort_order: gi,
      });
      g.choices.forEach((c, ci) => {
        insertChoice.run({
          choice_id: newId(),
          group_id,
          label: c.label,
          extra_price: c.extra_price,
          sort_order: ci,
        });
      });
    });
  });
  tx();

  return getMenuItem(item_id)!;
}

export function updateMenuItem(itemId: string, input: MenuItemInput): MenuItem | undefined {
  if (!getMenuItem(itemId)) return undefined;

  const updateItem = db.prepare(
    `UPDATE menu_items SET name = @name, price = @price, category = @category,
       image_path = @image_path, active = @active, sort_order = @sort_order
     WHERE item_id = @item_id`
  );
  const deleteGroups = db.prepare(`DELETE FROM option_groups WHERE item_id = ?`);
  const insertGroup = db.prepare(
    `INSERT INTO option_groups (group_id, item_id, label, required, multi_select, sort_order)
     VALUES (@group_id, @item_id, @label, @required, @multi_select, @sort_order)`
  );
  const insertChoice = db.prepare(
    `INSERT INTO option_choices (choice_id, group_id, label, extra_price, sort_order)
     VALUES (@choice_id, @group_id, @label, @extra_price, @sort_order)`
  );

  const tx = db.transaction(() => {
    updateItem.run({
      item_id: itemId,
      name: input.name,
      price: input.price,
      category: input.category,
      image_path: input.image_path ?? null,
      active: input.active === false ? 0 : 1,
      sort_order: input.sort_order ?? 0,
    });
    // option groups/choices are small and edited as a whole from the admin UI,
    // so replacing them wholesale is simpler and safer than diffing.
    deleteGroups.run(itemId);
    input.option_groups.forEach((g, gi) => {
      const group_id = newId();
      insertGroup.run({
        group_id,
        item_id: itemId,
        label: g.label,
        required: g.required ? 1 : 0,
        multi_select: g.multi_select ? 1 : 0,
        sort_order: gi,
      });
      g.choices.forEach((c, ci) => {
        insertChoice.run({
          choice_id: newId(),
          group_id,
          label: c.label,
          extra_price: c.extra_price,
          sort_order: ci,
        });
      });
    });
  });
  tx();

  return getMenuItem(itemId);
}

export function deleteMenuItem(itemId: string): void {
  db.prepare(`DELETE FROM menu_items WHERE item_id = ?`).run(itemId);
}
