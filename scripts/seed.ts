import "dotenv/config";
import { createStore, listStores } from "../src/lib/data/stores";
import { createMenuItem, listMenu } from "../src/lib/data/menu";
import { createStaff, findStaffByUsername } from "../src/lib/data/staff";

async function main() {
  let store = (await listStores()).find((s) => s.name === "GROOVE COFFEE 本店");
  if (!store) {
    store = await createStore({ name: "GROOVE COFFEE 本店", type: "permanent" });
    console.log(`store created: ${store.name} (${store.store_id})`);
  }

  if ((await listMenu(store.store_id, { includeInactive: true })).length === 0) {
    await createMenuItem(store.store_id, {
      name: "カフェラテ",
      price: 550,
      category: "コーヒー",
      option_groups: [
        {
          label: "サイズ",
          required: true,
          multi_select: false,
          choices: [
            { label: "S", extra_price: 0 },
            { label: "M", extra_price: 50 },
            { label: "L", extra_price: 100 },
          ],
        },
        {
          label: "温度",
          required: true,
          multi_select: false,
          choices: [
            { label: "HOT", extra_price: 0 },
            { label: "ICED", extra_price: 0 },
          ],
        },
        {
          label: "ミルク変更",
          required: false,
          multi_select: false,
          choices: [
            { label: "オーツミルク", extra_price: 60 },
            { label: "豆乳", extra_price: 50 },
          ],
        },
      ],
    });

    await createMenuItem(store.store_id, {
      name: "ドリップコーヒー",
      price: 450,
      category: "コーヒー",
      option_groups: [
        {
          label: "サイズ",
          required: true,
          multi_select: false,
          choices: [
            { label: "S", extra_price: 0 },
            { label: "M", extra_price: 50 },
          ],
        },
        {
          label: "温度",
          required: true,
          multi_select: false,
          choices: [
            { label: "HOT", extra_price: 0 },
            { label: "ICED", extra_price: 0 },
          ],
        },
      ],
    });

    await createMenuItem(store.store_id, {
      name: "抹茶ラテ",
      price: 580,
      category: "ラテ",
      option_groups: [
        {
          label: "温度",
          required: true,
          multi_select: false,
          choices: [
            { label: "HOT", extra_price: 0 },
            { label: "ICED", extra_price: 0 },
          ],
        },
        {
          label: "甘さ",
          required: false,
          multi_select: false,
          choices: [
            { label: "通常", extra_price: 0 },
            { label: "控えめ", extra_price: 0 },
          ],
        },
      ],
    });

    await createMenuItem(store.store_id, {
      name: "焼き菓子セット",
      price: 350,
      category: "フード",
      option_groups: [],
    });

    console.log(`menu seeded for ${store.name}`);
  }

  if (!(await findStaffByUsername("admin"))) {
    await createStaff({
      username: "admin",
      password: "admin1234",
      display_name: "管理者",
      role: "admin",
      store_ids: [store.store_id],
    });
    console.log("staff created: admin / admin1234 (role: admin)");
  }

  if (!(await findStaffByUsername("register"))) {
    await createStaff({
      username: "register",
      password: "register1234",
      display_name: "レジ担当",
      role: "register",
      store_ids: [store.store_id],
    });
    console.log("staff created: register / register1234 (role: register)");
  }

  console.log("seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
